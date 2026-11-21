/**
 * AksharType — Zero-Dependency Web Audio API Typing Sound Synthesizer
 * Profiles: 'mechanical' | 'soft' | 'off'
 * Features global gesture unlock, async resume guarantee, rich mechanical/soft keystrokes,
 * distinct error feedback sound, and blocked-backspace lock thump.
 */

class TypingSoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.profile = 'mechanical';
    this.unlockBound = false;
    this._bindGlobalUnlock();
  }

  _bindGlobalUnlock() {
    if (this.unlockBound || typeof window === 'undefined') return;
    this.unlockBound = true;
    const unlock = () => {
      if (this.profile === 'off') return;
      const ctx = this._getOrCreateContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true, capture: true });
    window.addEventListener('keydown', unlock, { passive: true, capture: true });
  }

  setProfile(profile) {
    this.profile = profile || 'mechanical';
  }

  _getOrCreateContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      // Master chain with soft limiter so rapid typing stays loud, crisp, and never clips
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
      compressor.knee.setValueAtTime(14, this.ctx.currentTime);
      compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
      compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
      compressor.release.setValueAtTime(0.06, this.ctx.currentTime);

      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(0.95, this.ctx.currentTime);

      masterGain.connect(compressor);
      compressor.connect(this.ctx.destination);
      this.master = masterGain;
    }

    if (!this.noiseBuffer && this.ctx) {
      const length = Math.floor(this.ctx.sampleRate * 0.08);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        // Exponentially weighted white noise for snappy transient
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }

    return this.ctx;
  }

  /**
   * Play a tactile typing, spacebar, error, or locked-backspace sound.
   * @param {'normal' | 'space' | 'error' | 'locked'} kind
   */
  play(kind = 'normal') {
    if (this.profile === 'off') return;
    const ctx = this._getOrCreateContext();
    if (!ctx || !this.master || !this.noiseBuffer) return;

    if (ctx.state === 'suspended') {
      ctx
        .resume()
        .then(() => {
          this._trigger(ctx, kind);
        })
        .catch(() => {});
      return;
    }

    this._trigger(ctx, kind);
  }

  _trigger(ctx, kind) {
    const now = ctx.currentTime;
    const jitter = 0.94 + Math.random() * 0.12;
    const out = this.master;

    // 1. Blocked Backspace ('locked') — muted double low knock
    if (kind === 'locked') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(155, now);
      osc.frequency.exponentialRampToValueAtTime(82, now + 0.075);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.09);
      return;
    }

    // 2. Mistake / Error sound — crisp, clear muted low downward cue in BOTH Mech and Soft modes
    if (kind === 'error') {
      const isSoft = this.profile === 'soft';

      // Muted woody error buzz-thud (non-shrill, unmistakable)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(isSoft ? 560 : 780, now);

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(215 * jitter, now);
      osc1.frequency.exponentialRampToValueAtTime(125, now + 0.09);

      gain1.gain.setValueAtTime(isSoft ? 0.18 : 0.28, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc1.connect(lp);
      lp.connect(gain1);
      gain1.connect(out);
      osc1.start(now);
      osc1.stop(now + 0.105);

      // Subtle second lower tick for tactile clarity
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(150, now + 0.035);
      osc2.frequency.exponentialRampToValueAtTime(98, now + 0.105);
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(isSoft ? 0.16 : 0.24, now + 0.035);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc2.connect(gain2);
      gain2.connect(out);
      osc2.start(now + 0.03);
      osc2.stop(now + 0.115);
      return;
    }

    // 3. Mechanical Switch Profile (Tactile Click + PBT Thock)
    if (this.profile === 'mechanical') {
      const isSpace = kind === 'space';

      // Layer A: Crisp switch tactile snap (bandpass transient)
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime((isSpace ? 1350 : 2500) * jitter, now);
      bp.Q.setValueAtTime(1.1, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(isSpace ? 0.42 : 0.36, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + (isSpace ? 0.038 : 0.028));

      noise.connect(bp);
      bp.connect(noiseGain);
      noiseGain.connect(out);
      noise.start(now);
      noise.stop(now + 0.042);

      // Layer B: Keycap bottom-out resonant thock
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime((isSpace ? 175 : 290) * jitter, now);
      osc.frequency.exponentialRampToValueAtTime(isSpace ? 68 : 95, now + 0.042);

      oscGain.gain.setValueAtTime(isSpace ? 0.36 : 0.26, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.046);

      osc.connect(oscGain);
      oscGain.connect(out);
      osc.start(now);
      osc.stop(now + 0.05);

      // Layer C: Subtle upper housing click transient
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'sine';
      clickOsc.frequency.setValueAtTime((isSpace ? 980 : 1680) * jitter, now);
      clickOsc.frequency.exponentialRampToValueAtTime(420, now + 0.012);
      clickGain.gain.setValueAtTime(isSpace ? 0.14 : 0.12, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.014);
      clickOsc.connect(clickGain);
      clickGain.connect(out);
      clickOsc.start(now);
      clickOsc.stop(now + 0.016);
      return;
    }

    // 4. Soft Profile (Clean audible laptop / scissor-switch tap)
    const isSpace = kind === 'space';
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime((isSpace ? 920 : 1450) * jitter, now);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(isSpace ? 0.28 : 0.22, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.026);

    noise.connect(lp);
    lp.connect(nGain);
    nGain.connect(out);
    noise.start(now);
    noise.stop(now + 0.03);

    const tapOsc = ctx.createOscillator();
    const tapGain = ctx.createGain();
    tapOsc.type = 'sine';
    tapOsc.frequency.setValueAtTime((isSpace ? 190 : 320) * jitter, now);
    tapOsc.frequency.exponentialRampToValueAtTime(100, now + 0.024);
    tapGain.gain.setValueAtTime(isSpace ? 0.18 : 0.13, now);
    tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
    tapOsc.connect(tapGain);
    tapGain.connect(out);
    tapOsc.start(now);
    tapOsc.stop(now + 0.032);
  }
}

export const soundEngine = new TypingSoundEngine();
