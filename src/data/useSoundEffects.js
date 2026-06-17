import { useRef, useCallback } from 'react';

// Pure Web Audio API — no libraries, no files needed
// All sounds are synthesized procedurally

export default function useSoundEffects() {
  const ctxRef = useRef(null);

  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  };

  // ── PADDLE HIT — sharp percussive "pop" ──
  const playHit = useCallback((power = 1.0) => {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;

      // Noise burst
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Bandpass filter — makes it sound like hollow paddle
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800 + power * 400;
      filter.Q.value = 1.5;

      // Gain envelope
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.6 * power, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.09);

      // Tonal "thwack" underneath
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220 + power * 80, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.3 * power, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {}
  }, []);

  // ── DRIVE HIT — harder, faster pop ──
  const playDrive = useCallback(() => playHit(1.4), [playHit]);

  // ── DINK — soft, muted tap ──
  const playDink = useCallback(() => {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {}
  }, []);

  // ── BOUNCE — rubbery thud ──
  const playBounce = useCallback(() => {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

      // Slight distortion for rubbery feel
      const dist = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = (Math.PI + 80) * x / (Math.PI + 80 * Math.abs(x));
      }
      dist.curve = curve;

      osc.connect(dist);
      dist.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {}
  }, []);

  // ── SERVE TOSS — soft rising whoosh ──
  const playServeToss = useCallback(() => {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(500, now + 0.3);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.0, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } catch (e) {}
  }, []);

  // ── NET HIT — dull thud ──
  const playNetHit = useCallback(() => {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;

      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5) * 0.4;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.16);
    } catch (e) {}
  }, []);

  // ── POINT WIN — ascending chime ──
  const playPointWin = useCallback(() => {
    try {
      const ctx = getCtx();
      const freqs = [523, 659, 784, 1047]; // C5 E5 G5 C6
      freqs.forEach((freq, i) => {
        const now = ctx.currentTime + i * 0.1;
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.31);
      });
    } catch (e) {}
  }, []);

  // ── POINT LOSE — descending thud ──
  const playPointLose = useCallback(() => {
    try {
      const ctx = getCtx();
      const freqs = [300, 220, 160];
      freqs.forEach((freq, i) => {
        const now = ctx.currentTime + i * 0.1;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
      });
    } catch (e) {}
  }, []);

  // ── CROWD CHEER — layered noise burst ──
  const playCrowd = useCallback(() => {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;

      for (let v = 0; v < 3; v++) {
        const bufferSize = ctx.sampleRate * 1.2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const env = i < bufferSize * 0.1
            ? i / (bufferSize * 0.1)
            : Math.pow(1 - (i - bufferSize * 0.1) / (bufferSize * 0.9), 0.5);
          data[i] = (Math.random() * 2 - 1) * env * 0.15;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800 + v * 300;
        filter.Q.value = 0.5;

        const gain = ctx.createGain();
        gain.gain.value = 0.4;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now + v * 0.05);
        noise.stop(now + 1.3);
      }
    } catch (e) {}
  }, []);

  // ── MATCH WIN — triumphant fanfare ──
  const playMatchWin = useCallback(() => {
    try {
      const ctx = getCtx();
      const notes = [
        [523, 0], [523, 0.1], [523, 0.2],
        [659, 0.35], [784, 0.5], [1047, 0.7]
      ];
      notes.forEach(([freq, delay]) => {
        const now = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.41);
      });
    } catch (e) {}
  }, []);

  return {
    playHit,
    playDrive,
    playDink,
    playBounce,
    playServeToss,
    playNetHit,
    playPointWin,
    playPointLose,
    playCrowd,
    playMatchWin,
  };
}
