import Phaser from 'phaser';
import type { HackingSystem } from '../systems/HackingSystem';
import { audio } from '../systems/AudioManager';
import { getGameState, startNewRun } from '../systems/GameState';
import { CinematicOverlay } from '../ui/CinematicOverlay';
import { CompassUI } from '../ui/CompassUI';
import type { DroneSystem } from '../systems/DroneSystem';
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
import { isTouchDevice, TouchControls } from '../ui/TouchControls';
import { WalkthroughUI } from '../ui/WalkthroughUI';
import { uiText } from '../ui/UIKit';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES, TEXTURES } from '../utils/Constants';
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
  private touchControls: TouchControls | null = null;

  constructor() {
    super(SCENES.ui);
  }

  create(): void {
    const state = getGameState();

    this.add.image(0, 0, TEXTURES.vignette).setOrigin(0);
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, TEXTURES.scanlines).setOrigin(0).setAlpha(0.08);

    // Faint ambient scan beam — a persistent "under surveillance" cyberpunk texture.
    const beam = this.add.rectangle(0, -4, GAME_WIDTH, 2, COLORS.cyan, 0.045).setOrigin(0, 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(2);
    this.tweens.add({ targets: beam, y: GAME_HEIGHT, duration: 7000, repeat: -1, ease: 'Sine.easeInOut', yoyo: true });

    // Screen-locked drifting particulate — reads as debris floating right in front of the "lens",
    // a cheap foreground depth layer that separates the HUD/world behind it from the viewer.
    this.add
      .particles(0, 0, TEXTURES.dot, {
        x: { min: 0, max: GAME_WIDTH },
        y: { min: 0, max: GAME_HEIGHT },
        lifespan: 14000,
        speedX: { min: -6, max: 6 },
        speedY: { min: -4, max: 8 },
        scale: { min: 0.08, max: 0.3 },
        alpha: { start: 0.22, end: 0 },
        tint: [COLORS.cyan, COLORS.white],
        frequency: 260,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(3);

    const objective = new ObjectiveUI(this, state);
    const mission = new MissionUI(this, state);
    const feed = new MessageFeed(this);
    this.hud = new HUD(this, state);
    this.debugOverlay = new DebugOverlay(this, state);
    this.pauseMenu = new PauseMenu(
      this,
      () => this.restartRun(),
      () => this.quitToMenu(),
    );
    this.cyberdeck = new CyberdeckUI(
      this,
      state,
      (action) => {
        const hacking = this.registry.get('hacking') as HackingSystem | undefined;
        return hacking ? hacking.cooldownLeft(action, this.time.now) : 0;
      },
      () => {
        const drones = this.registry.get('drones') as DroneSystem | undefined;
        return drones ? { total: drones.count, alert: drones.alertCount } : { total: 0, alert: 0 };
      },
    );
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
    if (isTouchDevice()) this.touchControls = new TouchControls(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribe.forEach((off) => off());
      this.touchControls?.destroy();
      this.touchControls = null;
    });

    const keyboard = requireKeyboard(this);
    keyboard.on('keydown-ESC', () => this.togglePause());
    keyboard.on('keydown-R', () => {
      if (this.pauseMenu.isOpen) this.restartRun();
    });
    keyboard.on('keydown-B', () => {
      if (this.pauseMenu.isOpen) this.quitToMenu();
    });
    keyboard.on('keydown-H', () => this.walkthrough.toggle());
    keyboard.on('keydown-M', () => this.minimap.toggle());

    const muteLabel = uiText(this, GAME_WIDTH - 20, GAME_HEIGHT - 20, '🔇 AUDIO MUTED — [V] UNMUTE', 12, '#ff3b4e', true).setOrigin(1, 1).setVisible(audio.isMuted);
    keyboard.on('keydown-V', () => {
      const muted = audio.toggleMute();
      muteLabel.setVisible(muted);
      if (!muted) state.notify('AUDIO ON', 'info');
    });
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

  /** Bails out of the current run entirely and returns to the main menu — the pause menu had no way to do this before. */
  private quitToMenu(): void {
    this.pauseMenu.hide();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop(SCENES.game);
      this.scene.stop(SCENES.ui);
      this.scene.start(SCENES.menu);
    });
  }
}
