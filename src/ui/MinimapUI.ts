import Phaser from 'phaser';
import { ROOMS } from '../data/rooms';
import { MAP_HEIGHT, MAP_WIDTH, ROOM_LAYOUTS } from '../map/MapData';
import type { GameState } from '../systems/GameState';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from '../utils/Constants';
import { drawPanel, uiText } from './UIKit';

interface Layout {
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
}

const WORLD_W = MAP_WIDTH * TILE_SIZE;
const WORLD_H = MAP_HEIGHT * TILE_SIZE;

function makeLayout(x: number, y: number, w: number, h: number): Layout {
  return { x, y, w, h, scale: Math.min((w - 10) / WORLD_W, (h - 10) / WORLD_H) };
}

const SMALL = makeLayout(GAME_WIDTH - 20 - 150, 214, 150, 90);
const LARGE = makeLayout((GAME_WIDTH - 460) / 2, (GAME_HEIGHT - 280) / 2, 460, 280);

/** Small always-on minimap; [M] expands it to a larger centered view. */
export class MinimapUI {
  private readonly smallGroup: Phaser.GameObjects.Container;
  private readonly largeGroup: Phaser.GameObjects.Container;
  private readonly smallDots: Phaser.GameObjects.Graphics;
  private readonly largeDots: Phaser.GameObjects.Graphics;
  private expanded = false;

  constructor(
    scene: Phaser.Scene,
    private readonly state: GameState,
  ) {
    this.smallDots = scene.add.graphics();
    this.largeDots = scene.add.graphics();
    this.smallGroup = this.buildLayer(scene, SMALL, this.smallDots, false).setDepth(400);
    this.largeGroup = this.buildLayer(scene, LARGE, this.largeDots, true).setDepth(950).setVisible(false);
  }

  private buildLayer(scene: Phaser.Scene, layout: Layout, dots: Phaser.GameObjects.Graphics, big: boolean): Phaser.GameObjects.Container {
    const children: Phaser.GameObjects.GameObject[] = [];
    if (big) {
      const shade = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x010204, 0.85).setOrigin(0);
      children.push(shade);
    }
    const panel = scene.add.graphics();
    drawPanel(panel, layout.x, layout.y, layout.w, layout.h, COLORS.cyan);
    children.push(panel);

    const rooms = scene.add.graphics();
    children.push(rooms);
    const labels: Phaser.GameObjects.Text[] = [];
    for (const r of ROOM_LAYOUTS) {
      const rx = layout.x + 5 + r.rect.x * TILE_SIZE * layout.scale;
      const ry = layout.y + 5 + r.rect.y * TILE_SIZE * layout.scale;
      const rw = Math.max(1, r.rect.w * TILE_SIZE * layout.scale);
      const rh = Math.max(1, r.rect.h * TILE_SIZE * layout.scale);
      rooms.fillStyle(COLORS.steel, big ? 0.35 : 0.28);
      rooms.fillRect(rx, ry, rw, rh);
      if (big) {
        rooms.lineStyle(1, COLORS.cyan, 0.2);
        rooms.strokeRect(rx, ry, rw, rh);
        if (rw > 26 && rh > 16) {
          const label = uiText(scene, rx + rw / 2, ry + rh / 2, ROOMS[r.id].name, 8, '#bfe6f2').setOrigin(0.5).setAlpha(0.85);
          label.setWordWrapWidth(rw - 2, true);
          labels.push(label);
        }
      }
    }
    children.push(...labels, dots);

    if (big) children.push(uiText(scene, layout.x + layout.w - 10, layout.y - 20, '[M] CLOSE MAP', 12, '#6f97a8').setOrigin(1, 0));

    return scene.add.container(0, 0, children);
  }

  toggle(): void {
    this.expanded = !this.expanded;
    this.smallGroup.setVisible(!this.expanded);
    this.largeGroup.setVisible(this.expanded);
  }

  update(): void {
    this.smallDots.clear();
    this.largeDots.clear();
    const layout = this.expanded ? LARGE : SMALL;
    const g = this.expanded ? this.largeDots : this.smallDots;
    const r = this.expanded ? 4 : 2.5;

    const px = layout.x + 5 + this.state.player.x * layout.scale;
    const py = layout.y + 5 + this.state.player.y * layout.scale;
    g.fillStyle(COLORS.cyan, 1);
    g.fillCircle(px, py, r);

    const o = this.state.octopus;
    if (o.spawned) {
      const ox = layout.x + 5 + o.x * layout.scale;
      const oy = layout.y + 5 + o.y * layout.scale;
      g.fillStyle(COLORS.magenta, 0.9);
      g.fillCircle(ox, oy, r * 0.9);
    }
  }
}
