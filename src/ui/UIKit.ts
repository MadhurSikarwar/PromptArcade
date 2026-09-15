import type Phaser from 'phaser';
import { COLORS, FONT_MONO } from '../utils/Constants';

export function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, accent: number = COLORS.cyan): void {
  g.fillStyle(COLORS.panel, 0.62);
  g.fillRect(x, y, w, h);
  g.lineStyle(1, accent, 0.2);
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  const c = 9;
  g.lineStyle(2, accent, 0.85);
  g.beginPath();
  g.moveTo(x, y + c);
  g.lineTo(x, y);
  g.lineTo(x + c, y);
  g.moveTo(x + w - c, y);
  g.lineTo(x + w, y);
  g.lineTo(x + w, y + c);
  g.moveTo(x + w, y + h - c);
  g.lineTo(x + w, y + h);
  g.lineTo(x + w - c, y + h);
  g.moveTo(x + c, y + h);
  g.lineTo(x, y + h);
  g.lineTo(x, y + h - c);
  g.strokePath();
}

/** Segmented cyberpunk meter. */
export function drawSegmentBar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  ratio: number,
  color: number,
  segments = 22,
  segmentWidth = 7,
  height = 9,
): void {
  const gap = 2;
  const filled = Math.round(Math.max(0, Math.min(1, ratio)) * segments);
  for (let i = 0; i < segments; i++) {
    const on = i < filled;
    g.fillStyle(on ? color : 0x1a2630, on ? 0.95 : 0.8);
    g.fillRect(x + i * (segmentWidth + gap), y, segmentWidth, height);
  }
}

export function uiText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  color = '#d8f8ff',
  bold = false,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: FONT_MONO,
    fontSize: `${size}px`,
    color,
    fontStyle: bold ? 'bold' : 'normal',
  });
}
