import Phaser from 'phaser';
import { Door, type SealSource } from '../entities/Door';
import type { DoorLayout } from '../map/MapData';
import type { GameState } from './GameState';

export class DoorSystem {
  readonly doors: Door[];
  private readonly byId = new Map<string, Door>();
  private readonly byTile = new Map<number, Door>();
  private readonly unsubscribe: (() => void)[] = [];

  constructor(
    scene: Phaser.Scene,
    state: GameState,
    layouts: readonly DoorLayout[],
    getPlayerBody: () => Phaser.Physics.Arcade.Body,
  ) {
    const isObstructed = (doorBounds: Phaser.Geom.Rectangle): boolean => {
      const body = getPlayerBody();
      const playerBounds = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
      return Phaser.Geom.Intersects.RectangleToRectangle(doorBounds, playerBounds);
    };

    this.doors = layouts.map((layout) => new Door(scene, layout, state, isObstructed));
    for (const door of this.doors) {
      this.byId.set(door.id, door);
      for (const tile of door.tiles) this.byTile.set(tile.y * 1000 + tile.x, door);
    }

    this.unsubscribe.push(state.events.on('flag-set', () => this.refreshAll()));
    this.unsubscribe.push(state.events.on('keycard-acquired', () => this.refreshAll()));
  }

  get blockers(): Phaser.GameObjects.Zone[] {
    return this.doors.map((door) => door.blocker);
  }

  getDoor(id: string): Door | undefined {
    return this.byId.get(id);
  }

  doorAtTile(tx: number, ty: number): Door | undefined {
    return this.byTile.get(ty * 1000 + tx);
  }

  refreshAll(): void {
    for (const door of this.doors) door.refresh();
  }

  update(now: number): void {
    for (const door of this.doors) door.update(now);
  }

  nearestDoor(x: number, y: number, maxDistance: number, filter: (door: Door) => boolean): Door | null {
    let best: Door | null = null;
    let bestDistance = maxDistance;
    for (const door of this.doors) {
      if (!filter(door)) continue;
      const d = Phaser.Math.Distance.Between(x, y, door.x, door.y);
      if (d < bestDistance) {
        best = door;
        bestDistance = d;
      }
    }
    return best;
  }

  sealNear(x: number, y: number, radius: number, source: SealSource, now: number, duration: number): number {
    let count = 0;
    for (const door of this.doors) {
      if (Phaser.Math.Distance.Between(x, y, door.x, door.y) > radius) continue;
      if (door.doorState === 'DISABLED') continue;
      if (door.seal(source, now, duration)) count++;
    }
    return count;
  }

  destroy(): void {
    this.unsubscribe.forEach((off) => off());
  }
}
