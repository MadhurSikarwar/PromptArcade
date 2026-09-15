import Phaser from 'phaser';
import { MISSIONS } from '../data/missions';
import { OBJECTIVES } from '../data/objectives';
import { LOGS, TANKS } from '../data/researchLogs';
import type { Player } from '../entities/Player';
import { WorldInteractable, type MarkerKind } from '../entities/WorldInteractable';
import type { FacilityMap } from '../map/FacilityMap';
import { ANCHORS, EMP_STATIONS, FOOD_SPOTS, VENTS } from '../map/MapData';
import { COLORS, TEXTURES, TILE_SIZE } from '../utils/Constants';
import type { AdaptiveAISystem } from './AdaptiveAISystem';
import { audio } from './AudioManager';
import type { DoorSystem } from './DoorSystem';
import { KEYCARD_COLORS, KEYCARD_LABELS, type GameState, type KeycardLevel } from './GameState';
import type { HackingSystem } from './HackingSystem';
import type { InteractionSystem } from './InteractionSystem';
import type { LightingSystem } from './LightingSystem';
import type { PowerSystem } from './PowerSystem';
import type { ThreatSystem } from './ThreatSystem';

export interface ProgressionDeps {
  scene: Phaser.Scene;
  state: GameState;
  map: FacilityMap;
  doors: DoorSystem;
  interaction: InteractionSystem;
  hacking: HackingSystem;
  power: PowerSystem;
  lighting: LightingSystem;
  threat: ThreatSystem;
  adaptive: AdaptiveAISystem;
  player: () => Player;
  interactKey: Phaser.Input.Keyboard.Key;
  teleportPlayer: (x: number, y: number) => void;
  onEscape: () => void;
}

const W = (t: { x: number; y: number }): { x: number; y: number } => ({ x: t.x * TILE_SIZE + TILE_SIZE / 2, y: t.y * TILE_SIZE + TILE_SIZE / 2 });

/** The story chain: every step is a flag, an objective and a set of interactables. */
export class ObjectiveSystem {
  private readonly items = new Map<string, WorldInteractable>();
  private readonly tanksSeen = new Set<string>();
  private holdProgress = 0;
  private grabbed = false;
  private escaping = false;
  private readonly offs: (() => void)[] = [];

  constructor(private readonly d: ProgressionDeps) {
    this.build();
    const s = d.state;
    this.offs.push(
      s.events.on('door-changed', ({ id, state }) => {
        if (state !== 'OPEN') return;
        if (id === 'door-main-access') s.completeObjective('m1-exit');
        if (id === 'door-security-west' || id === 'door-security-south') s.completeObjective('m3-enter');
        if (id === 'door-upper-access' && !s.hasFlag('upperUnlocked')) {
          s.setFlag('upperUnlocked');
          s.completeObjective('m6-door');
          s.say('DIVER', 'That door. The one I ignored... Authorization accepted.');
        }
      }),
    );
    this.offs.push(
      s.events.on('room-entered', ({ roomId, firstVisit }) => {
        if (roomId === 'medbay' && firstVisit && s.objective === OBJECTIVES.wake) s.setObjective(OBJECTIVES.medbay);
        if (roomId === 'wing' && firstVisit && s.hasFlag('a3Active')) s.say('DIVER', 'Everything in here is wired into it.');
        if (roomId === 'server' && firstVisit) s.completeObjective('m4-server');
        if (roomId === 'aquarium' && firstVisit) s.completeObjective('m5-aquarium');
        if (roomId === 'wing' && firstVisit) s.completeObjective('m5-wing');
        if (roomId === 'hub' && s.hasKeycard('experiment')) s.completeObjective('m6-hub');
        if (roomId === 'entrance' && s.hasKeycard('upper')) s.completeObjective('m6-entrance');
      }),
    );
  }

