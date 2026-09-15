import Phaser from 'phaser';
import { Door } from '../entities/Door';
import type { DoorLayout } from '../map/MapData';
import type { GameState } from './GameState';

export class DoorSystem {
  readonly doors: Door[];
  private readonly byId = new Map<string, Door>();

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
    for (const door of this.doors) this.byId.set(door.id, door);
  }

  get blockers(): Phaser.GameObjects.Zone[] {
    return this.doors.map((door) => door.blocker);
  }

  getDoor(id: string): Door | undefined {
    return this.byId.get(id);
  }
}
