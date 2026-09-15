import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { FacilityMap, TILE } from '../map/FacilityMap';
import { DOORS, PLAYER_SPAWN_TILE } from '../map/MapData';
import { DoorSystem } from '../systems/DoorSystem';
import { getGameState, type GameState } from '../systems/GameState';
import { InteractionSystem } from '../systems/InteractionSystem';
import { InteractionPrompt } from '../ui/InteractionPrompt';
import { CAMERA_LERP, CAMERA_ZOOM, COLORS, DEPTH, SCENES, TILE_SIZE } from '../utils/Constants';
import { DebugController } from '../utils/Debug';
import { requireKeyboard } from '../utils/Helpers';

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private map!: FacilityMap;
  private player!: Player;
  private doors!: DoorSystem;
  private interaction!: InteractionSystem;
  private structureDebug: Phaser.GameObjects.Graphics | null = null;
  private ending = false;

  constructor() {
    super(SCENES.game);
  }

  create(): void {
    this.ending = false;
    this.structureDebug = null;
    this.state = getGameState();

    this.map = new FacilityMap(this);
    this.physics.world.setBounds(0, 0, this.map.widthPx, this.map.heightPx);

    const spawn = this.map.tileCenter(PLAYER_SPAWN_TILE.x, PLAYER_SPAWN_TILE.y);
    this.player = new Player(this, spawn.x, spawn.y, this.state);
    this.physics.add.collider(this.player.sprite, this.map.collisionLayer);

    this.doors = new DoorSystem(this, this.state, DOORS, () => this.player.body);
    this.physics.add.collider(this.player.sprite, this.doors.blockers);

    const keyboard = requireKeyboard(this);
    const prompt = new InteractionPrompt(this);
    this.interaction = new InteractionSystem(this.state, prompt, keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E));
    for (const door of this.doors.doors) this.interaction.register(door);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.map.widthPx, this.map.heightPx);
    cam.setZoom(CAMERA_ZOOM);
    cam.startFollow(this.player.sprite, false, CAMERA_LERP, CAMERA_LERP);
    cam.setDeadzone(36, 24);
    cam.setBackgroundColor(COLORS.void);
    cam.fadeIn(900, 0, 0, 0);

    new DebugController(this, this.state, { setWorldDebug: (enabled) => this.setWorldDebug(enabled) });

    // Keys released while paused would otherwise stay "down" after resuming.
    const onResume = (): void => {
      keyboard.resetKeys();
    };
    this.events.on(Phaser.Scenes.Events.RESUME, onResume);
    const unsubscribe = [this.state.events.on('player-died', ({ cause }) => this.onPlayerDied(cause))];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.RESUME, onResume);
      unsubscribe.forEach((off) => off());
    });

    this.scene.launch(SCENES.ui);
    this.updateRoom();
    this.state.setObjective('FIND A WAY OUT.');
    this.time.delayedCall(1200, () => this.state.say('DIVER', 'That floor just gave out... Where am I?'));
  }

  override update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    this.player.update(dt);
    this.updateRoom();
    this.interaction.update(this.player.x, this.player.y);
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
}
