export type SfxName =
  | 'step'
  | 'door'
  | 'denied'
  | 'granted'
  | 'pickup'
  | 'hack-tick'
  | 'hack-good'
  | 'hack-fail'
  | 'power-up'
  | 'power-down'
  | 'alarm'
  | 'scrape'
  | 'impact'
  | 'glitch'
  | 'emp'
  | 'heartbeat'
  | 'bubble'
  | 'thunder'
  | 'click'
  | 'roar'
  | 'zap'
  | 'splash'
  | 'beep'
  | 'vent';

type AmbienceKind = 'facility' | 'ocean' | 'underwater' | 'none';

/** Fully procedural WebAudio sound design: no audio files required. */
class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private ambNodes: AudioScheduledSourceNode[] = [];
  private dripTimer: number | null = null;
  private ambience: AmbienceKind = 'none';

  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.7;
        this.master.connect(this.ctx.destination);
        this.ambBus = this.ctx.createGain();
        this.ambBus.gain.value = 1;
        this.ambBus.connect(this.master);
        const length = this.ctx.sampleRate * 2;
        this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      }
      void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, opts: { slideTo?: number; delay?: number; attack?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo), t + dur);
    const attack = opts.attack ?? 0.005;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private noise(dur: number, vol: number, filter: BiquadFilterType, freq: number, opts: { q?: number; slideTo?: number; delay?: number; attack?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noiseBuffer) return;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const biquad = ctx.createBiquadFilter();
    biquad.type = filter;
    biquad.frequency.setValueAtTime(freq, t);
    if (opts.slideTo) biquad.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
    biquad.Q.value = opts.q ?? 1;
    const gain = ctx.createGain();
    const attack = opts.attack ?? 0.01;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(biquad).connect(gain).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  play(name: SfxName, volume = 1): void {
    if (!this.ctx) return;
    const v = volume;
    switch (name) {
      case 'step':
        this.noise(0.06, 0.05 * v, 'bandpass', 900, { q: 2 });
        break;
      case 'door':
        this.noise(0.35, 0.18 * v, 'bandpass', 500, { slideTo: 1400, q: 3 });
        this.tone(70, 0.25, 'sine', 0.25 * v, { delay: 0.25 });
        break;
      case 'denied':
        this.tone(180, 0.12, 'square', 0.08 * v);
        this.tone(140, 0.18, 'square', 0.08 * v, { delay: 0.14 });
        break;
      case 'granted':
      case 'beep':
        this.tone(880, 0.08, 'sine', 0.12 * v);
        if (name === 'granted') this.tone(1320, 0.12, 'sine', 0.12 * v, { delay: 0.09 });
        break;
      case 'pickup':
        [660, 880, 1320].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.12 * v, { delay: i * 0.07 }));
        break;
      case 'hack-tick':
        this.tone(1800 + Math.random() * 600, 0.03, 'square', 0.04 * v);
        break;
      case 'hack-good':
        this.tone(1200, 0.06, 'square', 0.07 * v);
        this.tone(1600, 0.08, 'square', 0.07 * v, { delay: 0.06 });
        break;
      case 'hack-fail':
        this.tone(600, 0.4, 'sawtooth', 0.1 * v, { slideTo: 80 });
        break;
      case 'power-up':
        this.tone(60, 1.6, 'sawtooth', 0.12 * v, { slideTo: 420, attack: 0.3 });
        this.noise(1.6, 0.08 * v, 'lowpass', 200, { slideTo: 3000, attack: 0.4 });
        break;
      case 'power-down':
        this.tone(400, 1.4, 'sawtooth', 0.12 * v, { slideTo: 30 });
        break;
      case 'alarm':
        for (let i = 0; i < 4; i++) this.tone(i % 2 ? 620 : 820, 0.28, 'square', 0.07 * v, { delay: i * 0.3 });
        break;
      case 'scrape':
        this.noise(1.8, 0.25 * v, 'bandpass', 300, { slideTo: 1100, q: 6, attack: 0.4 });
        this.noise(1.4, 0.12 * v, 'bandpass', 2200, { slideTo: 700, q: 9, delay: 0.3, attack: 0.3 });
        break;
      case 'impact':
        this.tone(90, 0.6, 'sine', 0.5 * v, { slideTo: 30 });
        this.noise(0.4, 0.3 * v, 'lowpass', 1200, { slideTo: 100 });
        break;
      case 'glitch':
        for (let i = 0; i < 6; i++) this.tone(200 + Math.random() * 2400, 0.03, 'square', 0.05 * v, { delay: i * 0.045 });
        break;
      case 'emp':
        this.tone(200, 0.5, 'sawtooth', 0.12 * v, { slideTo: 3000 });
        this.tone(60, 0.8, 'sine', 0.5 * v, { delay: 0.45, slideTo: 25 });
        this.noise(0.8, 0.25 * v, 'lowpass', 4000, { delay: 0.45, slideTo: 200 });
        break;
      case 'heartbeat':
        this.tone(58, 0.14, 'sine', 0.35 * v);
        this.tone(52, 0.16, 'sine', 0.28 * v, { delay: 0.2 });
        break;
      case 'bubble':
        this.tone(400 + Math.random() * 500, 0.08, 'sine', 0.05 * v, { slideTo: 1400 });
        break;
      case 'thunder':
        this.noise(2.5, 0.35 * v, 'lowpass', 400, { slideTo: 60, attack: 0.05 });
        break;
      case 'click':
        this.noise(0.08, 0.4 * v, 'highpass', 1500);
        this.tone(55, 0.9, 'sine', 0.45 * v, { slideTo: 40 });
        break;
      case 'roar':
        this.tone(70, 1.4, 'sawtooth', 0.22 * v, { slideTo: 45, attack: 0.2 });
        this.noise(1.4, 0.2 * v, 'bandpass', 500, { q: 4, slideTo: 200, attack: 0.2 });
        break;
      case 'zap':
        this.noise(0.18, 0.18 * v, 'highpass', 3000);
        this.tone(120, 0.18, 'square', 0.08 * v, { slideTo: 60 });
        break;
      case 'splash':
        this.noise(0.9, 0.3 * v, 'lowpass', 3000, { slideTo: 300 });
        break;
      case 'vent':
        this.noise(0.6, 0.12 * v, 'bandpass', 700, { q: 2, slideTo: 300 });
        break;
    }
  }

  setAmbience(kind: AmbienceKind): void {
    if (kind === this.ambience) return;
    this.stopAmbience();
    this.ambience = kind;
    const ctx = this.ctx;
    if (!ctx || !this.ambBus || !this.noiseBuffer || kind === 'none') return;

    const addOsc = (freq: number, vol: number): void => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.value = vol;
      osc.connect(gain).connect(this.ambBus as GainNode);
      osc.start();
      this.ambNodes.push(osc);
    };
    const addNoise = (filter: BiquadFilterType, freq: number, vol: number): void => {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      const biquad = ctx.createBiquadFilter();
      biquad.type = filter;
      biquad.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = vol;
      src.connect(biquad).connect(gain).connect(this.ambBus as GainNode);
      src.start();
      this.ambNodes.push(src);
    };

    if (kind === 'facility') {
      addOsc(46, 0.06);
      addOsc(55.3, 0.045);
      addNoise('lowpass', 320, 0.05);
      this.dripTimer = window.setInterval(() => {
        if (Math.random() < 0.6) this.tone(1400 + Math.random() * 900, 0.12, 'sine', 0.025, { slideTo: 700 });
        if (Math.random() < 0.08) this.noise(1.2, 0.04, 'bandpass', 180, { q: 5, attack: 0.5 });
      }, 1700);
    } else if (kind === 'ocean') {
      addNoise('lowpass', 700, 0.12);
      addNoise('highpass', 5000, 0.03);
    } else {
      addNoise('lowpass', 260, 0.14);
      addOsc(38, 0.07);
      this.dripTimer = window.setInterval(() => {
        if (Math.random() < 0.7) this.play('bubble', 0.6);
      }, 900);
    }
  }

  setAmbienceVolume(volume: number, seconds = 0.8): void {
    if (!this.ctx || !this.ambBus) return;
    this.ambBus.gain.cancelScheduledValues(this.ctx.currentTime);
    this.ambBus.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + seconds);
  }

  stopAmbience(): void {
    for (const node of this.ambNodes) {
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
    }
    this.ambNodes = [];
    if (this.dripTimer !== null) window.clearInterval(this.dripTimer);
    this.dripTimer = null;
    this.ambience = 'none';
  }
}

export const audio = new AudioManager();
