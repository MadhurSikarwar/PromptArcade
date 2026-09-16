import type Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../utils/Constants';
import { drawPanel, uiText } from './UIKit';

export class PauseMenu {
  private readonly container: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    onRestart: () => void,
    onQuitToMenu: () => void,
  ) {
    const shade = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x010305, 0.78).setOrigin(0);
    const frame = scene.add.graphics();
    const w = 460;
    const h = 360;
    const x = (GAME_WIDTH - w) / 2;
    const y = (GAME_HEIGHT - h) / 2;
    drawPanel(frame, x, y, w, h);

    const title = uiText(scene, GAME_WIDTH / 2, y + 44, 'PAUSED', 40, '#19e6ff', true).setOrigin(0.5);
    const controls = uiText(
      scene,
      GAME_WIDTH / 2,
      y + 148,
      ['WASD / ARROWS   MOVE', 'SHIFT           SPRINT', 'E               INTERACT', 'ESC             RESUME'].join('\n'),
      14,
      '#9fbfcc',
    )
      .setOrigin(0.5)
      .setLineSpacing(6);

    const restartBtn = this.makeButton(scene, GAME_WIDTH / 2, y + h - 108, 300, 42, '↺  RESTART RUN  [R]', COLORS.yellow, onRestart);
    const quitBtn = this.makeButton(scene, GAME_WIDTH / 2, y + h - 56, 300, 42, '⏻  QUIT TO MAIN MENU  [B]', COLORS.red, onQuitToMenu);

    this.container = scene.add
      .container(0, 0, [shade, frame, title, controls, restartBtn.box, restartBtn.label, quitBtn.box, quitBtn.label])
      .setDepth(1000)
      .setVisible(false);
  }

  private makeButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    accent: number,
    onClick: () => void,
  ): { box: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text } {
    const box = scene.add.rectangle(x, y, w, h, accent, 0.14).setStrokeStyle(1.5, accent, 0.9).setInteractive({ useHandCursor: true });
    const text = uiText(scene, x, y, label, 14, '#eafcff', true).setOrigin(0.5);
    box.on('pointerover', () => box.setFillStyle(accent, 0.28));
    box.on('pointerout', () => box.setFillStyle(accent, 0.14));
    box.on('pointerdown', () => {
      scene.tweens.add({ targets: [box, text], scale: 0.96, duration: 60, yoyo: true });
      onClick();
    });
    return { box, label: text };
  }

  get isOpen(): boolean {
    return this.container.visible;
  }

  show(): void {
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }
}
