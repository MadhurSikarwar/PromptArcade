import type { RoomId } from '../data/rooms';
import type { DoorState, FlagId, KeycardLevel } from '../systems/GameState';
import { COLORS } from '../utils/Constants';

/** All geometry is in tile units. Rects are inclusive of x..x+w-1 and y..y+h-1. */
export interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type FloorStyle = 'plate' | 'tile' | 'grate';

export interface RoomLayout {
  id: RoomId;
  rect: TileRect;
  floor: FloorStyle;
}

export type PropKind = 'bed' | 'console' | 'crate' | 'rack' | 'tank' | 'reactor' | 'generator' | 'table' | 'holo' | 'locker' | 'pod' | 'bench' | 'machine';

export interface PropLayout {
  kind: PropKind;
  rect: TileRect;
}

export type DoorOrientation = 'horizontal' | 'vertical';

export interface DoorRequirement {
  keycard?: KeycardLevel;
  flag?: FlagId;
  flagReason?: string;
  power?: boolean;
}

export interface DoorLayout {
  id: string;
  label: string;
  tileX: number;
  tileY: number;
  span: number;
  orientation: DoorOrientation;
  initial: DoorState;
  requires?: DoorRequirement;
  alwaysLocked?: boolean;
  noLockdown?: boolean;
  lockedReason?: string;
  lockedLine?: string;
  accent: number;
}

export interface CameraLayout {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number;
  sweep: number;
  range: number;
}

export interface HazardLayout {
  id: string;
  rect: TileRect;
  activeFlag: FlagId;
}

export interface FloodLayout {
  rect: TileRect;
  activeFlag?: FlagId;
}

export const MAP_WIDTH = 100;
export const MAP_HEIGHT = 56;

export const PLAYER_SPAWN_TILE = { x: 19, y: 29 } as const;

export const ROOM_LAYOUTS: readonly RoomLayout[] = [
  { id: 'entrance', rect: { x: 3, y: 21, w: 12, h: 11 }, floor: 'grate' },
  { id: 'medbay', rect: { x: 19, y: 6, w: 14, h: 9 }, floor: 'tile' },
  { id: 'crew', rect: { x: 19, y: 17, w: 12, h: 9 }, floor: 'plate' },
  { id: 'storage', rect: { x: 33, y: 16, w: 8, h: 10 }, floor: 'plate' },
  { id: 'security', rect: { x: 43, y: 3, w: 11, h: 12 }, floor: 'plate' },
  { id: 'hub', rect: { x: 42, y: 19, w: 13, h: 13 }, floor: 'tile' },
  { id: 'power', rect: { x: 24, y: 35, w: 14, h: 14 }, floor: 'grate' },
  { id: 'maintenance', rect: { x: 43, y: 37, w: 17, h: 10 }, floor: 'grate' },
  { id: 'server', rect: { x: 58, y: 3, w: 11, h: 12 }, floor: 'plate' },
  { id: 'lab', rect: { x: 60, y: 20, w: 14, h: 12 }, floor: 'tile' },
  { id: 'aquarium', rect: { x: 74, y: 3, w: 16, h: 12 }, floor: 'tile' },
  { id: 'wing', rect: { x: 78, y: 20, w: 19, h: 12 }, floor: 'tile' },
  { id: 'observation', rect: { x: 82, y: 37, w: 10, h: 6 }, floor: 'plate' },
  { id: 'upperlab', rect: { x: 2, y: 38, w: 13, h: 6 }, floor: 'tile' },
  { id: 'evac', rect: { x: 2, y: 46, w: 20, h: 5 }, floor: 'grate' },
  { id: 'finalairlock', rect: { x: 15, y: 52, w: 6, h: 3 }, floor: 'grate' },
];

export const CORRIDORS: readonly TileRect[] = [
  { x: 15, y: 28, w: 27, h: 3 },
  { x: 1, y: 25, w: 2, h: 3 },
  { x: 6, y: 32, w: 3, h: 6 },
  { x: 24, y: 15, w: 2, h: 2 },
  { x: 22, y: 26, w: 2, h: 2 },
  { x: 31, y: 20, w: 2, h: 2 },
  { x: 33, y: 11, w: 10, h: 3 },
  { x: 36, y: 14, w: 2, h: 2 },
  { x: 38, y: 26, w: 2, h: 2 },
  { x: 47, y: 15, w: 3, h: 4 },
  { x: 47, y: 32, w: 3, h: 5 },
  { x: 33, y: 31, w: 3, h: 4 },
  { x: 38, y: 41, w: 5, h: 3 },
  { x: 54, y: 7, w: 4, h: 3 },
  { x: 55, y: 24, w: 5, h: 3 },
  { x: 62, y: 15, w: 3, h: 5 },
  { x: 69, y: 7, w: 5, h: 3 },
  { x: 74, y: 24, w: 4, h: 3 },
  { x: 84, y: 15, w: 3, h: 5 },
  { x: 60, y: 39, w: 22, h: 3 },
  { x: 66, y: 32, w: 3, h: 7 },
  { x: 86, y: 32, w: 3, h: 5 },
  { x: 10, y: 44, w: 3, h: 2 },
  { x: 17, y: 51, w: 2, h: 1 },
];

