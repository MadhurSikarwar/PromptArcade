import Phaser from 'phaser';
import type { GameState } from '../systems/GameState';
import { COLORS, GAME_WIDTH, RADAR_RANGE } from '../utils/Constants';
import { uiText } from './UIKit';

const MARGIN = 20;
const R = 34;
const CX = GAME_WIDTH - MARGIN - R - 12;
const CY = MARGIN + 104 + 12 + R;

/** Small always-on radar: a blip appears once A-3 is within RADAR_RANGE, brighter and faster the closer it gets. */
export class RadarUI {
  private readonly gfx: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private readonly state: GameState,
  ) {
    this.gfx = scene.add.graphics();
    uiText(scene, CX, CY - R - 12, 'A-3 RADAR', 9, '#6f97a8').setOrigin(0.5, 1);
  }

  update(time: number): void {
    const g = this.gfx;
    g.clear();

    g.fillStyle(0x03080d, 0.62);
    g.fillCircle(CX, CY, R);
    g.lineStyle(1, COLORS.magenta, 0.5);
    g.strokeCircle(CX, CY, R);
    g.lineStyle(1, COLORS.magenta, 0.18);
    g.strokeCircle(CX, CY, R * 0.6);

    g.fillStyle(COLORS.cyan, 0.9);
    g.fillCircle(CX, CY, 2.5);

    const o = this.state.octopus;
    if (!o.spawned || o.distance > RADAR_RANGE) return;

    const dx = o.x - this.state.player.x;
    const dy = o.y - this.state.player.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const ratio = Phaser.Math.Clamp(o.distance / RADAR_RANGE, 0, 1);
    const bx = CX + (dx / dist) * R * (1 - ratio) * 0.92;
    const by = CY + (dy / dist) * R * (1 - ratio) * 0.92;

    const closeness = 1 - ratio;
    const pulseSpeed = 0.006 + closeness * 0.02;
    const pulse = 0.55 + Math.sin(time * pulseSpeed) * 0.45;
    const color = closeness > 0.7 ? COLORS.red : closeness > 0.35 ? COLORS.yellow : COLORS.green;
    const blipSize = 3 + closeness * 3;

    g.fillStyle(color, 0.25 + pulse * 0.35);
    g.fillCircle(bx, by, blipSize + 4 * pulse);
    g.fillStyle(color, 0.9);
    g.fillCircle(bx, by, blipSize);
  }
}