  private add(id: string, tile: { x: number; y: number }, kind: MarkerKind, color: number, label: () => string, onInteract: () => void, enabled?: () => boolean): WorldInteractable {
    const p = W(tile);
    const item = new WorldInteractable(this.d.scene, { id, x: p.x, y: p.y, kind, color, label, onInteract, enabled });
    this.items.set(id, item);
    this.d.interaction.register(item);
    return item;
  }

  /** A card physically ejects near a terminal/console — the player must walk over and take it. */
  private spawnKeycard(level: KeycardLevel, tile: { x: number; y: number }, notifyText: string, onTaken?: () => void): void {
    const { state: s } = this.d;
    const id = `keycard-${level}`;
    const item = this.add(
      id,
      tile,
      'keycard',
      KEYCARD_COLORS[level],
      () => `TAKE ${KEYCARD_LABELS[level]} KEYCARD`,
      () => {
        s.giveKeycard(level, notifyText);
        audio.play('pickup');
        this.d.interaction.unregister(id);
        item.remove();
        onTaken?.();
      },
    );
  }

  private build(): void {
    const { state: s, scene } = this.d;

    const cell = this.add('power-cell', ANCHORS.powerCell, 'pickup', COLORS.yellow, () => 'TAKE POWER CELL', () => {
      s.setFlag('hasPowerCell');
      audio.play('pickup');
      s.notify('POWER CELL ACQUIRED', 'success');
      s.completeObjective('m2-cell');
      this.d.interaction.unregister('power-cell');
      cell.remove();
      if (!s.hasFlag('medbayRestored')) s.setObjective(OBJECTIVES.returnCell);
    });

    this.add('medbay-terminal', ANCHORS.medbayTerminal, 'terminal', 0x22e0d0, () => (s.hasFlag('hasPowerCell') ? 'INSERT POWER CELL' : 'MEDBAY EMERGENCY TERMINAL'), () => {
      if (!s.hasFlag('hasPowerCell')) {
        audio.play('denied');
        s.notify('NO POWER — POWER CELL REQUIRED', 'danger');
        s.setObjective(OBJECTIVES.powerCell);
        return;
      }
      s.setFlag('medbayRestored');
      audio.play('power-up', 0.5);
      this.items.get('medbay-terminal')?.setDone(true);
      s.completeObjective('m2-medbay');
      s.log(LOGS.medbay.title, [...LOGS.medbay.lines], 0x22e0d0);
      scene.time.delayedCall(6500, () => {
        audio.play('door');
        s.notify('SECURITY KEYCARD EJECTED FROM TERMINAL', 'success');
        this.spawnKeycard('security', { x: ANCHORS.medbayTerminal.x + 1, y: ANCHORS.medbayTerminal.y + 1 }, 'SECURITY KEYCARD ACQUIRED', () => {
          s.completeObjective('m3-card');
          if (!s.hasFlag('tutorialKeycard')) {
            s.setFlag('tutorialKeycard');
            s.notify('KEYCARD ACQUIRED — USE IT AT MATCHING SECURITY DOORS.', 'info');
          }
        });
        s.setObjective(OBJECTIVES.security);
        s.say('DIVER', 'A keycard... and a warning.');
      });
    }, () => !s.hasFlag('medbayRestored'));

    this.add('crew-log', ANCHORS.crewLog, 'terminal', 0x5fb3a8, () => 'READ PERSONAL LOG', () => {
      audio.play('beep');
      s.log(LOGS.crew.title, [...LOGS.crew.lines], 0x5fb3a8);
    });

    this.add('security-terminal', ANCHORS.securityTerminal, 'terminal', COLORS.red, () => 'HACK SECURITY TERMINAL', () => {
      this.d.hacking.requestHack('SECURITY MAINFRAME', 2, (ok) => {
        if (!ok) return;
        s.setFlag('securityOnline');
        this.items.get('security-terminal')?.setDone(true);
        s.completeObjective('m3-terminal');
        s.notify('SECURITY OVERRIDE — DOOR CONTROL RESTORED', 'success');
        s.events.emit('cinematic', {
          kind: 'security-feeds',
          done: () => {
            s.log(LOGS.security.title, [...LOGS.security.lines], COLORS.red);
            s.setObjective(OBJECTIVES.generator);
            s.notify('CYBERDECK LINKED — PRESS TAB', 'info');
            s.say('DIVER', 'It was looking at the camera. It knows where I am.');
            audio.play('scrape', 0.35);
          },
        });
      });
    }, () => !s.hasFlag('securityOnline'));

    this.add('generator', ANCHORS.generator, 'switch', COLORS.yellow, () => 'ACTIVATE EMERGENCY GENERATOR', () => {
      this.d.power.setStage('generator');
      audio.play('power-up');
      this.items.get('generator')?.setDone(true);
      s.completeObjective('m2-generator');
      s.notify('EMERGENCY GENERATOR ONLINE — 35%', 'success');
      s.noise(this.d.player().x, this.d.player().y, 300, 'generator');
      s.setObjective(OBJECTIVES.route);
      s.say('DIVER', 'Power helps... but it wakes the whole place up. Watch those cables.');
    }, () => !s.hasFlag('generatorOn'));

    this.add('breaker', ANCHORS.breaker, 'switch', COLORS.yellow, () => (s.hasFlag('generatorOn') ? 'ROUTE POWER' : 'BREAKER PANEL // NO GENERATOR'), () => {
      if (!s.hasFlag('generatorOn')) {
        audio.play('denied');
        s.notify('NOTHING TO ROUTE — START THE EMERGENCY GENERATOR', 'danger');
        return;
      }
      this.d.hacking.requestHack('POWER ROUTING', 1, (ok) => {
        if (!ok) return;
        this.d.power.setStage('routed');
        this.items.get('breaker')?.setDone(true);
        s.completeObjective('m2-breaker');
        audio.play('power-up', 0.7);
        s.notify('POWER ROUTED TO CORE — 55%', 'success');
        s.setObjective(OBJECTIVES.cooling);
      });
    }, () => !s.hasFlag('powerRouted'));

    this.add('cooling', ANCHORS.cooling, 'switch', COLORS.cyan, () => (s.hasFlag('powerRouted') ? 'RESTORE COOLING' : 'COOLING VALVE // NO POWER'), () => {
      if (!s.hasFlag('powerRouted')) {
        audio.play('denied');
        s.notify('COOLING PUMPS HAVE NO POWER', 'danger');
        return;
      }
      this.d.power.setStage('cooling');
      this.items.get('cooling')?.setDone(true);
      s.completeObjective('m2-cooling');
      audio.play('vent');
      audio.play('power-up', 0.5);
      s.notify('COOLING RESTORED — 72%', 'success');
      s.setObjective(OBJECTIVES.restart);
    }, () => !s.hasFlag('coolingOn'));

    this.add('reactor', ANCHORS.reactor, 'console', COLORS.red, () => (s.hasFlag('coolingOn') ? 'RESTART THE FACILITY' : 'REACTOR // CORE TEMP CRITICAL'), () => {
      if (!s.hasFlag('coolingOn')) {
        audio.play('denied');
        s.notify('CORE TEMPERATURE CRITICAL — RESTORE COOLING FIRST', 'danger');
        return;
      }
      this.items.get('reactor')?.setDone(true);
      s.completeObjective('m2-reactor');
      this.restartFacility();
    }, () => !s.hasFlag('facilityPower'));

    this.add('server-terminal', ANCHORS.serverTerminal, 'terminal', COLORS.cyan, () => 'HACK RESEARCH ARCHIVE', () => {
      this.d.hacking.requestHack('RESEARCH ARCHIVE', 2, (ok) => {
        if (!ok) return;
        s.setFlag('serverData');
        this.items.get('server-terminal')?.setDone(true);
        s.log(LOGS.server.title, [...LOGS.server.lines], COLORS.cyan);
        scene.time.delayedCall(4000, () => {
          this.spawnKeycard('research', { x: ANCHORS.serverTerminal.x + 1, y: ANCHORS.serverTerminal.y + 1 }, 'RESEARCH KEYCARD ACQUIRED', () => s.completeObjective('m4-data'));
          s.setObjective(OBJECTIVES.lab);
          s.say('DIVER', 'A-3... That thing IS the project.');
        });
      });
    }, () => !s.hasFlag('serverData'));

    this.add('lab-terminal', ANCHORS.labTerminal, 'terminal', COLORS.green, () => (s.hasFlag('serverData') ? 'READ RESEARCH JOURNAL' : 'RESEARCH JOURNAL // ENCRYPTED'), () => {
      if (!s.hasFlag('serverData')) {
        audio.play('denied');
        s.notify('ENCRYPTED — RESEARCH CLEARANCE REQUIRED', 'danger');
        return;
      }
      s.setFlag('labLog');
      this.items.get('lab-terminal')?.setDone(true);
      s.completeObjective('m4-lab');
      s.log(LOGS.lab.title, [...LOGS.lab.lines], COLORS.green);
      scene.time.delayedCall(5000, () => s.setObjective(OBJECTIVES.aquarium));
    }, () => !s.hasFlag('labLog'));

    const tank = (key: keyof typeof TANKS, anchor: { x: number; y: number }): void => {
      this.add(`tank-${key}`, anchor, 'tank', COLORS.blue, () => `INSPECT ${TANKS[key].label}`, () => {
        audio.play('beep');
        s.notify(`${TANKS[key].label} // ${TANKS[key].status}`, key === 'a04' ? 'warning' : 'info');
        this.tanksSeen.add(key);
        if (key === 'a03') {
          s.say('DIVER', 'The glass bent outward. It broke out from the inside.');
          s.completeObjective('m5-breach');
        }
        if (key === 'a04') this.tankTease(anchor);
        if (this.tanksSeen.has('a04') && this.tanksSeen.size >= 2 && !s.hasFlag('aquariumSeen')) {
          s.setFlag('aquariumSeen');
          scene.time.delayedCall(2500, () => s.setObjective(OBJECTIVES.wing));
        }
      });
    };
    tank('a01', ANCHORS.tankA01);
    tank('a02', ANCHORS.tankA02);
    tank('a03', ANCHORS.tankA03);
    tank('a04', ANCHORS.tankA04);

    this.add('wing-terminal', ANCHORS.wingTerminal, 'terminal', COLORS.purple, () => 'HACK CONTAINMENT CONTROL', () => {
      this.d.hacking.requestHack('CONTAINMENT CONTROL', 3, (ok) => {
        if (!ok) return;
        s.setFlag('upperKey');
        this.items.get('wing-terminal')?.setDone(true);
        s.log(LOGS.wing.title, [...LOGS.wing.lines], COLORS.purple);
        this.spawnKeycard('experiment', { x: ANCHORS.wingTerminal.x + 1, y: ANCHORS.wingTerminal.y + 1 }, 'EXPERIMENT KEYCARD ACQUIRED', () => s.completeObjective('m5-card'));
        s.setObjective(OBJECTIVES.returnDoor);
        s.say('DIVER', 'It made something else in here. I need to get back to the Hub.');
        const now = scene.time.now;
        const p = this.d.player();
        audio.play('roar');
        s.notify('THE FACILITY IS ITS TERRITORY', 'a3');
        this.d.lighting.setRoomLights('wing', false, now, 15000);
        this.d.doors.sealNear(p.x, p.y, 420, 'A-3', now, 5000);
        const o = this.d.threat.octopus;
        if (o) o.brain.hunt(p.x, p.y, now);
        else this.d.threat.spawn(W({ x: 85, y: 12 }).x, W({ x: 85, y: 12 }).y, { hunt: true });
      });
    }, () => !s.hasFlag('upperKey'));

    this.add('hub-terminal', ANCHORS.hubCenter, 'console', COLORS.magenta, () => 'ACCESS CENTRAL NETWORK RELAY', () => {
      this.d.hacking.requestHack('CENTRAL NETWORK RELAY', 2, (ok) => {
        if (!ok) return;
        s.setFlag('hubRelayDone');
        this.items.get('hub-terminal')?.setDone(true);
        s.notify('UPPER FACILITY ACCESS CODE RECOVERED', 'success');
        this.spawnKeycard('upper', { x: ANCHORS.hubCenter.x + 1, y: ANCHORS.hubCenter.y + 1 }, 'UPPER FACILITY ACCESS ACQUIRED', () => s.completeObjective('m6-card'));
      });
    }, () => s.hasKeycard('experiment') && !s.hasFlag('hubRelayDone'));

    this.add('evac-terminal', ANCHORS.evacTerminal, 'console', COLORS.red, () => 'ACTIVATE EVACUATION CONTROL', () => this.finalReveal(), () => s.hasFlag('inUpperFacility') && !s.hasFlag('finalReveal'));

    this.add('airlock-release', ANCHORS.airlockRelease, 'console', COLORS.cyan, () => 'HOLD [E] — EMERGENCY RELEASE', () => undefined, () => s.hasFlag('finalReveal') && !s.hasFlag('escaped'));

    for (const vent of VENTS) {
      const go = (from: 'a' | 'b'): void => {
        const exit = W(from === 'a' ? vent.b : vent.a);
        audio.play('vent');
        s.player.hidden = true;
        this.d.adaptive.record('vent');
        this.d.player().setFrozen(true);
        scene.cameras.main.fadeOut(260, 0, 0, 0);
        scene.time.delayedCall(420, () => {
          this.d.teleportPlayer(exit.x, exit.y + 20);
          scene.cameras.main.fadeIn(300, 0, 0, 0);
          this.d.player().setFrozen(false);
          s.player.hidden = false;
          this.d.threat.ventUsed(exit.x, exit.y, scene.time.now);
        });
      };
      this.add(`${vent.id}-a`, vent.a, 'vent', 0x6d8196, () => 'CRAWL INTO VENT', () => go('a'));
      this.add(`${vent.id}-b`, vent.b, 'vent', 0x6d8196, () => 'CRAWL INTO VENT', () => go('b'));
    }

    for (const station of EMP_STATIONS) {
      let used = false;
      const item = this.add(station.id, station, 'emp', COLORS.cyan, () => 'TAKE EMP CHARGE', () => {
        if (!s.addEmp(1)) {
          s.notify('EMP CHARGES FULL', 'warning');
          return;
        }
        used = true;
        audio.play('pickup');
        s.notify('EMP CHARGE +1  [Q] TO FIRE', 'success');
        item.setDone(true);
      }, () => !used);
    }

    FOOD_SPOTS.forEach((spot, i) => {
      const id = `food-${i}`;
      const item = this.add(id, spot, 'food', COLORS.green, () => 'TAKE RATION PACK  (+10% HEALTH)', () => {
        const amount = Math.round(s.player.maxHealth * 0.1);
        s.heal(amount);
        audio.play('pickup');
        s.notify(`RATION PACK — +${amount} HEALTH`, 'success');
        this.d.interaction.unregister(id);
        item.remove();
      }, () => s.player.health < s.player.maxHealth);
    });
  }

