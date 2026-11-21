/**
 * AksharType — Zero-Dependency Web Audio API Typing Sound Synthesizer
 * Profiles: 'mechanical' | 'soft' | 'off'
 */

class TypingSoundEngine {
  constructor() {
    this.ctx = null;
    this.noiseBuffer = null;
    this.profile = 'mechanical';
  }

  setProfile(profile) {
    this.profile = profile;
  }

  ensureContext() {
    if (this.profile === 'off') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.noiseBuffer && this.ctx) {
      const length = Math.floor(this.ctx.sampleRate * 0.05);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.ctx;
  }

  /**
   * Play a natural keystroke sound.
   * @param {'normal' | 'space' | 'error' | 'locked'} kind
   */
  play(kind = 'normal') {
    if (this.profile === 'off') return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const jitter = 0.92 + Math.random() * 0.16;

    if (kind === 'locked') {
      // Subtle low damped thump when Backspace is blocked
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.06);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
      return;
    }

    if (this.profile === 'mechanical') {
      // Layer 1: Crisp switch tactile click (bandpass filtered short noise burst)
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      const baseFreq = kind === 'space' ? 1450 : kind === 'error' ? 1100 : 2400;
      filter.frequency.setValueAtTime(baseFreq * jitter, now);
      filter.Q.setValueAtTime(1.8, now);

      const noiseGain = ctx.createGain();
      const peak = kind === 'space' ? 0.16 : 0.13;
      noiseGain.gain.setValueAtTime(peak, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.024);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.028);

      // Layer 2: Keycap bottom-out resonant thock
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      const thockFreq = kind === 'space' ? 195 : kind === 'error' ? 165 : 275;
      osc.frequency.setValueAtTime(thockFreq * jitter, now);
      osc.frequency.exponentialRampToValueAtTime(85, now + 0.032);

      oscGain.gain.setValueAtTime(kind === 'space' ? 0.11 : 0.075, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.038);
      return;
    }

    // Profile: 'soft' (quiet damped laptop / membrane tap)
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime((kind === 'space' ? 720 : 1050) * jitter, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(kind === 'space' ? 0.09 : 0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

    noise.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.025);
  }
}

export const soundEngine = new TypingSoundEngine();
