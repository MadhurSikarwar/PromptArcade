import Phaser from 'phaser';
import { DroneBrain, type DroneWorld } from '../ai/DroneAI';
import { COLORS, DEPTH, TEXTURES } from '../utils/Constants';

const VISION_RANGE = 190;
const VISION_FOV = Phaser.Math.DegToRad(64);

/** Small hovering cyberpunk sentry: hexagonal chassis, one scanning lens, a vision cone, and a cast shadow that sells the hover. */
export class Drone {
  readonly brain: DroneBrain;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Graphics;
  private readonly cone: Phaser.GameObjects.Graphics;
  private readonly lens: Phaser.GameObjects.Arc;
  private readonly glow: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    world: DroneWorld,
    route: readonly { x: number; y: number }[],
    startX: number,
    startY: number,
  ) {
    this.brain = new DroneBrain(world, route, startX, startY);
    this.shadow = scene.add.image(startX, startY + 12, TEXTURES.glow).setTint(0x000000).setAlpha(0.35).setScale(0.4, 0.16).setDepth(DEPTH.octopus - 2);
    this.cone = scene.add.graphics().setDepth(DEPTH.aboveDark - 1);
    this.body = scene.add.graphics().setDepth(DEPTH.octopus);
    this.glow = scene.add.image(startX, startY, TEXTURES.glow).setScale(0.28).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.aboveDark);
    this.lens = scene.add.circle(startX, startY, 2.2, COLORS.red).setDepth(DEPTH.aboveDark);
  }

  get x(): number {
    return this.brain.x;
  }

  get y(): number {
    return this.brain.y;
  }

  update(dt: number, now: number, px: number, py: number): void {
    this.brain.update(dt, now, px, py);
    this.render(now);
  }

  private render(now: number): void {
    const b = this.brain;
    const hoverY = b.y + b.hoverOffset;
    const alert = b.state === 'ALERT';
    const disabled = b.state === 'DISABLED';
    const color = disabled ? 0x3a4450 : alert ? COLORS.red : COLORS.cyan;

    this.shadow.setPosition(b.x, b.y + 12).setAlpha(disabled ? 0.15 : 0.32 + (b.hoverOffset + 2.4) * 0.01);

    const g = this.body;
    g.clear();
    g.save();
    g.translateCanvas(b.x, hoverY);
    g.rotateCanvas(b.facing);
    // Hex chassis.
    g.fillStyle(0x0d151c, 1);
    g.lineStyle(1.5, color, disabled ? 0.4 : 0.9);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const px2 = Math.cos(a) * 10;
      const py2 = Math.sin(a) * 10;
      if (i === 0) g.moveTo(px2, py2);
      else g.lineTo(px2, py2);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
    // Twin rear thruster glints.
    g.fillStyle(color, disabled ? 0.15 : 0.75);
    g.fillCircle(-7, -5, 1.6);
    g.fillCircle(-7, 5, 1.6);
    g.restore();

    this.glow.setPosition(b.x, hoverY).setTint(color).setAlpha(disabled ? 0.15 : alert ? 0.85 : 0.45);
    this.lens.setPosition(b.x + Math.cos(b.facing) * 8, hoverY + Math.sin(b.facing) * 8).setFillStyle(color, disabled && Math.random() < 0.5 ? 0.2 : 1);

    const coneG = this.cone;
    coneG.clear();
    if (!disabled) {
      coneG.fillStyle(color, alert ? 0.22 : 0.08);
      coneG.slice(b.x, hoverY, VISION_RANGE, b.facing - VISION_FOV / 2, b.facing + VISION_FOV / 2, false);
      coneG.fillPath();
    }

    if (b.isFiring) {
      const flashX = b.x + Math.cos(b.facing) * 11;
      const flashY = hoverY + Math.sin(b.facing) * 11;
      g.fillStyle(0xffffff, 0.95);
      g.fillCircle(flashX, flashY, 4);
      g.fillStyle(COLORS.red, 0.55);
      g.fillCircle(flashX, flashY, 8);
    }
    void now;
  }

  destroy(): void {
    this.shadow.destroy();
    this.body.destroy();
    this.cone.destroy();
    this.glow.destroy();
    this.lens.destroy();
  }
}