export const PROPS: readonly PropLayout[] = [
  { kind: 'locker', rect: { x: 4, y: 22, w: 3, h: 1 } },
  { kind: 'bench', rect: { x: 11, y: 22, w: 3, h: 1 } },
  { kind: 'bed', rect: { x: 20, y: 7, w: 1, h: 2 } },
  { kind: 'bed', rect: { x: 23, y: 7, w: 1, h: 2 } },
  { kind: 'bed', rect: { x: 26, y: 7, w: 1, h: 2 } },
  { kind: 'console', rect: { x: 29, y: 7, w: 2, h: 1 } },
  { kind: 'table', rect: { x: 28, y: 10, w: 2, h: 1 } },
  { kind: 'bed', rect: { x: 20, y: 18, w: 2, h: 1 } },
  { kind: 'bed', rect: { x: 20, y: 21, w: 2, h: 1 } },
  { kind: 'bed', rect: { x: 27, y: 18, w: 2, h: 1 } },
  { kind: 'locker', rect: { x: 30, y: 23, w: 1, h: 2 } },
  { kind: 'crate', rect: { x: 34, y: 18, w: 2, h: 2 } },
  { kind: 'crate', rect: { x: 38, y: 20, w: 2, h: 1 } },
  { kind: 'crate', rect: { x: 34, y: 22, w: 1, h: 2 } },
  { kind: 'console', rect: { x: 45, y: 4, w: 7, h: 1 } },
  { kind: 'table', rect: { x: 47, y: 8, w: 3, h: 1 } },
  { kind: 'locker', rect: { x: 53, y: 11, w: 1, h: 3 } },
  { kind: 'holo', rect: { x: 47, y: 24, w: 3, h: 3 } },
  { kind: 'reactor', rect: { x: 29, y: 40, w: 4, h: 4 } },
  { kind: 'generator', rect: { x: 25, y: 36, w: 2, h: 2 } },
  { kind: 'generator', rect: { x: 25, y: 46, w: 2, h: 2 } },
  { kind: 'machine', rect: { x: 50, y: 43, w: 4, h: 2 } },
  { kind: 'generator', rect: { x: 55, y: 38, w: 2, h: 2 } },
  { kind: 'machine', rect: { x: 44, y: 45, w: 3, h: 1 } },
  { kind: 'rack', rect: { x: 60, y: 4, w: 1, h: 3 } },
  { kind: 'rack', rect: { x: 63, y: 4, w: 1, h: 3 } },
  { kind: 'rack', rect: { x: 66, y: 4, w: 1, h: 3 } },
  { kind: 'rack', rect: { x: 60, y: 10, w: 1, h: 3 } },
  { kind: 'rack', rect: { x: 66, y: 10, w: 1, h: 3 } },
  { kind: 'table', rect: { x: 66, y: 22, w: 3, h: 1 } },
  { kind: 'console', rect: { x: 70, y: 22, w: 2, h: 1 } },
  { kind: 'bench', rect: { x: 62, y: 28, w: 3, h: 1 } },
  { kind: 'pod', rect: { x: 71, y: 28, w: 2, h: 2 } },
  { kind: 'tank', rect: { x: 78, y: 4, w: 10, h: 4 } },
  { kind: 'tank', rect: { x: 75, y: 12, w: 2, h: 2 } },
  { kind: 'pod', rect: { x: 80, y: 21, w: 2, h: 2 } },
  { kind: 'pod', rect: { x: 89, y: 21, w: 2, h: 2 } },
  { kind: 'pod', rect: { x: 93, y: 21, w: 2, h: 2 } },
  { kind: 'machine', rect: { x: 87, y: 26, w: 3, h: 2 } },
  { kind: 'bench', rect: { x: 85, y: 41, w: 4, h: 1 } },
  { kind: 'console', rect: { x: 3, y: 39, w: 3, h: 1 } },
  { kind: 'pod', rect: { x: 12, y: 39, w: 2, h: 2 } },
  { kind: 'console', rect: { x: 2, y: 46, w: 3, h: 1 } },
  { kind: 'bench', rect: { x: 12, y: 49, w: 4, h: 1 } },
];

