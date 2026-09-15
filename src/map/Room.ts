import Phaser from 'phaser';
import { ZONE_NAMES, type RoomInfo } from '../data/rooms';
import { TILE_SIZE } from '../utils/Constants';
import type { FloorStyle, TileRect } from './MapData';

export class Room {
  readonly bounds: Phaser.Geom.Rectangle;

  constructor(
    readonly info: RoomInfo,
    readonly rect: TileRect,
    readonly floor: FloorStyle,
  ) {
    this.bounds = new Phaser.Geom.Rectangle(rect.x * TILE_SIZE, rect.y * TILE_SIZE, rect.w * TILE_SIZE, rect.h * TILE_SIZE);
  }

  get id(): string {
    return this.info.id;
  }

  get zoneName(): string {
    return ZONE_NAMES[this.info.zone];
  }

  get centerX(): number {
    return this.bounds.centerX;
  }

  get centerY(): number {
    return this.bounds.centerY;
  }

  contains(x: number, y: number): boolean {
    return this.bounds.contains(x, y);
  }
}
