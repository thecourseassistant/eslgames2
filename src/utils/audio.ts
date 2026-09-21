// Web Audio API Sound Synthesizer for high performance without external asset latency
class SoundManager {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playShot() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      // Powerful sniper blast using white noise buffer + steep lowpass decay
      const bufferSize = this.ctx.sampleRate * 0.35;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, t);
      filter.frequency.exponentialRampToValueAtTime(100, t + 0.25);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(1.0, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

      // Low frequency punch
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.2);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.8, t);
      oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      noise.start(t);
      osc.start(t);
      noise.stop(t + 0.35);
      osc.stop(t + 0.25);

      // Haptic feedback for mobile devices if supported
      if (navigator.vibrate) {
        navigator.vibrate([30, 20, 50]);
      }
    } catch {
      // Ignore audio errors gracefully
    }
  }

  playHit() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      // Ding / Success bell
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, t); // D5
      osc.frequency.setValueAtTime(880, t + 0.08); // A5
      osc.frequency.setValueAtTime(1174.66, t + 0.16); // D6

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.6);

      if (navigator.vibrate) {
        navigator.vibrate(40);
      }
    } catch {
      // Ignore
    }
  }

  playMiss() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      // Dull ricochet / metal ping
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.linearRampToValueAtTime(80, t + 0.25);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.25);

      if (navigator.vibrate) {
        navigator.vibrate([10, 40, 10]);
      }
    } catch {
      // Ignore
    }
  }

  playReload() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const ctx = this.ctx;
      const t = ctx.currentTime;

      // 1. Mag Release & Slide Eject (0ms)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(420, t);
      osc1.frequency.exponentialRampToValueAtTime(160, t + 0.14);
      gain1.gain.setValueAtTime(0.5, t);
      gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.14);

      // 2. New Magazine Slam / Click In (300ms)
      setTimeout(() => {
        if (!ctx) return;
        const t2 = ctx.currentTime;
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(520, t2);
        osc2.frequency.exponentialRampToValueAtTime(880, t2 + 0.12);
        gain2.gain.setValueAtTime(0.6, t2);
        gain2.gain.exponentialRampToValueAtTime(0.01, t2 + 0.15);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(t2);
        osc2.stop(t2 + 0.15);

        // Metallic resonance
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, t2);
        filter.Q.setValueAtTime(3, t2);
        const oscRes = ctx.createOscillator();
        const gainRes = ctx.createGain();
        oscRes.type = 'sine';
        oscRes.frequency.setValueAtTime(350, t2);
        gainRes.gain.setValueAtTime(0.3, t2);
        gainRes.gain.exponentialRampToValueAtTime(0.01, t2 + 0.18);
        oscRes.connect(filter);
        filter.connect(gainRes);
        gainRes.connect(ctx.destination);
        oscRes.start(t2);
        oscRes.stop(t2 + 0.18);
      }, 300);

      // 3. Heavy Sniper Bolt Rack & Chamber Snap (680ms)
      setTimeout(() => {
        if (!ctx) return;
        const t3 = ctx.currentTime;
        const oscBolt = ctx.createOscillator();
        const gainBolt = ctx.createGain();
        oscBolt.type = 'square';
        oscBolt.frequency.setValueAtTime(280, t3);
        oscBolt.frequency.exponentialRampToValueAtTime(650, t3 + 0.08);
        oscBolt.frequency.exponentialRampToValueAtTime(180, t3 + 0.22);
        gainBolt.gain.setValueAtTime(0.55, t3);
        gainBolt.gain.exponentialRampToValueAtTime(0.01, t3 + 0.22);
        oscBolt.connect(gainBolt);
        gainBolt.connect(ctx.destination);
        oscBolt.start(t3);
        oscBolt.stop(t3 + 0.22);

        if (navigator.vibrate) {
          navigator.vibrate([20, 30, 40]);
        }
      }, 680);
    } catch {
      // Ignore
    }
  }

  playDryFire() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.06);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
      if (navigator.vibrate) {
        navigator.vibrate(15);
      }
    } catch {
      // Ignore
    }
  }

  speak(text: string) {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      } catch {
        // Ignore speech synthesis failures
      }
    }
  }
}

export const sounds = new SoundManager();
