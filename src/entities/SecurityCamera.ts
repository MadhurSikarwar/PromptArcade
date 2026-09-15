import Phaser from 'phaser';
import type { CameraLayout } from '../map/MapData';
import type { GameState } from '../systems/GameState';
import { COLORS, DEPTH } from '../utils/Constants';

const FOV = Phaser.Math.DegToRad(52);

export class SecurityCamera {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  private readonly cone: Phaser.GameObjects.Graphics;
  private readonly led: Phaser.GameObjects.Arc;
  private disabledUntil = 0;
  private angle: number;
  private readonly phase = Math.random() * 10;

  constructor(
    scene: Phaser.Scene,
    private readonly layout: CameraLayout,
    private readonly state: GameState,
  ) {
    this.id = layout.id;
    this.name = layout.name;
    this.x = layout.x;
    this.y = layout.y;
    this.angle = Phaser.Math.DegToRad(layout.angle);
    this.cone = scene.add.graphics().setDepth(DEPTH.aboveDark).setBlendMode(Phaser.BlendModes.ADD);
    scene.add.rectangle(this.x, this.y, 10, 7, 0x1b232b).setStrokeStyle(1, 0x55636f).setDepth(DEPTH.aboveDark);
    this.led = scene.add.circle(this.x, this.y, 1.8, COLORS.red).setDepth(DEPTH.aboveDark);
  }

  isActive(now: number): boolean {
    return this.state.hasFlag('facilityPower') && now >= this.disabledUntil && now >= this.state.camerasLoopedUntil;
  }

  disable(now: number, ms: number): void {
    this.disabledUntil = Math.max(this.disabledUntil, now + ms);
  }

  /** Returns true when the camera currently sees the player. */
  update(now: number, px: number, py: number, los: (x0: number, y0: number, x1: number, y1: number) => boolean): boolean {
    const active = this.isActive(now);
    const base = Phaser.Math.DegToRad(this.layout.angle);
    this.angle = base + Math.sin(now * 0.0005 + this.phase) * Phaser.Math.DegToRad(this.layout.sweep);

    let sees = false;
    if (active && !this.state.player.hidden) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, px, py);
      if (d <= this.layout.range) {
        const diff = Phaser.Math.Angle.Wrap(Math.atan2(py - this.y, px - this.x) - this.angle);
        sees = Math.abs(diff) <= FOV / 2 && los(this.x, this.y, px, py);
      }
    }

    this.cone.clear();
    if (active) {
      this.cone.fillStyle(sees ? COLORS.red : 0xff4060, sees ? 0.3 : 0.1);
      this.cone.slice(this.x, this.y, this.layout.range, this.angle - FOV / 2, this.angle + FOV / 2, false);
      this.cone.fillPath();
      this.led.setFillStyle(COLORS.red).setAlpha(Math.sin(now * 0.01) > 0 ? 1 : 0.3);
    } else {
      this.led.setFillStyle(0x39424b).setAlpha(1);
    }
    return sees;
  }
}
