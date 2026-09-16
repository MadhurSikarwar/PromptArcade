import Phaser from 'phaser';
import { EndingExperience } from '../3d/EndingExperience';
import { ThreeStage } from '../3d/ThreeStage';
import { audio } from '../systems/AudioManager';
import { startNewRun, type EndingKind } from '../systems/GameState';
import { uiText } from '../ui/UIKit';
import { COLORS, FONT_MONO, GAME_HEIGHT, GAME_WIDTH, SCENES, TEXTURES } from '../utils/Constants';
import { requireKeyboard, toHex } from '../utils/Helpers';

interface EndingData {
  kind?: EndingKind;
}

interface EndingCopy {
  title: string;
  titleColor: number;
  subtitle: string;
  signalLines: string[];
  bg: number;
}

const ENDINGS: Record<EndingKind, EndingCopy> = {
  escape: {
    title: 'YOU SURFACED',
    titleColor: COLORS.cyan,
    subtitle: 'A-3 REMAINS BELOW.',
    signalLines: ['DIVING COMPUTER', '', 'UNKNOWN SIGNAL DETECTED', 'SOURCE: POSEIDON FACILITY', 'TYPE: OUTGOING', 'DESTINATION: UNKNOWN', '', 'SIGNAL STATUS: ACTIVE'],
    bg: 0x02080a,
  },
  destroy: {
    title: 'THE FACILITY IS GONE',
    titleColor: COLORS.red,
    subtitle: 'SO IS EVERYTHING THAT WAS IN IT. PROBABLY.',
    signalLines: ['DIVING COMPUTER', '', 'SEISMIC EVENT LOGGED', 'SOURCE: POSEIDON COORDINATES', 'TYPE: STRUCTURAL COLLAPSE', 'CONFIRMED SIGNATURES: 1 OF 2', '', 'ONE SIGNAL NEVER STOPPED.'],
    bg: 0x0a0203,
  },
  free: {
    title: 'YOU LET IT GO',
    titleColor: COLORS.green,
    subtitle: "IT'S NOT ALONE IN THE DARK ANYMORE. NEITHER ARE YOU.",
    signalLines: ['DIVING COMPUTER', '', 'NO HOSTILE SIGNAL DETECTED', 'SOURCE: POSEIDON FACILITY', 'TYPE: —', 'DESTINATION: —', '', 'THE FACILITY IS SILENT.'],
    bg: 0x020a06,
  },
};

/**
 * Two acts: a short 3D ascent (mirroring the opening's dive, per the PRD's 2D->3D symmetry),
 * then one of three 2D epilogues chosen entirely by what the player did at Evacuation Control.
 */
export class EndingScene extends Phaser.Scene {
  private restarting = false;
  private kind: EndingKind = 'escape';
  private phase: '3d' | '2d' = '3d';
  private stage: ThreeStage | null = null;
  private experience: EndingExperience | null = null;
  private elapsed = 0;
  private hintEl: HTMLDivElement | null = null;

  constructor() {
    super(SCENES.ending);
  }

  init(data: EndingData): void {
    this.restarting = false;
    this.kind = data.kind ?? 'escape';
    this.phase = '3d';
    this.elapsed = 0;
  }

  create(): void {
    this.stage = new ThreeStage(10);
    this.experience = new EndingExperience(this.stage.aspect);
    this.stage.usePostProcessing(this.experience.scene, this.experience.camera);
    audio.setAmbience('ocean');
    this.hintEl = this.makeSkipHint();

    const keyboard = requireKeyboard(this);
    keyboard.on('keydown-ENTER', () => this.onConfirm());
    keyboard.on('keydown-SPACE', () => this.onConfirm());

    this.cameras.main.setAlpha(0);
    this.cameras.main.fadeIn(900, 0, 0, 0);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stage?.dispose();
      this.stage = null;
      this.hintEl?.remove();
      this.hintEl = null;
      audio.stopAmbience();
    });
  }

  override update(_time: number, delta: number): void {
    if (this.phase !== '3d' || !this.stage || !this.experience) return;
    this.elapsed += Math.min(delta, 50) / 1000;
    this.experience.update(this.elapsed);
    this.stage.render(this.experience.scene, this.experience.camera);
    if (this.experience.isComplete(this.elapsed)) this.enterEpilogue();
  }

  private onConfirm(): void {
    if (this.phase === '3d') this.enterEpilogue();
    else this.toMenu();
  }

  private enterEpilogue(): void {
    if (this.phase !== '3d') return;
    this.phase = '2d';
    this.stage?.dispose();
    this.stage = null;
    this.experience = null;
    this.hintEl?.remove();
    this.hintEl = null;
    audio.setAmbienceVolume(0, 0.6);
    this.showEpilogueText();
  }

  private showEpilogueText(): void {
    const copy = ENDINGS[this.kind];
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, copy.bg).setOrigin(0);
    this.add.image(cx, GAME_HEIGHT / 2, TEXTURES.glow).setTint(copy.titleColor).setAlpha(0.14).setScale(8, 4).setBlendMode(Phaser.BlendModes.ADD);

    const title = uiText(this, cx, GAME_HEIGHT * 0.32, copy.title, 52, toHex(copy.titleColor), true).setOrigin(0.5);
    title.setShadow(0, 0, toHex(copy.titleColor), 20, false, true);
    uiText(this, cx, GAME_HEIGHT * 0.32 + 56, copy.subtitle, 16, '#7fa6b8').setOrigin(0.5).setWordWrapWidth(700).setAlign('center');

    const signal = uiText(this, cx, GAME_HEIGHT * 0.58, copy.signalLines.join('\n'), 14, '#ff2bd6', true).setOrigin(0.5).setAlpha(0).setLineSpacing(6);
    this.tweens.add({ targets: signal, alpha: 1, duration: 900, delay: 1400 });

    const prompt = uiText(this, cx, GAME_HEIGHT * 0.87, 'PRESS  ENTER  TO  RETURN', 18, '#e8f6ff', true).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: prompt, alpha: { from: 0.25, to: 1 }, duration: 900, delay: 2600, yoyo: true, repeat: -1 });

    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, TEXTURES.scanlines).setOrigin(0).setAlpha(0.12);
    this.add.image(0, 0, TEXTURES.vignette).setOrigin(0);
  }

  private makeSkipHint(): HTMLDivElement {
    const el = document.createElement('div');
    el.textContent = 'PRESS ENTER TO SKIP';
    el.style.position = 'fixed';
    el.style.left = '0';
    el.style.right = '0';
    el.style.bottom = '5vh';
    el.style.textAlign = 'center';
    el.style.zIndex = '11';
    el.style.pointerEvents = 'none';
    el.style.fontFamily = FONT_MONO;
    el.style.letterSpacing = '0.2em';
    el.style.fontSize = '13px';
    el.style.color = '#c8e8f0';
    el.style.textShadow = '0 0 6px rgba(0,0,0,0.8)';
    el.style.opacity = '0.6';
    document.body.appendChild(el);
    return el;
  }

  private toMenu(): void {
    if (this.restarting) return;
    this.restarting = true;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      startNewRun();
      this.scene.start(SCENES.menu);
    });
  }
}
