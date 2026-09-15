import type Phaser from 'phaser';
import type { NotifyTone } from '../systems/GameState';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../utils/Constants';
import { toHex } from '../utils/Helpers';
import { uiText } from './UIKit';

const TONE_COLORS: Record<NotifyTone, number> = {
  info: COLORS.cyan,
  success: COLORS.green,
  warning: COLORS.yellow,
  danger: COLORS.red,
  debug: COLORS.magenta,
};

const MAX_NOTIFICATIONS = 3;
const TOP = 132;
const ROW = 34;

/** System notifications (top-center) and protagonist dialogue subtitles (bottom-center). */
export class MessageFeed {
  private readonly notices: Phaser.GameObjects.Container[] = [];
  private readonly speaker: Phaser.GameObjects.Text;
  private readonly line: Phaser.GameObjects.Text;
  private typeTimer: Phaser.Time.TimerEvent | null = null;
  private hideTimer: Phaser.Time.TimerEvent | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    this.speaker = uiText(scene, GAME_WIDTH / 2, GAME_HEIGHT - 150, '', 12, '#19e6ff', true).setOrigin(0.5).setAlpha(0);
    this.line = uiText(scene, GAME_WIDTH / 2, GAME_HEIGHT - 128, '', 18, '#e8f6ff').setOrigin(0.5).setAlpha(0);
    this.line.setShadow(0, 2, '#000000', 6, false, true);
  }

  notify(text: string, tone: NotifyTone): void {
    const scene = this.scene;
    const color = TONE_COLORS[tone];
    const label = uiText(scene, 0, 0, text, 15, toHex(color), true).setOrigin(0.5);
    const width = label.width + 44;
    const bg = scene.add.graphics();
    bg.fillStyle(0x02070b, 0.8);
    bg.fillRect(-width / 2, -13, width, 26);
    bg.fillStyle(color, 1);
    bg.fillRect(-width / 2, -13, 3, 26);
    bg.fillRect(width / 2 - 3, -13, 3, 26);
    bg.lineStyle(1, color, 0.35);
    bg.strokeRect(-width / 2 + 0.5, -12.5, width - 1, 25);

    const container = scene.add.container(GAME_WIDTH / 2, TOP - 12, [bg, label]).setAlpha(0);
    this.notices.unshift(container);
    while (this.notices.length > MAX_NOTIFICATIONS) {
      const old = this.notices.pop();
      old?.destroy();
    }
    this.reflow();

    scene.tweens.add({ targets: container, alpha: 1, duration: 160 });
    scene.time.delayedCall(2600, () => {
      if (!container.active) return;
      scene.tweens.add({
        targets: container,
        alpha: 0,
        duration: 380,
        onComplete: () => {
          const index = this.notices.indexOf(container);
          if (index >= 0) this.notices.splice(index, 1);
          container.destroy();
          this.reflow();
        },
      });
    });
  }

  say(speakerName: string, text: string): void {
    const scene = this.scene;
    this.typeTimer?.remove();
    this.hideTimer?.remove();
    scene.tweens.killTweensOf([this.speaker, this.line]);

    this.speaker.setText(speakerName).setAlpha(1);
    this.line.setText('').setAlpha(1);
    let shown = 0;
    this.typeTimer = scene.time.addEvent({
      delay: 28,
      repeat: text.length - 1,
      callback: () => {
        shown++;
        this.line.setText(`“${text.slice(0, shown)}${shown < text.length ? '' : '”'}`);
      },
    });
    this.hideTimer = scene.time.delayedCall(text.length * 28 + 2600, () => {
      scene.tweens.add({ targets: [this.speaker, this.line], alpha: 0, duration: 500 });
    });
  }

  private reflow(): void {
    this.notices.forEach((notice, index) => {
      this.scene.tweens.add({ targets: notice, y: TOP + index * ROW, duration: 180, ease: 'Cubic.easeOut' });
    });
  }
}
