import Phaser from 'phaser';
import type { PromptTone } from '../entities/Interactable';
import { CAMERA_ZOOM, COLORS, DEPTH, FONT_MONO } from '../utils/Constants';

const TONE_COLORS: Record<PromptTone, number> = {
  normal: COLORS.cyan,
  locked: COLORS.red,
  warning: COLORS.yellow,
};

/**
 * World-space "[E] ACTION" prompt. Only one exists. It floats above the player's head (so it never hides
 * the diver) while a pulsing reticle marks the focused object.
 */
export class InteractionPrompt {
  private readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly keyText: Phaser.GameObjects.Text;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly reticle: Phaser.GameObjects.Graphics;
  private lastLabel = '';
  private lastTone: PromptTone | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    this.reticle = scene.add.graphics().setDepth(DEPTH.prompt - 1).setVisible(false);
    const resolution = Math.max(2, Math.ceil(window.devicePixelRatio * CAMERA_ZOOM));
    this.background = scene.add.graphics();
    this.keyText = scene.add
      .text(0, 0, 'E', { fontFamily: FONT_MONO, fontSize: '9px', color: '#021016', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setResolution(resolution);
    this.labelText = scene.add
      .text(0, 0, '', { fontFamily: FONT_MONO, fontSize: '8px', color: '#d8f8ff' })
      .setOrigin(0, 0.5)
      .setResolution(resolution);
    this.container = scene.add
      .container(0, 0, [this.background, this.keyText, this.labelText])
      .setDepth(DEPTH.prompt)
      .setVisible(false);
  }

  show(targetX: number, targetY: number, playerX: number, playerY: number, label: string, tone: PromptTone): void {
    if (label !== this.lastLabel || tone !== this.lastTone) this.redraw(label, tone);
    const time = this.scene.time.now;
    const bob = Math.sin(time * 0.006) * 1.2;
    this.container.setPosition(Math.round(playerX), Math.round(playerY - 30 + bob));
    this.container.setVisible(true);

    const pulse = 11 + Math.sin(time * 0.008) * 2;
    const arm = 5;
    const color = TONE_COLORS[tone];
    const r = this.reticle;
    r.clear();
    r.lineStyle(1.5, color, 0.9);
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      const cx = targetX + sx * pulse;
      const cy = targetY + sy * pulse;
      r.beginPath();
      r.moveTo(cx - sx * arm, cy);
      r.lineTo(cx, cy);
      r.lineTo(cx, cy - sy * arm);
      r.strokePath();
    }
    r.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
    this.reticle.setVisible(false);
  }

  private redraw(label: string, tone: PromptTone): void {
    this.lastLabel = label;
    this.lastTone = tone;
    const color = TONE_COLORS[tone];

    this.labelText.setText(label);
    this.labelText.setColor(tone === 'normal' ? '#d8f8ff' : Phaser.Display.Color.IntegerToColor(color).rgba);

    const keySize = 12;
    const gap = 5;
    const padX = 5;
    const width = padX + keySize + gap + this.labelText.width + padX;
    const height = 18;
    const left = -width / 2;

    this.background.clear();
    this.background.fillStyle(0x02070b, 0.82);
    this.background.fillRect(left, -height / 2, width, height);
    this.background.lineStyle(1, color, 0.7);
    this.background.strokeRect(left, -height / 2, width, height);
    this.background.fillStyle(color, 1);
    this.background.fillRect(left + padX, -keySize / 2, keySize, keySize);

    this.keyText.setPosition(left + padX + keySize / 2, 0);
    this.labelText.setPosition(left + padX + keySize + gap, 0);
  }
}
