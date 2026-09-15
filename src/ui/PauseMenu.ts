import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../utils/Constants';
import { drawPanel, uiText } from './UIKit';

export class PauseMenu {
  private readonly container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    const shade = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x010305, 0.78).setOrigin(0);
    const frame = scene.add.graphics();
    const w = 460;
    const h = 300;
    const x = (GAME_WIDTH - w) / 2;
    const y = (GAME_HEIGHT - h) / 2;
    drawPanel(frame, x, y, w, h);

    const title = uiText(scene, GAME_WIDTH / 2, y + 44, 'PAUSED', 40, '#19e6ff', true).setOrigin(0.5);
    const controls = uiText(
      scene,
      GAME_WIDTH / 2,
      y + 150,
      ['WASD / ARROWS   MOVE', 'SHIFT           SPRINT', 'E               INTERACT', 'ESC             PAUSE'].join('\n'),
      14,
      '#9fbfcc',
    )
      .setOrigin(0.5)
      .setLineSpacing(6);
    const actions = uiText(scene, GAME_WIDTH / 2, y + h - 36, '[ESC] RESUME        [R] RESTART RUN', 14, '#ff2bd6', true).setOrigin(0.5);

    this.container = scene.add.container(0, 0, [shade, frame, title, controls, actions]).setDepth(1000).setVisible(false);
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
