import Phaser from 'phaser';
import type { GameState } from '../systems/GameState';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXTURES } from '../utils/Constants';
import { drawPanel, uiText } from './UIKit';

const NODES: { id: string; label: string; x: number; y: number; flag: 'securityOnline' | 'generatorOn' | 'powerRouted' | 'facilityPower' | 'serverData' }[] = [
  { id: 'lab', label: 'LAB', x: 0, y: 0, flag: 'serverData' },
  { id: 'server', label: 'SERVER', x: 150, y: 0, flag: 'facilityPower' },
  { id: 'power', label: 'POWER', x: 300, y: 0, flag: 'powerRouted' },
  { id: 'security', label: 'SECURITY', x: 40, y: 90, flag: 'securityOnline' },
  { id: 'maintenance', label: 'MAINTENANCE', x: 260, y: 90, flag: 'generatorOn' },
];
const LINKS: [number, number][] = [[0, 1], [1, 2], [0, 3], [1, 3], [2, 4], [3, 4]];

/** In-world hacking device (TAB). Looks like equipment, not a pause menu. */
export class CyberdeckUI {
  private readonly container: Phaser.GameObjects.Container;
  private readonly stats: Phaser.GameObjects.Text;
  private readonly actions: Phaser.GameObjects.Text;
  private readonly net: Phaser.GameObjects.Graphics;
  private readonly x = (GAME_WIDTH - 720) / 2;
  private readonly y = (GAME_HEIGHT - 420) / 2;

  constructor(
    scene: Phaser.Scene,
    private readonly state: GameState,
    private readonly cooldown: (action: 'cameras' | 'seal' | 'lights' | 'decoy') => number,
  ) {
    const { x, y } = this;
    const frame = scene.add.graphics();
    frame.fillStyle(0x07020b, 0.94);
    frame.fillRect(x, y, 720, 420);
    drawPanel(frame, x, y, 720, 420, COLORS.magenta);
    const scan = scene.add.tileSprite(x, y, 720, 420, TEXTURES.scanlines).setOrigin(0).setAlpha(0.25);
    const title = uiText(scene, x + 22, y + 16, 'CYBERDECK // FACILITY NETWORK', 18, '#ff2bd6', true);
    this.stats = uiText(scene, x + 22, y + 60, '', 15, '#ffd6f6').setLineSpacing(8);
    this.net = scene.add.graphics();
    const netLabels = NODES.map((n) => uiText(scene, x + 330 + n.x, y + 96 + n.y, n.label, 11, '#ffb8ee').setOrigin(0.5, 0));
    this.actions = uiText(scene, x + 22, y + 258, '', 14, '#e8f6ff').setLineSpacing(9);
    const hint = uiText(scene, x + 720 - 22, y + 420 - 30, '[TAB] CLOSE', 12, '#8f5f8a').setOrigin(1, 0);
    this.container = scene.add.container(0, 0, [frame, scan, title, this.stats, this.net, ...netLabels, this.actions, hint]).setDepth(700).setVisible(false);
  }

  get isOpen(): boolean {
    return this.container.visible;
  }

  setOpen(open: boolean): void {
    this.container.setVisible(open);
  }

  update(now: number): void {
    if (!this.isOpen) return;
    const s = this.state;
    const threat = !s.octopus.spawned
      ? 'UNKNOWN'
      : s.octopus.state === 'HUNT' || s.octopus.state === 'ATTACK'
        ? 'HUNTING YOU'
        : s.octopus.distance < 500
          ? `CLOSE — ${s.octopus.state}`
          : s.octopus.state;
    const looped = now < s.camerasLoopedUntil;
    this.stats.setText(
      [
        `POWER      ${s.facility.power}%`,
        `SECURITY   ${s.facility.lockdown ? 'LOCKDOWN' : s.facility.alert > 50 ? 'HIGH' : 'LOW'}`,
        `CAMERAS    ${looped ? 'LOOPED' : `${s.facility.camerasActive} ACTIVE`}`,
        `ALERT      ${Math.round(s.facility.alert)}%`,
        `THREAT     ${threat}`,
      ].join('\n'),
    );

    const g = this.net;
    g.clear();
    const ox = this.x + 330;
    const oy = this.y + 80;
    LINKS.forEach(([a, b]) => {
      const na = NODES[a];
      const nb = NODES[b];
      const live = s.hasFlag(na.flag) && s.hasFlag(nb.flag);
      g.lineStyle(2, live ? COLORS.magenta : 0x3a1a3a, live ? 0.8 : 0.6);
      g.lineBetween(ox + na.x, oy + na.y, ox + nb.x, oy + nb.y);
      if (live) {
        const t = (now * 0.0006 + a * 0.3) % 1;
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(ox + na.x + (nb.x - na.x) * t, oy + na.y + (nb.y - na.y) * t, 2);
      }
    });
    NODES.forEach((n) => {
      const on = s.hasFlag(n.flag);
      g.fillStyle(on ? COLORS.green : 0x3a1a3a, 1);
      g.fillCircle(ox + n.x, oy + n.y, 8);
      g.lineStyle(2, on ? COLORS.magenta : 0x5a2a5a, 1);
      g.strokeCircle(ox + n.x, oy + n.y, 12);
    });

    const cd = (a: 'cameras' | 'seal' | 'lights' | 'decoy'): string => {
      const left = this.cooldown(a);
      return left > 0 ? `  (${Math.ceil(left / 1000)}s)` : '';
    };
    this.actions.setText(
      [
        `[1] CAMERAS   loop every feed for 20s${cd('cameras')}`,
        `[2] DOORS     seal nearest door for 12s${cd('seal')}`,
        `[3] LIGHTS    toggle lights in this room${cd('lights')}`,
        `[4] SECURITY  decoy alarm in a distant room${cd('decoy')}`,
      ].join('\n'),
    );
  }
}
