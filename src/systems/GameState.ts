import Phaser from 'phaser';
import { MISSIONS } from '../data/missions';
import { COLORS, MAX_EMP_CHARGES, PLAYER_TUNING, START_POWER } from '../utils/Constants';
import { getDifficultyTuning } from './Difficulty';
import { clamp } from '../utils/Helpers';

export type KeycardLevel = 'security' | 'research' | 'experiment' | 'upper';

export const KEYCARD_LABELS: Record<KeycardLevel, string> = {
  security: 'SECURITY',
  research: 'RESEARCH',
  experiment: 'EXPERIMENT',
  upper: 'UPPER FACILITY ACCESS',
};

export const KEYCARD_COLORS: Record<KeycardLevel, number> = {
  security: COLORS.blue,
  research: COLORS.green,
  experiment: COLORS.purple,
  upper: COLORS.red,
};
export type PlayerMovementState = 'IDLE' | 'WALK' | 'SPRINT' | 'EXHAUSTED';
export type DoorState = 'LOCKED' | 'CLOSED' | 'OPEN' | 'DISABLED';
export type NotifyTone = 'info' | 'success' | 'warning' | 'danger' | 'debug' | 'a3';
export type LightingMode = 'NORMAL' | 'EMERGENCY' | 'POWER_OFF';
export type UIModal = 'none' | 'hack' | 'deck' | 'cinematic';
export type DeckAction = 'cameras' | 'seal' | 'lights' | 'decoy' | 'drones';
export type CinematicKind = 'awakening' | 'security-feeds' | 'final-reveal' | 'reactor-overload' | 'neural-override';

export type EndingKind = 'escape' | 'destroy' | 'free';

export type FlagId =
  | 'hasPowerCell'
  | 'medbayRestored'
  | 'securityOnline'
  | 'generatorOn'
  | 'powerRouted'
  | 'coolingOn'
  | 'facilityPower'
  | 'a3Active'
  | 'serverData'
  | 'labLog'
  | 'aquariumSeen'
  | 'upperKey'
  | 'upperUnlocked'
  | 'inUpperFacility'
  | 'finalReveal'
  | 'escaped'
  | 'reactorOverloaded'
  | 'a3Freed'
  | 'hubRelayDone'
  | 'tutorialThreat'
  | 'tutorialEmp'
  | 'tutorialKeycard'
  | 'tutorialLockedDoor';

export const KEYCARD_LEVELS: readonly KeycardLevel[] = ['security', 'research', 'experiment', 'upper'];

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
  'flag-set': { flag: FlagId };
  noise: { x: number; y: number; radius: number; source: string };
  'hack-request': { title: string; difficulty: number; resolve: (success: boolean) => void };
  'log-show': { title: string; lines: string[]; accent?: number };
  cinematic: { kind: CinematicKind; done: () => void };
  'screen-fx': { kind: 'flash' | 'glitch' | 'shake' | 'red'; duration?: number };
  'deck-action': { action: DeckAction };
  'hold-progress': { label: string; progress: number };
  'objective-complete': { id: string; label: string };
  'mission-changed': { index: number };
  'player-damaged': { amount: number; cause: string };
}

type Listener<K extends keyof GameEventMap> = (payload: GameEventMap[K]) => void;

export class GameEvents {
  private readonly emitter = new Phaser.Events.EventEmitter();

  on<K extends keyof GameEventMap>(event: K, listener: Listener<K>): () => void {
    this.emitter.on(event, listener);
    return () => {
      this.emitter.off(event, listener);
    };
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    this.emitter.emit(event, payload);
  }

