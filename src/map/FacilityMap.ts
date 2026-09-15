import Phaser from 'phaser';
import { ROOMS } from '../data/rooms';
import { DEPTH, TEXTURES, TILE_SIZE } from '../utils/Constants';
import { mixColor, seededRandom, toCss } from '../utils/Helpers';
import { CORRIDORS, DOORS, MAP_HEIGHT, MAP_WIDTH, PROPS, ROOM_LAYOUTS, type PropLayout, type TileRect } from './MapData';
import { Room } from './Room';

export const TILE = { VOID: 0, FLOOR: 1, CORRIDOR: 2, WALL: 3, PROP: 4 } as const;
export type TileType = (typeof TILE)[keyof typeof TILE];

const TS = TILE_SIZE;
const CORRIDOR_ACCENT = 0x5a7d96;

type Ctx = CanvasRenderingContext2D;

/**
 * Builds the facility from MapData: a tile grid (walls auto-generated around walkable space),
 * one baked floor texture for visuals, and an invisible tilemap layer for arcade collision.
 */
export class FacilityMap {
  readonly widthPx = MAP_WIDTH * TS;
  readonly heightPx = MAP_HEIGHT * TS;
  readonly rooms: Room[];
  readonly collisionLayer: Phaser.Tilemaps.TilemapLayer;
  private readonly tiles: TileType[][];
  private readonly roomAt: (Room | null)[][];

  constructor(scene: Phaser.Scene) {
    this.rooms = ROOM_LAYOUTS.map((layout) => new Room(ROOMS[layout.id], layout.rect, layout.floor));
    this.tiles = Array.from({ length: MAP_HEIGHT }, () => new Array<TileType>(MAP_WIDTH).fill(TILE.VOID));
    this.roomAt = Array.from({ length: MAP_HEIGHT }, () => new Array<Room | null>(MAP_WIDTH).fill(null));
    this.buildGrid();

    if (!scene.textures.exists(TEXTURES.facility)) {
      this.bake(scene);
    }
    scene.add.image(0, 0, TEXTURES.facility).setOrigin(0, 0).setDepth(DEPTH.floor);
    this.collisionLayer = this.createCollisionLayer(scene);
  }

  getTile(tx: number, ty: number): TileType {
    if (tx < 0 || ty < 0 || tx >= MAP_WIDTH || ty >= MAP_HEIGHT) return TILE.VOID;
    return this.tiles[ty][tx];
  }

  isWalkable(tx: number, ty: number): boolean {
    const tile = this.getTile(tx, ty);
    return tile === TILE.FLOOR || tile === TILE.CORRIDOR;
  }

  getRoomAt(worldX: number, worldY: number): Room | null {
    const tx = Math.floor(worldX / TS);
    const ty = Math.floor(worldY / TS);
    if (tx < 0 || ty < 0 || tx >= MAP_WIDTH || ty >= MAP_HEIGHT) return null;
    return this.roomAt[ty][tx];
  }

  tileCenter(tx: number, ty: number): { x: number; y: number } {
    return { x: tx * TS + TS / 2, y: ty * TS + TS / 2 };
  }