export const DOORS: readonly DoorLayout[] = [
  { id: 'door-outer-airlock', label: 'OUTER AIRLOCK', tileX: 2, tileY: 25, span: 3, orientation: 'vertical', initial: 'LOCKED', alwaysLocked: true, lockedReason: 'PRESSURE SEALED', lockedLine: 'Sealed tight. The ocean is on the other side of that.', accent: COLORS.cyan },
  { id: 'door-upper-access', label: 'UPPER FACILITY ACCESS', tileX: 6, tileY: 32, span: 3, orientation: 'horizontal', initial: 'LOCKED', requires: { keycard: 'upper' }, noLockdown: true, lockedReason: 'LOCKED', lockedLine: "Guess that's not the way in.", accent: COLORS.red },
  { id: 'door-main-access', label: 'MAIN ACCESS', tileX: 15, tileY: 28, span: 3, orientation: 'vertical', initial: 'CLOSED', accent: COLORS.cyan },
  { id: 'door-medbay', label: 'MEDBAY', tileX: 24, tileY: 15, span: 2, orientation: 'horizontal', initial: 'CLOSED', accent: 0x22e0d0 },
  { id: 'door-security-west', label: 'SECURITY', tileX: 42, tileY: 11, span: 3, orientation: 'vertical', initial: 'LOCKED', requires: { keycard: 'security' }, accent: COLORS.red },
  { id: 'door-security-south', label: 'SECURITY', tileX: 47, tileY: 15, span: 3, orientation: 'horizontal', initial: 'LOCKED', requires: { keycard: 'security' }, accent: COLORS.red },
  { id: 'door-maintenance', label: 'MAINTENANCE', tileX: 47, tileY: 36, span: 3, orientation: 'horizontal', initial: 'LOCKED', requires: { flag: 'securityOnline', flagReason: 'SECURITY LOCKOUT — OVERRIDE AT SECURITY TERMINAL' }, accent: COLORS.yellow },
  { id: 'door-power', label: 'POWER CORE', tileX: 33, tileY: 34, span: 3, orientation: 'horizontal', initial: 'LOCKED', requires: { flag: 'powerRouted', flagReason: 'NO POWER ROUTED — USE MAINTENANCE BREAKERS' }, accent: 0xff2a5a },
  { id: 'door-power-east', label: 'POWER CORE', tileX: 38, tileY: 41, span: 3, orientation: 'vertical', initial: 'LOCKED', requires: { flag: 'powerRouted', flagReason: 'NO POWER ROUTED — USE MAINTENANCE BREAKERS' }, accent: 0xff2a5a },
  { id: 'door-service-east', label: 'SERVICE CORRIDOR', tileX: 60, tileY: 39, span: 3, orientation: 'vertical', initial: 'DISABLED', requires: { power: true }, accent: COLORS.yellow },
  { id: 'door-server', label: 'SERVER ROOM', tileX: 57, tileY: 7, span: 3, orientation: 'vertical', initial: 'DISABLED', requires: { power: true }, accent: COLORS.cyan },
  { id: 'door-lab', label: 'RESEARCH LAB', tileX: 59, tileY: 24, span: 3, orientation: 'vertical', initial: 'LOCKED', requires: { keycard: 'research' }, accent: COLORS.green },
  { id: 'door-lab-north', label: 'RESEARCH LAB', tileX: 62, tileY: 19, span: 3, orientation: 'horizontal', initial: 'LOCKED', requires: { keycard: 'research' }, accent: COLORS.green },
  { id: 'door-lab-south', label: 'RESEARCH LAB', tileX: 66, tileY: 32, span: 3, orientation: 'horizontal', initial: 'LOCKED', requires: { keycard: 'research' }, accent: COLORS.green },
  { id: 'door-aquarium', label: 'AQUARIUM', tileX: 73, tileY: 7, span: 3, orientation: 'vertical', initial: 'DISABLED', requires: { power: true }, accent: COLORS.blue },
  { id: 'door-wing', label: 'EXPERIMENT WING', tileX: 77, tileY: 24, span: 3, orientation: 'vertical', initial: 'LOCKED', requires: { keycard: 'research' }, accent: COLORS.purple },
  { id: 'door-wing-north', label: 'EXPERIMENT WING', tileX: 84, tileY: 19, span: 3, orientation: 'horizontal', initial: 'LOCKED', requires: { keycard: 'research' }, accent: COLORS.purple },
  { id: 'door-wing-south', label: 'EXPERIMENT WING', tileX: 86, tileY: 32, span: 3, orientation: 'horizontal', initial: 'LOCKED', requires: { keycard: 'research' }, accent: COLORS.purple },
  { id: 'door-evac', label: 'EVACUATION CONTROL', tileX: 10, tileY: 44, span: 3, orientation: 'horizontal', initial: 'CLOSED', noLockdown: true, accent: COLORS.red },
  { id: 'door-final-airlock', label: 'FINAL AIRLOCK', tileX: 17, tileY: 51, span: 2, orientation: 'horizontal', initial: 'LOCKED', noLockdown: true, requires: { flag: 'finalReveal', flagReason: 'EXIT SEQUENCE NOT INITIATED' }, accent: COLORS.cyan },
];

