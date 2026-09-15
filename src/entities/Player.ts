import Phaser from 'phaser';
import type { GameState, PlayerMovementState } from '../systems/GameState';
import { COLORS, DEPTH, PLAYER_TUNING, TEXTURES } from '../utils/Constants';
import { damp, requireKeyboard } from '../utils/Helpers';
import { SPRITE_SCALE } from '../utils/TextureFactory';

interface MovementKeys {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  upAlt: Phaser.Input.Keyboard.Key;
  downAlt: Phaser.Input.Keyboard.Key;
  leftAlt: Phaser.Input.Keyboard.Key;
  rightAlt: Phaser.Input.Keyboard.Key;
  sprint: Phaser.Input.Keyboard.Key;
}

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly body: Phaser.Physics.Arcade.Body;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly keys: MovementKeys;
  private exhausted = false;
  private regenCooldown = 0;
  private frozen = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly state: GameState,
  ) {
    this.glow = scene.add
      .image(x, y, TEXTURES.glow)
      .setTint(COLORS.cyan)
      .setAlpha(0.22)
      .setScale(1.1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.player - 1);

    this.sprite = scene.physics.add.sprite(x, y, TEXTURES.player).setScale(SPRITE_SCALE).setDepth(DEPTH.player);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const size = PLAYER_TUNING.bodySize / SPRITE_SCALE;
    this.body.setSize(size, size, true);
    this.sprite.setCollideWorldBounds(true);

    const keyboard = requireKeyboard(scene);
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: keyboard.addKey(K.W),
      down: keyboard.addKey(K.S),
      left: keyboard.addKey(K.A),
      right: keyboard.addKey(K.D),
      upAlt: keyboard.addKey(K.UP),
      downAlt: keyboard.addKey(K.DOWN),
      leftAlt: keyboard.addKey(K.LEFT),
      rightAlt: keyboard.addKey(K.RIGHT),
      sprint: keyboard.addKey(K.SHIFT),
    };

    state.setPlayerPosition(x, y);
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  setFrozen(frozen: boolean): void {
    this.frozen = frozen;
    if (frozen) this.body.setVelocity(0, 0);
  }

  update(dt: number): void {
    const k = this.keys;
    let ix = 0;
    let iy = 0;
    if (!this.frozen) {
      ix = (k.right.isDown || k.rightAlt.isDown ? 1 : 0) - (k.left.isDown || k.leftAlt.isDown ? 1 : 0);
      iy = (k.down.isDown || k.downAlt.isDown ? 1 : 0) - (k.up.isDown || k.upAlt.isDown ? 1 : 0);
    }
    const moving = ix !== 0 || iy !== 0;
    if (moving) {
      // Normalize so diagonal movement is not faster than cardinal movement.
      const length = Math.hypot(ix, iy);
      ix /= length;
      iy /= length;
    }

    const stats = this.state.player;
    if (this.exhausted && stats.stamina >= PLAYER_TUNING.exhaustedRecoverAt) this.exhausted = false;
    const sprinting = moving && k.sprint.isDown && !this.exhausted && stats.stamina > 0;

    if (sprinting) {
      this.state.setStamina(stats.stamina - PLAYER_TUNING.sprintDrainPerSec * dt);
      this.regenCooldown = PLAYER_TUNING.staminaRegenDelay;
      if (stats.stamina <= 0) this.exhausted = true;
    } else {
      this.regenCooldown = Math.max(0, this.regenCooldown - dt);
      if (this.regenCooldown === 0) this.state.setStamina(stats.stamina + PLAYER_TUNING.staminaRegenPerSec * dt);
    }

    const speed = sprinting ? PLAYER_TUNING.sprintSpeed : PLAYER_TUNING.walkSpeed;
    const lambda = moving ? PLAYER_TUNING.accelLambda : PLAYER_TUNING.decelLambda;
    let vx = damp(this.body.velocity.x, ix * speed, lambda, dt);
    let vy = damp(this.body.velocity.y, iy * speed, lambda, dt);
    if (!moving && Math.abs(vx) < 3 && Math.abs(vy) < 3) {
      vx = 0;
      vy = 0;
    }
    this.body.setVelocity(vx, vy);

    if (moving) {
      const targetAngle = Math.atan2(iy, ix);
      this.sprite.rotation = Phaser.Math.Angle.RotateTo(this.sprite.rotation, targetAngle, PLAYER_TUNING.turnSpeed * dt);
    }

    const currentSpeed = Math.hypot(vx, vy);
    let movement: PlayerMovementState = 'IDLE';
    if (this.exhausted) movement = 'EXHAUSTED';
    else if (sprinting) movement = 'SPRINT';
    else if (currentSpeed > 8) movement = 'WALK';
    stats.movement = movement;

    this.glow.setPosition(this.sprite.x, this.sprite.y);
    this.glow.setAlpha(sprinting ? 0.3 : 0.22);
    this.state.setPlayerPosition(this.sprite.x, this.sprite.y);
  }
}