  private tankTease(anchor: { x: number; y: number }): void {
    const { scene, state: s } = this.d;
    const p = W(anchor);
    const shape = scene.add.image(p.x - 50, p.y, TEXTURES.octopus).setScale(0.16).setTint(0x000000).setAlpha(0).setDepth(13);
    scene.tweens.add({ targets: shape, alpha: 0.85, x: p.x - 20, duration: 700, yoyo: true, hold: 500, onComplete: () => shape.destroy() });
    scene.time.delayedCall(500, () => {
      audio.play('impact', 0.4);
      scene.cameras.main.shake(200, 0.003);
    });
    s.say('DIVER', 'Something moved in there.');
  }

  private restartFacility(): void {
    const { scene, state: s, lighting } = this.d;
    this.d.power.setStage('online');
    audio.play('click');
    audio.play('power-up');
    s.events.emit('screen-fx', { kind: 'flash', duration: 700 });
    s.notify('MAIN FACILITY POWER RESTORED — 100%', 'success');
    scene.time.delayedCall(900, () => s.notify('DOORS · CAMERAS · SERVERS · AQUARIUM ONLINE', 'info'));
    s.setObjective(OBJECTIVES.server);

    scene.time.delayedCall(3200, () => {
      audio.setAmbienceVolume(0, 0.4);
      s.say('DIVER', '...It\'s too quiet.');
    });
    scene.time.delayedCall(5600, () => {
      audio.play('scrape', 1);
      scene.cameras.main.shake(400, 0.003);
      const order = ['entrance', 'crew', 'storage', 'medbay', 'hub', 'maintenance'];
      order.forEach((room, i) => {
        scene.time.delayedCall(i * 380, () => {
          lighting.setRoomLights(room, false, scene.time.now, 26000);
          audio.play('click', 0.35);
        });
      });
    });
    scene.time.delayedCall(8200, () => {
      audio.setAmbienceVolume(1, 1.5);
      const hub = W(ANCHORS.hubCenter);
      this.d.threat.spawn(hub.x, hub.y, { hunt: true });
      s.notify('A-3 IS AWAKE — IT IS HUNTING YOU', 'danger');
      s.say('DIVER', 'The lights behind me... it\'s coming. RUN.');
      s.setObjective(OBJECTIVES.survive);
      scene.time.delayedCall(30000, () => {
        if (!s.hasFlag('serverData')) s.setObjective(OBJECTIVES.server);
      });
    });
  }

