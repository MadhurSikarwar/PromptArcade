import type Phaser from 'phaser';
import { MISSIONS } from '../data/missions';
import type { GameState } from '../systems/GameState';
import { COLORS } from '../utils/Constants';
import { drawPanel, uiText } from './UIKit';

const X = 20;
const Y = 114;
const W = 380;
const ROW = 18;

/** Left-side mission panel: current mission title + its objective checklist. Always visible. */
export class MissionUI {
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private readonly state: GameState,
  ) {
    this.panel = scene.add.graphics();
    this.title = uiText(scene, X + 14, Y + 12, '', 13, '#ff2bd6', true);
    this.body = uiText(scene, X + 14, Y + 36, '', 13, '#d8f8ff').setLineSpacing(6);
    this.render();
  }

  render(): void {
    const mission = MISSIONS[this.state.missionIndex];
    this.panel.clear();
    if (!mission) {
      this.title.setText('DEMO COMPLETE');
      this.body.setText('');
      drawPanel(this.panel, X, Y, W, 40, COLORS.green);
      return;
    }
    const height = 36 + mission.objectives.length * ROW + 14;
    drawPanel(this.panel, X, Y, W, height, COLORS.magenta);
    this.title.setText(mission.title);
    this.body.setText(
      mission.objectives.map((o) => `${this.state.completedObjectives.has(o.id) ? '✓' : '□'} ${o.label}`).join('\n'),
    );
  }
}
