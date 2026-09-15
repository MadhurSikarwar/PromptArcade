import type Phaser from 'phaser';
import { KEYCARD_LEVELS, type GameState } from '../systems/GameState';
import { drawPanel, uiText } from '../ui/UIKit';
import { COLORS } from './Constants';
import { requireKeyboard } from './Helpers';

const ALERT_STEPS = [0, 30, 55, 80, 100];

export interface DebugHooks {
  setWorldDebug(enabled: boolean): void;
}

/**
 * F1 toggles debug mode. F2–F9 shortcuts only work while debug mode is on,
 * so they can never fire during normal gameplay.
 */
export class DebugController {
  constructor(scene: Phaser.Scene, state: GameState, hooks: DebugHooks) {
    const keyboard = requireKeyboard(scene);
    keyboard.addCapture('F1,F2,F3,F4,F5,F6,F7,F8,F9');

    // Plugin-level listeners are cleared automatically when the scene shuts down.
    const bind = (keyName: string, action: () => void, requiresDebug = true): void => {
      keyboard.on(`keydown-${keyName}`, (event: KeyboardEvent) => {
        if (event.repeat) return;
        if (requiresDebug && !state.debugEnabled) return;
        action();
      });
    };

    bind(
      'F1',
      () => {
        state.setDebug(!state.debugEnabled);
        hooks.setWorldDebug(state.debugEnabled);
      },
      false,
    );
    bind('F2', () => state.giveKeycard(1));
    bind('F3', () => KEYCARD_LEVELS.forEach((level) => state.giveKeycard(level)));
    bind('F4', () => {
      state.setPower(100);
      state.notify('DEBUG: POWER 100% (STATE ONLY — POWER SYSTEM IS PHASE 2)', 'debug');
    });
    bind('F5', () => {
      const next = ALERT_STEPS.find((step) => step > state.facility.alert) ?? 0;
      state.setAlert(next);
      state.notify(`DEBUG: ALERT SET TO ${next}%`, 'debug');
    });
    bind('F6', () => state.notify('DEBUG: A-3 NOT IMPLEMENTED YET (PHASE 3)', 'debug'));
    bind('F7', () => state.notify('DEBUG: A-3 NOT IMPLEMENTED YET (PHASE 3)', 'debug'));
    bind('F8', () => {
      state.setLockdown(!state.facility.lockdown);
      if (state.facility.lockdown) state.setAlert(100);
      state.notify(`DEBUG: LOCKDOWN ${state.facility.lockdown ? 'ON' : 'OFF'} (STATE ONLY)`, 'debug');
    });
    bind('F9', () => state.notify('DEBUG: FINAL CHASE NOT IMPLEMENTED YET (PHASE 8)', 'debug'));
  }
}

/** Screen-space readout rendered by the UI scene. */
export class DebugOverlay {
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private readonly state: GameState,
  ) {
    this.panel = scene.add.graphics().setDepth(900);
    drawPanel(this.panel, 20, 118, 330, 420, COLORS.magenta);
    this.text = uiText(scene, 32, 128, '', 11, '#ffc8f2').setDepth(901).setLineSpacing(2);
    this.setVisible(false);
  }

  update(fps: number): void {
    const s = this.state;
    if (!s.debugEnabled) {
      if (this.text.visible) this.setVisible(false);
      return;
    }
    if (!this.text.visible) this.setVisible(true);

    const p = s.player;
    const cards = KEYCARD_LEVELS.map((level) => `L${level}${s.hasKeycard(level) ? '✓' : '—'}`).join(' ');
    const doors = [...s.doors.entries()].map(([id, doorState]) => `  ${id.replace('door-', '').padEnd(16)} ${doorState}`);
    const nearby = s.nearbyInteractables.length > 0 ? s.nearbyInteractables.map((n) => `  ${n}`) : ['  (none)'];

    this.text.setText(
      [
        'DEBUG MODE  [F1]',
        `FPS        ${fps.toFixed(0)}`,
        `PLAYER     ${p.x.toFixed(0)}, ${p.y.toFixed(0)}  tile ${Math.floor(p.x / 32)},${Math.floor(p.y / 32)}`,
        `ROOM       ${s.currentRoomName}`,
        `STATE      ${p.movement}`,
        `HP/STA/O2  ${p.health.toFixed(0)} / ${p.stamina.toFixed(0)} / ${p.oxygen.toFixed(0)}`,
        `POWER      ${s.facility.power}%   ALERT ${s.facility.alert}%   LOCKDOWN ${s.facility.lockdown ? 'Y' : 'N'}`,
        `KEYCARDS   ${cards}   EMP ${s.inventory.empCharges}`,
        `A-3        ${s.octopus.state}  awareness ${s.octopus.awareness}`,
        'NEARBY',
        ...nearby.slice(0, 4),
        'DOORS',
        ...doors,
        '',
        'F2 L1 CARD  F3 ALL CARDS  F4 POWER',
        'F5 ALERT  F6 SPAWN A-3  F7 STUN A-3',
        'F8 LOCKDOWN  F9 FINAL CHASE',
      ].join('\n'),
    );
  }

  private setVisible(visible: boolean): void {
    this.panel.setVisible(visible);
    this.text.setVisible(visible);
  }
}
