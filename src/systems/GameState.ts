import Phaser from 'phaser';
import { PLAYER_TUNING, START_EMP_CHARGES, START_POWER } from '../utils/Constants';
import { clamp } from '../utils/Helpers';

export type KeycardLevel = 1 | 2 | 3;
export type PlayerMovementState = 'IDLE' | 'WALK' | 'SPRINT' | 'EXHAUSTED';
export type DoorState = 'LOCKED' | 'CLOSED' | 'OPEN' | 'DISABLED';
export type NotifyTone = 'info' | 'success' | 'warning' | 'danger' | 'debug';
export type LightingMode = 'NORMAL' | 'EMERGENCY' | 'POWER_OFF';

export const KEYCARD_LEVELS: readonly KeycardLevel[] = [1, 2, 3];

export interface GameEventMap {
  notify: { text: string; tone: NotifyTone };
  dialogue: { speaker: string; text: string };
  'room-entered': { roomId: string | null; name: string; zone: string; accent: number; firstVisit: boolean };
  'keycard-acquired': { level: KeycardLevel };
  'power-changed': { power: number };
  'alert-changed': { alert: number };
  'lockdown-changed': { lockdown: boolean };
  'objective-changed': { text: string };
  'door-changed': { id: string; state: DoorState };
  'player-died': { cause: string };
  'debug-toggled': { enabled: boolean };
}

type Listener<K extends keyof GameEventMap> = (payload: GameEventMap[K]) => void;

/** Typed wrapper so systems talk through named, checked events instead of direct references. */
export class GameEvents {
  private readonly emitter = new Phaser.Events.EventEmitter();

  /** Returns an unsubscribe function; scenes call it on shutdown to avoid leaking listeners. */
  on<K extends keyof GameEventMap>(event: K, listener: Listener<K>): () => void {
    this.emitter.on(event, listener);
    return () => {
      this.emitter.off(event, listener);
    };
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    this.emitter.emit(event, payload);
  }

  removeAll(): void {
    this.emitter.removeAllListeners();
  }
}

export interface PlayerData {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  oxygen: number;
  maxOxygen: number;
  x: number;
  y: number;
  movement: PlayerMovementState;
  alive: boolean;
}

export interface InventoryData {
  keycards: Record<KeycardLevel, boolean>;
  empCharges: number;
}

export interface FacilityData {
  power: number;
  alert: number;
  lockdown: boolean;
  lighting: LightingMode;
}

export interface OctopusData {
  spawned: boolean;
  state: string;
  awareness: number;
}

export function alertLabel(alert: number, lockdown: boolean): string {
  if (lockdown || alert >= 100) return 'LOCKDOWN';
  if (alert >= 75) return 'HIGH ALERT';
  if (alert >= 50) return 'ELEVATED';
  if (alert >= 25) return 'SECURITY ACTIVITY';
  return 'NORMAL';
}

/** Single source of truth for one run of the game. */
export class GameState {
  readonly events = new GameEvents();

  readonly player: PlayerData = {
    health: PLAYER_TUNING.maxHealth,
    maxHealth: PLAYER_TUNING.maxHealth,
    stamina: PLAYER_TUNING.maxStamina,
    maxStamina: PLAYER_TUNING.maxStamina,
    oxygen: PLAYER_TUNING.maxOxygen,
    maxOxygen: PLAYER_TUNING.maxOxygen,
    x: 0,
    y: 0,
    movement: 'IDLE',
    alive: true,
  };

  readonly inventory: InventoryData = {
    keycards: { 1: false, 2: false, 3: false },
    empCharges: START_EMP_CHARGES,
  };

  readonly facility: FacilityData = {
    power: START_POWER,
    alert: 0,
    lockdown: false,
    lighting: 'EMERGENCY',
  };

  readonly octopus: OctopusData = {
    spawned: false,
    state: 'NOT SPAWNED',
    awareness: 0,
  };

  readonly doors = new Map<string, DoorState>();
  readonly visitedRooms = new Set<string>();

  objective = 'FIND A WAY OUT.';
  currentRoomId: string | null = null;
  currentRoomName = 'UNKNOWN';
  debugEnabled = false;
  nearbyInteractables: string[] = [];

  setPlayerPosition(x: number, y: number): void {
    this.player.x = x;
    this.player.y = y;
  }

  setStamina(value: number): void {
    this.player.stamina = clamp(value, 0, this.player.maxStamina);
  }

  damagePlayer(amount: number, cause: string): void {
    if (!this.player.alive) return;
    this.player.health = clamp(this.player.health - amount, 0, this.player.maxHealth);
    if (this.player.health <= 0) {
      this.player.alive = false;
      this.events.emit('player-died', { cause });
    }
  }

  hasKeycard(level: KeycardLevel): boolean {
    return this.inventory.keycards[level];
  }

  giveKeycard(level: KeycardLevel): void {
    if (this.inventory.keycards[level]) return;
    this.inventory.keycards[level] = true;
    this.events.emit('keycard-acquired', { level });
    this.notify(`LEVEL ${level} ACCESS CARD ACQUIRED`, 'success');
  }

  setPower(value: number): void {
    const power = clamp(Math.round(value), 0, 100);
    if (power === this.facility.power) return;
    this.facility.power = power;
    this.events.emit('power-changed', { power });
  }

  setAlert(value: number): void {
    const alert = clamp(Math.round(value), 0, 100);
    if (alert === this.facility.alert) return;
    this.facility.alert = alert;
    this.events.emit('alert-changed', { alert });
  }

  setLockdown(lockdown: boolean): void {
    if (lockdown === this.facility.lockdown) return;
    this.facility.lockdown = lockdown;
    this.events.emit('lockdown-changed', { lockdown });
  }

  setObjective(text: string): void {
    if (text === this.objective) return;
    this.objective = text;
    this.events.emit('objective-changed', { text });
  }

  setDoorState(id: string, state: DoorState): void {
    if (this.doors.get(id) === state) return;
    this.doors.set(id, state);
    this.events.emit('door-changed', { id, state });
  }

  enterRoom(roomId: string | null, name: string, zone: string, accent: number): void {
    if (roomId === this.currentRoomId && name === this.currentRoomName) return;
    this.currentRoomId = roomId;
    this.currentRoomName = name;
    const firstVisit = roomId !== null && !this.visitedRooms.has(roomId);
    if (roomId !== null) this.visitedRooms.add(roomId);
    this.events.emit('room-entered', { roomId, name, zone, accent, firstVisit });
  }

  notify(text: string, tone: NotifyTone = 'info'): void {
    this.events.emit('notify', { text, tone });
  }

  say(speaker: string, text: string): void {
    this.events.emit('dialogue', { speaker, text });
  }

  setDebug(enabled: boolean): void {
    this.debugEnabled = enabled;
    this.events.emit('debug-toggled', { enabled });
  }
}

let activeState: GameState | null = null;

/** Discards the previous run (and every listener attached to it) and starts a clean one. */
export function startNewRun(): GameState {
  activeState?.events.removeAll();
  activeState = new GameState();
  return activeState;
}

export function getGameState(): GameState {
  return activeState ?? startNewRun();
}
