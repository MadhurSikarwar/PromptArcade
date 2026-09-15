import Phaser from 'phaser';
import { startNewRun } from '../systems/GameState';
import { uiText } from '../ui/UIKit';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES, TEXTURES } from '../utils/Constants';
import { requireKeyboard } from '../utils/Helpers';

/** Escape ending: surfaced, alive, and one last transmission from the facility below. */
export class EndingScene extends Phaser.Scene {
  private restarting = false;

  constructor() {
    super(SCENES.ending);
  }

  create(): void {
    this.restarting = false;
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x02080a).setOrigin(0);
    this.add.image(cx, GAME_HEIGHT / 2, TEXTURES.glow).setTint(COLORS.cyan).setAlpha(0.14).setScale(8, 4).setBlendMode(Phaser.BlendModes.ADD);

    const title = uiText(this, cx, GAME_HEIGHT * 0.32, 'YOU SURFACED', 60, '#19e6ff', true).setOrigin(0.5);
    title.setShadow(0, 0, '#19e6ff', 20, false, true);
    uiText(this, cx, GAME_HEIGHT * 0.32 + 56, 'A-3 REMAINS BELOW.', 16, '#7fa6b8').setOrigin(0.5);

    const signal = uiText(
      this,
      cx,
      GAME_HEIGHT * 0.55,
      ['DIVING COMPUTER', '', 'UNKNOWN SIGNAL DETECTED', 'SOURCE: POSEIDON FACILITY', 'TYPE: OUTGOING', 'DESTINATION: UNKNOWN', '', 'SIGNAL STATUS: ACTIVE'].join('\n'),
      14,
      '#ff2bd6',
      true,
    )
      .setOrigin(0.5)
      .setAlpha(0)
      .setLineSpacing(6);
    this.tweens.add({ targets: signal, alpha: 1, duration: 900, delay: 1400 });

    const prompt = uiText(this, cx, GAME_HEIGHT * 0.85, 'PRESS  ENTER  TO  RETURN', 18, '#e8f6ff', true).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: prompt, alpha: { from: 0.25, to: 1 }, duration: 900, delay: 2600, yoyo: true, repeat: -1 });

    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, TEXTURES.scanlines).setOrigin(0).setAlpha(0.12);
    this.add.image(0, 0, TEXTURES.vignette).setOrigin(0);
    this.cameras.main.fadeIn(1400, 0, 0, 0);

    const keyboard = requireKeyboard(this);
    keyboard.on('keydown-ENTER', () => this.toMenu());
    keyboard.on('keydown-SPACE', () => this.toMenu());
  }

  private toMenu(): void {
    if (this.restarting) return;
    this.restarting = true;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      startNewRun();
      this.scene.start(SCENES.menu);
    });
  }
}
