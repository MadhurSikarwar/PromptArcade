import Phaser from 'phaser';
import { startNewRun } from '../systems/GameState';
import { uiText } from '../ui/UIKit';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES, TEXTURES } from '../utils/Constants';
import { requireKeyboard } from '../utils/Helpers';

interface GameOverData {
  cause?: string;
}

export class GameOverScene extends Phaser.Scene {
  private cause = 'UNKNOWN';
  private restarting = false;

  constructor() {
    super(SCENES.gameOver);
  }

  init(data: GameOverData): void {
    this.cause = data.cause ?? 'UNKNOWN';
    this.restarting = false;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x070103).setOrigin(0);
    this.add.image(cx, GAME_HEIGHT / 2, TEXTURES.glow).setTint(COLORS.red).setAlpha(0.12).setScale(8, 4).setBlendMode(Phaser.BlendModes.ADD);

    const title = uiText(this, cx, GAME_HEIGHT * 0.4, 'SIGNAL LOST', 84, '#ff3b4e', true).setOrigin(0.5);
    title.setShadow(0, 0, '#ff3b4e', 20, false, true);
    uiText(this, cx, GAME_HEIGHT * 0.4 + 70, `CAUSE: ${this.cause}`, 16, '#c78a92').setOrigin(0.5);
    const prompt = uiText(this, cx, GAME_HEIGHT * 0.7, 'PRESS  ENTER  TO  RETRY', 20, '#e8f6ff', true).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 800, yoyo: true, repeat: -1 });

    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, TEXTURES.scanlines).setOrigin(0).setAlpha(0.15);
    this.add.image(0, 0, TEXTURES.vignette).setOrigin(0);
    this.cameras.main.fadeIn(500, 0, 0, 0);

    const keyboard = requireKeyboard(this);
    keyboard.on('keydown-ENTER', () => this.retry());
    keyboard.on('keydown-SPACE', () => this.retry());
  }

  private retry(): void {
    if (this.restarting) return;
    this.restarting = true;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      startNewRun();
      this.scene.start(SCENES.game);
    });
  }
}