const T = 32;
export const CAMERAS: readonly CameraLayout[] = [
  { id: 'cam-01', name: 'CAM-01 SECURITY WING', x: 38 * T + 16, y: 11 * T + 3, angle: 90, sweep: 55, range: 150 },
  { id: 'cam-02', name: 'CAM-02 CENTRAL HUB', x: 54 * T + 28, y: 19 * T + 4, angle: 135, sweep: 35, range: 270 },
  { id: 'cam-03', name: 'CAM-03 MAINTENANCE', x: 43 * T + 4, y: 37 * T + 4, angle: 45, sweep: 35, range: 270 },
  { id: 'cam-04', name: 'CAM-04 SERVER ROOM', x: 68 * T + 28, y: 3 * T + 4, angle: 135, sweep: 30, range: 240 },
  { id: 'cam-05', name: 'CAM-05 RESEARCH LAB', x: 60 * T + 4, y: 20 * T + 4, angle: 45, sweep: 35, range: 270 },
  { id: 'cam-06', name: 'CAM-06 EXPERIMENT WING', x: 96 * T + 28, y: 20 * T + 4, angle: 135, sweep: 40, range: 310 },
  { id: 'cam-07', name: 'CAM-07 WEST CORRIDOR', x: 28 * T, y: 28 * T + 3, angle: 90, sweep: 70, range: 130 },
  { id: 'cam-08', name: 'CAM-08 EVACUATION', x: 21 * T + 28, y: 46 * T + 4, angle: 150, sweep: 30, range: 330 },
];

export const HAZARDS: readonly HazardLayout[] = [
  { id: 'haz-maintenance', rect: { x: 50, y: 37, w: 3, h: 6 }, activeFlag: 'generatorOn' },
  { id: 'haz-evac', rect: { x: 8, y: 46, w: 2, h: 5 }, activeFlag: 'finalReveal' },
];

export const FLOODS: readonly FloodLayout[] = [
  { rect: { x: 82, y: 37, w: 10, h: 6 } },
  { rect: { x: 2, y: 46, w: 20, h: 5 }, activeFlag: 'finalReveal' },
];

export interface VentPair {
  id: string;
  a: { x: number; y: number };
  b: { x: number; y: number };
}

export const VENTS: readonly VentPair[] = [
  { id: 'vent-medbay-storage', a: { x: 20, y: 13 }, b: { x: 40, y: 17 } },
  { id: 'vent-crew-hub', a: { x: 28, y: 24 }, b: { x: 53, y: 30 } },
  { id: 'vent-maint-lab', a: { x: 57, y: 46 }, b: { x: 61, y: 31 } },
];

export const EMP_STATIONS: readonly { id: string; x: number; y: number }[] = [
  { id: 'emp-storage', x: 39, y: 24 },
  { id: 'emp-observation', x: 90, y: 38 },
  { id: 'emp-upper', x: 4, y: 42 },
];

/** Story / puzzle anchor tiles used by the progression script. */
export const ANCHORS = {
  powerCell: { x: 37, y: 23 },
  medbayTerminal: { x: 30, y: 8 },
  crewLog: { x: 25, y: 24 },
  securityTerminal: { x: 48, y: 5 },
  generator: { x: 44, y: 38 },
  breaker: { x: 58, y: 45 },
  cooling: { x: 26, y: 41 },
  reactor: { x: 34, y: 39 },
  serverTerminal: { x: 63, y: 9 },
  labTerminal: { x: 70, y: 23 },
  tankA01: { x: 79, y: 8 },
  tankA02: { x: 82, y: 8 },
  tankA03: { x: 85, y: 8 },
  tankA04: { x: 77, y: 12 },
  wingTerminal: { x: 88, y: 28 },
  evacTerminal: { x: 4, y: 47 },
  airlockRelease: { x: 19, y: 53 },
  hubCenter: { x: 48, y: 21 },
  upperEntry: { x: 7, y: 39 },
} as const;
