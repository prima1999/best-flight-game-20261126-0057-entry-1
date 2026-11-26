// Synthesised sound for SkyCourier: every sound is a WebAudio oscillator.
// No audio files are loaded; the engine hum, wind, chimes and thuds are built
// from oscillators and filtered noise created at run time.

const AudioSys = {
  ctx: null,
  master: null,
  engineOsc: null,
  engineOsc2: null,
  engineGain: null,
  windSource: null,
  windGain: null,
  windFilter: null,
  started: false,
  muted: false,
};

function initAudio() {
  if (AudioSys.started) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    AudioSys.ctx = ctx;
    AudioSys.master = ctx.createGain();
    AudioSys.master.gain.value = 0.5;
    AudioSys.master.connect(ctx.destination);

    AudioSys.engineOsc = ctx.createOscillator();
    AudioSys.engineOsc.type = 'sawtooth';
    AudioSys.engineOsc.frequency.value = 55;
    AudioSys.engineOsc2 = ctx.createOscillator();
    AudioSys.engineOsc2.type = 'square';
    AudioSys.engineOsc2.frequency.value = 110;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    AudioSys.engineGain = ctx.createGain();
    AudioSys.engineGain.gain.value = 0;
    AudioSys.engineOsc.connect(engineFilter);
    AudioSys.engineOsc2.connect(engineFilter);
    engineFilter.connect(AudioSys.engineGain);
    AudioSys.engineGain.connect(AudioSys.master);
    AudioSys.engineOsc.start();
    AudioSys.engineOsc2.start();

    const noiseLen = ctx.sampleRate * 2;
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) data[i] = Math.random() * 2 - 1;
    AudioSys.windSource = ctx.createBufferSource();
    AudioSys.windSource.buffer = noiseBuf;
    AudioSys.windSource.loop = true;
    AudioSys.windFilter = ctx.createBiquadFilter();
    AudioSys.windFilter.type = 'bandpass';
    AudioSys.windFilter.frequency.value = 600;
    AudioSys.windFilter.Q.value = 0.6;
    AudioSys.windGain = ctx.createGain();
    AudioSys.windGain.gain.value = 0;
    AudioSys.windSource.connect(AudioSys.windFilter);
    AudioSys.windFilter.connect(AudioSys.windGain);
    AudioSys.windGain.connect(AudioSys.master);
    AudioSys.windSource.start();
    AudioSys.started = true;
  } catch (err) {
    AudioSys.ctx = null;
  }
}

function resumeAudio() {
  if (AudioSys.ctx && AudioSys.ctx.state === 'suspended') {
    AudioSys.ctx.resume().catch(() => {});
  }
}

// Engine drone follows throttle and airspeed; wind follows airspeed.
function updateEngineSound(throttle, speed, flying) {
  if (!AudioSys.started || !AudioSys.ctx) return;
  const t = AudioSys.ctx.currentTime;
  const target = flying ? 0.05 + throttle * 0.11 : 0;
  AudioSys.engineGain.gain.setTargetAtTime(target, t, 0.1);
  const base = 42 + throttle * 58 + speed * 0.35;
  AudioSys.engineOsc.frequency.setTargetAtTime(base, t, 0.08);
  AudioSys.engineOsc2.frequency.setTargetAtTime(base * 2.02, t, 0.08);
  AudioSys.windGain.gain.setTargetAtTime(flying ? Math.min(0.12, speed * 0.0016) : 0, t, 0.15);
  AudioSys.windFilter.frequency.setTargetAtTime(380 + speed * 9, t, 0.15);
}

function _tone(freq, dur, type, vol, when) {
  if (!AudioSys.started || !AudioSys.ctx) return;
  const ctx = AudioSys.ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const start = ctx.currentTime + (when || 0);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain);
  gain.connect(AudioSys.master);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

function playRingChime() {
  _tone(880, 0.35, 'sine', 0.22, 0);
  _tone(1318, 0.45, 'sine', 0.16, 0.07);
}

function playDropChime() {
  _tone(659, 0.3, 'triangle', 0.2, 0);
  _tone(988, 0.4, 'triangle', 0.16, 0.08);
}

function playThud() {
  if (!AudioSys.started || !AudioSys.ctx) return;
  const ctx = AudioSys.ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.25);
  gain.gain.setValueAtTime(0.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(AudioSys.master);
  osc.start();
  osc.stop(ctx.currentTime + 0.35);
}

function playCrash() {
  _tone(220, 0.5, 'sawtooth', 0.25, 0);
  _tone(110, 0.7, 'sawtooth', 0.25, 0.05);
  _tone(55, 0.9, 'square', 0.2, 0.1);
  playThud();
}

function playAlarm() {
  _tone(1046, 0.18, 'square', 0.1, 0);
  _tone(1046, 0.18, 'square', 0.1, 0.24);
}

function playClick() {
  _tone(1200, 0.06, 'sine', 0.12, 0);
}
