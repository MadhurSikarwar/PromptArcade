import Phaser from 'phaser';
import { MAP_HEIGHT, MAP_WIDTH, ROOM_LAYOUTS } from '../map/MapData';
import type { GameState } from '../systems/GameState';
import { COLORS, GAME_WIDTH, TILE_SIZE } from '../utils/Constants';
import { drawPanel } from './UIKit';

const W = 150;
const H = 90;
const X = GAME_WIDTH - 20 - W;
const Y = 214;
const WORLD_W = MAP_WIDTH * TILE_SIZE;
const WORLD_H = MAP_HEIGHT * TILE_SIZE;
const SCALE = Math.min((W - 10) / WORLD_W, (H - 10) / WORLD_H);

/** Small static room-layout minimap with a live player (and A-3, when spawned) dot. */
export class MinimapUI {
  private readonly dots: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, private readonly state: GameState) {
    const bg = scene.add.graphics();
    drawPanel(bg, X, Y, W, H, COLORS.cyan);
    const rooms = scene.add.graphics();
    for (const r of ROOM_LAYOUTS) {
      const rx = X + 5 + r.rect.x * TILE_SIZE * SCALE;
      const ry = Y + 5 + r.rect.y * TILE_SIZE * SCALE;
      const rw = Math.max(1, r.rect.w * TILE_SIZE * SCALE);
      const rh = Math.max(1, r.rect.h * TILE_SIZE * SCALE);
      rooms.fillStyle(COLORS.steel, 0.28);
      rooms.fillRect(rx, ry, rw, rh);
    }
    this.dots = scene.add.graphics();
  }

  update(): void {
    const g = this.dots;
    g.clear();
    const px = X + 5 + this.state.player.x * SCALE;
    const py = Y + 5 + this.state.player.y * SCALE;
    g.fillStyle(COLORS.cyan, 1);
    g.fillCircle(px, py, 2.5);

    const o = this.state.octopus;
    if (o.spawned) {
      const ox = X + 5 + o.x * SCALE;
      const oy = Y + 5 + o.y * SCALE;
      g.fillStyle(COLORS.magenta, 0.9);
      g.fillCircle(ox, oy, 2.2);
    }
  }
}
