import Phaser from 'phaser';
import type { DroneWorld } from '../ai/DroneAI';
import { Drone } from '../entities/Drone';
import type { DroneRoute } from '../map/MapData';
import { TILE_SIZE } from '../utils/Constants';
import type { AlertSystem } from './AlertSystem';
import { audio } from './AudioManager';
import type { GameState } from './GameState';
import type { ThreatSystem } from './ThreatSystem';

export interface DroneDeps {
  alert: AlertSystem;
  threat: ThreatSystem;
  los: (x0: number, y0: number, x1: number, y1: number) => boolean;
  player: () => { x: number; y: number };
}

const W = (t: { x: number; y: number }): { x: number; y: number } => ({ x: t.x * TILE_SIZE + TILE_SIZE / 2, y: t.y * TILE_SIZE + TILE_SIZE / 2 });

/** Owns every patrol drone: simple secondary threat that feeds the alert system and A-3, never attacks directly. */
export class DroneSystem {
  private readonly drones: Drone[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly state: GameState,
    routes: readonly DroneRoute[],
    private readonly deps: DroneDeps,
  ) {
    const world: DroneWorld = {
      los: (a, b, c, d) => deps.los(a, b, c, d),
      playerHidden: () => this.state.player.hidden || !this.state.player.alive,
      onSpotted: (px, py, now) => this.onSpotted(px, py, now),
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
  }

  destroy(): void {
    for (const drone of this.drones) drone.destroy();
  }
}
