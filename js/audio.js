/**
 * EduRace – Web Audio Engine (Synthesized 8-bit / Chiptune SFX)
 * No external audio files needed – fully client-side and offline capable!
 */

let AudioCtx = null;

function tone(seq, type = 'sine', d = 0.18) {
  if (typeof S !== 'undefined' && S.mute) return;
  try {
    AudioCtx = AudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (AudioCtx.state === 'suspended') {
      AudioCtx.resume();
    }
    seq.forEach((freq, k) => {
      const osc = AudioCtx.createOscillator();
      const gain = AudioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const startTime = AudioCtx.currentTime + k * d;
      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + d);
      osc.connect(gain);
      gain.connect(AudioCtx.destination);
      osc.start(startTime);
      osc.stop(startTime + d);
    });
  } catch (e) {
    console.warn('Audio playback error:', e);
  }
}

const playCorrectSound = () => tone([523, 784], 'sine', 0.18);
const playIncorrectSound = () => tone([130], 'sawtooth', 0.35);
const playWinSound = () => tone([262, 330, 392, 523], 'triangle', 0.25);
const playLoseSound = () => tone([196, 165, 131], 'sine', 0.3);

const playTick = () => tone([880], 'square', 0.05);
const playSelect = () => tone([440], 'triangle', 0.07);
const playLock = () => tone([330, 494], 'square', 0.08);
const playStart = () => tone([392, 523, 659], 'triangle', 0.12);
const playStreak = (n) => tone(n >= 3 ? [523, 659, 784, 1047] : [523, 659, 784], 'triangle', 0.1);
const playNext = () => tone([587], 'sine', 0.08);

function toggleMute() {
  if (typeof S !== 'undefined') {
    S.mute = !S.mute;
    if (typeof render === 'function') render();
  }
}

