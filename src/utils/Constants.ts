export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const TILE_SIZE = 32;
export const CAMERA_ZOOM = 1.6;
export const CAMERA_LERP = 0.11;

export const FONT_MONO = '"Share Tech Mono", Consolas, "Lucida Console", "Courier New", monospace';

export const SCENES = {
  boot: 'BootScene',
  preload: 'PreloadScene',
  menu: 'MainMenuScene',
  game: 'GameScene',
  ui: 'UIScene',
  gameOver: 'GameOverScene',
} as const;

export const TEXTURES = {
  player: 'tex-player',
  glow: 'tex-glow',
  dot: 'tex-dot',
  vignette: 'tex-vignette',
  scanlines: 'tex-scanlines',
  collisionTiles: 'tex-collision-tiles',
  facility: 'tex-facility',
} as const;

/** Color language from the PRD: cyan = tech, magenta = hacking, green = accessible, yellow = hazard, red = danger, purple = advanced. */
export const COLORS = {
  cyan: 0x19e6ff,
  magenta: 0xff2bd6,
  green: 0x39ff9c,
  yellow: 0xffc23a,
  red: 0xff3b4e,
  purple: 0xa45bff,
  blue: 0x2f7bff,
  steel: 0x7f93a8,
  white: 0xe8f6ff,
  void: 0x020406,
  panel: 0x03080d,
} as const;

export const DEPTH = {
  floor: 0,
  doors: 10,
  player: 20,
  fx: 30,
  prompt: 100,
} as const;

export const PLAYER_TUNING = {
  walkSpeed: 118,
  sprintSpeed: 212,
  accelLambda: 16,
  decelLambda: 22,
  turnSpeed: 14,
  bodySize: 18,
  maxHealth: 100,
  maxStamina: 100,
  maxOxygen: 100,
  sprintDrainPerSec: 19,
  staminaRegenPerSec: 28,
  staminaRegenDelay: 0.45,
  exhaustedRecoverAt: 30,
} as const;

export const INTERACTION_RADIUS = 58;

export const START_EMP_CHARGES = 2;
export const START_POWER = 18;
