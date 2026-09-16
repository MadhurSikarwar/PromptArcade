import Phaser from 'phaser';
import { audio } from '../systems/AudioManager';
import { getDifficultyTuning } from '../systems/Difficulty';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../utils/Constants';
import { drawPanel, uiText } from './UIKit';

const KEY_NAMES = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT'];

/** TARGET SIGNAL minigame: pick the matching number before the trace completes. */
export class HackingUI {
  private readonly container: Phaser.GameObjects.Container;
  private readonly title: Phaser.GameObjects.Text;
  private readonly target: Phaser.GameObjects.Text;
  private readonly roundText: Phaser.GameObjects.Text;
  private readonly cells: Phaser.GameObjects.Text[] = [];
  private readonly cellBoxes: Phaser.GameObjects.Rectangle[] = [];
  private readonly bar: Phaser.GameObjects.Graphics;
  private values: number[] = [];
  private targetValue = 0;
  private rounds = 2;
  private round = 0;
  private trace = 0;
  private traceSpeed = 1 / 7;
  private shuffleTimer = 0;
  private resolve: ((success: boolean) => void) | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    const w = 560;
    const h = 330;
    const x = (GAME_WIDTH - w) / 2;
    const y = (GAME_HEIGHT - h) / 2;
    const shade = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050008, 0.55).setOrigin(0);
    const frame = scene.add.graphics();
    drawPanel(frame, x, y, w, h, COLORS.magenta);
    this.title = uiText(scene, x + 20, y + 16, '', 14, '#ff2bd6', true);
    const targetSignalLabel = uiText(scene, x + 20, y + 44, 'TARGET SIGNAL', 12, '#b58ab0');
    this.target = uiText(scene, x + w / 2, y + 86, '', 52, '#ffffff', true).setOrigin(0.5);
    this.target.setShadow(0, 0, '#ff2bd6', 16, false, true);
    this.roundText = uiText(scene, x + w - 20, y + 16, '', 12, '#ff9ae8').setOrigin(1, 0);
    const children: Phaser.GameObjects.GameObject[] = [shade, frame, this.title, targetSignalLabel, this.target, this.roundText];

    for (let i = 0; i < 8; i++) {
      const cx = x + 60 + (i % 4) * 147;
      const cy = y + 160 + Math.floor(i / 4) * 64;
      const box = scene.add.rectangle(cx, cy, 120, 48, 0x12051a, 1).setStrokeStyle(1, COLORS.magenta, 0.6).setInteractive({ useHandCursor: true });
      box.setOrigin(0, 0.5);
      box.on('pointerdown', () => this.pick(i));
      const keyLabel = uiText(scene, cx + 8, cy - 16, `[${i + 1}]`, 10, '#8f5f8a');
      const value = uiText(scene, cx + 60, cy + 3, '', 24, '#ffd6f6', true).setOrigin(0.5);
      this.cellBoxes.push(box);
      this.cells.push(value);
      children.push(box, keyLabel, value);
    }

    const traceLabel = uiText(scene, x + 20, y + h - 58, 'TRACE', 12, '#b58ab0');
    this.bar = scene.add.graphics();
    const hint = uiText(scene, x + w - 20, y + h - 58, 'PRESS 1-8 OR CLICK', 11, '#8f5f8a').setOrigin(1, 0);
    children.push(traceLabel, this.bar, hint);
    this.container = scene.add.container(0, 0, children).setDepth(800).setVisible(false);

    const keyboard = scene.input.keyboard;
    KEY_NAMES.forEach((name, index) => keyboard?.on(`keydown-${name}`, () => this.pick(index)));
    ['NUMPAD_ONE', 'NUMPAD_TWO', 'NUMPAD_THREE', 'NUMPAD_FOUR', 'NUMPAD_FIVE', 'NUMPAD_SIX', 'NUMPAD_SEVEN', 'NUMPAD_EIGHT'].forEach((name, index) =>
      keyboard?.on(`keydown-${name}`, () => this.pick(index)),
    );
  }

  get isOpen(): boolean {
    return this.container.visible;
  }

  open(title: string, difficulty: number, resolve: (success: boolean) => void): void {
    this.resolve = resolve;
    this.rounds = Phaser.Math.Clamp(difficulty, 1, 3);
    this.round = 0;
    this.trace = 0;
    this.traceSpeed = 1 / ((18 - difficulty * 1.5) * getDifficultyTuning().hackForgivenessMult);
    this.title.setText(`CYBERDECK // BREACH: ${title}`);
    this.container.setVisible(true);
    audio.play('glitch', 0.6);
    this.newRound();
  }

  private newRound(): void {
    const pool = Phaser.Utils.Array.Shuffle(Array.from({ length: 89 }, (_, i) => i + 10));
    this.values = pool.slice(0, 8);
    this.targetValue = Phaser.Utils.Array.GetRandom(this.values);
    this.target.setText(String(this.targetValue));
    this.roundText.setText(`SIGNAL ${this.round + 1} / ${this.rounds}`);
    this.renderCells();
  }

  private renderCells(): void {
    this.values.forEach((value, i) => this.cells[i].setText(String(value).padStart(2, '0')));
  }

  private pick(index: number): void {
    if (!this.isOpen || !this.resolve) return;
    if (this.values[index] === this.targetValue) {
      audio.play('hack-good');
      this.cellBoxes[index].setFillStyle(0x39ff9c, 0.5);
      this.scene.time.delayedCall(120, () => this.cellBoxes[index].setFillStyle(0x12051a, 1));
      this.round++;
      if (this.round >= this.rounds) this.finish(true);
      else this.newRound();
    } else {
      audio.play('denied');
      this.trace += 0.1;
      this.cellBoxes[index].setFillStyle(0xff3b4e, 0.5);
      this.scene.time.delayedCall(140, () => this.cellBoxes[index].setFillStyle(0x12051a, 1));
    }
  }

  private finish(success: boolean): void {
    const resolve = this.resolve;
    this.resolve = null;
    this.container.setVisible(false);
    resolve?.(success);
  }

  update(dt: number): void {
    if (!this.isOpen) return;
    this.trace += this.traceSpeed * dt;
    this.shuffleTimer += dt;
    if (this.shuffleTimer > 2.6) {
      this.shuffleTimer = 0;
      Phaser.Utils.Array.Shuffle(this.values);
      this.renderCells();
      audio.play('hack-tick');
    }
    const w = 560;
    const x = (GAME_WIDTH - w) / 2 + 20;
    const y = (GAME_HEIGHT - 330) / 2 + 330 - 36;
    const g = this.bar;
    g.clear();
    const segments = 40;
    const filled = Math.floor(Phaser.Math.Clamp(this.trace, 0, 1) * segments);
    for (let i = 0; i < segments; i++) {
      g.fillStyle(i < filled ? (this.trace > 0.7 ? COLORS.red : COLORS.magenta) : 0x2a1030, 1);
      g.fillRect(x + i * 13, y, 10, 12);
    }
    if (this.trace >= 1) this.finish(false);
  }
}
