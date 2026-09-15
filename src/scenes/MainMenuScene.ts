import Phaser from 'phaser';
import { startNewRun } from '../systems/GameState';
import { uiText } from '../ui/UIKit';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES, TEXTURES } from '../utils/Constants';
import { requireKeyboard } from '../utils/Helpers';

export class MainMenuScene extends Phaser.Scene {
  private starting = false;

  constructor() {
    super(SCENES.menu);
  }

  create(): void {
    this.starting = false;
    const cx = GAME_WIDTH / 2;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.void).setOrigin(0);
    this.add
      .image(cx, GAME_HEIGHT * 0.42, TEXTURES.glow)
      .setTint(COLORS.cyan)
      .setAlpha(0.14)
      .setScale(9, 4)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.add.particles(0, 0, TEXTURES.dot, {
      x: { min: 0, max: GAME_WIDTH },
      y: GAME_HEIGHT + 10,
      lifespan: 9000,
      speedY: { min: -70, max: -25 },
      speedX: { min: -8, max: 8 },
      scale: { min: 0.15, max: 0.6 },
      alpha: { start: 0.4, end: 0 },
      tint: COLORS.cyan,
      frequency: 140,
      blendMode: Phaser.BlendModes.ADD,
    });

    const ghost = uiText(this, cx + 4, GAME_HEIGHT * 0.38 + 2, 'NEON DIVER', 104, '#ff2bd6', true)
      .setOrigin(0.5)
      .setAlpha(0.35)
      .setBlendMode(Phaser.BlendModes.ADD);
    const title = uiText(this, cx, GAME_HEIGHT * 0.38, 'NEON DIVER', 104, '#19e6ff', true).setOrigin(0.5);
    title.setShadow(0, 0, '#19e6ff', 24, false, true);

    uiText(this, cx, GAME_HEIGHT * 0.38 + 80, '—  D E E P E R   T H A N   S A F E  —', 22, '#ff5fd8', true).setOrigin(0.5);

    const prompt = uiText(this, cx, GAME_HEIGHT * 0.68, 'PRESS  ENTER  TO  DIVE', 20, '#e8f6ff', true).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    uiText(this, cx, GAME_HEIGHT - 48, 'WASD  MOVE     SHIFT  SPRINT     E  INTERACT     ESC  PAUSE', 13, '#4f7688').setOrigin(0.5);

    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, TEXTURES.scanlines).setOrigin(0).setAlpha(0.12);
    this.add.image(0, 0, TEXTURES.vignette).setOrigin(0);

    // Occasional failing-neon flicker on the title.
    this.time.addEvent({
      delay: 2400,
      loop: true,
      callback: () => {
        this.tweens.add({ targets: [title, ghost], alpha: { from: 0.2, to: 1 }, duration: 60, yoyo: true, repeat: 2 });
        ghost.setX(cx + Phaser.Math.Between(-6, 6));
      },
    });

    const keyboard = requireKeyboard(this);
    keyboard.on('keydown-ENTER', () => this.startGame());
    keyboard.on('keydown-SPACE', () => this.startGame());
    this.input.on('pointerdown', () => this.startGame());
    this.cameras.main.fadeIn(700, 0, 0, 0);
  }

  private startGame(): void {
    if (this.starting) return;
    this.starting = true;
    this.cameras.main.fadeOut(650, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      startNewRun();
      this.scene.start(SCENES.game);
    });
  }
}
