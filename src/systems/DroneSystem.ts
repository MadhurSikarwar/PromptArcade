import Phaser from 'phaser';
import type { DroneWorld } from '../ai/DroneAI';
import { Drone } from '../entities/Drone';
import type { DroneRoute } from '../map/MapData';
import { COLORS, DEPTH, TILE_SIZE } from '../utils/Constants';
import type { AlertSystem } from './AlertSystem';
import { audio } from './AudioManager';
import { getDifficultyTuning } from './Difficulty';
import type { GameState } from './GameState';
import type { ThreatSystem } from './ThreatSystem';

export interface DroneDeps {
  alert: AlertSystem;
  threat: ThreatSystem;
  los: (x0: number, y0: number, x1: number, y1: number) => boolean;
  player: () => { x: number; y: number };
}

interface Tracer {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  until: number;
}

const W = (t: { x: number; y: number }): { x: number; y: number } => ({ x: t.x * TILE_SIZE + TILE_SIZE / 2, y: t.y * TILE_SIZE + TILE_SIZE / 2 });
const TRACER_MS = 140;
const BASE_FIRE_DAMAGE = 5;

/** Owns every patrol drone: a secondary threat that flags the player to A-3 and, once alerted, fires light-damage shots. */
export class DroneSystem {
  private readonly drones: Drone[] = [];
  private readonly tracers: Tracer[] = [];
  private readonly tracerGfx: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private readonly state: GameState,
    routes: readonly DroneRoute[],
    private readonly deps: DroneDeps,
  ) {
    this.tracerGfx = scene.add.graphics().setDepth(DEPTH.aboveDark).setBlendMode(Phaser.BlendModes.ADD);

    const world: DroneWorld = {
      los: (a, b, c, d) => deps.los(a, b, c, d),
      playerHidden: () => this.state.player.hidden || !this.state.player.alive,
      onSpotted: (px, py, now) => this.onSpotted(px, py, now),
      onFire: (fromX, fromY, toX, toY, now) => this.onFire(fromX, fromY, toX, toY, now),
    };

    for (const route of routes) {
      const waypoints = route.waypoints.map(W);
      const start = waypoints[0] ?? { x: 0, y: 0 };
      this.drones.push(new Drone(scene, world, waypoints, start.x, start.y));
    }
  }

  get count(): number {
    return this.drones.length;
  }

  get alertCount(): number {
    return this.drones.filter((d) => d.brain.state === 'ALERT').length;
  }

  private onSpotted(px: number, py: number, now: number): void {
    if (this.state.finalChase) return;
    audio.play('alarm', 0.35);
    this.state.notify('DRONE CONTACT — YOUR POSITION IS FLAGGED', 'danger');
    this.deps.alert.add(22);
    this.deps.threat.droneSighting(px, py, now);
  }

  private onFire(fromX: number, fromY: number, toX: number, toY: number, now: number): void {
    if (!this.state.player.alive) return;
    audio.play('zap', 0.8);
    const damage = Math.round(BASE_FIRE_DAMAGE * getDifficultyTuning().damageMult);
    this.state.damagePlayer(damage, 'DRONE FIRE', now);
    this.state.events.emit('screen-fx', { kind: 'red', duration: 180 });
    this.tracers.push({ fromX, fromY, toX, toY, until: now + TRACER_MS });
  }

  /** EMP and hacking both disable every drone in range — same pattern as cameras/hazards. */
  disableNear(x: number, y: number, radius: number, now: number, ms: number): number {
    let count = 0;
    for (const drone of this.drones) {
      if (Phaser.Math.Distance.Between(x, y, drone.x, drone.y) <= radius) {
        drone.brain.disable(now, ms);
        count++;
      }
    }
    return count;
  }

  disableAll(now: number, ms: number): void {
    for (const drone of this.drones) drone.brain.disable(now, ms);
  }

  update(dt: number, now: number): void {
    const p = this.deps.player();
    for (const drone of this.drones) drone.update(dt, now, p.x, p.y);
    this.renderTracers(now);
  }

  private renderTracers(now: number): void {
    const g = this.tracerGfx;
    g.clear();
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tracer = this.tracers[i];
      if (now >= tracer.until) {
        this.tracers.splice(i, 1);
        continue;
      }
      const alpha = (tracer.until - now) / TRACER_MS;
      g.lineStyle(2.4, COLORS.red, alpha * 0.9);
      g.lineBetween(tracer.fromX, tracer.fromY, tracer.toX, tracer.toY);
      g.lineStyle(1, 0xffffff, alpha * 0.7);
      g.lineBetween(tracer.fromX, tracer.fromY, tracer.toX, tracer.toY);
    }
  }

  destroy(): void {
    this.tracerGfx.destroy();
    for (const drone of this.drones) drone.destroy();
  }
}