  listenerCount(event: keyof GameEventMap): number {
    return this.emitter.listenerCount(event);
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
  flashlight: boolean;
  hidden: boolean;
  lastDamageAt: number;
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
  camerasActive: number;
}

export interface OctopusData {
  spawned: boolean;
  state: string;
  awareness: number;
  x: number;
  y: number;
  distance: number;
}

export interface AdaptationData {
  sprintSeconds: number;
  darkSeconds: number;
  ventUses: number;
  empUses: number;
  doorSeals: number;
  lightToggles: number;
  roomVisits: Record<string, number>;
  learned: Set<string>;
}

export interface CheckpointSnapshot {
  x: number;
  y: number;
  health: number;
  keycards: Record<KeycardLevel, boolean>;
  empCharges: number;
  flags: FlagId[];
  power: number;
  missionIndex: number;
  completedObjectives: string[];
  objective: string;
}

export function alertLabel(alert: number, lockdown: boolean): string {
  if (lockdown || alert >= 100) return 'LOCKDOWN';
  if (alert >= 75) return 'HIGH ALERT';
  if (alert >= 50) return 'ELEVATED';
  if (alert >= 25) return 'SECURITY ACTIVITY';
  return 'NORMAL';
}

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
    flashlight: true,
    hidden: false,
    lastDamageAt: -99999,
  };

  readonly inventory: InventoryData = {
    keycards: { security: false, research: false, experiment: false, upper: false },
    empCharges: getDifficultyTuning().startEmpCharges,
  };
  readonly facility: FacilityData = { power: START_POWER, alert: 0, lockdown: false, lighting: 'POWER_OFF', camerasActive: 0 };
  readonly octopus: OctopusData = { spawned: false, state: 'NOT SPAWNED', awareness: 0, x: 0, y: 0, distance: Infinity };
  readonly adaptation: AdaptationData = { sprintSeconds: 0, darkSeconds: 0, ventUses: 0, empUses: 0, doorSeals: 0, lightToggles: 0, roomVisits: {}, learned: new Set() };
  readonly flags = new Set<FlagId>();
  readonly doors = new Map<string, DoorState>();
  readonly visitedRooms = new Set<string>();

  objective = 'FIND A WAY OUT.';
  currentRoomId: string | null = null;
  currentRoomName = 'UNKNOWN';
  debugEnabled = false;
  nearbyInteractables: string[] = [];
  modal: UIModal = 'none';
  cyberdeckOfflineUntil = 0;
  camerasLoopedUntil = 0;
  finalChase = false;
  hasSpawned = false;
  /** Phaser clock time (ms) the run started — set once on a fresh run, used to score/log elapsed time. */
  runStartedAt = 0;
  empReadyAt = 0;
  floodTriggerAt = 0;
  flooding = false;
  floodStartAt = 0;
  /** 0 = no self-destruct running. Set by the "overload reactor" ending choice. */
  destructAt = 0;

  missionIndex = 0;
  readonly completedObjectives = new Set<string>();
  checkpoint: CheckpointSnapshot | null = null;

  setPlayerPosition(x: number, y: number): void {
    this.player.x = x;
    this.player.y = y;
  }

  setStamina(value: number): void {
    this.player.stamina = clamp(value, 0, this.player.maxStamina);
  }

  damagePlayer(amount: number, cause: string, now = 0): void {
    if (!this.player.alive) return;
    this.player.health = clamp(this.player.health - amount, 0, this.player.maxHealth);
    this.player.lastDamageAt = now;
    this.events.emit('player-damaged', { amount, cause });
    if (this.player.health <= 0) {
      this.player.alive = false;
      this.events.emit('player-died', { cause });
    }
  }

  heal(amount: number): void {
    if (!this.player.alive) return;
    this.player.health = clamp(this.player.health + amount, 0, this.player.maxHealth);
  }

  hasKeycard(level: KeycardLevel): boolean {
    return this.inventory.keycards[level];
  }

  giveKeycard(level: KeycardLevel, label?: string): void {
    if (this.inventory.keycards[level]) return;
    this.inventory.keycards[level] = true;
    this.events.emit('keycard-acquired', { level });
    this.notify(label ?? `LEVEL ${level} ACCESS CARD ACQUIRED`, 'success');
  }

  addEmp(amount: number): boolean {
    if (this.inventory.empCharges >= MAX_EMP_CHARGES) return false;
    this.inventory.empCharges = Math.min(MAX_EMP_CHARGES, this.inventory.empCharges + amount);
    return true;
  }

  hasFlag(flag: FlagId): boolean {
    return this.flags.has(flag);
  }

  /** Which epilogue plays — decided by what the player chose at Evacuation Control, not by how they physically leave. */
  getEndingKind(): EndingKind {
    if (this.flags.has('a3Freed')) return 'free';
    if (this.flags.has('reactorOverloaded')) return 'destroy';
    return 'escape';
  }

  setFlag(flag: FlagId): void {
    if (this.flags.has(flag)) return;
    this.flags.add(flag);
    this.events.emit('flag-set', { flag });
  }

  setPower(value: number): void {
    const power = clamp(Math.round(value), 0, 100);
    if (power === this.facility.power) return;
    this.facility.power = power;
    this.events.emit('power-changed', { power });
  }

  setAlert(value: number): void {
    const alert = clamp(value, 0, 100);
    if (Math.round(alert) === Math.round(this.facility.alert) && alert !== 0 && alert !== 100) {
      this.facility.alert = alert;
      return;
    }
    this.facility.alert = alert;
    this.events.emit('alert-changed', { alert: Math.round(alert) });
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
    if (roomId !== null) {
      this.visitedRooms.add(roomId);
      this.adaptation.roomVisits[roomId] = (this.adaptation.roomVisits[roomId] ?? 0) + 1;
    }
    this.events.emit('room-entered', { roomId, name, zone, accent, firstVisit });
  }

  notify(text: string, tone: NotifyTone = 'info'): void {
    this.events.emit('notify', { text, tone });
  }

  say(speaker: string, text: string): void {
    this.events.emit('dialogue', { speaker, text });
  }

  log(title: string, lines: string[], accent?: number): void {
    this.events.emit('log-show', { title, lines, accent });
  }

  noise(x: number, y: number, radius: number, source: string): void {
    this.events.emit('noise', { x, y, radius, source });
  }

  setDebug(enabled: boolean): void {
    this.debugEnabled = enabled;
    this.events.emit('debug-toggled', { enabled });
  }

  /**
   * Marks a mission objective done, wherever it lives — some objectives (e.g. a keycard that
   * ejects during an earlier mission's terminal flow) get completed before their listed mission
   * is even active. Looking it up by id across all missions (not just the current one) keeps
   * that from being silently dropped and permanently blocking that mission's completion.
   * Auto-advances through any missions that are now fully done, in order.
   */
  completeObjective(id: string): void {
    if (this.completedObjectives.has(id)) return;
    const owningMission = MISSIONS.find((m) => m.objectives.some((o) => o.id === id));
    const objective = owningMission?.objectives.find((o) => o.id === id);
    if (!owningMission || !objective) return;
    this.completedObjectives.add(id);
    this.events.emit('objective-complete', { id, label: objective.label });

    while (this.missionIndex < MISSIONS.length) {
      const current = MISSIONS[this.missionIndex];
      const done = current.objectives.every((o) => this.completedObjectives.has(o.id));
      if (!done) return;
      this.notify(`MISSION COMPLETE — ${current.title}`, 'success');
      this.missionIndex++;
      this.saveCheckpoint();
      if (this.missionIndex >= MISSIONS.length) {
        this.notify('DEMO COMPLETE', 'success');
        return;
      }
      this.events.emit('mission-changed', { index: this.missionIndex });
    }
  }

  saveCheckpoint(): void {
    this.checkpoint = {
      x: this.player.x,
      y: this.player.y,
      health: this.player.health,
      keycards: { ...this.inventory.keycards },
      empCharges: this.inventory.empCharges,
      flags: Array.from(this.flags),
      power: this.facility.power,
      missionIndex: this.missionIndex,
      completedObjectives: Array.from(this.completedObjectives),
      objective: this.objective,
    };
  }

  /** Reapplies the last saved checkpoint onto this same GameState (no new run, doors keep their unlocked flags). */
  restoreCheckpoint(): boolean {
    const cp = this.checkpoint;
    if (!cp) return false;
    this.player.health = cp.health;
    this.player.alive = true;
    this.player.x = cp.x;
    this.player.y = cp.y;
    this.inventory.keycards = { ...cp.keycards };
    this.inventory.empCharges = cp.empCharges;
    this.flags.clear();
    for (const flag of cp.flags) this.flags.add(flag);
    this.facility.power = cp.power;
    this.facility.alert = 0;
    this.facility.lockdown = false;
    this.finalChase = false;
    this.destructAt = 0;
    this.missionIndex = cp.missionIndex;
    this.completedObjectives.clear();
    for (const id of cp.completedObjectives) this.completedObjectives.add(id);
    this.objective = cp.objective;
    this.modal = 'none';
    return true;
  }
}

let activeState: GameState | null = null;

export function startNewRun(): GameState {
  activeState?.events.removeAll();
  activeState = new GameState();
  return activeState;
}

export function getGameState(): GameState {
  return activeState ?? startNewRun();
}
