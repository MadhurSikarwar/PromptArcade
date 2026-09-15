import type Phaser from 'phaser';
import { GLITCH } from '../data/researchLogs';
import { audio } from '../systems/AudioManager';
import { COLORS, GAME_WIDTH } from '../utils/Constants';
import { toHex } from '../utils/Helpers';
import { drawPanel, uiText } from './UIKit';

interface QueuedLog {
  title: string;
  lines: string[];
  accent: number;
}

/** Non-modal terminal log readout: short fragments, typed out, glitches included. The game keeps running. */
export class LogPanel {
  private readonly container: Phaser.GameObjects.Container;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly queue: QueuedLog[] = [];
  private active: QueuedLog | null = null;
  private lineIndex = 0;
  private charIndex = 0;
  private shown: string[] = [];
  private timer = 0;
  private holdTimer = 0;

  constructor(private readonly scene: Phaser.Scene) {
    const x = GAME_WIDTH - 20 - 420;
    const y = 118;
    this.frame = scene.add.graphics();
    this.title = uiText(scene, x + 16, y + 12, '', 12, '#19e6ff', true);
    this.body = uiText(scene, x + 16, y + 38, '', 14, '#e8f6ff').setLineSpacing(6).setWordWrapWidth(390);
    this.container = scene.add.container(0, 0, [this.frame, this.title, this.body]).setDepth(600).setVisible(false);
  }

  show(title: string, lines: string[], accent: number = COLORS.cyan): void {
    this.queue.push({ title, lines, accent });
    if (!this.active) this.next();
  }

  private next(): void {
    const log = this.queue.shift();
    this.active = log ?? null;
    if (!log) {
      this.scene.tweens.add({ targets: this.container, alpha: 0, duration: 400, onComplete: () => this.container.setVisible(false) });
      return;
    }
    this.lineIndex = 0;
    this.charIndex = 0;
    this.shown = [];
    this.holdTimer = 0;
    const x = GAME_WIDTH - 20 - 420;
    const height = 60 + log.lines.length * 22;
    this.frame.clear();
    drawPanel(this.frame, x, 118, 420, height, log.accent);
    this.title.setText(log.title).setColor(toHex(log.accent));
    this.body.setText('');
    this.scene.tweens.killTweensOf(this.container);
    this.container.setVisible(true).setAlpha(1);
    audio.play('beep');
  }

  update(dt: number): void {
    const log = this.active;
    if (!log) return;
    if (this.lineIndex >= log.lines.length) {
      this.holdTimer += dt;
      if (this.holdTimer > 4.5) this.next();
      return;
    }
    this.timer += dt;
    const line = log.lines[this.lineIndex];
    if (line === GLITCH) {
      if (this.timer > 0.5) {
        this.timer = 0;
        audio.play('glitch', 0.6);
        this.shown.push('▓▒░ ░▒▓ ▒▓░▓ ░▒');
        this.lineIndex++;
      } else {
        this.body.setText([...this.shown, Math.random() < 0.5 ? '▓▒░▓▒░' : '░▓▒ ▓░▒'].join('\n'));
        return;
      }
    } else if (this.timer > 0.028) {
      this.timer = 0;
      this.charIndex++;
      if (this.charIndex > line.length) {
        this.shown.push(line);
        this.lineIndex++;
        this.charIndex = 0;
        this.timer = -0.35;
      }
    }
    const partial = this.lineIndex < log.lines.length && log.lines[this.lineIndex] !== GLITCH ? log.lines[this.lineIndex].slice(0, this.charIndex) : '';
    this.body.setText([...this.shown, partial].join('\n'));
  }
}
