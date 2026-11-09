/**
 * EduRace – Web Audio Engine (Synthesized Arcade BGM & Interactive SFX)
 * Tanpa file MP3 eksternal – 100% berjalan di browser & hemat kuota!
 */

let AudioCtx = null;
let bgmTimer = null;
let bgmStep = 0;
let bgmNextTime = 0;

function getAudioCtx() {
  if (!AudioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) AudioCtx = new Ctx();
  }
  if (AudioCtx && AudioCtx.state === 'suspended') {
    AudioCtx.resume().catch(() => {});
  }
  return AudioCtx;
}

/**
 * Helper pemutar nada tunggal dengan envelope halus
 */
function playNote(freq, startTime, duration, type = 'triangle', peakGain = 0.16, slideTo = null) {
  const ctx = getAudioCtx();
  if (!ctx || (typeof S !== 'undefined' && S.mute)) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, startTime + duration);
    }

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + Math.min(0.015, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  } catch (e) {
    // Abaikan jika browser memblokir autoplay sebelum interaksi
  }
}

/**
 * Helper perkusi sintetis (kick & hi-hat ringan untuk ritme backsound)
 */
function playDrum(kind, startTime, vol = 0.08) {
  const ctx = getAudioCtx();
  if (!ctx || (typeof S !== 'undefined' && S.mute)) return;
  try {
    if (kind === 'kick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(135, startTime);
      osc.frequency.exponentialRampToValueAtTime(38, startTime + 0.11);
      gain.gain.setValueAtTime(vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.13);
    } else if (kind === 'hat') {
      // Hi-hat lembut menggunakan osilator frekuensi tinggi singkat
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(6800, startTime);
      osc.frequency.exponentialRampToValueAtTime(3200, startTime + 0.035);
      gain.gain.setValueAtTime(vol * 0.35, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0008, startTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.045);
    }
  } catch (e) {}
}

function tone(seq, type = 'sine', d = 0.14, vol = 0.16) {
  if (typeof S !== 'undefined' && S.mute) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  seq.forEach((freq, k) => {
    if (freq > 0) {
      playNote(freq, now + k * d, d * 0.92, type, vol);
    }
  });
}

/* ==========================================================================
   Sound Effects (SFX) Permainan
   ========================================================================== */

// Fanfare mulai balapan (Countdown Beep-Beep-Beep-GO! + melodi pembuka)
const playStart = () => {
  if (typeof S !== 'undefined' && S.mute) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // 3 ketukan start + lonjakan GO!
  playNote(523.25, t, 0.11, 'triangle', 0.2);        // C5
  playNote(523.25, t + 0.15, 0.11, 'triangle', 0.2); // C5
  playNote(523.25, t + 0.30, 0.11, 'triangle', 0.2); // C5
  // Chord GO! (C5 - E5 - G5 - C6)
  playNote(523.25, t + 0.46, 0.32, 'triangle', 0.16);
  playNote(659.25, t + 0.46, 0.32, 'triangle', 0.16);
  playNote(783.99, t + 0.46, 0.32, 'triangle', 0.16);
  playNote(1046.5, t + 0.54, 0.38, 'sine', 0.22);
};

// Jawaban benar (arpeggio ceria + harmonisasi)
const playCorrectSound = () => {
  if (typeof S !== 'undefined' && S.mute) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((f, i) => playNote(f, t + i * 0.08, 0.22, 'triangle', 0.2));
  playNote(523.25, t + 0.24, 0.32, 'sine', 0.12);
};

// Jawaban salah / waktu habis tanpa pemenang
const playIncorrectSound = () => {
  if (typeof S !== 'undefined' && S.mute) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  playNote(246.94, t, 0.18, 'sawtooth', 0.13, 220);       // B3 -> A3
  playNote(196.00, t + 0.19, 0.34, 'sawtooth', 0.14, 146.83); // G3 -> D3
};

// Fanfare juara akhir permainan
const playWinSound = () => {
  if (typeof S !== 'undefined' && S.mute) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Melodi kemenangan (C5 - E5 - G5 - C6 - G5 - C6!)
  const mel = [
    [523.25, 0.00, 0.14],
    [659.25, 0.14, 0.14],
    [783.99, 0.28, 0.14],
    [1046.5, 0.42, 0.26],
    [783.99, 0.70, 0.14],
    [1046.5, 0.85, 0.55]
  ];
  mel.forEach(([f, offset, dur]) => playNote(f, t + offset, dur, 'triangle', 0.22));
  // Bass pengiring
  playNote(261.63, t, 0.4, 'sine', 0.16);
  playNote(392.00, t + 0.42, 0.4, 'sine', 0.16);
  playNote(523.25, t + 0.85, 0.55, 'sine', 0.18);
};

// Lagu hasil seri
const playLoseSound = () => {
  tone([392, 349.23, 329.63, 261.63], 'triangle', 0.22, 0.16);
};