  /** Solid tiles that are visible structure (walls and props), used by the debug view. */
  forEachSolidStructure(callback: (tx: number, ty: number, tile: TileType) => void): void {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = this.tiles[y][x];
        if (tile === TILE.WALL || tile === TILE.PROP) callback(x, y, tile);
      }
    }
  }

  private buildGrid(): void {
    const fill = (rect: TileRect, tile: TileType, room: Room | null = null): void => {
      for (let y = rect.y; y < rect.y + rect.h; y++) {
        for (let x = rect.x; x < rect.x + rect.w; x++) {
          if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) continue;
          this.tiles[y][x] = tile;
          if (room) this.roomAt[y][x] = room;
        }
      }
    };

    for (const corridor of CORRIDORS) fill(corridor, TILE.CORRIDOR);
    for (const room of this.rooms) fill(room.rect, TILE.FLOOR, room);

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (this.tiles[y][x] !== TILE.VOID) continue;
        let touchesWalkable = false;
        for (let dy = -1; dy <= 1 && !touchesWalkable; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if ((dx !== 0 || dy !== 0) && this.isWalkable(x + dx, y + dy)) {
              touchesWalkable = true;
              break;
            }
          }
        }
        if (touchesWalkable) this.tiles[y][x] = TILE.WALL;
      }
    }

    for (const prop of PROPS) fill(prop.rect, TILE.PROP);
  }

  private createCollisionLayer(scene: Phaser.Scene): Phaser.Tilemaps.TilemapLayer {
    const data = this.tiles.map((row) => row.map((tile) => tile as number));
    const map = scene.make.tilemap({ data, tileWidth: TS, tileHeight: TS });
    const tileset = map.addTilesetImage(TEXTURES.collisionTiles, TEXTURES.collisionTiles, TS, TS, 0, 0);
    if (!tileset) throw new Error('Collision tileset could not be created');
    const layer = map.createLayer(0, tileset, 0, 0);
    if (!layer) throw new Error('Collision layer could not be created');
    layer.setCollision([TILE.VOID, TILE.WALL, TILE.PROP]);
    layer.setVisible(false);
    return layer;
  }

  // ---------------------------------------------------------------- baking

  private bake(scene: Phaser.Scene): void {
    const texture = scene.textures.createCanvas(TEXTURES.facility, this.widthPx, this.heightPx);
    if (!texture) throw new Error('Facility texture could not be created');
    const ctx = texture.getContext();
    const rand = seededRandom(0x5eed1e);

    this.drawVoid(ctx, rand);
    this.drawFloors(ctx, rand);
    this.drawRoomMarkings(ctx);
    this.drawStains(ctx, rand);
    this.drawLighting(ctx);
    this.drawStencils(ctx);
    this.drawWalls(ctx);
    this.drawDoorTracks(ctx);
    for (const prop of PROPS) this.drawProp(ctx, prop, rand);

    texture.refresh();
  }

  private accentAt(tx: number, ty: number): number {
    const room = ty >= 0 && ty < MAP_HEIGHT && tx >= 0 && tx < MAP_WIDTH ? this.roomAt[ty][tx] : null;
    return room ? room.info.accent : CORRIDOR_ACCENT;
  }

  private drawVoid(ctx: Ctx, rand: () => number): void {
    ctx.fillStyle = '#020406';
    ctx.fillRect(0, 0, this.widthPx, this.heightPx);
    for (let i = 0; i < 30; i++) {
      const horizontal = rand() < 0.5;
      const thickness = 5 + Math.floor(rand() * 9);
      const pos = Math.floor(rand() * (horizontal ? this.heightPx : this.widthPx));
      ctx.fillStyle = rand() < 0.3 ? '#0a1219' : '#060b10';
      if (horizontal) {
        ctx.fillRect(0, pos, this.widthPx, thickness);
        ctx.fillStyle = 'rgba(120,170,210,0.05)';
        ctx.fillRect(0, pos, this.widthPx, 1);
      } else {
        ctx.fillRect(pos, 0, thickness, this.heightPx);
        ctx.fillStyle = 'rgba(120,170,210,0.05)';
        ctx.fillRect(pos, 0, 1, this.heightPx);
      }
    }
  }

  private drawFloors(ctx: Ctx, rand: () => number): void {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = this.tiles[y][x];
        if (tile !== TILE.FLOOR && tile !== TILE.CORRIDOR && tile !== TILE.PROP) continue;
        const room = this.roomAt[y][x];
        const style = room ? room.floor : 'grate';
        const accent = room ? room.info.accent : CORRIDOR_ACCENT;
        const px = x * TS;
        const py = y * TS;

        ctx.fillStyle = toCss(mixColor(0x0c1217, accent, room ? 0.075 : 0.035));
        ctx.fillRect(px, py, TS, TS);
        ctx.fillStyle = `rgba(255,255,255,${(rand() * 0.018).toFixed(3)})`;
        ctx.fillRect(px, py, TS, TS);

        if (style === 'grate') {
          ctx.fillStyle = 'rgba(0,0,0,0.42)';
          for (let i = 0; i < 4; i++) ctx.fillRect(px + 4, py + 4 + i * 7, TS - 8, 3);
          ctx.strokeStyle = 'rgba(0,0,0,0.55)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, TS - 1, TS - 1);
        } else if (style === 'tile') {
          ctx.strokeStyle = 'rgba(0,0,0,0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, TS - 1, TS - 1);
          ctx.fillStyle = 'rgba(255,255,255,0.035)';
          ctx.fillRect(px + 1, py + 1, TS - 2, 1);
        } else {
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          if (x % 2 === 0) ctx.fillRect(px, py, 1, TS);
          if (y % 2 === 0) ctx.fillRect(px, py, TS, 1);
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          if (x % 2 === 0) ctx.fillRect(px + 1, py, 1, TS);
          if (y % 2 === 0) {
            ctx.fillRect(px, py + 1, TS, 1);
            if (x % 2 === 0) {
              ctx.fillStyle = 'rgba(255,255,255,0.09)';
              ctx.fillRect(px + 4, py + 4, 2, 2);
            }
          }
        }
      }
    }
  }

  private drawRoomMarkings(ctx: Ctx): void {
    for (const room of this.rooms) {
      const { x, y, width, height, centerX, centerY } = room.bounds;
      const accent = room.info.accent;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();

      if (room.info.id === 'hub') {
        ctx.lineWidth = 2;
        for (const [radius, alpha] of [[64, 0.35], [104, 0.22]] as const) {
          ctx.strokeStyle = toCss(accent, alpha);
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.setLineDash([12, 10]);
        ctx.strokeStyle = toCss(accent, 0.18);
        ctx.beginPath();
        ctx.arc(centerX, centerY, 150, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (room.info.id === 'power') {
        const cx = 31 * TS;
        const cy = 42 * TS;
        ctx.setLineDash([14, 10]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = toCss(accent, 0.35);
        ctx.beginPath();
        ctx.arc(cx, cy, 110, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (room.info.id === 'maintenance' || room.info.id === 'power') {
        this.hazardBand(ctx, x, y, width, height, 10);
      }

      ctx.restore();
    }
  }

  private hazardBand(ctx: Ctx, x: number, y: number, w: number, h: number, band: number): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.rect(x + band, y + band, w - band * 2, h - band * 2);
    ctx.clip('evenodd');
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,190,40,0.32)';
    ctx.lineWidth = 6;
    ctx.setLineDash([]);
    for (let i = -h; i < w + h; i += 18) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + h, y + h);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawStains(ctx: Ctx, rand: () => number): void {
    for (let i = 0; i < 190; i++) {
      const sx = rand() * this.widthPx;
      const sy = rand() * this.heightPx;
      if (!this.isWalkable(Math.floor(sx / TS), Math.floor(sy / TS))) continue;
      const radius = 10 + rand() * 42;
      const wet = rand() < 0.35;
      const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
      gradient.addColorStop(0, wet ? 'rgba(110,190,230,0.07)' : 'rgba(0,0,0,0.32)');
      gradient.addColorStop(1, wet ? 'rgba(110,190,230,0)' : 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(sx, sy, radius, radius * (0.45 + rand() * 0.5), rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawLighting(ctx: Ctx): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const room of this.rooms) {
      const { x, y, width, height, centerX, centerY } = room.bounds;
      const accent = room.info.accent;
      const radius = Math.max(width, height) * 0.62;
      const pool = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      pool.addColorStop(0, toCss(accent, 0.15));
      pool.addColorStop(0.55, toCss(accent, 0.055));
      pool.addColorStop(1, toCss(accent, 0));
      ctx.fillStyle = pool;
      ctx.fillRect(x, y, width, height);

      for (let fx = x + TS * 2; fx < x + width - TS; fx += TS * 4) {
        const fixture = ctx.createRadialGradient(fx, y + 6, 0, fx, y + 6, 56);
        fixture.addColorStop(0, toCss(accent, 0.2));
        fixture.addColorStop(1, toCss(accent, 0));
        ctx.fillStyle = fixture;
        ctx.fillRect(fx - 56, y, 112, 60);
      }
    }
    for (const corridor of CORRIDORS) {
      const cx = (corridor.x + corridor.w / 2) * TS;
      const cy = (corridor.y + corridor.h / 2) * TS;
      const horizontal = corridor.w >= corridor.h;
      const steps = Math.max(1, Math.floor((horizontal ? corridor.w : corridor.h) / 5));
      for (let i = 0; i < steps; i++) {
        const t = (i + 0.5) / steps;
        const lx = horizontal ? corridor.x * TS + t * corridor.w * TS : cx;
        const ly = horizontal ? cy : corridor.y * TS + t * corridor.h * TS;
        const lamp = ctx.createRadialGradient(lx, ly, 0, lx, ly, 70);
        lamp.addColorStop(0, 'rgba(90,160,210,0.10)');
        lamp.addColorStop(1, 'rgba(90,160,210,0)');
        ctx.fillStyle = lamp;
        ctx.fillRect(lx - 70, ly - 70, 140, 140);
      }
    }
    ctx.restore();
  }

  private drawStencils(ctx: Ctx): void {
    ctx.save();
    ctx.textBaseline = 'bottom';
    for (const room of this.rooms) {
      const { x, bottom } = room.bounds;
      ctx.font = 'bold 26px Consolas, "Courier New", monospace';
      ctx.fillStyle = toCss(room.info.accent, 0.1);
      ctx.fillText(room.info.name, x + 12, bottom - 8);
      ctx.font = '12px Consolas, "Courier New", monospace';
      ctx.fillStyle = toCss(room.info.accent, 0.16);
      ctx.fillText(`Z${room.info.zone}-${room.info.id.toUpperCase().slice(0, 3)}`, x + 12, room.bounds.y + 20);
    }
    ctx.restore();
  }

  private drawWalls(ctx: Ctx): void {
    const neon = (x: number, y: number, w: number, h: number, accent: number, alpha: number): void => {
      const horizontal = w > h;
      ctx.fillStyle = toCss(accent, alpha * 0.14);
      if (horizontal) ctx.fillRect(x, y - 3, w, h + 6);
      else ctx.fillRect(x - 3, y, w + 6, h);
      ctx.fillStyle = toCss(accent, alpha);
      ctx.fillRect(x, y, w, h);
    };

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (this.tiles[y][x] !== TILE.WALL) continue;
        const px = x * TS;
        const py = y * TS;
        ctx.fillStyle = '#0f141a';
        ctx.fillRect(px, py, TS, TS);
        ctx.fillStyle = 'rgba(255,255,255,0.022)';
        ctx.fillRect(px + 3, py + 3, TS - 6, TS - 6);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(px + 6, py + 6, TS - 12, TS - 12);
      }
    }

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (this.tiles[y][x] !== TILE.WALL) continue;
        const px = x * TS;
        const py = y * TS;
        const below = this.isWalkable(x, y + 1);
        const above = this.isWalkable(x, y - 1);
        const left = this.isWalkable(x - 1, y);
        const right = this.isWalkable(x + 1, y);

        if (below) {
          const faceTop = py + TS * 0.4;
          const face = ctx.createLinearGradient(0, faceTop, 0, py + TS);
          face.addColorStop(0, '#1f2831');
          face.addColorStop(1, '#090d11');
          ctx.fillStyle = face;
          ctx.fillRect(px, faceTop, TS, TS * 0.6);
          ctx.fillStyle = 'rgba(170,210,240,0.12)';
          ctx.fillRect(px, faceTop, TS, 1);
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          if (x % 2 === 0) ctx.fillRect(px, faceTop, 1, TS * 0.6);
          neon(px, py + TS - 2, TS, 2, this.accentAt(x, y + 1), 0.8);
        }
        if (above) neon(px, py, TS, 2, this.accentAt(x, y - 1), 0.5);
        if (left) neon(px, py, 2, TS, this.accentAt(x - 1, y), 0.5);
        if (right) neon(px + TS - 2, py, 2, TS, this.accentAt(x + 1, y), 0.5);
      }
    }
  }

  private drawDoorTracks(ctx: Ctx): void {
    for (const door of DOORS) {
      const horizontal = door.orientation === 'horizontal';
      const length = door.span * TS;
      const px = door.tileX * TS;
      const py = door.tileY * TS;
      ctx.fillStyle = '#05080b';
      if (horizontal) ctx.fillRect(px, py + 4, length, TS - 8);
      else ctx.fillRect(px + 4, py, TS - 8, length);

      ctx.save();
      ctx.beginPath();
      if (horizontal) ctx.rect(px, py, length, TS);
      else ctx.rect(px, py, TS, length);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,190,40,0.28)';
      ctx.lineWidth = 3;
      for (let i = -TS; i < length + TS; i += 10) {
        ctx.beginPath();
        if (horizontal) {
          ctx.moveTo(px + i, py);
          ctx.lineTo(px + i + 8, py + 4);
          ctx.moveTo(px + i, py + TS - 4);
          ctx.lineTo(px + i + 8, py + TS);
        } else {
          ctx.moveTo(px, py + i);
          ctx.lineTo(px + 4, py + i + 8);
          ctx.moveTo(px + TS - 4, py + i);
          ctx.lineTo(px + TS, py + i + 8);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawProp(ctx: Ctx, prop: PropLayout, rand: () => number): void {
    const x = prop.rect.x * TS + 3;
    const y = prop.rect.y * TS + 3;
    const w = prop.rect.w * TS - 6;
    const h = prop.rect.h * TS - 6;
    const accent = this.accentAt(prop.rect.x, prop.rect.y);

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, x + 4, y + 6, w, h, 4);
    ctx.fill();

    switch (prop.kind) {
      case 'bed': {
        ctx.fillStyle = '#2a343d';
        roundRect(ctx, x, y, w, h, 4);
        ctx.fill();
        ctx.fillStyle = '#6f8993';
        roundRect(ctx, x + 3, y + 3, w - 6, h - 6, 3);
        ctx.fill();
        ctx.fillStyle = '#c6dbe0';
        const pillowAlongX = w > h;
        if (pillowAlongX) ctx.fillRect(x + 5, y + 5, 10, h - 10);
        else ctx.fillRect(x + 5, y + 5, w - 10, 10);
        ctx.fillStyle = toCss(accent, 0.35);
        if (pillowAlongX) ctx.fillRect(x + w * 0.45, y + 3, w * 0.5, h - 6);
        else ctx.fillRect(x + 3, y + h * 0.45, w - 6, h * 0.5);
        break;
      }
      case 'console': {
        ctx.fillStyle = '#161e25';
        roundRect(ctx, x, y, w, h, 3);
        ctx.fill();
        ctx.fillStyle = toCss(accent, 0.18);
        ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
        ctx.fillStyle = toCss(accent, 0.85);
        ctx.fillRect(x + 4, y + 4, w - 8, h * 0.42);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        for (let lx = x + 6; lx < x + w - 8; lx += 7) ctx.fillRect(lx, y + 6, 4, 1);
        for (let bx = x + 6; bx < x + w - 6; bx += 9) {
          ctx.fillStyle = rand() < 0.5 ? '#ff3b4e' : '#39ff9c';
          ctx.fillRect(bx, y + h - 8, 3, 3);
        }
        break;
      }
      case 'crate': {
        ctx.fillStyle = '#4a3a22';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#231a0e';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        ctx.strokeStyle = 'rgba(140,110,60,0.55)';
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 3);
        ctx.lineTo(x + w - 3, y + h - 3);
        ctx.moveTo(x + w - 3, y + 3);
        ctx.lineTo(x + 3, y + h - 3);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,190,40,0.6)';
        ctx.fillRect(x + 3, y + 3, Math.min(14, w - 6), 4);
        break;
      }
      case 'rack': {
        ctx.fillStyle = '#06080a';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#1d2830';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        for (let ly = y + 5; ly < y + h - 4; ly += 5) {
          for (let lx = x + 5; lx < x + w - 4; lx += 5) {
            if (rand() < 0.45) {
              ctx.fillStyle = rand() < 0.8 ? toCss(accent, 0.95) : '#39ff9c';
              ctx.fillRect(lx, ly, 2, 2);
            }
          }
        }
        break;
      }
      case 'tank': {
        ctx.fillStyle = '#04101f';
        roundRect(ctx, x, y, w, h, 6);
        ctx.fill();
        const water = ctx.createLinearGradient(0, y, 0, y + h);
        water.addColorStop(0, toCss(accent, 0.45));
        water.addColorStop(1, toCss(accent, 0.12));
        ctx.fillStyle = water;
        roundRect(ctx, x + 3, y + 3, w - 6, h - 6, 5);
        ctx.fill();
        ctx.strokeStyle = 'rgba(150,210,255,0.55)';
        ctx.lineWidth = 2;
        roundRect(ctx, x + 1, y + 1, w - 2, h - 2, 6);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(x + 8, y + 6, w * 0.3, 2);
        for (let i = 0; i < Math.max(3, w / 12); i++) {
          ctx.beginPath();
          ctx.arc(x + 6 + rand() * (w - 12), y + 6 + rand() * (h - 12), 1 + rand() * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'reactor': {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const r = Math.min(w, h) / 2;
        ctx.fillStyle = '#12080c';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        for (const [rr, a] of [[r - 4, 0.8], [r * 0.7, 0.55], [r * 0.42, 0.7]] as const) {
          ctx.strokeStyle = toCss(accent, a);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cx, cy, rr, 0, Math.PI * 2);
          ctx.stroke();
        }
        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.4);
        core.addColorStop(0, 'rgba(255,230,235,0.95)');
        core.addColorStop(0.35, toCss(accent, 0.9));
        core.addColorStop(1, toCss(accent, 0));
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'generator':
      case 'machine': {
        ctx.fillStyle = prop.kind === 'generator' ? '#2a2718' : '#20262b';
        roundRect(ctx, x, y, w, h, 3);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, 7);
        ctx.clip();
        ctx.fillStyle = '#ffc23a';
        ctx.fillRect(x, y, w, 7);
        ctx.fillStyle = '#111';
        for (let i = -8; i < w; i += 10) {
          ctx.beginPath();
          ctx.moveTo(x + i, y + 7);
          ctx.lineTo(x + i + 5, y + 7);
          ctx.lineTo(x + i + 12, y);
          ctx.lineTo(x + i + 7, y);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        for (let vy = y + 12; vy < y + h - 4; vy += 5) ctx.fillRect(x + 5, vy, w - 10, 2);
        ctx.fillStyle = toCss(accent, 0.9);
        ctx.beginPath();
        ctx.arc(x + w - 8, y + h - 8, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'table':
      case 'bench': {
        ctx.fillStyle = prop.kind === 'table' ? '#26303a' : '#1b232a';
        roundRect(ctx, x, y, w, h, 3);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(x + 2, y + 2, w - 4, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        for (let sx = x + 8; sx < x + w - 4; sx += 8) ctx.fillRect(sx, y + 3, 1, h - 6);
        if (prop.kind === 'table') {
          ctx.fillStyle = toCss(accent, 0.7);
          ctx.fillRect(x + 6, y + h / 2 - 2, 6, 4);
        }
        break;
      }
      case 'holo': {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const r = Math.min(w, h) / 2;
        ctx.fillStyle = '#0a1422';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = toCss(accent, 0.9);
        ctx.lineWidth = 3;
        ctx.stroke();
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        glow.addColorStop(0, 'rgba(200,235,255,0.85)');
        glow.addColorStop(0.3, toCss(accent, 0.6));
        glow.addColorStop(1, toCss(accent, 0.05));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'locker': {
        ctx.fillStyle = '#24303a';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#0f151b';
        const vertical = h > w;
        const segments = Math.max(prop.rect.w, prop.rect.h);
        for (let i = 1; i < segments; i++) {
          if (vertical) ctx.fillRect(x, y + (h / segments) * i, w, 2);
          else ctx.fillRect(x + (w / segments) * i, y, 2, h);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        for (let i = 0; i < segments; i++) {
          if (vertical) ctx.fillRect(x + w - 7, y + (h / segments) * i + 6, 3, 6);
          else ctx.fillRect(x + (w / segments) * i + 6, y + h - 8, 6, 3);
        }
        break;
      }
      case 'pod': {
        ctx.fillStyle = '#12091a';
        roundRect(ctx, x, y, w, h, Math.min(w, h) / 2.5);
        ctx.fill();
        const inner = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) / 2);
        inner.addColorStop(0, toCss(accent, 0.7));
        inner.addColorStop(1, toCss(accent, 0.08));
        ctx.fillStyle = inner;
        roundRect(ctx, x + 4, y + 4, w - 8, h - 8, Math.min(w, h) / 3);
        ctx.fill();
        ctx.strokeStyle = toCss(accent, 0.8);
        ctx.lineWidth = 2;
        roundRect(ctx, x + 1, y + 1, w - 2, h - 2, Math.min(w, h) / 2.5);
        ctx.stroke();
        break;
      }
    }
  }
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
