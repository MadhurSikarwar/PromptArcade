import Phaser from 'phaser';
import type { FloodLayout, HazardLayout } from '../map/MapData';
import type { GameState } from '../systems/GameState';
import { COLORS, DEPTH, TILE_SIZE } from '../utils/Constants';

export class ElectricHazard {
  readonly bounds: Phaser.Geom.Rectangle;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private surgeUntil = 0;
  private disabledUntil = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly layout: HazardLayout,
    private readonly state: GameState,
  ) {
    const r = layout.rect;
    this.bounds = new Phaser.Geom.Rectangle(r.x * TILE_SIZE, r.y * TILE_SIZE, r.w * TILE_SIZE, r.h * TILE_SIZE);
    this.gfx = scene.add.graphics().setDepth(DEPTH.aboveDark);
  }

  get id(): string {
    return this.layout.id;
  }

  isArmed(): boolean {
    return this.state.hasFlag(this.layout.activeFlag);
  }

  isLive(now: number): boolean {
    if (!this.isArmed() || now < this.disabledUntil) return false;
    if (now < this.surgeUntil) return true;
    return (now % 3000) < 1500;
  }

  surge(now: number, ms: number): void {
    this.surgeUntil = now + ms;
  }

  disable(now: number, ms: number): void {
    this.disabledUntil = now + ms;
  }

  update(now: number): void {
    const g = this.gfx;
    g.clear();
    if (!this.isArmed()) return;
    const b = this.bounds;
    const live = this.isLive(now);
    const warning = !live && now >= this.disabledUntil && (now % 3000) > 2400;
    g.lineStyle(1, COLORS.yellow, live ? 0.7 : warning ? 0.6 : 0.22);
    g.strokeRect(b.x + 2, b.y + 2, b.width - 4, b.height - 4);
    if (!live) return;
    g.fillStyle(COLORS.yellow, 0.07);
    g.fillRect(b.x, b.y, b.width, b.height);
    const bolts = now < this.surgeUntil ? 7 : 4;
    for (let i = 0; i < bolts; i++) {
      g.lineStyle(i % 2 ? 1 : 2, i % 3 === 0 ? COLORS.cyan : 0xfff3a0, 0.9);
      let x = b.x + Math.random() * b.width;
      let y = b.y;
      g.beginPath();
      g.moveTo(x, y);
      while (y < b.bottom) {
        y += 8 + Math.random() * 14;
        x = Phaser.Math.Clamp(x + (Math.random() - 0.5) * 22, b.x, b.right);
        g.lineTo(x, Math.min(y, b.bottom));
      }
      g.strokePath();
    }
  }
}

export class FloodZone {
  readonly bounds: Phaser.Geom.Rectangle;
  private readonly gfx: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private readonly layout: FloodLayout,
    private readonly state: GameState,
  ) {
    const r = layout.rect;
    this.bounds = new Phaser.Geom.Rectangle(r.x * TILE_SIZE, r.y * TILE_SIZE, r.w * TILE_SIZE, r.h * TILE_SIZE);
    this.gfx = scene.add.graphics().setDepth(DEPTH.hazards);
  }

  isActive(): boolean {
    return !this.layout.activeFlag || this.state.hasFlag(this.layout.activeFlag);
  }

  update(now: number): void {
    const g = this.gfx;
    g.clear();
    if (!this.isActive()) return;
    const b = this.bounds;
    g.fillStyle(0x1f7bff, 0.16);
    g.fillRect(b.x, b.y, b.width, b.height);
    g.lineStyle(1, 0x7fd8ff, 0.22);
    for (let row = 0; row < b.height; row += 18) {
      g.beginPath();
      for (let col = 0; col <= b.width; col += 16) {
        const y = b.y + row + 6 + Math.sin(now * 0.002 + col * 0.05 + row) * 3;
        if (col === 0) g.moveTo(b.x + col, y);
        else g.lineTo(b.x + col, y);
      }
      g.strokePath();
    }
  }
}
