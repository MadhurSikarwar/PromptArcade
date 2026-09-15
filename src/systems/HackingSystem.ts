import Phaser from 'phaser';
import type { FacilityMap } from '../map/FacilityMap';
import type { AdaptiveAISystem } from './AdaptiveAISystem';
import type { AlertSystem } from './AlertSystem';
import { audio } from './AudioManager';
import type { DoorSystem } from './DoorSystem';
import type { DeckAction, GameState } from './GameState';
import type { LightingSystem } from './LightingSystem';

const COOLDOWNS: Record<DeckAction, number> = { cameras: 35000, seal: 9000, lights: 1500, decoy: 28000 };

export interface HackingDeps {
  doors: DoorSystem;
  lighting: LightingSystem;
  map: FacilityMap;
  alert: AlertSystem;
  adaptive: AdaptiveAISystem;
  player: () => { x: number; y: number };
}

/** Terminal hacks (minigame requests) and Cyberdeck network actions. */
export class HackingSystem {
  private readonly readyAt: Record<DeckAction, number> = { cameras: 0, seal: 0, lights: 0, decoy: 0 };
  private readonly off: () => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly state: GameState,
    private readonly deps: HackingDeps,
  ) {
    this.off = state.events.on('deck-action', ({ action }) => this.perform(action));
  }

  cooldownLeft(action: DeckAction, now: number): number {
    return Math.max(0, this.readyAt[action] - now);
  }

  requestHack(title: string, difficulty: number, onDone: (success: boolean) => void): void {
    if (this.state.modal !== 'none') return;
    const p = this.deps.player();
    this.state.modal = 'hack';
    this.deps.alert.add(5);
    this.state.noise(p.x, p.y, 220, 'hack');
    this.state.events.emit('hack-request', {
      title,
      difficulty,
      resolve: (success) => {
        this.state.modal = 'none';
        if (success) {
          audio.play('granted');
          this.state.notify('ACCESS GRANTED', 'success');
        } else {
          audio.play('hack-fail');
          this.deps.alert.add(10);
          this.state.noise(p.x, p.y, 340, 'hack-fail');
          this.state.notify('ACCESS DENIED — TRACE COMPLETE', 'danger');
        }
        onDone(success);
      },
    });
  }

  private perform(action: DeckAction): void {
    const now = this.scene.time.now;
    if (now < this.readyAt[action]) {
      this.state.notify(`COOLDOWN — ${Math.ceil((this.readyAt[action] - now) / 1000)}s`, 'warning');
      audio.play('denied');
      return;
    }
    const p = this.deps.player();
    let ok = true;
    switch (action) {
      case 'cameras':
        if (!this.state.hasFlag('facilityPower')) {
          this.state.notify('CAMERAS HAVE NO POWER', 'warning');
          ok = false;
          break;
        }
        this.state.camerasLoopedUntil = now + 20000;
        this.deps.alert.add(4);
        this.state.notify('CAMERA FEEDS LOOPED — 20s', 'success');
        break;
      case 'seal': {
        const door = this.deps.doors.nearestDoor(p.x, p.y, 300, (d) => !d.isProgressionLocked && !d.isSealed && d.doorState !== 'DISABLED');
        if (!door || !door.seal('PLAYER', now, 12000)) {
          this.state.notify('NO SEALABLE DOOR IN RANGE', 'warning');
          ok = false;
          break;
        }
        this.deps.adaptive.record('seal');
        this.state.notify(`${door.label} SEALED — 12s`, 'success');
        break;
      }
      case 'lights': {
        const room = this.state.currentRoomId;
        if (!room) {
          this.state.notify('NO ROOM LIGHTING HERE', 'warning');
          ok = false;
          break;
        }
        const lit = this.deps.lighting.isRoomLit(room, now);
        this.deps.lighting.setRoomLights(room, !lit, now, 45000);
        if (lit) this.deps.adaptive.record('lights');
        audio.play(lit ? 'power-down' : 'power-up', 0.5);
        this.state.notify(lit ? 'ROOM LIGHTS OFF — HIDE IN THE DARK' : 'ROOM LIGHTS ON', 'success');
        break;
      }
      case 'decoy': {
        const far = this.deps.map.rooms.filter((r) => Phaser.Math.Distance.Between(r.centerX, r.centerY, p.x, p.y) > 650 && !['upperlab', 'evac', 'finalairlock'].includes(r.info.id));
        const room = Phaser.Utils.Array.GetRandom(far.length > 0 ? far : this.deps.map.rooms);
        this.state.noise(room.centerX, room.centerY, 2600, 'decoy');
        this.deps.alert.add(4);
        audio.play('alarm', 0.3);
        this.state.notify(`DECOY ALARM TRIGGERED — ${room.info.name}`, 'success');
        break;
      }
    }
    if (ok) {
      this.readyAt[action] = now + COOLDOWNS[action];
      audio.play('hack-good');
    }
  }

  destroy(): void {
    this.off();
  }
}
