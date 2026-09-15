import Phaser from 'phaser';
import { startNewRun } from '../systems/GameState';
import { drawPanel, uiText } from '../ui/UIKit';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES, TEXTURES } from '../utils/Constants';
import { requireKeyboard } from '../utils/Helpers';

const CONTROLS: [string, string][] = [
  ['WASD', 'MOVE'],
  ['SHIFT', 'SPRINT'],
  ['E', 'INTERACT'],
  ['Q', 'EMP BLAST'],
  ['TAB', 'CYBERDECK'],
  ['M', 'MAP'],
  ['H', 'WALKTHROUGH'],
  ['ESC', 'PAUSE'],
];

const BRIEFING = [
  'Follow the top-center arrow and the mission checklist to your next goal.',
  'Find keycards, restore power and hack terminals to unlock the facility.',
  'The Kraken hunts by sight and sound — watch the radar, run, hide in vents, or use [Q] to EMP it.',
  'A 4-minute flood timer is ticking. Once it hits zero, the lower level floods and oxygen starts draining.',
  'Reach Upper Facility Access, return to the door you ignored at the start, and get out alive.',
];

/** A button is a hit-target rectangle + label the caller can style/animate directly. */
interface Button {
  box: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export class MainMenuScene extends Phaser.Scene {
  private starting = false;
  private octoT = 0;
  private octopusBody!: Phaser.GameObjects.Image;
  private octopusGlow!: Phaser.GameObjects.Image;
  private octopusGlowMagenta!: Phaser.GameObjects.Image;
  private octopusTentacles!: Phaser.GameObjects.Graphics;
  private octopusEyes: Phaser.GameObjects.Image[] = [];

  constructor() {
    super(SCENES.menu);
  }

  create(): void {
    this.starting = false;
    const cx = GAME_WIDTH / 2;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.void).setOrigin(0);
    this.add
      .image(cx, GAME_HEIGHT * 0.4, TEXTURES.glow)
      .setTint(COLORS.cyan)
      .setAlpha(0.14)
      .setScale(9, 4)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Perspective neon floor grid, fading toward a horizon — classic cyberpunk skyline vibe.
    const horizon = GAME_HEIGHT * 0.62;
    const grid = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    for (let i = -20; i <= 20; i++) {
      const t = i / 20;
      grid.lineStyle(1, COLORS.magenta, 0.16 * (1 - Math.abs(t) * 0.4));
      grid.lineBetween(cx + t * 40, horizon, cx + t * GAME_WIDTH, GAME_HEIGHT);
    }
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const y = horizon + (GAME_HEIGHT - horizon) * t * t;
      grid.lineStyle(1, COLORS.cyan, 0.14 * (1 - t * 0.5));
      grid.lineBetween(0, y, GAME_WIDTH, y);
    }

