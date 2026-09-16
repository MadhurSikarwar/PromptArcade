import Phaser from 'phaser';
import { audio } from '../systems/AudioManager';
import type { CinematicKind } from '../systems/GameState';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXTURES } from '../utils/Constants';
import { uiText } from './UIKit';

interface Feed {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  subject: Phaser.GameObjects.Image;
  static: boolean;
}

/** Scripted full-screen beats: waking into the collapse, A-3 on the security cameras, and the final "every screen shows you" reveal. */
export class CinematicOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly noise: Phaser.GameObjects.Graphics;
  private readonly caption: Phaser.GameObjects.Text;
  private readonly big: Phaser.GameObjects.Text;
  private readonly black: Phaser.GameObjects.Rectangle;
  private feeds: Feed[] = [];
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private running = false;

  constructor(private readonly scene: Phaser.Scene) {
    const bg = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x010203, 0.96).setOrigin(0);
    this.noise = scene.add.graphics();
    this.caption = uiText(scene, GAME_WIDTH / 2, GAME_HEIGHT - 90, '', 22, '#ff3b4e', true).setOrigin(0.5);
    this.big = uiText(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2, '', 40, '#ff2bd6', true).setOrigin(0.5).setAlpha(0);
    this.big.setShadow(0, 0, '#ff2bd6', 18, false, true);
    this.black = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1).setOrigin(0).setAlpha(0);
    const scan = scene.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, TEXTURES.scanlines).setOrigin(0).setAlpha(0.3);
    this.container = scene.add.container(0, 0, [bg, this.noise, scan, this.caption, this.black, this.big]).setDepth(950).setVisible(false);
  }

  get isRunning(): boolean {
    return this.running;
  }

  private addFeed(x: number, y: number, w: number, h: number, label: string, texture: string, scale: number, tint: number): Feed {
    const subject = this.scene.add.image(x + w / 2, y + h / 2, texture).setScale(scale).setTint(tint).setAlpha(0);
    const text = uiText(this.scene, x + 8, y + 6, label, 12, '#e8f6ff', true);
    const rec = uiText(this.scene, x + w - 8, y + 6, '● REC', 11, '#ff3b4e').setOrigin(1, 0);
    this.container.addAt([subject, text, rec], 2);
    this.labels.push(text, rec);
    const feed = { x, y, w, h, label, subject, static: true };
    this.feeds.push(feed);
    return feed;
  }

  play(kind: CinematicKind, done: () => void): void {
    this.running = true;
    this.feeds.forEach((f) => f.subject.destroy());
    this.labels.forEach((l) => l.destroy());
    this.feeds = [];
    this.labels.length = 0;
    this.caption.setText('');
    this.big.setAlpha(0).setFontSize(40);
    this.black.setAlpha(0);
    this.container.setVisible(true);
    const t = (ms: number, fn: () => void): void => {
      this.scene.time.delayedCall(ms, fn);
    };
    const finish = (): void => {
      this.container.setVisible(false);
      this.running = false;
      done();
    };

    if (kind === 'awakening') {
      this.black.setAlpha(1);
      audio.play('impact', 0.6);
      t(500, () => {
        audio.play('scrape', 0.4);
        this.black.setAlpha(0.82);
      });
      t(1500, () => {
        this.caption.setText('...EMERGENCY LIGHTING ACTIVE...').setColor('#ff3b4e');
        this.black.setAlpha(0.5);
        audio.play('glitch', 0.4);
      });
      t(2800, () => {
        this.black.setAlpha(0.86);
        this.caption.setText('SOMETHING IS MOVING.');
        audio.play('scrape', 0.75);
        this.scene.cameras.main.shake(220, 0.004);
      });
      t(4100, () => {
        audio.play('roar', 0.65);
        this.big.setText('A—3').setColor('#ff2bd6').setAlpha(1);
        this.black.setAlpha(0.32);
      });
      t(5500, () => {
        this.caption.setText('GET UP.').setColor('#e8f6ff');
        this.big.setAlpha(0);
      });
      t(6600, () => {
        this.black.setAlpha(0);
        this.caption.setText('');
      });
      t(7100, finish);
      return;
    }

    if (kind === 'reactor-overload') {
      this.caption.setText('REMOTE REACTOR OVERRIDE ENGAGED').setColor('#ff3b4e');
      audio.play('alarm', 0.7);
      this.black.setAlpha(0.55);
      t(1100, () => {
        this.caption.setText('CONTAINMENT FIELD COLLAPSING');
        audio.play('glitch', 0.6);
        this.scene.cameras.main.shake(200, 0.005);
      });
      t(2400, () => {
        audio.play('power-up', 0.5);
        this.big.setText('60').setColor('#ff3b4e').setAlpha(1);
        this.big.setFontSize(96);
      });
      t(3600, () => {
        this.big.setFontSize(40);
        this.big.setText('SECONDS TO CORE BREACH');
      });
      t(4800, () => {
        this.caption.setText('GET TO THE AIRLOCK. NOW.').setColor('#ffc23a');
        this.big.setAlpha(0);
        audio.play('roar', 0.5);
      });
      t(5800, finish);
      return;
    }

    if (kind === 'neural-override') {
      this.caption.setText('NEURAL LINK ISOLATED').setColor('#39ff9c');
      audio.play('glitch', 0.5);
      this.black.setAlpha(0.5);
      t(1300, () => {
        this.caption.setText('CONTAINMENT PROTOCOL DISENGAGED');
        audio.play('power-down', 0.4);
      });
      t(2700, () => {
        audio.play('roar', 0.3);
        this.big.setText('IT\'S FREE.').setColor('#39ff9c').setAlpha(1);
      });
      t(4200, () => {
        this.caption.setText('A-3 IS NO LONGER BEING FORCED TO HUNT.').setColor('#7fa6b8');
        this.big.setAlpha(0);
      });
      t(5600, () => {
        this.black.setAlpha(0);
        this.caption.setText('');
      });
      t(6000, finish);
      return;
    }

    if (kind === 'security-feeds') {
      const fw = 380;
      const fh = 240;
      const cam1 = this.addFeed(40, 150, fw, fh, 'CAM-02 CENTRAL HUB', TEXTURES.octopus, 0.9, 0x202a30);
      const cam2 = this.addFeed(450, 150, fw, fh, 'CAM-03 MAINTENANCE', TEXTURES.octopus, 1.2, 0x2a3640);
      const cam3 = this.addFeed(860, 150, fw, fh, 'CAM-05 RESEARCH LAB', TEXTURES.octopus, 2.2, 0x33424d);
      audio.play('glitch');
      t(1300, () => {
        cam2.static = false;
        cam2.subject.setAlpha(0.95);
        this.caption.setText('UNAUTHORIZED MOVEMENT');
        audio.play('scrape', 0.6);
        this.scene.tweens.add({ targets: cam2.subject, x: cam2.subject.x + 60, duration: 1400 });
      });
      t(2900, () => {
        cam2.static = true;
        cam2.subject.setAlpha(0);
        cam1.static = false;
        cam1.subject.setAlpha(0.9);
        audio.play('glitch');
      });
      t(3900, () => {
        cam1.static = true;
        cam1.subject.setAlpha(0);
        cam3.static = false;
        cam3.subject.setAlpha(1).setRotation(Math.PI / 2 + Math.PI);
        this.caption.setText('IT IS LOOKING AT THE CAMERA');
        audio.play('roar', 0.5);
      });
      t(5200, () => {
        audio.play('impact', 0.6);
        this.black.setAlpha(1);
        this.big.setText('IT\'S WATCHING.').setColor('#ff3b4e').setAlpha(1);
      });
      t(6800, finish);
      return;
    }

    const fw = 560;
    const fh = 220;
    this.caption.setText('ACCESS GRANTED — EXIT SEQUENCE INITIATED').setColor('#39ff9c');
    audio.play('granted');
    const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    ['CAMERA 01', 'CAMERA 02', 'CAMERA 03', 'CAMERA 04'].forEach((label, i) => {
      const feed = this.addFeed(60 + (i % 2) * 600, 90 + Math.floor(i / 2) * 250, fw, fh, label, TEXTURES.player, 1.2 + i * 0.3, 0xffffff);
      feed.subject.setRotation(angles[i]);
      t(900 + i * 450, () => {
        feed.static = false;
        feed.subject.setAlpha(1);
        audio.play('beep');
      });
    });
    t(2900, () => {
      this.caption.setText('EVERY SCREEN IS SHOWING YOU').setColor('#ffc23a');
    });
    t(4000, () => {
      audio.play('glitch');
      this.big.setText('UNKNOWN NETWORK ACCESS').setColor('#ff2bd6').setAlpha(1);
    });
    t(5200, () => {
      audio.play('glitch');
      this.big.setText('FACILITY CONTROL OVERRIDE');
    });
    t(6300, () => {
      audio.play('power-down');
      this.black.setAlpha(1);
      this.big.setAlpha(0);
      this.caption.setText('');
    });
    t(7400, () => {
      audio.play('roar');
      this.big.setText('YOU ARE NOT THE ONE BEING HUNTED.').setColor('#ff3b4e').setAlpha(1);
    });
    t(9400, finish);
  }

  update(): void {
    if (!this.running) return;
    const g = this.noise;
    g.clear();
    for (const feed of this.feeds) {
      g.fillStyle(0x0a1014, 1);
      g.fillRect(feed.x, feed.y, feed.w, feed.h);
      g.lineStyle(2, COLORS.cyan, 0.4);
      g.strokeRect(feed.x, feed.y, feed.w, feed.h);
      const density = feed.static ? 160 : 30;
      for (let i = 0; i < density; i++) {
        g.fillStyle(0xffffff, Math.random() * (feed.static ? 0.35 : 0.1));
        g.fillRect(feed.x + Math.random() * feed.w, feed.y + Math.random() * feed.h, 2 + Math.random() * 6, 1 + Math.random() * 2);
      }
    }
    if (Math.random() < 0.05) this.big.setX(GAME_WIDTH / 2 + (Math.random() - 0.5) * 12);
  }
}
