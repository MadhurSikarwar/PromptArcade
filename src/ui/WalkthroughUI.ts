import type Phaser from 'phaser';
import { MISSIONS } from '../data/missions';
import type { GameState } from '../systems/GameState';
import { COLORS, GAME_WIDTH } from '../utils/Constants';
import { drawPanel, uiText } from './UIKit';

const W = 320;
const X = GAME_WIDTH - 20 - W;
const Y = 210;

/** Optional, hideable step-by-step guide for the current mission. Toggled with [H]. */
export class WalkthroughUI {
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private readonly state: GameState,
  ) {
    this.panel = scene.add.graphics();
    this.title = uiText(scene, X + 14, Y + 12, '', 12, '#19e6ff', true);
    this.body = uiText(scene, X + 14, Y + 36, '', 12, '#c8dfe8').setLineSpacing(7);
    uiText(scene, X + 14, Y - 20, '[H] WALKTHROUGH', 10, '#4f7688');
    this.container = scene.add.container(0, 0, [this.panel, this.title, this.body]).setDepth(500).setVisible(false);
    this.render();
  }

  toggle(): void {
    this.container.setVisible(!this.container.visible);
  }

  render(): void {
    const mission = MISSIONS[this.state.missionIndex];
    this.panel.clear();
    if (!mission) {
      this.title.setText('DEMO COMPLETE');
      this.body.setText('');
      return;
    }
    const height = 36 + mission.objectives.length * 20 + 14;
    drawPanel(this.panel, X, Y, W, height, COLORS.cyan);
    this.title.setText(`MISSION: ${mission.title.replace(/^MISSION \d+ — /, '')}`);
    this.body.setText(
      mission.objectives.map((o, i) => `${i + 1}. ${o.label}${this.state.completedObjectives.has(o.id) ? '  ✓' : ''}`).join('\n'),
    );
  }
}