  private startFinalChase(): void {
    const { scene, state: s } = this.d;
    s.setFlag('inUpperFacility');
    s.completeObjective('m7-upper');
    s.setObjective(OBJECTIVES.upper);
    scene.time.delayedCall(1400, () => {
      audio.play('alarm');
      s.finalChase = true;
      s.notify('INTRUDER DETECTED — FACILITY LOCKDOWN', 'danger');
      s.events.emit('screen-fx', { kind: 'red', duration: 900 });
      scene.time.delayedCall(2600, () => {
        const spawn = W({ x: 7, y: 27 });
        this.d.threat.spawn(spawn.x, spawn.y, { hunt: true, final: true });
        audio.play('roar');
        s.say('DIVER', 'It followed me up. GO!');
      });
    });
  }

  private finalReveal(): void {
    const { scene, state: s } = this.d;
    audio.play('granted');
    s.notify('ACCESS GRANTED — EXIT SEQUENCE INITIATED', 'success');
    s.completeObjective('m7-chase');
    s.events.emit('cinematic', {
      kind: 'final-reveal',
      done: () => {
        s.setFlag('finalReveal');
        this.d.lighting.permanentBlackout = true;
        this.d.doors.getDoor('door-final-airlock')?.open();
        s.setObjective(OBJECTIVES.escape);
        audio.play('impact');
        scene.cameras.main.shake(500, 0.008);
        // A beat of warning before it actually appears — control just returned to the player,
        // spawning it hunting at full speed in the same instant was an unavoidable ambush.
        s.notify('NETWORK OVERRIDE — SOMETHING IS COMING', 'a3');
        scene.time.delayedCall(2200, () => {
          const spawn = W({ x: 4, y: 39 });
          this.d.threat.spawn(spawn.x, spawn.y, { hunt: true, final: true });
          audio.play('roar');
          s.notify('A-3 IS HERE — RUN FOR THE AIRLOCK!', 'danger');
        });
      },
    });
  }

