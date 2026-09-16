import Phaser from 'phaser';
import { getCurrentProfile } from '../profile/Session';
import { escapeCount, runCount, topRuns, type LoggedRun } from '../profile/ProfileStore';
import { formatDuration } from '../profile/Scoring';
import { drawPanel, uiText } from '../ui/UIKit';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES, TEXTURES } from '../utils/Constants';
import { requireKeyboard, toHex } from '../utils/Helpers';

const ENDING_LABEL: Record<string, string> = { escape: 'ESCAPED', destroy: 'DESTROYED FACILITY', free: 'FREED A-3' };
const DIFFICULTY_COLOR: Record<string, number> = { easy: COLORS.green, normal: COLORS.cyan, hard: COLORS.yellow, nightmare: COLORS.red };

/** "Personal log": every profile's best scores and full run history, read from ProfileStore. */
export class PersonalLogScene extends Phaser.Scene {
  private leaving = false;

  constructor() {
    super(SCENES.personalLog);
  }

  create(): void {
    this.leaving = false;
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.void).setOrigin(0);
    this.add.image(cx, 100, TEXTURES.glow).setTint(COLORS.magenta).setAlpha(0.1).setScale(9, 2.4).setBlendMode(Phaser.BlendModes.ADD);

    const profile = getCurrentProfile();
    uiText(this, cx, 46, 'PERSONAL LOG', 34, '#19e6ff', true).setOrigin(0.5).setShadow(0, 0, '#19e6ff', 16, false, true);
    uiText(this, cx, 80, profile ? `DIVER: ${profile.displayName.toUpperCase()}` : 'NO ACTIVE PROFILE', 13, '#ff2bd6', true).setOrigin(0.5);

    if (!profile) {
      uiText(this, cx, GAME_HEIGHT / 2, 'LOG IN TO TRACK YOUR RUNS.', 16, '#7fa6b8').setOrigin(0.5);
    } else {
      const runs = topRuns(profile.id, 10);
      const totalRuns = runCount(profile.id);
      const escapes = escapeCount(profile.id);

      const statsY = 118;
      const stats = [
        ['RUNS LOGGED', String(totalRuns)],
        ['ESCAPES', String(escapes)],
        ['BEST SCORE', runs[0] ? String(runs[0].score) : '—'],
      ];
      stats.forEach(([label, value], i) => {
        const x = cx - 280 + i * 280;
        uiText(this, x, statsY, label, 11, '#6f97a8').setOrigin(0.5);
        uiText(this, x, statsY + 22, value, 24, '#e8f6ff', true).setOrigin(0.5);
      });

      const panelX = cx - 460;
      const panelY = 168;
      const panelW = 920;
      const panelH = 420;
      const panel = this.add.graphics();
      drawPanel(panel, panelX, panelY, panelW, panelH, COLORS.cyan);

      uiText(this, panelX + 16, panelY + 12, 'RANK', 11, '#6f97a8', true);
      uiText(this, panelX + 90, panelY + 12, 'SCORE', 11, '#6f97a8', true);
      uiText(this, panelX + 190, panelY + 12, 'DIFFICULTY', 11, '#6f97a8', true);
      uiText(this, panelX + 340, panelY + 12, 'RESULT', 11, '#6f97a8', true);
      uiText(this, panelX + 560, panelY + 12, 'MISSIONS', 11, '#6f97a8', true);
      uiText(this, panelX + 700, panelY + 12, 'TIME', 11, '#6f97a8', true);
      uiText(this, panelX + 800, panelY + 12, 'WHEN', 11, '#6f97a8', true);

      if (runs.length === 0) {
        uiText(this, panelX + panelW / 2, panelY + panelH / 2, 'NO RUNS YET — DIVE IN AND FIND OUT.', 14, '#4f7688').setOrigin(0.5);
      } else {
        runs.forEach((run: LoggedRun, i) => {
          const rowY = panelY + 40 + i * 36;
          const rowColor = i === 0 ? '#ffc23a' : '#d8f8ff';
          uiText(this, panelX + 16, rowY, `#${i + 1}`, 13, rowColor, true);
          uiText(this, panelX + 90, rowY, String(run.score), 13, rowColor, true);
          uiText(this, panelX + 190, rowY, run.difficulty.toUpperCase(), 12, toHex(DIFFICULTY_COLOR[run.difficulty] ?? COLORS.steel), true);
          const resultLabel = run.outcome === 'escaped' ? ENDING_LABEL[run.endingKind ?? 'escape'] : `DIED — ${run.cause ?? 'UNKNOWN'}`;
          uiText(this, panelX + 340, rowY, resultLabel, 12, run.outcome === 'escaped' ? '#39ff9c' : '#ff3b4e').setWordWrapWidth(200);
          uiText(this, panelX + 560, rowY, `${run.missionsCompleted}/${run.totalMissions}`, 12, '#9fdcff');
          uiText(this, panelX + 700, rowY, formatDuration(run.elapsedMs), 12, '#9fdcff');
          uiText(this, panelX + 800, rowY, new Date(run.timestamp).toLocaleDateString(), 11, '#5f7683');
        });
      }
    }

    const back = uiText(this, cx, GAME_HEIGHT - 34, '[ESC]  BACK TO MENU', 14, '#e8f6ff', true).setOrigin(0.5);
    this.tweens.add({ targets: back, alpha: 0.4, duration: 900, yoyo: true, repeat: -1 });

    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, TEXTURES.scanlines).setOrigin(0).setAlpha(0.1);
    this.add.image(0, 0, TEXTURES.vignette).setOrigin(0);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    const keyboard = requireKeyboard(this);
    keyboard.on('keydown-ESC', () => this.back());
    keyboard.on('keydown-ENTER', () => this.back());
  }

  private back(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(SCENES.menu));
  }
}
