import Phaser from 'phaser';
import type { OctoState, OctopusWorld } from '../ai/OctopusStateMachine';
import type { Pathfinder } from '../ai/Pathfinder';
import type { ElectricHazard } from '../entities/Hazard';
import { Octopus } from '../entities/Octopus';
import type { SecurityCamera } from '../entities/SecurityCamera';
import { TILE, type FacilityMap } from '../map/FacilityMap';
import { TILE_SIZE } from '../utils/Constants';
import type { AdaptiveAISystem } from './AdaptiveAISystem';
import { audio } from './AudioManager';
import type { DoorSystem } from './DoorSystem';
import type { GameState } from './GameState';
import type { LightingSystem } from './LightingSystem';

export interface ThreatDeps {
  map: FacilityMap;
  doors: DoorSystem;
  lighting: LightingSystem;
  pathfinder: Pathfinder;
  cameras: SecurityCamera[];
  hazards: ElectricHazard[];
  adaptive: AdaptiveAISystem;
  player: () => { x: number; y: number; sprinting: boolean };
  onPlayerHit: (fromX: number, fromY: number) => void;
}

const UPPER_ROOMS = new Set(['upperlab', 'evac', 'finalairlock']);

/** Owns A-3's presence in the world and its manipulation of facility systems (doors, lights, electricity, cameras). */
export class ThreatSystem {
  octopus: Octopus | null = null;
  private nextIntervention = 0;
  private nextHeartbeat = 0;
  private nextAmbient = 0;
  private nextPing = 0;
  private readonly offs: (() => void)[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly state: GameState,
    private readonly deps: ThreatDeps,
  ) {
    this.offs.push(
      state.events.on('noise', ({ x, y, radius }) => {
        this.octopus?.brain.hear(x, y, radius, this.scene.time.now);
      }),
    );
  }

