import Phaser from 'phaser';
import { authProviders, continueAsGuest, getCurrentProfile, setCurrentProfile } from '../profile/Session';
import { COLORS, FONT_MONO, GAME_HEIGHT, GAME_WIDTH, SCENES, TEXTURES } from '../utils/Constants';

type Mode = 'login' | 'signup';

const google = authProviders.find((p) => p.id === 'google')!;
const local = authProviders.find((p) => p.id === 'local')!;

/**
 * The real landing screen: log in, sign up, or continue as a guest. Accounts and the personal
 * log both live in this browser only (see LocalAuthProvider) — "Sign in with Google" is wired
 * up and ready, just waiting on a Firebase project (see GoogleAuthProvider.ts).
 */
export class AuthScene extends Phaser.Scene {
  private root: HTMLDivElement | null = null;
  private mode: Mode = 'login';
  private leaving = false;

  constructor() {
    super(SCENES.auth);
  }

  create(): void {
    this.leaving = false;

    // Already have a session (page reload, or a returning guest this tab remembers)? Skip straight in.
    const existing = getCurrentProfile() ?? local.getCurrentUser();
    if (existing) {
      setCurrentProfile(existing, local);
      this.scene.start(SCENES.menu);
      return;
    }

    this.cameras.main.setBackgroundColor(COLORS.void);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT * 0.4, TEXTURES.glow).setTint(COLORS.cyan).setAlpha(0.12).setScale(9, 4).setBlendMode(Phaser.BlendModes.ADD);
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, TEXTURES.scanlines).setOrigin(0).setAlpha(0.12);
    this.add.image(0, 0, TEXTURES.vignette).setOrigin(0);
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.buildForm();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  private teardown(): void {
    this.root?.remove();
    this.root = null;
  }

  private go(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(450, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENES.menu);
    });
  }

  // ------------------------------------------------------------------ DOM form

  private buildForm(): void {
    const root = document.createElement('div');
    root.style.position = 'fixed';
    root.style.inset = '0';
    root.style.zIndex = '20';
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    root.style.alignItems = 'center';
    root.style.justifyContent = 'center';
    root.style.fontFamily = FONT_MONO;
    root.style.pointerEvents = 'none'; // re-enabled per-element below
    root.style.padding = 'max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))';
    root.style.boxSizing = 'border-box';
    root.style.overflowY = 'auto';
    document.body.appendChild(root);
    this.root = root;

    const card = document.createElement('div');
    card.style.pointerEvents = 'auto';
    card.style.width = 'min(92vw, 420px)';
    card.style.background = 'rgba(3,8,13,0.92)';
    card.style.border = '1px solid rgba(25,230,255,0.35)';
    card.style.borderRadius = '4px';
    card.style.padding = '28px 26px 22px';
    card.style.boxShadow = '0 0 40px rgba(25,230,255,0.12), inset 0 0 60px rgba(25,230,255,0.03)';
    root.appendChild(card);

    const title = document.createElement('div');
    title.textContent = 'KRAKEN';
    title.style.color = '#19e6ff';
    title.style.fontSize = '30px';
    title.style.fontWeight = '700';
    title.style.letterSpacing = '0.12em';
    title.style.textAlign = 'center';
    title.style.textShadow = '0 0 16px rgba(25,230,255,0.6)';
    card.appendChild(title);

    const sub = document.createElement('div');
    sub.textContent = 'DIVE CREDENTIALS REQUIRED';
    sub.style.color = '#7fa6b8';
    sub.style.fontSize = '11px';
    sub.style.letterSpacing = '0.25em';
    sub.style.textAlign = 'center';
    sub.style.marginTop = '4px';
    sub.style.marginBottom = '20px';
    card.appendChild(sub);

    // Tabs
    const tabs = document.createElement('div');
    tabs.style.display = 'flex';
    tabs.style.gap = '8px';
    tabs.style.marginBottom = '16px';
    card.appendChild(tabs);
    const loginTab = this.makeTabButton('LOG IN');
    const signupTab = this.makeTabButton('SIGN UP');
    tabs.appendChild(loginTab);
    tabs.appendChild(signupTab);

    // Fields
    const displayNameField = this.makeField('DISPLAY NAME', 'text');
    const usernameField = this.makeField('USERNAME', 'text');
    const passwordField = this.makeField('PASSWORD', 'password');
    card.appendChild(displayNameField.wrap);
    card.appendChild(usernameField.wrap);
    card.appendChild(passwordField.wrap);
    displayNameField.wrap.style.display = 'none';

    const error = document.createElement('div');
    error.style.color = '#ff3b4e';
    error.style.fontSize = '11px';
    error.style.letterSpacing = '0.05em';
    error.style.minHeight = '16px';
    error.style.marginTop = '4px';
    error.style.marginBottom = '6px';
    card.appendChild(error);

    const submit = document.createElement('button');
    submit.style.width = '100%';
    submit.style.padding = '11px';
    submit.style.marginTop = '6px';
    submit.style.background = 'rgba(25,230,255,0.16)';
    submit.style.border = '1.5px solid #19e6ff';
    submit.style.color = '#eafcff';
    submit.style.fontFamily = FONT_MONO;
    submit.style.fontSize = '14px';
    submit.style.letterSpacing = '0.1em';
    submit.style.fontWeight = '700';
    submit.style.cursor = 'pointer';
    submit.style.borderRadius = '2px';
    card.appendChild(submit);

    const setMode = (mode: Mode): void => {
      this.mode = mode;
      loginTab.style.background = mode === 'login' ? 'rgba(25,230,255,0.22)' : 'rgba(25,230,255,0.06)';
      signupTab.style.background = mode === 'signup' ? 'rgba(25,230,255,0.22)' : 'rgba(25,230,255,0.06)';
      displayNameField.wrap.style.display = mode === 'signup' ? 'block' : 'none';
      submit.textContent = mode === 'signup' ? '▶  CREATE ACCOUNT' : '▶  LOG IN';
      error.textContent = '';
    };
    loginTab.onclick = () => setMode('login');
    signupTab.onclick = () => setMode('signup');
    setMode('login');

    const runSubmit = async (): Promise<void> => {
      error.textContent = '';
      submit.disabled = true;
      const username = usernameField.input.value;
      const password = passwordField.input.value;
      const result = this.mode === 'signup' ? await local.signUp(username, password, displayNameField.input.value) : await local.logIn(username, password);
      submit.disabled = false;
      if (!result.ok || !result.profile) {
        error.textContent = result.error ?? 'SOMETHING WENT WRONG';
        return;
      }
      setCurrentProfile(result.profile, local);
      this.go();
    };
    submit.onclick = () => void runSubmit();
    for (const field of [usernameField, passwordField, displayNameField]) {
      field.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') void runSubmit();
      });
    }

    // Guest
    const guestBtn = document.createElement('button');
    guestBtn.textContent = 'CONTINUE AS GUEST  →';
    guestBtn.style.width = '100%';
    guestBtn.style.padding = '9px';
    guestBtn.style.marginTop = '10px';
    guestBtn.style.background = 'transparent';
    guestBtn.style.border = '1px solid rgba(255,255,255,0.18)';
    guestBtn.style.color = '#c8dfe8';
    guestBtn.style.fontFamily = FONT_MONO;
    guestBtn.style.fontSize = '12px';
    guestBtn.style.letterSpacing = '0.08em';
    guestBtn.style.cursor = 'pointer';
    guestBtn.style.borderRadius = '2px';
    guestBtn.onclick = () => {
      continueAsGuest();
      this.go();
    };
    card.appendChild(guestBtn);

    // Divider
    const divider = document.createElement('div');
    divider.textContent = '— OR —';
    divider.style.textAlign = 'center';
    divider.style.color = '#3a5460';
    divider.style.fontSize = '10px';
    divider.style.margin = '14px 0 10px';
    card.appendChild(divider);

    // Google (guided stub)
    const googleBtn = document.createElement('button');
    googleBtn.textContent = 'G   SIGN IN WITH GOOGLE';
    googleBtn.style.width = '100%';
    googleBtn.style.padding = '10px';
    googleBtn.style.background = 'rgba(255,255,255,0.04)';
    googleBtn.style.border = '1px solid rgba(255,255,255,0.14)';
    googleBtn.style.color = '#5f7683';
    googleBtn.style.fontFamily = FONT_MONO;
    googleBtn.style.fontSize = '12px';
    googleBtn.style.letterSpacing = '0.08em';
    googleBtn.style.cursor = 'not-allowed';
    googleBtn.style.borderRadius = '2px';
    googleBtn.disabled = true;
    googleBtn.title = google.unavailableReason ?? 'Unavailable';
    card.appendChild(googleBtn);

    const googleNote = document.createElement('div');
    googleNote.textContent = 'Needs a Firebase project — see GoogleAuthProvider.ts';
    googleNote.style.color = '#3a5460';
    googleNote.style.fontSize = '9px';
    googleNote.style.textAlign = 'center';
    googleNote.style.marginTop = '5px';
    googleNote.style.letterSpacing = '0.03em';
    card.appendChild(googleNote);

    window.setTimeout(() => usernameField.input.focus(), 50);
  }

  private makeTabButton(label: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.flex = '1';
    btn.style.padding = '8px';
    btn.style.background = 'rgba(25,230,255,0.06)';
    btn.style.border = '1px solid rgba(25,230,255,0.4)';
    btn.style.color = '#9fdcff';
    btn.style.fontFamily = FONT_MONO;
    btn.style.fontSize = '11px';
    btn.style.letterSpacing = '0.1em';
    btn.style.cursor = 'pointer';
    btn.style.borderRadius = '2px';
    return btn;
  }

  private makeField(label: string, type: 'text' | 'password'): { wrap: HTMLDivElement; input: HTMLInputElement } {
    const wrap = document.createElement('div');
    wrap.style.marginBottom = '12px';

    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    labelEl.style.color = '#6f97a8';
    labelEl.style.fontSize = '10px';
    labelEl.style.letterSpacing = '0.15em';
    labelEl.style.marginBottom = '4px';
    wrap.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = type;
    input.autocomplete = type === 'password' ? 'current-password' : 'off';
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';
    input.style.padding = '10px';
    input.style.background = '#040a0e';
    input.style.border = '1px solid rgba(25,230,255,0.3)';
    input.style.color = '#e8f6ff';
    input.style.fontFamily = FONT_MONO;
    input.style.fontSize = '16px'; // >=16px stops iOS Safari auto-zooming on focus
    input.style.borderRadius = '2px';
    input.style.outline = 'none';
    wrap.appendChild(input);

    return { wrap, input };
  }
}