  update(dt: number, now: number): void {
    const s = this.d.state;
    const p = this.d.player();
    if (!s.hasFlag('inUpperFacility') && s.hasFlag('upperUnlocked') && p.y > 37.5 * TILE_SIZE && p.x < 15 * TILE_SIZE) {
      this.startFinalChase();
    }

    if (!s.hasFlag('finalReveal') || s.hasFlag('escaped')) return;
    const inChamber = p.y > 52 * TILE_SIZE && p.x > 15 * TILE_SIZE && p.x < 21 * TILE_SIZE;
    if (inChamber && !this.grabbed) {
      this.grabbed = true;
      s.completeObjective('m7-airlock');
      const door = this.d.doors.getDoor('door-final-airlock');
      const o = this.d.threat.octopus;
      if (door && o) {
        o.brain.grab(door.x, door.y - 42);
        o.setGrabTarget({ x: door.x, y: door.y });
      }
      audio.play('roar');
      audio.play('impact');
      this.d.scene.cameras.main.shake(600, 0.01);
      s.notify('IT HAS THE DOOR — EMERGENCY RELEASE!', 'danger');
      s.setObjective(OBJECTIVES.release);
    }
    if (!inChamber || this.escaping) return;

    const target = this.items.get('airlock-release');
    const near = target ? Phaser.Math.Distance.Between(p.x, p.y, target.x, target.y) < 70 : false;
    if (near && this.d.interactKey.isDown) {
      this.holdProgress = Math.min(1, this.holdProgress + dt / 1.5);
      if (Math.random() < 0.1) this.d.scene.cameras.main.shake(120, 0.004);
    } else {
      this.holdProgress = Math.max(0, this.holdProgress - dt * 0.8);
    }
    s.events.emit('hold-progress', { label: 'EMERGENCY RELEASE', progress: this.holdProgress });
    if (this.holdProgress >= 1) this.escape(now);
  }

