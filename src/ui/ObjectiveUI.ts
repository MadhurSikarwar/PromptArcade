import type Phaser from 'phaser';
import type { GameState } from '../systems/GameState';
import { COLORS, GAME_WIDTH } from '../utils/Constants';
import { toHex } from '../utils/Helpers';
import { drawPanel, uiText } from './UIKit';

/** Top-left: current location + objective. Center: first-visit room title card. */
export class ObjectiveUI {
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly location: Phaser.GameObjects.Text;
  private readonly objective: Phaser.GameObjects.Text;
  private readonly newTag: Phaser.GameObjects.Text;
  private readonly title: Phaser.GameObjects.Text;
  private readonly subtitle: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    state: GameState,
  ) {
    const x = 20;
    const y = 20;
    this.panel = scene.add.graphics();
    drawPanel(this.panel, x, y, 380, 84, COLORS.cyan);
    uiText(scene, x + 14, y + 9, 'POSEIDON RESEARCH FACILITY // LEVEL -1', 10, '#4f7688');
    this.location = uiText(scene, x + 14, y + 25, state.currentRoomName, 17, '#9fdcff', true);
    uiText(scene, x + 14, y + 55, 'OBJECTIVE', 10, '#ff2bd6');
    this.objective = uiText(scene, x + 88, y + 53, state.objective, 13, '#e8f6ff');
    this.newTag = uiText(scene, x + 380 - 14, y + 9, 'NEW', 10, '#ff2bd6', true).setOrigin(1, 0).setAlpha(0);

    this.title = uiText(scene, GAME_WIDTH / 2, 200, '', 38, '#ffffff', true).setOrigin(0.5).setAlpha(0);
    this.subtitle = uiText(scene, GAME_WIDTH / 2, 236, '', 12, '#7fa6b8').setOrigin(0.5).setAlpha(0);
  }

  setLocation(name: string, zone: string, accent: number, firstVisit: boolean): void {
    this.location.setText(name).setColor(toHex(accent));
    if (!firstVisit) return;

    this.scene.tweens.killTweensOf([this.title, this.subtitle]);
    this.title.setText(name).setColor(toHex(accent)).setAlpha(0).setScale(1.08);
    this.subtitle.setText(zone).setAlpha(0);
    this.scene.tweens.add({ targets: this.title, alpha: 1, scale: 1, duration: 420, ease: 'Cubic.easeOut' });
    this.scene.tweens.add({ targets: this.subtitle, alpha: 1, duration: 420, delay: 120 });
    this.scene.tweens.add({ targets: [this.title, this.subtitle], alpha: 0, duration: 700, delay: 2000 });
  }

  setObjective(text: string): void {
    this.objective.setText(text);
    this.scene.tweens.killTweensOf(this.newTag);
    this.newTag.setAlpha(1);
    this.scene.tweens.add({ targets: this.newTag, alpha: 0, duration: 500, delay: 2500 });
    this.scene.tweens.add({ targets: this.objective, alpha: { from: 0.2, to: 1 }, duration: 150, yoyo: true, repeat: 2 });
  }
}
