export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const TILE_SIZE = 32;
export const CAMERA_ZOOM = 1.6;
export const CAMERA_LERP = 0.11;

export const FONT_MONO = '"Share Tech Mono", Consolas, "Lucida Console", "Courier New", monospace';

export const SCENES = {
  boot: 'BootScene',
  preload: 'PreloadScene',
  auth: 'AuthScene',
  menu: 'MainMenuScene',
  personalLog: 'PersonalLogScene',
  customize: 'CustomizeScene',
  game: 'GameScene',
  ui: 'UIScene',
  gameOver: 'GameOverScene',
  ending: 'EndingScene',
} as const;

export const TEXTURES = {
  player: 'tex-player',
  octopus: 'tex-octopus',
  glow: 'tex-glow',
  cone: 'tex-cone',
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
  hazards: 5,
  doors: 10,
  pickups: 12,
  player: 20,
  octopus: 25,
  darkness: 50,
  aboveDark: 60,
  fx: 70,
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
export const MAX_EMP_CHARGES = 3;
export const START_POWER = 18;
export const EMP_COOLDOWN_MS = 15000;
export const EMP_STUN_RADIUS = 260;
export const OCTOPUS_ATTACK_DAMAGE = 22;
export const OCTOPUS_ATTACK_DAMAGE_FINAL = 28;

export const FLOOD_TIMER_MS = 240000;
export const FLOOD_RISE_MS = 90000;
export const FLOOD_OXYGEN_DRAIN_PER_SEC = 3.2;
export const RADAR_RANGE = 900;
