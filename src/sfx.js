// Web Audio SFX + optional music. Fully offline.
export function createAudio() {
  let ctx = null, muted = false, master = null, musicGain = null, musicNodes = null, musicOn = false;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.12; musicGain.connect(master);
    return ctx;
  }
  function resume() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); }

  function tone(freq, dur, type, vol, slide) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    resume();
    const t0 = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol, hp) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    resume();
    const n = (dur * c.sampleRate) | 0;
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(); src.buffer = buf;
    const g = c.createGain(); g.gain.value = vol || 0.15;
    let node = src;
    if (hp) {
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
      src.connect(f); node = f;
    }
    node.connect(g); g.connect(master);
    src.start();
  }

  function putt(power) { tone(90 + power * 40, 0.08, 'triangle', 0.18 + power * 0.15, 40); noise(0.05, 0.08); }
  function bounce(speed) { tone(220 + Math.min(400, speed * 80), 0.06, 'square', Math.min(0.25, 0.08 + speed * 0.04), 120); }
  function cup() {
    tone(520, 0.12, 'sine', 0.22, 260);
    setTimeout(() => tone(780, 0.18, 'sine', 0.2, 400), 90);
    setTimeout(() => tone(1040, 0.28, 'sine', 0.18, 520), 200);
  }
  function cheer() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.16, f * 0.7), i * 70));
  }
  function oob() { tone(180, 0.2, 'sawtooth', 0.12, 60); }

  function startMusic() {
    if (musicOn || muted) return;
    const c = ensure(); if (!c) return;
    resume();
    musicOn = true;
    const notes = [196, 233, 262, 311, 349, 311, 262, 233];
    let i = 0;
    function tick() {
      if (!musicOn || muted) return;
      const f = notes[i++ % notes.length];
      const t0 = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.15, t0 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
      o.connect(g); g.connect(musicGain);
      o.start(t0); o.stop(t0 + 0.5);
      musicNodes = setTimeout(tick, 480);
    }
    tick();
  }
  function stopMusic() {
    musicOn = false;
    if (musicNodes) { clearTimeout(musicNodes); musicNodes = null; }
  }

  return {
    putt, bounce, cup, cheer, oob, resume, startMusic, stopMusic,
    get muted() { return muted; },
    setMuted(v) { muted = !!v; if (muted) stopMusic(); else startMusic(); },
    toggleMute() { this.setMuted(!muted); return muted; }
  };
}