    const beam = this.add.rectangle(0, -4, GAME_WIDTH, 3, COLORS.cyan, 0.16).setOrigin(0, 0).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: beam, y: GAME_HEIGHT, duration: 4200, repeat: -1, ease: 'Sine.easeInOut' });

    this.add.particles(0, 0, TEXTURES.dot, {
      x: { min: 0, max: GAME_WIDTH },
      y: GAME_HEIGHT + 10,
      lifespan: 9000,
      speedY: { min: -70, max: -25 },
      speedX: { min: -8, max: 8 },
      scale: { min: 0.15, max: 0.6 },
      alpha: { start: 0.4, end: 0 },
      tint: COLORS.cyan,
      frequency: 140,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.add.particles(0, 0, TEXTURES.dot, {
      x: { min: 0, max: GAME_WIDTH },
      y: GAME_HEIGHT + 10,
      lifespan: 7000,
      speedY: { min: -55, max: -18 },
      speedX: { min: -10, max: 10 },
      scale: { min: 0.1, max: 0.4 },
      alpha: { start: 0.28, end: 0 },
      tint: COLORS.magenta,
      frequency: 260,
      blendMode: Phaser.BlendModes.ADD,
    });

    this.octoT = 0;
    this.buildBackgroundOctopus();

    const ghost = uiText(this, cx + 4, GAME_HEIGHT * 0.34 + 2, 'KRAKEN', 108, '#ff2bd6', true)
      .setOrigin(0.5)
      .setAlpha(0.35)
      .setBlendMode(Phaser.BlendModes.ADD);
    const title = uiText(this, cx, GAME_HEIGHT * 0.34, 'KRAKEN', 108, '#19e6ff', true).setOrigin(0.5);
    title.setShadow(0, 0, '#19e6ff', 26, false, true);

    uiText(this, cx, GAME_HEIGHT * 0.34 + 80, '—  D E A D   S I G N A L  —', 22, '#ff5fd8', true).setOrigin(0.5);
    uiText(this, cx, GAME_HEIGHT * 0.34 + 112, 'POSEIDON RESEARCH FACILITY // TRANSMISSION LOST', 11, '#4f7688', true).setOrigin(0.5);

    // Occasional failing-neon flicker on the title.
    this.time.addEvent({
      delay: 2400,
      loop: true,
      callback: () => {
        this.tweens.add({ targets: [title, ghost], alpha: { from: 0.2, to: 1 }, duration: 60, yoyo: true, repeat: 2 });
        ghost.setX(cx + Phaser.Math.Between(-6, 6));
      },
    });

    const diveBtn = this.makeButton(cx - 108, GAME_HEIGHT * 0.6, 196, 50, '▶  DIVE IN', COLORS.cyan, true, () => this.startGame());
    this.makeButton(cx + 108, GAME_HEIGHT * 0.6, 196, 50, '☰  BRIEFING', COLORS.magenta, false, () => this.openBriefing());
    this.pulseButton(diveBtn);

    uiText(this, cx, GAME_HEIGHT * 0.6 + 46, 'PRESS  ENTER  TO  DIVE  ·  OR  CLICK  BRIEFING  FOR  CONTROLS', 11, '#4f7688').setOrigin(0.5);

    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, TEXTURES.scanlines).setOrigin(0).setAlpha(0.18);
    this.add.image(0, 0, TEXTURES.vignette).setOrigin(0);

    this.buildBriefingModal();

    const keyboard = requireKeyboard(this);
    keyboard.on('keydown-ENTER', () => this.startGame());
    keyboard.on('keydown-ESC', () => this.closeBriefing());
    this.cameras.main.fadeIn(700, 0, 0, 0);
  }

  private makeButton(x: number, y: number, w: number, h: number, label: string, accent: number, primary: boolean, onClick: () => void): Button {
    const box = this.add
      .rectangle(x, y, w, h, accent, primary ? 0.16 : 0.08)
      .setStrokeStyle(1.5, accent, primary ? 1 : 0.65)
      .setInteractive({ useHandCursor: true });
    const text = uiText(this, x, y, label, 15, primary ? '#eafcff' : '#ffd6f6', true).setOrigin(0.5);

    box.on('pointerover', () => {
      box.setFillStyle(accent, primary ? 0.32 : 0.18);
      this.tweens.add({ targets: [box, text], scale: 1.04, duration: 120, ease: 'Cubic.easeOut' });
    });
    box.on('pointerout', () => {
      box.setFillStyle(accent, primary ? 0.16 : 0.08);
      this.tweens.add({ targets: [box, text], scale: 1, duration: 120, ease: 'Cubic.easeOut' });
    });
    box.on('pointerdown', () => {
      this.tweens.add({ targets: [box, text], scale: 0.96, duration: 60, yoyo: true });
      onClick();
    });
    return { box, label: text };
  }

  private pulseButton(btn: Button): void {
    this.tweens.add({
      targets: btn.box,
      alpha: { from: 1, to: 0.7 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Same creature as in-game (body + 8-tentacle procedural render + glowing eyes) — bigger, longer-limbed, and lit up. */
  private buildBackgroundOctopus(): void {
    const start = -420;
    const y0 = GAME_HEIGHT * 0.24;
    this.octopusGlow = this.add.image(start, y0, TEXTURES.glow).setScale(2.6).setTint(COLORS.cyan).setAlpha(0.28).setBlendMode(Phaser.BlendModes.ADD);
    this.octopusGlowMagenta = this.add.image(start, y0, TEXTURES.glow).setScale(1.7).setTint(COLORS.magenta).setAlpha(0.22).setBlendMode(Phaser.BlendModes.ADD);
    this.octopusTentacles = this.add.graphics().setAlpha(0.95);
    this.octopusBody = this.add.image(start, y0, TEXTURES.octopus).setScale(2.3).setAlpha(0.96);
    this.octopusEyes = [0, 1].map(() => this.add.image(start, y0, TEXTURES.glow).setScale(0.34).setTint(COLORS.cyan).setAlpha(0.95).setBlendMode(Phaser.BlendModes.ADD));
  }

  override update(_time: number, delta: number): void {
    if (!this.octopusBody) return;
    const dt = Math.min(delta, 50) / 1000;
    this.octoT += dt;

    // Wandering path: two circular motions at unrelated periods layered together, so it loops
    // top-to-bottom and right-to-left across the whole screen without ever exactly repeating.
    const time = this.octoT;
    const cx = GAME_WIDTH * 0.5;
    const cy = GAME_HEIGHT * 0.42;
    const w1 = (2 * Math.PI) / 41;
    const w2 = (2 * Math.PI) / 33;
    const w3 = (2 * Math.PI) / 19;
    const w4 = (2 * Math.PI) / 26;
    const ax1 = GAME_WIDTH * 0.44;
    const ax2 = GAME_WIDTH * 0.14;
    const ay1 = GAME_HEIGHT * 0.32;
    const ay2 = GAME_HEIGHT * 0.12;

    const xPos = cx + ax1 * Math.sin(time * w1) + ax2 * Math.sin(time * w3 + 1.3);
    const yPos = cy + ay1 * Math.sin(time * w2 + 0.7) + ay2 * Math.sin(time * w4 + 2.1);
    const vx = ax1 * w1 * Math.cos(time * w1) + ax2 * w3 * Math.cos(time * w3 + 1.3);
    const vy = ay1 * w2 * Math.cos(time * w2 + 0.7) + ay2 * w4 * Math.cos(time * w4 + 2.1);

    const x = xPos;
    const y = yPos;
    const facing = Math.atan2(vy, vx);
    const pulse = 1 + Math.sin(this.octoT * 0.8) * 0.04;

    this.octopusBody.setPosition(x, y).setRotation(facing).setScale(2.3 * pulse);
    this.octopusGlow.setPosition(x, y).setAlpha(0.24 + Math.sin(this.octoT * 0.8) * 0.06);
    this.octopusGlowMagenta.setPosition(x - 18, y + 10).setAlpha(0.18 + Math.sin(this.octoT * 0.8 + 1.4) * 0.06);

    const g = this.octopusTentacles;
    g.clear();
    for (let i = 0; i < 8; i++) {
      const spread = (i - 3.5) * 0.3;
      let angle = facing + Math.PI + spread;
      let px = x + Math.cos(angle) * 46;
      let py = y + Math.sin(angle) * 46;
      const segments = 13;
      for (let s = 0; s < segments; s++) {
        const wave = Math.sin(this.octoT * 1.5 + i * 1.3 + s * 0.5) * 0.32;
        angle += wave * 0.35;
        const segLength = 22;
        const nx = px + Math.cos(angle) * segLength;
        const ny = py + Math.sin(angle) * segLength;
        const width = Math.max(2.5, 20 - s * 1.4);
        g.lineStyle(width + 4, 0x020406, 0.85);
        g.lineBetween(px, py, nx, ny);
        g.lineStyle(width, s % 3 === 0 ? 0x1c2a33 : 0x121a21, 1);
        g.lineBetween(px, py, nx, ny);
        if (s % 3 === 1) {
          g.fillStyle(COLORS.cyan, 0.75);
          g.fillCircle(nx, ny, 2.6);
        } else if (s % 4 === 3) {
          g.fillStyle(COLORS.magenta, 0.6);
          g.fillCircle(nx, ny, 2);
        }
        px = nx;
        py = ny;
      }
      g.fillStyle(COLORS.cyan, 0.95);
      g.fillCircle(px, py, 3.6);
    }

    this.octopusEyes.forEach((eye, i) => {
      const a = facing + (i === 0 ? -0.45 : 0.45);
      eye.setPosition(x + Math.cos(a) * 46, y + Math.sin(a) * 46);
    });
  }

  private buildBriefingModal(): void {
    const cx = GAME_WIDTH / 2;
    const w = 620;
    const h = 520;
    const x = cx - w / 2;
    const y = (GAME_HEIGHT - h) / 2;

    // Interactive so it both blocks clicks to the menu buttons behind it and closes the modal when clicked.
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x010204, 0.82).setOrigin(0).setInteractive();
    backdrop.on('pointerdown', () => this.closeBriefing());

    const panel = this.add.graphics();
    drawPanel(panel, x, y, w, h, COLORS.magenta);

    // Sits on top of the backdrop over the panel's own footprint so clicks on the briefing
    // content (not just its buttons) don't fall through to the backdrop and close the modal.
    const panelShield = this.add.rectangle(x, y, w, h, 0x000000, 0).setOrigin(0).setInteractive();

    const title = uiText(this, x + 26, y + 22, 'MISSION BRIEFING', 20, '#ff5fd8', true);
    const sub = uiText(this, x + 26, y + 50, 'POSEIDON FACILITY // DIVE PROTOCOL', 10, '#8f5f8a', true);

    const bodyText = BRIEFING.map((line) => `›  ${line}`).join('\n\n');
    const body = uiText(this, x + 26, y + 86, bodyText, 13, '#c8dfe8').setLineSpacing(9).setWordWrapWidth(w - 52);

    const controlsY = y + h - 118;
    const controlsLabel = uiText(this, x + 26, controlsY, 'CONTROLS', 11, '#ff2bd6', true);
    const controlEls: Phaser.GameObjects.Text[] = [controlsLabel];
    CONTROLS.forEach(([key, action], i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const kx = x + 26 + col * ((w - 52) / 4);
      const ky = controlsY + 24 + row * 30;
      const keyBg = this.add.rectangle(kx, ky, 46, 20, COLORS.cyan, 0.12).setStrokeStyle(1, COLORS.cyan, 0.6).setOrigin(0, 0.5);
      const keyText = uiText(this, kx + 23, ky, key, 10, '#9fdcff', true).setOrigin(0.5);
      const actionText = uiText(this, kx + 52, ky, action, 10, '#8fa8b3').setOrigin(0, 0.5);
      controlEls.push(keyText, actionText);
      this.briefingExtras.push(keyBg);
    });

    const closeBtn = this.makeButton(x + w - 34, y + 26, 32, 32, 'X', COLORS.red, false, () => this.closeBriefing());

    const startBtn = this.makeButton(cx, y + h - 28, 220, 44, '▶  BEGIN DIVE', COLORS.green, true, () => this.startGame());

    this.briefing = this.add.container(0, 0, [
      backdrop,
      panel,
      panelShield,
      title,
      sub,
      body,
      ...controlEls,
      ...this.briefingExtras,
      closeBtn.box,
      closeBtn.label,
      startBtn.box,
      startBtn.label,
    ]);
    this.briefing.setDepth(500).setVisible(false);
  }

  private briefing!: Phaser.GameObjects.Container;
  private briefingExtras: Phaser.GameObjects.GameObject[] = [];

  private openBriefing(): void {
    this.briefing.setVisible(true);
    this.briefing.setAlpha(0);
    this.tweens.add({ targets: this.briefing, alpha: 1, duration: 160 });
  }

  private closeBriefing(): void {
    if (!this.briefing.visible) return;
    this.tweens.add({ targets: this.briefing, alpha: 0, duration: 140, onComplete: () => this.briefing.setVisible(false) });
  }

  private startGame(): void {
    if (this.starting) return;
    this.starting = true;
    this.cameras.main.fadeOut(650, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      startNewRun();
      this.scene.start(SCENES.game);
    });
  }
}
