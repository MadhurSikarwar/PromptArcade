import Phaser from 'phaser';
import type { GameState } from '../systems/GameState';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXTURES } from '../utils/Constants';
import { uiText } from './UIKit';

/** Proximity pulse, hunt state banner, low-oxygen warning, hold-to-release bar and screen effects. */
export class ThreatIndicator {
  private readonly edge: Phaser.GameObjects.Image;
  private readonly tint: Phaser.GameObjects.Rectangle;
  private readonly flash: Phaser.GameObjects.Rectangle;
  private readonly banner: Phaser.GameObjects.Text;
  private readonly escapeHint: Phaser.GameObjects.Text;
  private readonly oxygen: Phaser.GameObjects.Text;
  private readonly holdBar: Phaser.GameObjects.Graphics;
  private readonly holdText: Phaser.GameObjects.Text;
  private redUntil = 0;
  private glitchUntil = 0;
  private holdProgress = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly state: GameState,
  ) {
    this.tint = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.red, 0).setOrigin(0);
    this.edge = scene.add.image(0, 0, TEXTURES.vignette).setOrigin(0).setTint(COLORS.red).setAlpha(0);
    this.flash = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0).setOrigin(0).setDepth(900);
    this.banner = uiText(scene, GAME_WIDTH / 2, 92, '', 16, '#ff3b4e', true).setOrigin(0.5);
    this.escapeHint = uiText(scene, GAME_WIDTH / 2, 116, '', 12, '#e8f6ff').setOrigin(0.5);
    this.oxygen = uiText(scene, GAME_WIDTH / 2, GAME_HEIGHT - 190, '', 16, '#19e6ff', true).setOrigin(0.5);
    this.holdBar = scene.add.graphics();
    this.holdText = uiText(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 90, '', 16, '#19e6ff', true).setOrigin(0.5);
  }

  fx(kind: 'flash' | 'glitch' | 'shake' | 'red', duration = 400): void {
    const now = this.scene.time.now;
    if (kind === 'flash') {
      this.flash.setFillStyle(0xd8fbff, 0.85);
      this.scene.tweens.add({ targets: this.flash, fillAlpha: 0, duration });
    } else if (kind === 'red') {
      this.redUntil = now + duration;
    } else if (kind === 'glitch') {
      this.glitchUntil = now + duration;
    }
  }

  setHold(label: string, progress: number): void {
    this.holdProgress = progress;
    this.holdText.setText(progress > 0 ? `${label}  ${Math.round(progress * 100)}%` : '');
  }

  update(now: number): void {
    const s = this.state;
    const o = s.octopus;
    const near = o.spawned ? Phaser.Math.Clamp(1 - o.distance / 420, 0, 1) : 0;
    const pulse = near * (0.5 + Math.sin(now * (0.006 + near * 0.012)) * 0.5);
    const red = now < this.redUntil ? 0.9 : 0;
    this.edge.setAlpha(Math.max(pulse * 0.85, red));

    let tintAlpha = 0;
    if (s.facility.lockdown) tintAlpha = 0.05 + (Math.sin(now * 0.008) > 0 ? 0.06 : 0);
    else if (s.facility.lighting === 'EMERGENCY') tintAlpha = 0.03;
    if (now < this.glitchUntil) tintAlpha += Math.random() * 0.1;
    this.tint.setFillStyle(now < this.glitchUntil && Math.random() < 0.5 ? COLORS.magenta : COLORS.red, tintAlpha);

    let text = '';
    if (o.spawned) {
      if (o.state === 'HUNT' || o.state === 'ATTACK') text = '▲  A-3 IS HUNTING YOU  ▲';
      else if (o.state === 'SEARCH') text = 'A-3 IS SEARCHING';
      else if (o.state === 'INVESTIGATE' && o.distance < 700) text = 'A-3 HEARD SOMETHING';
      else if (o.state === 'STUNNED') text = 'A-3 STUNNED';
      else if (o.state === 'FORCING' && o.distance < 600) text = 'A-3 IS FORCING A DOOR';
    }
    if (s.player.hidden) text = 'HIDDEN IN VENT';
    this.banner.setText(text).setColor(o.state === 'STUNNED' ? '#19e6ff' : o.state === 'SEARCH' || o.state === 'INVESTIGATE' ? '#ffc23a' : '#ff3b4e');
    this.banner.setAlpha(text ? 0.65 + Math.sin(now * 0.01) * 0.35 : 0);

    const showHint = o.spawned && (o.state === 'HUNT' || o.state === 'ATTACK') && !s.player.hidden;
    this.escapeHint.setText(showHint ? 'SHIFT SPRINT  ·  [Q] EMP TO STUN  ·  FIND A VENT TO HIDE' : '');
    this.escapeHint.setAlpha(showHint ? 0.85 : 0);

    const low = s.player.oxygen < 35;
    this.oxygen.setText(low ? `LOW OXYGEN — ${Math.round(s.player.oxygen)}%  GET OUT OF THE WATER` : '').setAlpha(low ? 0.6 + Math.sin(now * 0.012) * 0.4 : 0);

    const g = this.holdBar;
    g.clear();
    if (this.holdProgress > 0) {
      const w = 360;
      const x = GAME_WIDTH / 2 - w / 2;
      const y = GAME_HEIGHT / 2 + 110;
      g.fillStyle(0x02070b, 0.9).fillRect(x, y, w, 16);
      g.fillStyle(COLORS.cyan, 1).fillRect(x + 2, y + 2, (w - 4) * this.holdProgress, 12);
    }
  }
}
