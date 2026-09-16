import Phaser from 'phaser';
import { OctopusBrain, type OctopusWorld } from '../ai/OctopusStateMachine';
import { COLORS, DEPTH, TEXTURES } from '../utils/Constants';

const EYE_COLORS: Record<string, number> = {
  HUNT: 0xff2b6a,
  ATTACK: 0xff2b6a,
  INVESTIGATE: COLORS.yellow,
  SEARCH: 0xff8a3a,
  FORCING: COLORS.magenta,
  GRAB: 0xff2b6a,
};

/** A-3 visuals: cybernetic mantle sprite, eight procedurally animated tentacles, bioluminescent eyes visible in darkness. */
export class Octopus {
  readonly brain: OctopusBrain;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Image;
  private readonly tentacles: Phaser.GameObjects.Graphics;
  private readonly eyes: Phaser.GameObjects.Image[];
  private readonly sparks: Phaser.GameObjects.Graphics;
  private grabTarget: { x: number; y: number } | null = null;

  constructor(scene: Phaser.Scene, world: OctopusWorld, x: number, y: number) {
    this.brain = new OctopusBrain(world, x, y);
    // A big, soft cast shadow under the whole mass — sells scale and "this is above the floor".
    this.shadow = scene.add.image(x, y + 10, TEXTURES.glow).setTint(0x000000).setAlpha(0.5).setScale(1.4, 0.55).setDepth(DEPTH.octopus - 1);
    this.tentacles = scene.add.graphics().setDepth(DEPTH.octopus);
    this.body = scene.add.image(x, y, TEXTURES.octopus).setScale(0.5).setDepth(DEPTH.octopus);
    this.eyes = [0, 1].map(() => scene.add.image(x, y, TEXTURES.glow).setScale(0.22).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.aboveDark));
    this.sparks = scene.add.graphics().setDepth(DEPTH.aboveDark);
  }

  get x(): number {
    return this.brain.x;
  }

  get y(): number {
    return this.brain.y;
  }

  setGrabTarget(target: { x: number; y: number } | null): void {
    this.grabTarget = target;
  }

  update(dt: number, now: number, px: number, py: number): void {
    this.brain.update(dt, now, px, py);
    this.render(now);
  }

  private render(now: number): void {
    const b = this.brain;
    const state = b.state;
    const moving = state === 'PATROL' || state === 'RETURN' || state === 'INVESTIGATE' || state === 'SEARCH' || state === 'HUNT';
    const stunned = state === 'STUNNED';
    const pulse = state === 'HUNT' ? 1.05 + Math.sin(now * 0.02) * 0.03 : 1 + Math.sin(now * 0.004) * 0.02;

    this.body.setPosition(b.x, b.y).setRotation(b.facing).setScale(0.5 * pulse);
    this.body.setTint(stunned && Math.random() < 0.5 ? 0x8899aa : 0xffffff);

    const shadowStretch = state === 'HUNT' ? 1.15 : stunned ? 0.85 : 1;
    this.shadow.setPosition(b.x, b.y + 10).setScale(1.4 * shadowStretch, 0.55 * (stunned ? 0.7 : 1)).setAlpha(stunned ? 0.3 : 0.5);

    const g = this.tentacles;
    g.clear();
    const speedFactor = state === 'HUNT' ? 2.4 : moving ? 1.4 : stunned ? 0.2 : 0.7;
    for (let i = 0; i < 8; i++) {
      const spread = (i - 3.5) * 0.3;
      let angle = b.facing + Math.PI + spread;
      let reach = 1;
      if ((state === 'ATTACK' || state === 'GRAB') && (i === 3 || i === 4)) {
        angle = b.facing + (i === 3 ? -0.12 : 0.12);
        reach = state === 'GRAB' ? 2.1 : 1 + b.attackProgress * 1.4;
      }
      if (this.grabTarget && (i === 3 || i === 4)) {
        angle = Math.atan2(this.grabTarget.y - b.y, this.grabTarget.x - b.x) + (i === 3 ? -0.1 : 0.1);
      }
      let x = b.x + Math.cos(angle) * 18;
      let y = b.y + Math.sin(angle) * 18;
      const segments = 10;
      const segLength = (stunned ? 6 : 7.5) * reach;
      for (let s = 0; s < segments; s++) {
        const wave = Math.sin(now * 0.005 * speedFactor + i * 1.3 + s * 0.55) * (stunned ? 0.12 : 0.34);
        angle += wave * 0.35;
        const nx = x + Math.cos(angle) * segLength;
        const ny = y + Math.sin(angle) * segLength;
        const width = Math.max(1.2, 8.5 - s * 0.8);
        g.lineStyle(width + 2, 0x020406, 0.9);
        g.lineBetween(x, y, nx, ny);
        g.lineStyle(width, s % 3 === 0 ? 0x1c2a33 : 0x121a21, 1);
        g.lineBetween(x, y, nx, ny);
        if (s % 3 === 1) {
          g.fillStyle(COLORS.cyan, 0.55);
          g.fillCircle(nx, ny, 1.1);
        }
        x = nx;
        y = ny;
      }
      g.fillStyle(state === 'HUNT' ? COLORS.magenta : COLORS.cyan, 0.9);
      g.fillCircle(x, y, 1.6);
    }

    const eyeColor = EYE_COLORS[state] ?? COLORS.cyan;
    const flicker = stunned ? (Math.random() < 0.5 ? 0.1 : 0.8) : 1;
    this.eyes.forEach((eye, index) => {
      const a = b.facing + (index === 0 ? -0.45 : 0.45);
      eye.setPosition(b.x + Math.cos(a) * 17, b.y + Math.sin(a) * 17).setTint(eyeColor).setAlpha(flicker * (state === 'HUNT' ? 1 : 0.8));
    });

    this.sparks.clear();
    if (stunned) {
      this.sparks.lineStyle(1.5, COLORS.cyan, 0.9);
      for (let i = 0; i < 4; i++) {
        const a = Math.random() * Math.PI * 2;
        const r1 = 10 + Math.random() * 18;
        const r2 = r1 + 10 + Math.random() * 14;
        this.sparks.lineBetween(b.x + Math.cos(a) * r1, b.y + Math.sin(a) * r1, b.x + Math.cos(a + 0.3) * r2, b.y + Math.sin(a + 0.3) * r2);
      }
    }
  }

  destroy(): void {
    this.shadow.destroy();
    this.body.destroy();
    this.tentacles.destroy();
    this.sparks.destroy();
    this.eyes.forEach((eye) => eye.destroy());
  }
}