  private escape(now: number): void {
    const { scene, state: s } = this.d;
    this.escaping = true;
    s.setFlag('escaped');
    s.completeObjective('m7-escape');
    s.events.emit('hold-progress', { label: '', progress: 0 });
    const door = this.d.doors.getDoor('door-final-airlock');
    door?.seal('PLAYER', now, 9999999);
    audio.play('impact');
    audio.play('roar');
    scene.cameras.main.shake(700, 0.012);
    s.events.emit('screen-fx', { kind: 'flash', duration: 500 });
    s.notify('AIRLOCK SEALED — A-3 SEPARATED', 'success');
    this.d.threat.octopus?.setGrabTarget(null);
    scene.time.delayedCall(700, () => this.d.threat.despawn());
    scene.time.delayedCall(1500, () => {
      audio.play('splash');
      s.notify('FLOODING CHAMBER — OUTER DOOR OPENING', 'info');
    });
    scene.time.delayedCall(3800, () => this.d.onEscape());
  }

  debugRestorePower(): void {
    this.d.state.setFlag('securityOnline');
    this.d.power.setStage('online');
  }

  debugFinalChase(): void {
    const s = this.d.state;
    (['hasPowerCell', 'medbayRestored', 'securityOnline', 'serverData', 'labLog', 'aquariumSeen', 'upperKey', 'upperUnlocked'] as const).forEach((f) => s.setFlag(f));
    this.d.power.setStage('online');
    s.giveKeycard('security');
    s.giveKeycard('research');
    s.giveKeycard('experiment');
    s.giveKeycard('upper');
    for (let i = 0; i < MISSIONS.length - 1; i++) {
      for (const o of MISSIONS[i].objectives) s.completeObjective(o.id);
    }
    const entry = W(ANCHORS.upperEntry);
    this.d.teleportPlayer(entry.x, entry.y);
  }

  destroy(): void {
    this.offs.forEach((off) => off());
  }
}
