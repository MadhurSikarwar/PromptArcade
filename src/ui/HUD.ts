import type Phaser from 'phaser';
import { alertLabel, KEYCARD_LEVELS, type GameState, type KeycardLevel } from '../systems/GameState';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../utils/Constants';
import { toHex } from '../utils/Helpers';
import { drawPanel, drawSegmentBar, uiText } from './UIKit';

const KEYCARD_COLORS: Record<KeycardLevel, number> = { 1: COLORS.blue, 2: COLORS.purple, 3: COLORS.red };
const LABEL_COLOR = '#6f97a8';
const MARGIN = 20;

function alertColor(alert: number, lockdown: boolean): number {
  if (lockdown || alert >= 75) return COLORS.red;
  if (alert >= 50) return 0xff8a3a;
  if (alert >= 25) return COLORS.yellow;
  return COLORS.green;
}

/** Minimal edge-anchored HUD: vitals bottom-left, facility top-right, inventory bottom-right. */
export class HUD {
  private readonly meters: Phaser.GameObjects.Graphics;
  private readonly hpValue: Phaser.GameObjects.Text;
  private readonly staminaValue: Phaser.GameObjects.Text;
  private readonly oxygenValue: Phaser.GameObjects.Text;
  private readonly powerValue: Phaser.GameObjects.Text;
  private readonly alertValue: Phaser.GameObjects.Text;
  private readonly keycardTexts: Record<KeycardLevel, Phaser.GameObjects.Text>;
  private readonly empValue: Phaser.GameObjects.Text;

  private readonly vitals = { x: MARGIN, y: GAME_HEIGHT - MARGIN - 92, w: 290, h: 92 };
  private readonly facility = { x: GAME_WIDTH - MARGIN - 300, y: MARGIN, w: 300, h: 80 };
  private readonly inventory = { x: GAME_WIDTH - MARGIN - 236, y: GAME_HEIGHT - MARGIN - 92, w: 236, h: 92 };

  constructor(
    scene: Phaser.Scene,
    private readonly state: GameState,
  ) {
    const panels = scene.add.graphics();
    const v = this.vitals;
    const f = this.facility;
    const i = this.inventory;
    drawPanel(panels, v.x, v.y, v.w, v.h, COLORS.cyan);
    drawPanel(panels, f.x, f.y, f.w, f.h, COLORS.cyan);
    drawPanel(panels, i.x, i.y, i.w, i.h, COLORS.cyan);

    uiText(scene, v.x + 14, v.y + 11, 'HP', 11, LABEL_COLOR);
    uiText(scene, v.x + 14, v.y + 37, 'STAMINA', 11, LABEL_COLOR);
    uiText(scene, v.x + 14, v.y + 63, 'OXYGEN', 11, LABEL_COLOR);
    this.hpValue = uiText(scene, v.x + v.w - 12, v.y + 11, '', 11).setOrigin(1, 0);
    this.staminaValue = uiText(scene, v.x + v.w - 12, v.y + 37, '', 11).setOrigin(1, 0);
    this.oxygenValue = uiText(scene, v.x + v.w - 12, v.y + 63, '', 11).setOrigin(1, 0);

    uiText(scene, f.x + 14, f.y + 10, 'FACILITY POWER', 11, LABEL_COLOR);
    uiText(scene, f.x + 14, f.y + 44, 'FACILITY ALERT', 11, LABEL_COLOR);
    this.powerValue = uiText(scene, f.x + f.w - 14, f.y + 10, '', 11).setOrigin(1, 0);
    this.alertValue = uiText(scene, f.x + f.w - 14, f.y + 44, '', 11, '#39ff9c', true).setOrigin(1, 0);

    uiText(scene, i.x + 14, i.y + 10, 'KEYCARDS', 11, LABEL_COLOR);
    uiText(scene, i.x + 14, i.y + 63, 'EMP CHARGES', 11, LABEL_COLOR);
    this.keycardTexts = {
      1: uiText(scene, 0, 0, '', 12, '#d8f8ff', true).setOrigin(0.5),
      2: uiText(scene, 0, 0, '', 12, '#d8f8ff', true).setOrigin(0.5),
      3: uiText(scene, 0, 0, '', 12, '#d8f8ff', true).setOrigin(0.5),
    };
    this.empValue = uiText(scene, i.x + i.w - 14, i.y + 63, '', 11).setOrigin(1, 0);

    this.meters = scene.add.graphics();
  }

  update(time: number): void {
    const s = this.state;
    const g = this.meters;
    g.clear();

    const v = this.vitals;
    const p = s.player;
    const exhausted = p.movement === 'EXHAUSTED';
    drawSegmentBar(g, v.x + 82, v.y + 13, p.health / p.maxHealth, 0xff3b6b, 18);
    drawSegmentBar(g, v.x + 82, v.y + 39, p.stamina / p.maxStamina, exhausted ? COLORS.yellow : COLORS.green, 18);
    drawSegmentBar(g, v.x + 82, v.y + 65, p.oxygen / p.maxOxygen, COLORS.cyan, 18);
    this.hpValue.setText(`${Math.ceil(p.health)}`);
    this.staminaValue.setText(exhausted ? 'LOW' : `${Math.round(p.stamina)}`);
    this.staminaValue.setColor(exhausted ? '#ffc23a' : '#d8f8ff');
    this.oxygenValue.setText(`${Math.round(p.oxygen)}`);

    const f = this.facility;
    const fac = s.facility;
    const powerColor = fac.power < 35 ? COLORS.yellow : COLORS.cyan;
    drawSegmentBar(g, f.x + 14, f.y + 28, fac.power / 100, powerColor, 30, 7, 7);
    this.powerValue.setText(`${fac.power}%`);

    const aColor = alertColor(fac.alert, fac.lockdown);
    const flashing = fac.lockdown && Math.floor(time / 300) % 2 === 0;
    drawSegmentBar(g, f.x + 14, f.y + 62, fac.alert / 100, aColor, 30, 7, 7);
    this.alertValue.setText(`${alertLabel(fac.alert, fac.lockdown)}  ${fac.alert}%`);
    this.alertValue.setColor(toHex(aColor)).setAlpha(flashing ? 0.35 : 1);

    const inv = this.inventory;
    KEYCARD_LEVELS.forEach((level, index) => {
      const owned = s.hasKeycard(level);
      const color = KEYCARD_COLORS[level];
      const cx = inv.x + 14 + index * 70;
      const cy = inv.y + 30;
      if (owned) {
        g.fillStyle(color, 0.9);
        g.fillRect(cx, cy, 62, 22);
      } else {
        g.fillStyle(0x0b141b, 0.9);
        g.fillRect(cx, cy, 62, 22);
      }
      g.lineStyle(1, color, owned ? 1 : 0.45);
      g.strokeRect(cx + 0.5, cy + 0.5, 61, 21);
      const label = this.keycardTexts[level];
      label.setPosition(cx + 31, cy + 11);
      label.setText(`L${level} ${owned ? '✓' : '—'}`);
      label.setColor(owned ? '#020609' : toHex(color));
    });

    for (let n = 0; n < 3; n++) {
      const has = n < s.inventory.empCharges;
      g.fillStyle(has ? COLORS.cyan : 0x1a2630, has ? 0.95 : 0.8);
      g.fillRect(inv.x + 110 + n * 16, inv.y + 65, 11, 11);
    }
    this.empValue.setText(`${s.inventory.empCharges}`);
  }
}
