import Phaser from 'phaser';
import type { HackingSystem } from '../systems/HackingSystem';
import { getGameState, startNewRun } from '../systems/GameState';
import { CinematicOverlay } from '../ui/CinematicOverlay';
import { CompassUI } from '../ui/CompassUI';
import { CyberdeckUI } from '../ui/CyberdeckUI';
import { HackingUI } from '../ui/HackingUI';
import { HUD } from '../ui/HUD';
import { LogPanel } from '../ui/LogPanel';
import { MessageFeed } from '../ui/MessageFeed';
import { MinimapUI } from '../ui/MinimapUI';
import { MissionUI } from '../ui/MissionUI';
import { ObjectiveUI } from '../ui/ObjectiveUI';
import { PauseMenu } from '../ui/PauseMenu';
import { RadarUI } from '../ui/RadarUI';
import { ThreatIndicator } from '../ui/ThreatIndicator';
import { WalkthroughUI } from '../ui/WalkthroughUI';
import { GAME_HEIGHT, GAME_WIDTH, SCENES, TEXTURES } from '../utils/Constants';
import { DebugOverlay } from '../utils/Debug';
import { requireKeyboard } from '../utils/Helpers';

/** Screen-space layer running above GameScene, unaffected by camera zoom and alive while the game is paused. */
export class UIScene extends Phaser.Scene {
  private hud!: HUD;
  private debugOverlay!: DebugOverlay;
  private pauseMenu!: PauseMenu;
  private cyberdeck!: CyberdeckUI;
  private hackingUI!: HackingUI;
  private threatIndicator!: ThreatIndicator;
  private logPanel!: LogPanel;
  private cinematic!: CinematicOverlay;
  private radar!: RadarUI;
  private walkthrough!: WalkthroughUI;
  private compass!: CompassUI;
  private minimap!: MinimapUI;

  constructor() {
    super(SCENES.ui);
  }

  create(): void {
    const state = getGameState();

    this.add.image(0, 0, TEXTURES.vignette).setOrigin(0);
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, TEXTURES.scanlines).setOrigin(0).setAlpha(0.05);

    const objective = new ObjectiveUI(this, state);
    const mission = new MissionUI(this, state);
    const feed = new MessageFeed(this);
    this.hud = new HUD(this, state);
    this.debugOverlay = new DebugOverlay(this, state);
    this.pauseMenu = new PauseMenu(this);
    this.cyberdeck = new CyberdeckUI(this, state, (action) => {
      const hacking = this.registry.get('hacking') as HackingSystem | undefined;
      return hacking ? hacking.cooldownLeft(action, this.time.now) : 0;
    });
    this.hackingUI = new HackingUI(this);
    this.threatIndicator = new ThreatIndicator(this, state);
    this.logPanel = new LogPanel(this);
    this.cinematic = new CinematicOverlay(this);
    this.radar = new RadarUI(this, state);
    this.walkthrough = new WalkthroughUI(this, state);
    this.compass = new CompassUI(this, state);
    this.minimap = new MinimapUI(this, state);

    const unsubscribe = [
      state.events.on('notify', ({ text, tone }) => feed.notify(text, tone)),
      state.events.on('dialogue', ({ speaker, text }) => feed.say(speaker, text)),
      state.events.on('room-entered', ({ name, zone, accent, firstVisit }) => objective.setLocation(name, zone, accent, firstVisit)),
      state.events.on('objective-changed', ({ text }) => objective.setObjective(text)),
      state.events.on('objective-complete', ({ label }) => {
        mission.render();
        this.walkthrough.render();
        this.compass.render();
        feed.notify(`✓ ${label}`, 'success');
      }),
      state.events.on('mission-changed', () => {
        mission.render();
        this.walkthrough.render();
        this.compass.render();
      }),
      state.events.on('hack-request', ({ title, difficulty, resolve }) => this.hackingUI.open(title, difficulty, resolve)),
      state.events.on('cinematic', ({ kind, done }) => {
        state.modal = 'cinematic';
        this.cinematic.play(kind, () => {
          state.modal = 'none';
          done();
        });
      }),
      state.events.on('log-show', ({ title, lines, accent }) => this.logPanel.show(title, lines, accent)),
      state.events.on('screen-fx', ({ kind, duration }) => this.threatIndicator.fx(kind, duration)),
      state.events.on('hold-progress', ({ label, progress }) => this.threatIndicator.setHold(label, progress)),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => unsubscribe.forEach((off) => off()));

    const keyboard = requireKeyboard(this);
    keyboard.on('keydown-ESC', () => this.togglePause());
    keyboard.on('keydown-R', () => {
      if (this.pauseMenu.isOpen) this.restartRun();
    });
    keyboard.on('keydown-H', () => this.walkthrough.toggle());
  }

  override update(time: number, delta: number): void {
    const state = getGameState();
    const dt = Math.min(delta, 50) / 1000;
    this.hud.update(time);
    this.debugOverlay.update(this.game.loop.actualFps);
    this.cyberdeck.setOpen(state.modal === 'deck');
    this.cyberdeck.update(time);
    this.hackingUI.update(dt);
    this.logPanel.update(dt);
    this.cinematic.update();
    this.threatIndicator.update(time);
    this.radar.update(time);
    this.compass.update(state.player.x, state.player.y, time);
    this.minimap.update();
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