// Detak hitung mundur 5 detik terakhir (nada makin naik saat mendekati 1)
const playTick = (left = 3) => {
  if (typeof S !== 'undefined' && S.mute) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const pitch = left <= 1 ? 1174.66 : left <= 2 ? 1046.5 : left <= 3 ? 987.77 : 880;
  playNote(pitch, ctx.currentTime, 0.07, 'sine', 0.18);
};

// Klik pilih opsi / huruf
const playSelect = () => {
  if (typeof S !== 'undefined' && S.mute) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  playNote(587.33, ctx.currentTime, 0.055, 'triangle', 0.14, 783.99);
};

// Kunci jawaban (bunyi mantap 2 nada)
const playLock = () => {
  if (typeof S !== 'undefined' && S.mute) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  playNote(440, t, 0.07, 'triangle', 0.17);
  playNote(659.25, t + 0.065, 0.12, 'triangle', 0.2);
};

// Bonus beruntun (Streak)
const playStreak = (n) => {
  const seq = n >= 3 ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [523.25, 659.25, 783.99, 1046.5];
  tone(seq, 'triangle', 0.09, 0.2);
};

// Pindah ke soal berikutnya
const playNext = () => {
  if (typeof S !== 'undefined' && S.mute) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  playNote(523.25, t, 0.06, 'sine', 0.14);
  playNote(783.99, t + 0.055, 0.09, 'sine', 0.16);
};

/* ==========================================================================
   Backsound Musik Arena (Upbeat Quiz / Racing Loop)
   ========================================================================== */

// Pola melodi 32-langkah (ceria, seru, tidak mengganggu konsentrasi)
const BGM_MELODY = [
  523.25, 0,      659.25, 0,      783.99, 659.25, 523.25, 0,
  587.33, 0,      698.46, 0,      783.99, 698.46, 587.33, 0,
  659.25, 0,      783.99, 0,      1046.5, 783.99, 659.25, 523.25,
  587.33, 659.25, 698.46, 587.33, 523.25, 0,      392.00, 0
];

// Pola bass 32-langkah
const BGM_BASS = [
  130.81, 0, 130.81, 196.00, 130.81, 0, 130.81, 196.00,
  146.83, 0, 146.83, 220.00, 146.83, 0, 146.83, 220.00,
  164.81, 0, 164.81, 246.94, 174.61, 0, 174.61, 261.63,
  196.00, 0, 196.00, 146.83, 130.81, 196.00, 130.81, 0
];

function scheduleBgmStep() {
  if (typeof S === 'undefined' || S.view !== 'game' || S.mute || S.bgmOff) {
    return;
  }
  const ctx = getAudioCtx();
  if (!ctx) return;

  // Saat layar pembahasan (S.over) volume musik dikecilkan agar diskusi kelas nyaman
  const isDiscussion = !!S.over;
  const isUrgent = !isDiscussion && S.left <= 5 && S.left > 0;
  const stepDur = isUrgent ? 0.145 : 0.175; // Tempo sedikit lebih cepat di 5 detik terakhir
  const melGain = isDiscussion ? 0.022 : 0.065;
  const bassGain = isDiscussion ? 0.03 : 0.08;

  while (bgmNextTime < ctx.currentTime + 0.25) {
    const idx = bgmStep % BGM_MELODY.length;
    const mFreq = BGM_MELODY[idx];
    const bFreq = BGM_BASS[idx];

    if (mFreq > 0 && (!isDiscussion || idx % 2 === 0)) {
      playNote(mFreq, bgmNextTime, stepDur * 0.85, 'triangle', melGain);
    }
    if (bFreq > 0) {
      playNote(bFreq, bgmNextTime, stepDur * 0.9, 'sine', bassGain);
    }
    if (!isDiscussion) {
      if (idx % 4 === 0) playDrum('kick', bgmNextTime, 0.065);
      else if (idx % 2 === 1) playDrum('hat', bgmNextTime, 0.04);
    }

    bgmNextTime += stepDur;
    bgmStep++;
  }
}

function startBgm() {
  stopBgm();
  if (typeof S !== 'undefined' && (S.mute || S.bgmOff || S.view !== 'game')) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  bgmStep = 0;
  bgmNextTime = ctx.currentTime + 0.65; // Mulai tepat setelah fanfare playStart selesai
  bgmTimer = setInterval(scheduleBgmStep, 80);
}

function stopBgm() {
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
}

function toggleBgm() {
  if (typeof S === 'undefined') return;
  S.bgmOff = !S.bgmOff;
  if (S.bgmOff) {
    stopBgm();
  } else {
    if (S.mute) S.mute = false;
    startBgm();
  }
  if (typeof render === 'function') render();
}

function toggleMute() {
  if (typeof S !== 'undefined') {
    S.mute = !S.mute;
    if (S.mute) {
      stopBgm();
    } else if (S.view === 'game' && !S.bgmOff) {
      startBgm();
    }
    if (typeof render === 'function') render();
  }
}
