import { audio } from './AudioManager';
import type { DoorSystem } from './DoorSystem';
import { getDifficultyTuning } from './Difficulty';
import { alertLabel, type GameState } from './GameState';

const LOCKDOWN_MS = 14000;

/** Global facility alert 0-100 with real consequences: A-3 activity, pings and lockdown. */
export class AlertSystem {
  private lockdownUntil = 0;
  private lastLabel = 'NORMAL';
  private nextAlarm = 0;

  constructor(
    private readonly state: GameState,
    private readonly doors: DoorSystem,
  ) {}

  add(amount: number): void {
    if (this.state.finalChase) return;
    this.state.setAlert(this.state.facility.alert + amount);
  }

  update(dt: number, now: number, seenByCamera: boolean, sprinting: boolean): void {
    const s = this.state;
    const fac = s.facility;

    if (s.finalChase) {
      if (!fac.lockdown) s.setLockdown(true);
      s.setAlert(100);
      if (now > this.nextAlarm) {
        this.nextAlarm = now + 3200;
        audio.play('alarm', 0.5);
      }
      return;
    }

    const diff = getDifficultyTuning();
    if (seenByCamera) this.add(16 * dt * diff.alertGainMult);
    else if (sprinting && s.hasFlag('facilityPower')) this.add(1.4 * dt * diff.alertGainMult);
    else if (!fac.lockdown) s.setAlert(fac.alert - 1.7 * dt * diff.alertDecayMult);

    const label = alertLabel(fac.alert, fac.lockdown);
    if (label !== this.lastLabel) {
      const rising = ['NORMAL', 'SECURITY ACTIVITY', 'ELEVATED', 'HIGH ALERT', 'LOCKDOWN'].indexOf(label) > ['NORMAL', 'SECURITY ACTIVITY', 'ELEVATED', 'HIGH ALERT', 'LOCKDOWN'].indexOf(this.lastLabel);
      if (rising && label === 'SECURITY ACTIVITY') s.notify('SECURITY ACTIVITY DETECTED', 'warning');
      if (rising && label === 'ELEVATED') s.notify('ALERT ELEVATED — A-3 ACTIVITY INCREASING', 'warning');
      if (rising && label === 'HIGH ALERT') s.notify('HIGH ALERT — THE FACILITY IS TRACKING YOU', 'danger');
      this.lastLabel = label;
    }

    if (fac.alert >= 100 && !fac.lockdown) {
      s.setLockdown(true);
      const lockdownMs = LOCKDOWN_MS * diff.lockdownMsMult;
      this.lockdownUntil = now + lockdownMs;
      audio.play('alarm');
      s.notify('FACILITY LOCKDOWN', 'danger');
      const sealed = this.doors.sealNear(s.player.x, s.player.y, 520, 'LOCKDOWN', now, lockdownMs);
      if (sealed > 0) s.notify(`${sealed} DOORS SEALED NEAR YOU`, 'danger');
      s.noise(s.player.x + (Math.random() - 0.5) * 160, s.player.y + (Math.random() - 0.5) * 160, 1600, 'lockdown');
      s.events.emit('screen-fx', { kind: 'red', duration: 600 });
      this.nextAlarm = now + 3000;
    }

    if (fac.lockdown) {
      if (now > this.nextAlarm) {
        this.nextAlarm = now + 3000;
        audio.play('alarm', 0.6);
      }
      if (now >= this.lockdownUntil) {
        s.setLockdown(false);
        s.setAlert(55);
        s.notify('LOCKDOWN LIFTED', 'info');
      }
    }
  }
}
