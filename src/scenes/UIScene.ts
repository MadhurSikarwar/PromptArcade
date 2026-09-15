import Phaser from 'phaser';
import { getGameState, startNewRun } from '../systems/GameState';
import { HUD } from '../ui/HUD';
import { MessageFeed } from '../ui/MessageFeed';
import { ObjectiveUI } from '../ui/ObjectiveUI';
import { PauseMenu } from '../ui/PauseMenu';
import { GAME_HEIGHT, GAME_WIDTH, SCENES, TEXTURES } from '../utils/Constants';
import { DebugOverlay } from '../utils/Debug';
import { requireKeyboard } from '../utils/Helpers';

/** Screen-space layer running above GameScene, unaffected by camera zoom and alive while the game is paused. */
export class UIScene extends Phaser.Scene {
  private hud!: HUD;
  private debugOverlay!: DebugOverlay;
  private pauseMenu!: PauseMenu;

  constructor() {
    super(SCENES.ui);
  }

  create(): void {
    const state = getGameState();

    this.add.image(0, 0, TEXTURES.vignette).setOrigin(0);
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, TEXTURES.scanlines).setOrigin(0).setAlpha(0.05);

    const objective = new ObjectiveUI(this, state);
    const feed = new MessageFeed(this);
    this.hud = new HUD(this, state);
    this.debugOverlay = new DebugOverlay(this, state);
    this.pauseMenu = new PauseMenu(this);

    const unsubscribe = [
      state.events.on('notify', ({ text, tone }) => feed.notify(text, tone)),
      state.events.on('dialogue', ({ speaker, text }) => feed.say(speaker, text)),
      state.events.on('room-entered', ({ name, zone, accent, firstVisit }) => objective.setLocation(name, zone, accent, firstVisit)),
      state.events.on('objective-changed', ({ text }) => objective.setObjective(text)),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => unsubscribe.forEach((off) => off()));

    const keyboard = requireKeyboard(this);
    keyboard.on('keydown-ESC', () => this.togglePause());
    keyboard.on('keydown-R', () => {
      if (this.pauseMenu.isOpen) this.restartRun();
    });
  }

  override update(time: number): void {
    this.hud.update(time);
    this.debugOverlay.update(this.game.loop.actualFps);
  }

  private togglePause(): void {
    if (this.pauseMenu.isOpen) {
      this.pauseMenu.hide();
      this.scene.resume(SCENES.game);
    } else if (this.scene.isActive(SCENES.game)) {
      this.pauseMenu.show();
      this.scene.pause(SCENES.game);
    }
  }

  private restartRun(): void {
    this.pauseMenu.hide();
    startNewRun();
    this.scene.stop(SCENES.game);
    this.scene.start(SCENES.game);
  }
}
