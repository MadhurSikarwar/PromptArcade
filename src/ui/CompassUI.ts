import Phaser from 'phaser';
import { MISSIONS } from '../data/missions';
import { OBJECTIVE_TARGETS } from '../data/objectiveTargets';
import type { GameState } from '../systems/GameState';
import { COLORS, GAME_WIDTH } from '../utils/Constants';
import { uiText } from './UIKit';

const CX = GAME_WIDTH / 2;
const CY = 46;
const RING_R = 22;

/** Always-on compass needle + label pointing straight at the next incomplete objective's location. */
export class CompassUI {
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly needle: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly distance: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, private readonly state: GameState) {
    this.ring = scene.add.graphics();
    this.needle = scene.add.graphics();
    this.label = uiText(scene, CX, CY + RING_R + 8, '', 12, '#19e6ff', true).setOrigin(0.5, 0);
    this.distance = uiText(scene, CX, CY + RING_R + 24, '', 10, '#6f97a8').setOrigin(0.5, 0);
    this.render();
  }

  private currentTarget(): { x: number; y: number; label: string } | null {
    const mission = MISSIONS[this.state.missionIndex];
    if (!mission) return null;
    const next = mission.objectives.find((o) => !this.state.completedObjectives.has(o.id));
    if (!next) return null;
    const point = OBJECTIVE_TARGETS[next.id];
    if (!point) return null;
    return { ...point, label: next.label };
  }

  render(): void {
    const target = this.currentTarget();
    const g = this.ring;
    g.clear();
    if (!target) {
      this.needle.clear();
      this.label.setText('');
      this.distance.setText('');
      return;
    }
    g.fillStyle(0x03080d, 0.6);
    g.fillCircle(CX, CY, RING_R);
    g.lineStyle(1, COLORS.cyan, 0.55);
    g.strokeCircle(CX, CY, RING_R);
    this.label.setText(target.label.toUpperCase());
  }

  update(playerX: number, playerY: number, now: number): void {
    const target = this.currentTarget();
    const n = this.needle;
    n.clear();
    if (!target) return;

    const dx = target.x - playerX;
    const dy = target.y - playerY;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const close = dist < 120;

    const tipR = close ? RING_R * 0.35 : RING_R * 0.85;
    const backR = RING_R * 0.25;
    const spread = 0.52;
    const tipX = CX + Math.cos(angle) * tipR;
    const tipY = CY + Math.sin(angle) * tipR;
    const b1x = CX + Math.cos(angle + Math.PI - spread) * backR;
    const b1y = CY + Math.sin(angle + Math.PI - spread) * backR;
    const b2x = CX + Math.cos(angle + Math.PI + spread) * backR;
    const b2y = CY + Math.sin(angle + Math.PI + spread) * backR;

    const pulse = close ? 0.7 + Math.sin(now * 0.008) * 0.3 : 1;
    n.fillStyle(close ? COLORS.green : COLORS.magenta, pulse);
    n.fillTriangle(tipX, tipY, b1x, b1y, b2x, b2y);

    const meters = Math.round(dist / 32);
    this.distance.setText(close ? 'YOU ARE HERE' : `${meters}m`);
  }
}
