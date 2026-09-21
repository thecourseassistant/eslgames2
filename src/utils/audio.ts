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

      // Helper to generate custom noise buffer
      const getNoise = (duration: number) => {
        const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        return source;
      };

      const now = ctx.currentTime;

      // ==========================================
      // 1. MAGAZINE RELEASE & DROP (t = 0.0s)
      // ==========================================
      // Latch click
      const latchOsc = ctx.createOscillator();
      const latchGain = ctx.createGain();
      latchOsc.type = 'triangle';
      latchOsc.frequency.setValueAtTime(1400, now);
      latchOsc.frequency.exponentialRampToValueAtTime(350, now + 0.06);
      latchGain.gain.setValueAtTime(0.45, now);
      latchGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
      latchOsc.connect(latchGain);
      latchGain.connect(ctx.destination);
      latchOsc.start(now);
      latchOsc.stop(now + 0.06);

      // Mag sliding out friction
      const magOutNoise = getNoise(0.12);
      const magOutFilter = ctx.createBiquadFilter();
      magOutFilter.type = 'bandpass';
      magOutFilter.frequency.setValueAtTime(1600, now);
      magOutFilter.frequency.exponentialRampToValueAtTime(450, now + 0.12);
      magOutFilter.Q.value = 3.5;
      const magOutGain = ctx.createGain();
      magOutGain.gain.setValueAtTime(0.28, now);
      magOutGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      magOutNoise.connect(magOutFilter);
      magOutFilter.connect(magOutGain);
      magOutGain.connect(ctx.destination);
      magOutNoise.start(now);

      // ==========================================
      // 2. FRESH MAGAZINE INSERT & SLAP (t = 0.28s)
      // ==========================================
      const tInsert = now + 0.28;

      // Mag guidance metal scraping
      const guideNoise = getNoise(0.1);
      const guideFilter = ctx.createBiquadFilter();
      guideFilter.type = 'bandpass';
      guideFilter.frequency.setValueAtTime(800, tInsert - 0.06);
      guideFilter.frequency.exponentialRampToValueAtTime(2200, tInsert);
      guideFilter.Q.value = 4.0;
      const guideGain = ctx.createGain();
      guideGain.gain.setValueAtTime(0.2, tInsert - 0.06);
      guideGain.gain.exponentialRampToValueAtTime(0.01, tInsert);
      guideNoise.connect(guideFilter);
      guideFilter.connect(guideGain);
      guideGain.connect(ctx.destination);
      guideNoise.start(tInsert - 0.06);

      // Solid palm slap thud on magazine baseplate
      const slapOsc = ctx.createOscillator();
      const slapGain = ctx.createGain();
      slapOsc.type = 'sine';
      slapOsc.frequency.setValueAtTime(180, tInsert);
      slapOsc.frequency.exponentialRampToValueAtTime(45, tInsert + 0.14);
      slapGain.gain.setValueAtTime(0.7, tInsert);
      slapGain.gain.exponentialRampToValueAtTime(0.01, tInsert + 0.14);
      slapOsc.connect(slapGain);
      slapGain.connect(ctx.destination);
      slapOsc.start(tInsert);
      slapOsc.stop(tInsert + 0.14);

      // Metallic magazine lock click
      const lockNoise = getNoise(0.08);
      const lockFilter = ctx.createBiquadFilter();
      lockFilter.type = 'highpass';
      lockFilter.frequency.setValueAtTime(2400, tInsert);
      const lockGain = ctx.createGain();
      lockGain.gain.setValueAtTime(0.5, tInsert);
      lockGain.gain.exponentialRampToValueAtTime(0.01, tInsert + 0.08);
      lockNoise.connect(lockFilter);
      lockFilter.connect(lockGain);
      lockGain.connect(ctx.destination);
      lockNoise.start(tInsert);

      // ====================================================
      // 3. AUTHENTIC "RACK THE SLIDE" (t = 0.60s to 0.98s)
      // ====================================================
      // Phase 3A: Pulling the slide back (backward rack stroke)
      const tRackBack = now + 0.60;

      // Heavy metal slide friction on receiver rails
      const slideBackNoise = getNoise(0.16);
      const slideBackFilter = ctx.createBiquadFilter();
      slideBackFilter.type = 'bandpass';
      slideBackFilter.frequency.setValueAtTime(1100, tRackBack);
      slideBackFilter.frequency.exponentialRampToValueAtTime(3200, tRackBack + 0.12);
      slideBackFilter.Q.value = 5.0;
      const slideBackGain = ctx.createGain();
      slideBackGain.gain.setValueAtTime(0.45, tRackBack);
      slideBackGain.gain.exponentialRampToValueAtTime(0.01, tRackBack + 0.16);
      slideBackNoise.connect(slideBackFilter);
      slideBackFilter.connect(slideBackGain);
      slideBackGain.connect(ctx.destination);
      slideBackNoise.start(tRackBack);

      // Gritty metal tooth ratchet
      const ratchetOsc = ctx.createOscillator();
      const ratchetGain = ctx.createGain();
      ratchetOsc.type = 'sawtooth';
      ratchetOsc.frequency.setValueAtTime(320, tRackBack);
      ratchetOsc.frequency.exponentialRampToValueAtTime(740, tRackBack + 0.14);
      ratchetGain.gain.setValueAtTime(0.3, tRackBack);
      ratchetGain.gain.exponentialRampToValueAtTime(0.01, tRackBack + 0.14);
      ratchetOsc.connect(ratchetGain);
      ratchetGain.connect(ctx.destination);
      ratchetOsc.start(tRackBack);
      ratchetOsc.stop(tRackBack + 0.14);

      // Slide hitting the rear stop
      const rearStopOsc = ctx.createOscillator();
      const rearStopGain = ctx.createGain();
      rearStopOsc.type = 'triangle';
      rearStopOsc.frequency.setValueAtTime(680, tRackBack + 0.12);
      rearStopOsc.frequency.exponentialRampToValueAtTime(240, tRackBack + 0.19);
      rearStopGain.gain.setValueAtTime(0.4, tRackBack + 0.12);
      rearStopGain.gain.exponentialRampToValueAtTime(0.01, tRackBack + 0.19);
      rearStopOsc.connect(rearStopGain);
      rearStopGain.connect(ctx.destination);
      rearStopOsc.start(tRackBack + 0.12);
      rearStopOsc.stop(tRackBack + 0.19);

      // Phase 3B: Slide release & heavy forward chamber slam (t = 0.80s)
      const tSlam = now + 0.80;

      // Heavy recoil spring snap forward
      const springNoise = getNoise(0.09);
      const springFilter = ctx.createBiquadFilter();
      springFilter.type = 'bandpass';
      springFilter.frequency.setValueAtTime(3400, tSlam);
      springFilter.frequency.exponentialRampToValueAtTime(1400, tSlam + 0.08);
      springFilter.Q.value = 4.0;
      const springGain = ctx.createGain();
      springGain.gain.setValueAtTime(0.35, tSlam);
      springGain.gain.exponentialRampToValueAtTime(0.01, tSlam + 0.08);
      springNoise.connect(springFilter);
      springFilter.connect(springGain);
      springGain.connect(ctx.destination);
      springNoise.start(tSlam);

      // Steel chamber slam impact (solid mechanical "CHAK-CHINK!")
      const slamThud = ctx.createOscillator();
      const slamThudGain = ctx.createGain();
      slamThud.type = 'triangle';
      slamThud.frequency.setValueAtTime(260, tSlam + 0.04);
      slamThud.frequency.exponentialRampToValueAtTime(60, tSlam + 0.18);
      slamThudGain.gain.setValueAtTime(0.85, tSlam + 0.04);
      slamThudGain.gain.exponentialRampToValueAtTime(0.01, tSlam + 0.18);
      slamThud.connect(slamThudGain);
      slamThudGain.connect(ctx.destination);
      slamThud.start(tSlam + 0.04);
      slamThud.stop(tSlam + 0.18);

      // Bright metallic breech lock resonance
      const metalRing = ctx.createOscillator();
      const metalRingFilter = ctx.createBiquadFilter();
      metalRingFilter.type = 'bandpass';
      metalRingFilter.frequency.setValueAtTime(3100, tSlam + 0.04);
      metalRingFilter.Q.value = 7.0;
      const metalRingGain = ctx.createGain();
      metalRing.type = 'square';
      metalRing.frequency.setValueAtTime(780, tSlam + 0.04);
      metalRing.frequency.exponentialRampToValueAtTime(390, tSlam + 0.2);
      metalRingGain.gain.setValueAtTime(0.4, tSlam + 0.04);
      metalRingGain.gain.exponentialRampToValueAtTime(0.01, tSlam + 0.2);
      metalRing.connect(metalRingFilter);
      metalRingFilter.connect(metalRingGain);
      metalRingGain.connect(ctx.destination);
      metalRing.start(tSlam + 0.04);
      metalRing.stop(tSlam + 0.2);

      // Sharp locking detent snap
      const snapNoise = getNoise(0.06);
      const snapFilter = ctx.createBiquadFilter();
      snapFilter.type = 'highpass';
      snapFilter.frequency.setValueAtTime(3800, tSlam + 0.05);
      const snapGain = ctx.createGain();
      snapGain.gain.setValueAtTime(0.6, tSlam + 0.05);
      snapGain.gain.exponentialRampToValueAtTime(0.01, tSlam + 0.11);
      snapNoise.connect(snapFilter);
      snapFilter.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapNoise.start(tSlam + 0.05);

      // Realistic tactical haptics matching Mag In (280ms) and Slide Rack Slam (800ms)
      if (navigator.vibrate) {
        setTimeout(() => {
          if (navigator.vibrate) navigator.vibrate([20, 25, 30]);
        }, 280);
        setTimeout(() => {
          if (navigator.vibrate) navigator.vibrate([15, 30, 45, 65]);
        }, 800);
      }
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
