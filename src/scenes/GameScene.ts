import Phaser from 'phaser';
import { Pathfinder } from '../ai/Pathfinder';
import { ElectricHazard, FloodZone } from '../entities/Hazard';
import { Player } from '../entities/Player';
import { SecurityCamera } from '../entities/SecurityCamera';
import { FacilityMap, TILE } from '../map/FacilityMap';
import { CAMERAS, DOORS, FLOODS, HAZARDS, PLAYER_SPAWN_TILE } from '../map/MapData';
import { AdaptiveAISystem } from '../systems/AdaptiveAISystem';
import { AlertSystem } from '../systems/AlertSystem';
import { audio } from '../systems/AudioManager';
import { DoorSystem } from '../systems/DoorSystem';
import { FloodSystem } from '../systems/FloodSystem';
import { getGameState, type DeckAction, type GameState } from '../systems/GameState';
import { HackingSystem } from '../systems/HackingSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { LightingSystem } from '../systems/LightingSystem';
import { NoiseSystem } from '../systems/NoiseSystem';
import { ObjectiveSystem } from '../systems/ObjectiveSystem';
import { PowerSystem } from '../systems/PowerSystem';
import { ThreatSystem } from '../systems/ThreatSystem';
import { InteractionPrompt } from '../ui/InteractionPrompt';
import { CAMERA_LERP, CAMERA_ZOOM, COLORS, DEPTH, EMP_COOLDOWN_MS, EMP_STUN_RADIUS, FLOOD_OXYGEN_DRAIN_PER_SEC, FLOOD_TIMER_MS, SCENES, TILE_SIZE } from '../utils/Constants';
import { DebugController } from '../utils/Debug';
import { requireKeyboard } from '../utils/Helpers';

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private map!: FacilityMap;
  private player!: Player;
  private doors!: DoorSystem;
  private interaction!: InteractionSystem;
  private lighting!: LightingSystem;
  private noise!: NoiseSystem;
  private power!: PowerSystem;
  private hacking!: HackingSystem;
  private adaptive!: AdaptiveAISystem;
  private alert!: AlertSystem;
  private threat!: ThreatSystem;
  private objective!: ObjectiveSystem;
  private flood!: FloodSystem;
  private securityCameras: SecurityCamera[] = [];
  private hazards: ElectricHazard[] = [];
  private floods: FloodZone[] = [];
  private structureDebug: Phaser.GameObjects.Graphics | null = null;
  private ending = false;
  private lastHazardHitAt = -99999;
  private lastSeenDamageAt = -99999;

  constructor() {
    super(SCENES.game);
  }

  create(): void {
    this.ending = false;
    this.structureDebug = null;
    this.state = getGameState();
    this.lastSeenDamageAt = this.state.player.lastDamageAt;

    audio.unlock();
    audio.setAmbience('facility');

    this.map = new FacilityMap(this);
    this.physics.world.setBounds(0, 0, this.map.widthPx, this.map.heightPx);

    const freshRun = !this.state.hasSpawned;
    const spawn = freshRun ? this.map.tileCenter(PLAYER_SPAWN_TILE.x, PLAYER_SPAWN_TILE.y) : { x: this.state.player.x, y: this.state.player.y };
    this.state.hasSpawned = true;
    this.player = new Player(this, spawn.x, spawn.y, this.state);
    this.physics.add.collider(this.player.sprite, this.map.collisionLayer);

    this.doors = new DoorSystem(this, this.state, DOORS, () => this.player.body);
    this.physics.add.collider(this.player.sprite, this.doors.blockers);

    const keyboard = requireKeyboard(this);
    const prompt = new InteractionPrompt(this);
    const interactKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.interaction = new InteractionSystem(this.state, prompt, interactKey);
    for (const door of this.doors.doors) this.interaction.register(door);

    this.lighting = new LightingSystem(this, this.state, this.map);
    this.noise = new NoiseSystem(this, this.state);
    this.power = new PowerSystem(this.state);
    this.adaptive = new AdaptiveAISystem(this.state);
    this.alert = new AlertSystem(this.state, this.doors);

    this.securityCameras = CAMERAS.map((layout) => new SecurityCamera(this, layout, this.state));
    this.hazards = HAZARDS.map((layout) => new ElectricHazard(this, layout, this.state));
    this.floods = FLOODS.map((layout) => new FloodZone(this, layout, this.state));
    this.flood = new FloodSystem(this, this.state, this.map);

    this.hacking = new HackingSystem(this, this.state, {
      doors: this.doors,
      lighting: this.lighting,
      map: this.map,
      alert: this.alert,
      adaptive: this.adaptive,
      player: () => ({ x: this.player.x, y: this.player.y }),
    });
    this.registry.set('hacking', this.hacking);

    const pathfinder = new Pathfinder(this.map.widthPx / TILE_SIZE, this.map.heightPx / TILE_SIZE, (x, y) => this.map.isWalkable(x, y));

    this.threat = new ThreatSystem(this, this.state, {
      map: this.map,
      doors: this.doors,
      lighting: this.lighting,
      pathfinder,
      cameras: this.securityCameras,
      hazards: this.hazards,
      adaptive: this.adaptive,
      player: () => ({ x: this.player.x, y: this.player.y, sprinting: this.state.player.movement === 'SPRINT' }),
      onPlayerHit: (fromX, fromY) => this.onPlayerHit(fromX, fromY),
    });

    const teleportPlayer = (x: number, y: number): void => {
      this.player.sprite.setPosition(x, y);
      this.player.body.reset(x, y);
      this.state.setPlayerPosition(x, y);
    };

    this.objective = new ObjectiveSystem({
      scene: this,
      state: this.state,
      map: this.map,
      doors: this.doors,
      interaction: this.interaction,
      hacking: this.hacking,
      power: this.power,
      lighting: this.lighting,
      threat: this.threat,
      adaptive: this.adaptive,
      player: () => this.player,
      interactKey,
      teleportPlayer,
      onEscape: () => this.onEscape(),
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.map.widthPx, this.map.heightPx);
    cam.setZoom(CAMERA_ZOOM);
    cam.startFollow(this.player.sprite, false, CAMERA_LERP, CAMERA_LERP);
    cam.setDeadzone(36, 24);
    cam.setBackgroundColor(COLORS.void);
    cam.fadeIn(900, 0, 0, 0);

    new DebugController(this, this.state, {
      setWorldDebug: (enabled) => this.setWorldDebug(enabled),
      restorePower: () => this.objective.debugRestorePower(),
      spawnOctopus: () => this.threat.spawn(this.player.x + 90, this.player.y, { hunt: true }),
      stunOctopus: () => this.threat.stunNear(this.player.x, this.player.y, 999999, this.time.now),
      triggerFinalChase: () => this.objective.debugFinalChase(),
    });

    keyboard.on('keydown-TAB', () => this.toggleDeck());
    keyboard.on('keydown-ONE', () => this.deckAction('cameras'));
    keyboard.on('keydown-TWO', () => this.deckAction('seal'));
    keyboard.on('keydown-THREE', () => this.deckAction('lights'));
    keyboard.on('keydown-FOUR', () => this.deckAction('decoy'));
    keyboard.on('keydown-Q', () => this.useEmp());
    keyboard.on('keydown-F', () => this.toggleFlashlight());

    const onResume = (): void => {
      keyboard.resetKeys();
    };
    this.events.on(Phaser.Scenes.Events.RESUME, onResume);
    const unsubscribe = [this.state.events.on('player-died', ({ cause }) => this.onPlayerDied(cause))];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.RESUME, onResume);
      unsubscribe.forEach((off) => off());
      this.doors.destroy();
      this.threat.destroy();
      this.hacking.destroy();
      this.objective.destroy();
      this.noise.destroy();
      audio.setAmbience('none');
    });

    this.scene.launch(SCENES.ui);
    this.updateRoom();
    if (freshRun) {
      this.state.setObjective('FIND A WAY OUT.');
      this.state.floodTriggerAt = this.time.now + FLOOD_TIMER_MS;
      this.state.saveCheckpoint();
      this.time.delayedCall(1200, () => this.state.say('DIVER', 'That floor just gave out... Where am I?'));
      this.time.delayedCall(6000, () => {
        if (!this.state.hasFlag('tutorialEmp')) {
          this.state.setFlag('tutorialEmp');
          this.state.notify('EMP EQUIPMENT — PRESS [Q] TO STUN THE OCTOPUS.', 'info');
        }
      });
    }
  }

  override update(_time: number, delta: number): void {
    if (this.ending) return;
    const dt = Math.min(delta, 50) / 1000;
    const now = this.time.now;

    this.player.setFrozen(this.state.modal === 'hack' || this.state.modal === 'cinematic');
    this.player.update(dt);
    this.updateRoom();

    if (this.state.player.lastDamageAt !== this.lastSeenDamageAt) {
      this.lastSeenDamageAt = this.state.player.lastDamageAt;
      this.flashPlayerDamage();
    }

    this.interaction.setEnabled(this.state.modal === 'none');
    this.interaction.update(this.player.x, this.player.y);

    this.doors.update(now);
    this.lighting.update(now, this.player.x, this.player.y, this.player.sprite.rotation);

    let seenByCamera = false;
    for (const cam of this.securityCameras) {
      const sees = cam.update(now, this.player.x, this.player.y, (a, b, c, d) => this.threat.los(a, b, c, d));
      if (sees) {
        seenByCamera = true;
        this.threat.cameraSighting(this.player.x, this.player.y, now);
      }
    }
    this.state.facility.camerasActive = this.securityCameras.filter((c) => c.isActive(now)).length;

    for (const hazard of this.hazards) {
      hazard.update(now);
      if (hazard.isLive(now) && hazard.bounds.contains(this.player.x, this.player.y) && now - this.lastHazardHitAt > 900) {
        this.lastHazardHitAt = now;
        audio.play('zap');
        this.state.damagePlayer(8, 'ELECTROCUTED', now);
        this.state.events.emit('screen-fx', { kind: 'red', duration: 300 });
      }
    }
    for (const flood of this.floods) flood.update(now);

    if (!this.state.flooding && this.state.floodTriggerAt > 0 && now >= this.state.floodTriggerAt) {
      this.flood.trigger(now);
    }
    this.flood.update(now, this.player.x, this.player.y);
    if (this.flood.isPlayerSubmerged()) {
      this.state.player.oxygen = Math.max(0, this.state.player.oxygen - FLOOD_OXYGEN_DRAIN_PER_SEC * dt);
      if (this.state.player.oxygen <= 0) this.state.damagePlayer(4 * dt, 'DROWNED', now);
    } else if (this.state.player.oxygen < this.state.player.maxOxygen) {
      this.state.player.oxygen = Math.min(this.state.player.maxOxygen, this.state.player.oxygen + FLOOD_OXYGEN_DRAIN_PER_SEC * 1.5 * dt);
    }

    const sprinting = this.state.player.movement === 'SPRINT';
    this.alert.update(dt, now, seenByCamera, sprinting);
    this.adaptive.update(dt, sprinting, this.lighting.isPlayerInDark(now));
    this.threat.update(dt, now);
    this.objective.update(dt, now);

    const octopus = this.threat.octopus;
    if (octopus) {
      const os = octopus.brain.state;
      if (os === 'HUNT' || os === 'ATTACK' || os === 'SEARCH' || os === 'INVESTIGATE' || os === 'FORCING') {
        const aggressive = os === 'HUNT' || os === 'ATTACK';
        this.lighting.addTempLight(octopus.x, octopus.y, aggressive ? 1.7 : 1.1, aggressive ? 0.6 : 0.38, now, 180);
      }
    }
  }

  private toggleDeck(): void {
    if (this.state.modal !== 'none' && this.state.modal !== 'deck') return;
    const now = this.time.now;
    const open = this.state.modal !== 'deck';
    if (open && now < this.state.cyberdeckOfflineUntil) {
      this.state.notify('CYBERDECK OFFLINE — EMP FEEDBACK', 'warning');
      return;
    }
    this.state.modal = open ? 'deck' : 'none';
    audio.play(open ? 'beep' : 'click');
  }

  private deckAction(action: DeckAction): void {
    if (this.state.modal !== 'deck') return;
    this.state.events.emit('deck-action', { action });
  }

  private useEmp(): void {
    if (this.state.modal === 'hack' || this.state.modal === 'cinematic') return;
    const now = this.time.now;
    if (now < this.state.empReadyAt) {
      this.state.notify(`EMP RECHARGING — ${Math.ceil((this.state.empReadyAt - now) / 1000)}s`, 'warning');
      return;
    }
    if (this.state.inventory.empCharges <= 0) {
      this.state.notify('NO EMP CHARGES', 'warning');
      return;
    }
    this.state.inventory.empCharges--;
    this.state.empReadyAt = now + EMP_COOLDOWN_MS;
    audio.play('emp');
    this.adaptive.record('emp');
    this.state.noise(this.player.x, this.player.y, 500, 'emp');
    this.state.events.emit('screen-fx', { kind: 'flash', duration: 300 });
    const stunned = this.threat.stunNear(this.player.x, this.player.y, EMP_STUN_RADIUS, now);
    for (const cam of this.securityCameras) {
      if (Phaser.Math.Distance.Between(cam.x, cam.y, this.player.x, this.player.y) < EMP_STUN_RADIUS) cam.disable(now, 8000);
    }
    for (const hazard of this.hazards) {
      if (Phaser.Math.Distance.Between(hazard.bounds.centerX, hazard.bounds.centerY, this.player.x, this.player.y) < EMP_STUN_RADIUS) hazard.disable(now, 8000);
    }
    if (this.state.modal === 'deck') this.state.modal = 'none';
    this.state.cyberdeckOfflineUntil = now + 6000;
    this.state.notify(stunned ? 'EMP DISCHARGED — A-3 STUNNED' : 'EMP DISCHARGED', 'success');
  }

  private toggleFlashlight(): void {
    this.state.player.flashlight = !this.state.player.flashlight;
    audio.play('click');
  }

  private flashPlayerDamage(): void {
    const sprite = this.player.sprite;
    sprite.setTint(0xff3b4e);
    this.time.delayedCall(160, () => sprite.clearTint());
  }

  private onPlayerHit(fromX: number, fromY: number): void {
    const dx = this.player.x - fromX;
    const dy = this.player.y - fromY;
    const len = Math.max(1, Math.hypot(dx, dy));
    this.player.body.setVelocity((dx / len) * 220, (dy / len) * 220);
  }

  private updateRoom(): void {
    const room = this.map.getRoomAt(this.player.x, this.player.y);
    if (room) {
      this.state.enterRoom(room.info.id, room.info.name, room.zoneName, room.info.accent);
    } else {
      this.state.enterRoom(null, 'CORRIDOR', '', 0x9fdcff);
    }
  }

  private setWorldDebug(enabled: boolean): void {
    const world = this.physics.world;
    if (enabled && !world.debugGraphic) world.createDebugGraphic();
    world.drawDebug = enabled;
    if (world.debugGraphic) {
      world.debugGraphic.clear();
      world.debugGraphic.setVisible(enabled);
    }

    if (enabled && !this.structureDebug) {
      const g = this.add.graphics().setDepth(DEPTH.fx);
      this.map.forEachSolidStructure((tx, ty, tile) => {
        g.lineStyle(1, tile === TILE.PROP ? COLORS.yellow : COLORS.magenta, 0.45);
        g.strokeRect(tx * TILE_SIZE + 0.5, ty * TILE_SIZE + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      });
      this.structureDebug = g;
    }
    this.structureDebug?.setVisible(enabled);
  }

  private onPlayerDied(cause: string): void {
    if (this.ending) return;
    this.ending = true;
    this.player.setFrozen(true);
    this.interaction.setEnabled(false);
    const cam = this.cameras.main;
    cam.shake(420, 0.01);
    cam.flash(260, 140, 0, 20);
    this.time.delayedCall(900, () => {
      cam.fadeOut(600, 0, 0, 0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.stop(SCENES.ui);
        this.scene.start(SCENES.gameOver, { cause });
      });
    });
  }

  private onEscape(): void {
    if (this.ending) return;
    this.ending = true;
    this.player.setFrozen(true);
    this.interaction.setEnabled(false);
    const cam = this.cameras.main;
    cam.fadeOut(1400, 0, 12, 20);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop(SCENES.ui);
      this.scene.start(SCENES.ending);
    });
  }
}
