import Phaser from 'phaser';
import { getCurrentProfile } from '../profile/Session';
import { DEFAULT_LOADOUT, loadLoadout, saveLoadout, type DiverLoadout } from '../profile/ProfileStore';
import { drawPanel, uiText } from '../ui/UIKit';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES, TEXTURES } from '../utils/Constants';
import { requireKeyboard, toHex } from '../utils/Helpers';
import { ensurePlayerTexture } from '../utils/TextureFactory';

const SUIT_SWATCHES = [0x23303c, 0x2a1a1a, 0x1a2a1a, 0x241a2e, 0x2e2410, 0x101820, 0x3a3a3a];
const ACCENT_SWATCHES = [0x19e6ff, 0xff2bd6, 0x39ff9c, 0xffc23a, 0xff3b4e, 0xa45bff, 0xffffff];

/** Diver appearance customization — suit tone and accent (visor/trim/lamp) color, saved per-profile. */
export class CustomizeScene extends Phaser.Scene {
  private loadout: DiverLoadout = { ...DEFAULT_LOADOUT };
  private preview!: Phaser.GameObjects.Image;
  private previewGlow!: Phaser.GameObjects.Image;
  private leaving = false;
  private suitSelector: Phaser.GameObjects.Arc[] = [];
  private accentSelector: Phaser.GameObjects.Arc[] = [];

  constructor() {
    super(SCENES.customize);
  }

  create(): void {
    this.leaving = false;
    const profile = getCurrentProfile();
    this.loadout = profile ? loadLoadout(profile.id) : { ...DEFAULT_LOADOUT };

    const cx = GAME_WIDTH / 2;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.void).setOrigin(0);
    this.add.image(cx, 140, TEXTURES.glow).setTint(COLORS.green).setAlpha(0.1).setScale(9, 2.4).setBlendMode(Phaser.BlendModes.ADD);

    uiText(this, cx, 46, 'CUSTOMIZE DIVER', 34, '#39ff9c', true).setOrigin(0.5).setShadow(0, 0, '#39ff9c', 16, false, true);
    uiText(this, cx, 80, 'CHOOSE A SUIT TONE AND AN ACCENT COLOR', 12, '#7fa6b8').setOrigin(0.5);

    // Live preview.
    this.previewGlow = this.add.image(cx, 210, TEXTURES.glow).setScale(1.6).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3);
    this.preview = this.add.image(cx, 210, TEXTURES.player).setScale(1.6);
    const previewPanel = this.add.graphics();
    drawPanel(previewPanel, cx - 90, 150, 180, 130, COLORS.cyan);
    this.children.moveTo(previewPanel, 0);

    uiText(this, 200, 320, 'SUIT TONE', 12, '#6f97a8', true);
    this.suitSelector = this.buildSwatchRow(200, 350, SUIT_SWATCHES, (color) => {
      this.loadout.suitColor = color;
      this.refreshPreview();
    });

    uiText(this, GAME_WIDTH - 200, 320, 'ACCENT COLOR', 12, '#6f97a8', true).setOrigin(1, 0);
    this.accentSelector = this.buildSwatchRow(GAME_WIDTH - 200 - (ACCENT_SWATCHES.length - 1) * 46, 350, ACCENT_SWATCHES, (color) => {
      this.loadout.accentColor = color;
      this.refreshPreview();
    });

    this.refreshPreview();

    this.makeButton(cx - 110, GAME_HEIGHT - 90, 200, 46, '💾  SAVE LOADOUT', COLORS.green, () => this.save());
    this.makeButton(cx + 110, GAME_HEIGHT - 90, 200, 46, '↺  RESET DEFAULT', COLORS.steel, () => this.reset());

    const back = uiText(this, cx, GAME_HEIGHT - 30, '[ESC]  BACK TO MENU', 13, '#e8f6ff', true).setOrigin(0.5);
    this.tweens.add({ targets: back, alpha: 0.4, duration: 900, yoyo: true, repeat: -1 });

    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, TEXTURES.scanlines).setOrigin(0).setAlpha(0.1);
    this.add.image(0, 0, TEXTURES.vignette).setOrigin(0);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    const keyboard = requireKeyboard(this);
    keyboard.on('keydown-ESC', () => this.back());
  }

  private buildSwatchRow(startX: number, y: number, colors: number[], onPick: (color: number) => void): Phaser.GameObjects.Arc[] {
    const swatches: Phaser.GameObjects.Arc[] = [];
    colors.forEach((color, i) => {
      const x = startX + i * 46;
      const ring = this.add.circle(x, y, 17).setStrokeStyle(2, 0xffffff, 0).setDepth(1);
      const fill = this.add.circle(x, y, 14, color).setInteractive({ useHandCursor: true }).setDepth(2);
      fill.on('pointerover', () => fill.setScale(1.12));
      fill.on('pointerout', () => fill.setScale(1));
      fill.on('pointerdown', () => onPick(color));
      (fill as Phaser.GameObjects.Arc & { ring?: Phaser.GameObjects.Arc; color?: number }).ring = ring;
      (fill as Phaser.GameObjects.Arc & { ring?: Phaser.GameObjects.Arc; color?: number }).color = color;
      swatches.push(fill);
    });
    return swatches;
  }

  private refreshPreview(): void {
    const key = ensurePlayerTexture(this, this.loadout.suitColor, this.loadout.accentColor);
    this.preview.setTexture(key);
    this.previewGlow.setTint(this.loadout.accentColor);

    for (const selector of [this.suitSelector, this.accentSelector]) {
      for (const swatch of selector) {
        const extra = swatch as Phaser.GameObjects.Arc & { ring?: Phaser.GameObjects.Arc; color?: number };
        const active = extra.color === this.loadout.suitColor || extra.color === this.loadout.accentColor;
        extra.ring?.setStrokeStyle(2, 0xffffff, active ? 0.9 : 0);
      }
    }
  }

  private save(): void {
    const profile = getCurrentProfile();
    if (profile) saveLoadout(profile.id, this.loadout);
    this.back();
  }

  private reset(): void {
    this.loadout = { ...DEFAULT_LOADOUT };
    this.refreshPreview();
  }

  private makeButton(x: number, y: number, w: number, h: number, label: string, accent: number, onClick: () => void): void {
    const box = this.add.rectangle(x, y, w, h, accent, 0.16).setStrokeStyle(1.5, accent, 1).setInteractive({ useHandCursor: true });
    const text = uiText(this, x, y, label, 14, toHex(accent), true).setOrigin(0.5);
    box.on('pointerover', () => box.setFillStyle(accent, 0.3));
    box.on('pointerout', () => box.setFillStyle(accent, 0.16));
    box.on('pointerdown', () => {
      this.tweens.add({ targets: [box, text], scale: 0.95, duration: 60, yoyo: true });
      onClick();
    });
  }

  private back(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(SCENES.menu));
  }
}