  los(x0: number, y0: number, x1: number, y1: number): boolean {
    const dist = Phaser.Math.Distance.Between(x0, y0, x1, y1);
    const steps = Math.ceil(dist / 10);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const tx = Math.floor((x0 + (x1 - x0) * t) / TILE_SIZE);
      const ty = Math.floor((y0 + (y1 - y0) * t) / TILE_SIZE);
      const tile = this.deps.map.getTile(tx, ty);
      if (tile === TILE.WALL || tile === TILE.VOID) return false;
      const door = this.deps.doors.doorAtTile(tx, ty);
      if (door && door.doorState !== 'OPEN') return false;
    }
    return true;
  }

  private walkLine(x0: number, y0: number, x1: number, y1: number): boolean {
    const dist = Phaser.Math.Distance.Between(x0, y0, x1, y1);
    const steps = Math.ceil(dist / 8);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      for (const [ox, oy] of [[0, 0], [10, 10], [-10, -10], [10, -10], [-10, 10]] as const) {
        const tx = Math.floor((x0 + (x1 - x0) * t + ox) / TILE_SIZE);
        const ty = Math.floor((y0 + (y1 - y0) * t + oy) / TILE_SIZE);
        if (!this.deps.map.isWalkable(tx, ty)) return false;
        const door = this.deps.doors.doorAtTile(tx, ty);
        if (door && door.doorState !== 'OPEN') return false;
      }
    }
    return true;
  }

  private buildWorld(): OctopusWorld {
    return {
      pathfinder: this.deps.pathfinder,
      doorAtTile: (tx, ty) => this.deps.doors.doorAtTile(tx, ty),
      los: (a, b, c, d) => this.los(a, b, c, d),
      walkLine: (a, b, c, d) => this.walkLine(a, b, c, d),
      visibility: () => {
        const p = this.deps.player();
        let v = this.deps.lighting.visibilityFactor(this.state.currentRoomId, this.scene.time.now, p.sprinting);
        if (this.deps.adaptive.has('darkness')) v = Math.max(v, 0.75);
        return v;
      },
      playerHidden: () => this.state.player.hidden || !this.state.player.alive,
      patrolPoint: (fx, fy) => this.patrolPoint(fx, fy),
      onAttack: (damage, fromX, fromY) => {
        audio.play('impact');
        audio.play('roar', 0.7);
        this.state.damagePlayer(damage, 'TAKEN BY A-3', this.scene.time.now);
        this.state.events.emit('screen-fx', { kind: 'red', duration: 400 });
        this.deps.onPlayerHit(fromX, fromY);
      },
      onStateChange: (next, prev) => this.onStateChange(next, prev),
      onForceDoor: (door) => {
        const p = this.deps.player();
        if (Phaser.Math.Distance.Between(p.x, p.y, door.x, door.y) < 560) {
          audio.play('scrape', 0.8);
          this.state.notify(`NETWORK OVERRIDE — ${door.label} IS BEING FORCED`, 'a3');
        }
      },
    };
  }

  private patrolPoint(fromX: number, fromY: number): { x: number; y: number } {
    const p = this.deps.player();
    const upper = this.state.hasFlag('inUpperFacility');
    const rooms = this.deps.map.rooms.filter((room) => UPPER_ROOMS.has(room.info.id) === upper && room.info.id !== 'finalairlock');
    const favourite = this.deps.adaptive.has('route') ? this.deps.adaptive.favouriteRoom() : null;
    if (favourite && Math.random() < 0.45) {
      const room = rooms.find((r) => r.info.id === favourite);
      if (room) return { x: room.centerX, y: room.centerY };
    }
    const alertPull = this.state.facility.alert >= 50 && Math.random() < 0.5;
    const candidates = rooms.filter((room) => {
      const dToPlayer = Phaser.Math.Distance.Between(room.centerX, room.centerY, p.x, p.y);
      const dToSelf = Phaser.Math.Distance.Between(room.centerX, room.centerY, fromX, fromY);
      return dToSelf > 200 && (alertPull ? dToPlayer < 700 : dToPlayer > 420);
    });
    const pick = Phaser.Utils.Array.GetRandom(candidates.length > 0 ? candidates : rooms);
    return { x: pick.centerX + (Math.random() - 0.5) * pick.bounds.width * 0.5, y: pick.centerY + (Math.random() - 0.5) * pick.bounds.height * 0.5 };
  }

  private onStateChange(next: OctoState, prev: OctoState): void {
    this.state.octopus.state = next;
    if (next === 'HUNT' && prev !== 'ATTACK' && prev !== 'FORCING' && prev !== 'STUNNED') {
      audio.play('roar');
      this.state.notify('A-3 IS HUNTING YOU — RUN OR HIDE!', 'danger');
      this.scene.cameras.main.shake(260, 0.004);
      if (!this.state.hasFlag('tutorialThreat')) {
        this.state.setFlag('tutorialThreat');
        this.state.notify('RUN! IT SAW YOU. USE [Q] EMP OR FIND A VENT.', 'warning');
      }
    }
    if (next === 'ATTACK') {
      audio.play('roar', 0.85);
      this.state.notify('⚠ A-3 IS ATTACKING — GET AWAY!', 'danger');
      this.scene.cameras.main.shake(220, 0.007);
    }
    if (next === 'SEARCH' && prev === 'HUNT') this.state.notify('A-3 LOST SIGHT OF YOU — IT IS SEARCHING', 'warning');
  }

  spawn(x: number, y: number, opts: { hunt?: boolean; final?: boolean } = {}): void {
    const now = this.scene.time.now;
    if (!this.octopus) {
      this.octopus = new Octopus(this.scene, this.buildWorld(), x, y);
      this.state.octopus.spawned = true;
      this.state.setFlag('a3Active');
    } else {
      this.octopus.brain.teleport(x, y);
    }
    const brain = this.octopus.brain;
    if (opts.final) brain.finalMode = true;
    const p = this.deps.player();
    if (opts.hunt) brain.hunt(p.x, p.y, now);
    this.nextIntervention = now + 14000;
  }

  despawn(): void {
    this.octopus?.destroy();
    this.octopus = null;
    this.state.octopus.spawned = false;
    this.state.octopus.state = 'GONE';
  }

  stunNear(x: number, y: number, radius: number, now: number): boolean {
    const o = this.octopus;
    if (!o || Phaser.Math.Distance.Between(x, y, o.x, o.y) > radius) return false;
    o.brain.stun(now);
    return true;
  }

  cameraSighting(x: number, y: number, now: number): void {
    this.octopus?.brain.reportSighting(x, y, now);
  }

  ventUsed(exitX: number, exitY: number, now: number): void {
    if (this.octopus && this.deps.adaptive.has('vents')) this.octopus.brain.hear(exitX, exitY, 5000, now);
  }

  update(dt: number, now: number): void {
    const o = this.octopus;
    if (!o) return;
    const p = this.deps.player();
    const brain = o.brain;
    brain.hearingMult = this.deps.adaptive.has('footsteps') ? 1.45 : 1;
    brain.forceDuration = this.deps.adaptive.has('doors') ? 0.6 : 1.5;
    brain.stunDuration = this.deps.adaptive.has('emp') ? 3200 : 5000;
    // Slow and manageable in Mission 1, ramping up as later missions (now 4 total) raise the stakes.
    brain.speedBonus = this.state.missionIndex * 19 - 18 + (this.state.facility.alert >= 50 ? 14 : 0);

    o.update(dt, now, p.x, p.y);

    const s = this.state.octopus;
    s.x = o.x;
    s.y = o.y;
    s.state = brain.state;
    s.awareness = Math.round(brain.awareness);
    s.distance = Phaser.Math.Distance.Between(o.x, o.y, p.x, p.y);

    if (s.distance < 400 && brain.state !== 'STUNNED' && now > this.nextHeartbeat) {
      this.nextHeartbeat = now + 380 + s.distance * 1.8;
      audio.play('heartbeat', Phaser.Math.Clamp(1.2 - s.distance / 400, 0.2, 1));
    }
    if (s.distance > 380 && s.distance < 1100 && now > this.nextAmbient) {
      this.nextAmbient = now + 7000 + Math.random() * 7000;
      audio.play('scrape', Phaser.Math.Clamp(0.9 - s.distance / 1300, 0.12, 0.6));
    }
    if (this.state.facility.alert >= 75 && now > this.nextPing && !brain.finalMode) {
      this.nextPing = now + 9000;
      brain.hear(p.x + (Math.random() - 0.5) * 260, p.y + (Math.random() - 0.5) * 260, 99999, now);
    }

    this.runInterventions(now);
  }

  private runInterventions(now: number): void {
    if (now < this.nextIntervention || this.state.modal !== 'none' || !this.octopus) return;
    const inWing = this.state.currentRoomId === 'wing';
    const factor = (this.state.facility.alert >= 50 ? 0.7 : 1) * (inWing || this.state.finalChase ? 0.55 : 1);
    this.nextIntervention = now + (15000 + Math.random() * 11000) * factor;

    const p = this.deps.player();
    const options: (() => void)[] = [];
    const door = this.deps.doors.nearestDoor(p.x, p.y, 330, (d) => !d.isProgressionLocked && !d.isSealed && d.doorState !== 'DISABLED' && !d.layout.noLockdown);
    if (door) {
      options.push(() =>
        this.telegraph(`NETWORK OVERRIDE — ${door.label}`, () => {
          if (door.seal('A-3', this.scene.time.now, 8000)) this.state.notify('DOOR SEALED BY UNKNOWN USER', 'a3');
        }),
      );
    }
    const room = this.state.currentRoomId;
    if (room && this.deps.lighting.isRoomLit(room, now)) {
      options.push(() =>
        this.telegraph('POWER FLUCTUATION DETECTED', () => {
          this.deps.lighting.setRoomLights(room, false, this.scene.time.now, 12000);
          audio.play('power-down', 0.6);
        }),
      );
    }
    if (room && this.deps.adaptive.has('darkness') && this.deps.lighting.isPlayerInDark(now)) {
      options.push(() =>
        this.telegraph('NETWORK OVERRIDE — EMERGENCY LIGHTING', () => {
          this.deps.lighting.setRoomLights(room, true, this.scene.time.now);
          this.octopus?.brain.hear(p.x, p.y, 99999, this.scene.time.now);
        }),
      );
    }
    const hazard = this.deps.hazards.find((h) => h.isArmed() && Phaser.Math.Distance.Between(p.x, p.y, h.bounds.centerX, h.bounds.centerY) < 380);
    if (hazard) {
      options.push(() => this.telegraph('ELECTRICAL SURGE DETECTED', () => hazard.surge(this.scene.time.now, 6000)));
    }
    const watching = this.deps.cameras.some((c) => c.isActive(now) && Phaser.Math.Distance.Between(c.x, c.y, p.x, p.y) < 360);
    if (watching) {
      options.push(() => this.telegraph('CAMERA NETWORK ACCESSED BY UNKNOWN USER', () => this.octopus?.brain.reportSighting(p.x, p.y, this.scene.time.now)));
    }
    if (options.length > 0) Phaser.Utils.Array.GetRandom(options)();
  }

  /** Major interventions are always telegraphed: glitch sound, UI notice and a short delay. */
  private telegraph(text: string, action: () => void): void {
    audio.play('glitch');
    this.state.notify(text, 'a3');
    this.state.events.emit('screen-fx', { kind: 'glitch', duration: 500 });
    this.scene.time.delayedCall(1200, action);
  }

  destroy(): void {
    this.offs.forEach((off) => off());
    this.octopus?.destroy();
  }
}
