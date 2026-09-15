import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TEXTURES, TILE_SIZE } from './Constants';

/** Resolution multiplier for character sprites so they stay crisp under camera zoom. */
export const SPRITE_SCALE = 0.5;

type Painter = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

function paint(scene: Phaser.Scene, key: string, width: number, height: number, draw: Painter): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) throw new Error(`Could not create texture ${key}`);
  draw(texture.getContext(), width, height);
  texture.refresh();
}

/** Placeholder art pipeline: every texture is procedural and replaceable by real assets later. */
export function generateTextures(scene: Phaser.Scene): void {
  paint(scene, TEXTURES.player, 80, 80, drawDiver);

  paint(scene, TEXTURES.glow, 128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  paint(scene, TEXTURES.dot, 16, 16, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  paint(scene, TEXTURES.vignette, GAME_WIDTH, GAME_HEIGHT, (ctx, w, h) => {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(w / h, 1);
    const r = h * 0.72;
    const g = ctx.createRadialGradient(0, 0, r * 0.35, 0, 0, r);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.28)');
    g.addColorStop(1, 'rgba(0,0,0,0.82)');
    ctx.fillStyle = g;
    ctx.fillRect(-w, -h, w * 2, h * 2);
    ctx.restore();
  });

  paint(scene, TEXTURES.scanlines, 4, 4, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fillRect(0, 2, 4, 1);
  });

  // Invisible tileset backing the collision tilemap (5 tile types).
  paint(scene, TEXTURES.collisionTiles, TILE_SIZE * 5, TILE_SIZE, () => undefined);

  paint(scene, TEXTURES.octopus, 128, 128, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(210,210,210,0.85)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.42, h * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Flashlight cone: pointed at +X, mid-height, faded outward. Stamped with originX 0, originY 0.5.
  paint(scene, TEXTURES.cone, 256, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(0, h / 2, 0, 0, h / 2, w);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2 - w * 0.5);
    ctx.lineTo(w, h / 2 + w * 0.5);
    ctx.closePath();
    ctx.fill();
  });
}

function drawDiver(ctx: CanvasRenderingContext2D): void {
  // Facing +X. Drawn at 2x and displayed at SPRITE_SCALE.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(42, 45, 24, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // oxygen tank on the back
  ctx.fillStyle = '#3a4652';
  ctx.beginPath();
  ctx.ellipse(21, 40, 9, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5f707e';
  ctx.fillRect(18, 28, 3, 24);
  ctx.fillStyle = '#d6a938';
  ctx.fillRect(13, 37, 4, 6);

  // arms
  ctx.fillStyle = '#1d2934';
  ctx.beginPath();
  ctx.ellipse(46, 19, 10, 6, 0.25, 0, Math.PI * 2);
  ctx.ellipse(46, 61, 10, 6, -0.25, 0, Math.PI * 2);
  ctx.fill();

  // torso
  ctx.fillStyle = '#23303c';
  ctx.strokeStyle = '#070b0f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(38, 40, 16, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#19e6ff';
  ctx.fillRect(30, 22, 14, 2);
  ctx.fillRect(30, 56, 14, 2);

  // helmet + visor
  ctx.fillStyle = '#34444f';
  ctx.beginPath();
  ctx.arc(45, 40, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(25,230,255,0.25)';
  ctx.beginPath();
  ctx.arc(52, 40, 12, -1.1, 1.1);
  ctx.fill();
  ctx.fillStyle = '#19e6ff';
  ctx.beginPath();
  ctx.moveTo(48, 31);
  ctx.quadraticCurveTo(60, 40, 48, 49);
  ctx.quadraticCurveTo(53, 40, 48, 31);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(51, 35, 2, 3);

  // helmet lamp
  const lamp = ctx.createRadialGradient(60, 40, 0, 60, 40, 9);
  lamp.addColorStop(0, 'rgba(210,250,255,1)');
  lamp.addColorStop(1, 'rgba(25,230,255,0)');
  ctx.fillStyle = lamp;
  ctx.fillRect(50, 30, 20, 20);
}
