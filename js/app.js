/**
 * QuizRace – Main Application Logic & Game Controller
 */

const $ = s => document.querySelector(s);

// Themes & Modes
const THEMES = [
  ['rocket', '🚀 Roket'],
  ['car', '🏎️ Mobil'],
  ['tug', '🪢 Tarik Tambang'],
  ['cook', '🍳 Masak'],
  ['plant', '🌱 Tanaman'],
  ['climb', '⛰️ Panjat Gunung'],
  ['swim', '🏊 Renang'],
  ['train', '🚂 Kereta']
];

const TN = {
  rocket: 'Roket', car: 'Mobil', tug: 'Tarik Tambang',
  cook: 'Masak', plant: 'Tanaman', climb: 'Panjat Gunung',
  swim: 'Renang', train: 'Kereta'
};

THEMES.forEach(t => {
  t[1] = ic(t[0] === 'rocket' ? 'logo' : t[0], 20) + ' ' + TN[t[0]];
});

const TIMES = [10, 15, 20, 30, 45, 60];

const MODES = [
  ['race', '🏁', 'Balapan 2 Tim', 'Kedua tim menjawab serempak. Tiap soal: benar & tercepat dapat +2 poin, benar kedua +1 poin.', '#60A5FA'],
  ['buzz', '🔔', 'Rebutan Cepat', 'Kunci duluan! Tim pertama yang mengunci jawaban benar langsung mengambil poin.', '#FFD23F'],
  ['streak', '🔥', 'Beruntun', 'Jawab benar berturut-turut untuk bonus: ke-1 +1, ke-2 +2, ke-3 dan seterusnya +3. Salah mengulang dari nol.', '#00E36B'],
  ['bet', '🎲', 'Taruhan Poin', 'Pilih taruhan ×1, ×2, ×3. Jawaban benar menambah poin, salah mengurangi.', '#F87171']
];

['race', 'buzz', 'streak', 'bet'].forEach((k, i) => {
  MODES[i][1] = ic(k, 40);
});

const QTYPES = [
  ['mcq', '📝', 'Pilihan Ganda', 'Pilih satu jawaban tepat dari 4 tombol opsi A, B, C, D.', '#60A5FA'],
  ['blank', '✏️', 'Fill in the Blanks', 'Lengkapi huruf/angka yang kosong pada kalimat lewat papan tombol sentuh IFP.', '#00E36B'],
  ['drag', '🖐️', 'Drag and Drop', 'Seret & lepas kartu jawaban langsung dengan jari ke kotak target di layar IFP.', '#FFD23F'],
  ['mix', '🔀', 'Campuran (3-in-1)', 'Kombinasi otomatis Pilihan Ganda, Fill in the Blanks, dan Drag & Drop tiap soal.', '#C4B5FD']
];

['mcq', 'blank', 'drag', 'mix'].forEach((k, i) => {
  QTYPES[i][1] = ic(k, 40);
});

// Central Application State
const S = {
  view: 'landing',
  step: 1,
  pkg: null,
  n1: 'Tim Biru',
  n2: 'Tim Merah',
  theme: 'rocket',
  time: 20,
  i: 0,
  sc: [0, 0],
  pick: [null, null],
  lock: [null, null],
  over: false,
  hist: [],
  left: 20,
  win: null,
  mode: 'race',
  qtype: 'mcq',
  pvType: 'mcq',
  tutOpen: false,
  blankIn: [[], []],
  blankCur: [0, 0],
  blankStr: ['', ''],
  st: [1, 1],
  stk: [0, 0],
  tTime: [0, 0],
  okCnt: [0, 0],
  fastCnt: [0, 0],
  roundStart: 0,
  winByTime: false,
  xc: 0,
  mute: false,
  bgmOff: false
};

// Initialize AI sub-state
initAIState(S);

// Fullscreen toggle helper (supports both entering and exiting/minimizing fullscreen)
function isFull() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

function toggleFull() {
  if (!isFull()) {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
}

function fullBtnHtml(compact = false) {
  const f = isFull();
  const lbl = f ? 'Kecilkan Layar' : 'Layar Penuh';
  return `<button type="button" class="btn w" id="fullBtn" onclick="toggleFull()" aria-label="${lbl}" title="${lbl}">${ic(f ? 'exitFull' : 'full', 18)}${compact ? ` ${f ? 'Kecilkan' : 'Penuh'}` : ` ${lbl}`}</button>`;
}

document.addEventListener('fullscreenchange', () => {
  if (S.view === 'game' && !S.over) {
    const fb = $('#fullBtn');
    if (fb) fb.outerHTML = fullBtnHtml(true);
  } else {
    render();
  }
});

function toggleTut(open) {
  S.tutOpen = open;
  render();
}

// Helpers
const head = (r = '') =>
  `<header><div class="logo d"><i>${ic('logo', 26)}</i>QuizRace</div><span class="tag">Kuis 2 Tim · Interactive Flat Panel (IFP)</span><div style="display:flex;gap:8px;align-items:center">${r}</div></header>`;

const pkg = () => BANK.find(p => p.id === S.pkg) || null;
const Q = () => (pkg() ? pkg().qs : []);
const hasPkg = () => !!pkg();
const go = (v) => {
  if (v !== 'game' && typeof stopBgm === 'function') stopBgm();
  S.view = v;
  render();
};
const gL = () => go('landing');
const mode = () => MODES.find(m => m[0] === S.mode) || MODES[0];
const qtypeObj = (k = S.qtype) => QTYPES.find(q => q[0] === k) || QTYPES[0];
const curQType = (idx = S.i) => S.qtype === 'mix' ? ['mcq', 'blank', 'drag'][idx % 3] : S.qtype;
const cap = () => {
  const n = Q().length;
  return S.mode === 'buzz' ? n : n * 2;
};
const prog = () => S.sc.map(v => Math.max(0, Math.min(1, v / cap())));

function formatStem(str, qt) {
  if (qt === 'mcq') return str;
  const mark = `<span class="q-blank-mark">____</span>`;
  if (str.includes('___')) return str.replace(/___+/g, mark);
  if (/(…|\.\.\.)$/.test(str.trim())) return str.trim().replace(/(…|\.\.\.)$/, ' ' + mark);
  return str + ' ' + mark;
}

/**
 * Deterministic generator for Fill in the Blanks data per question
 */
function getBlankData(q, qIdx = 0) {
  const ans = String(q[1][q[2]] || '').trim();
  const upper = ans.toUpperCase();
  const chars = Array.from(upper);

  const isBlankable = (c, totalLen) => {
    if (c === ' ') return false;
    if (totalLen <= 4) return true;
    return /[A-Z0-9]/.test(c);
  };

  const cand = [];
  chars.forEach((c, idx) => {
    if (isBlankable(c, chars.length)) cand.push(idx);
  });

  let targetBlanks;
  if (cand.length <= 4) {
    targetBlanks = cand.length;
  } else if (cand.length <= 7) {
    targetBlanks = 4;
  } else {
    targetBlanks = 5;
  }

  const mask = chars.map(() => false);
  if (targetBlanks >= cand.length) {
    cand.forEach(idx => { mask[idx] = true; });
  } else {
    const pool = cand.slice(1);
    for (let b = 0; b < targetBlanks; b++) {
      const pickIdx = Math.min(pool.length - 1, Math.floor(((b + 0.5) * pool.length) / targetBlanks));
      mask[pool[pickIdx]] = true;
    }
    for (let k = pool.length - 1; k >= 0 && mask.filter(Boolean).length < targetBlanks; k--) {
      mask[pool[k]] = true;
    }
  }

  const blankIndices = [];
  mask.forEach((m, idx) => { if (m) blankIndices.push(idx); });

  const reqSet = new Set(blankIndices.map(idx => chars[idx]));
  const keys = Array.from(reqSet);
  const otherChars = Array.from(
    q[1].filter((_, i) => i !== q[2]).join('').toUpperCase()
  ).filter(c => c !== ' ' && !reqSet.has(c));

  const fallbackPool = /[0-9]/.test(upper) && !/[A-Z]/.test(upper)
    ? ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '−', '+']
    : ['A', 'E', 'I', 'O', 'U', 'S', 'T', 'N', 'R', 'K', 'M', 'L', 'P', 'B', 'D', 'G'];

  const distPool = [...otherChars, ...fallbackPool];
  const targetKeys = Math.min(8, Math.max(keys.length, 8));
  for (let k = 0; k < distPool.length && keys.length < targetKeys; k++) {
    const ch = distPool[(k + qIdx * 3) % distPool.length];
    if (!keys.includes(ch)) keys.push(ch);
  }

  for (let k = keys.length - 1; k > 0; k--) {
    const j = (qIdx * 17 + k * 31 + chars.length * 7) % (k + 1);
    [keys[k], keys[j]] = [keys[j], keys[k]];
  }

  return { ans, upper, chars, mask, blankIndices, keys };
}

function pickPkg(i) {
  S.pkg = BANK[i].id;
  render();
}

function startFlow() {
  S.step = 1;
  go('setup');
}

// Langkah 2-4 hanya bisa dibuka setelah ada paket soal
function goStep(n) {
  if (n > 1 && !hasPkg()) {
    S.ai.msg = 'Buat soal dengan AI dulu, lalu lanjut ke langkah berikutnya.';
    S.ai.ok = false;
    n = 1;
  }
  S.step = n;
  render();
}

let heroTimer = null;
let ht = 0;

function setPvType(pt) {
  S.pvType = pt;
  const tabs = document.querySelectorAll('.pv-tab');
  tabs.forEach(btn => btn.classList.toggle('on', btn.dataset.pv === pt));
  const el = $('#heroBox');
  if (el) el.innerHTML = heroView(ht % 168);
}

function heroTick() {
  const el = $('#heroBox');
  if (!el) {
    clearInterval(heroTimer);
    return;
  }
  ht += 0.08;
  el.innerHTML = heroView(ht % 168);
}

function heroView(T) {
  const roundIdx = Math.floor(T / 7);
  const th = Math.floor(roundIdx / 3) % 8;
  const k = roundIdx % 3;
  const u = T % 7;
  const pvModes = ['blank', 'drag', 'mcq'];
  const qt = S.pvType === 'auto' ? pvModes[k] : S.pvType;
  const qtLabel = qt === 'blank' ? '✏️ Fill in the Blanks' : qt === 'drag' ? '🖐️ Drag & Drop' : '📝 Pilihan Ganda';

  const Qs = DEMO_QS;
  const qIdx = (th * 3 + k) % Qs.length;
  const q = Qs[qIdx];
  const PT = [
    [[1, 0], [1, 1], [0, 1]],
    [[0, 1], [1, 1], [1, 0]],
    [[1, 1], [0, 1], [1, 1]],
    [[1, 0], [0, 1], [1, 1]],
    [[1, 1], [1, 0], [0, 1]],
    [[0, 1], [1, 0], [1, 1]],
    [[1, 1], [1, 1], [1, 0]],
    [[1, 0], [1, 1], [1, 1]]
  ][th];
  const ok = PT[k];
  const pk = ok.map(o => (o ? q[2] : (q[2] + 1) % 4));
  const rev = u >= 4.2;
  const L = [1.8, 2.9];
  const K = [2.4, 3.5];
  const e = rev ? Math.min(1, (u - 4.2) / 1) : 0;
  const ee = e * e * (3 - 2 * e);
  const s = [0, 0];
  for (let prev = 0; prev < k; prev++) {
    PT[prev].forEach((o, m) => (s[m] += o));
  }

  const pos = [0, 1].map(m => (s[m] + ok[m] * ee) / 3);
  const sh = [0, 1].map(m => s[m] + (rev ? ok[m] : 0));
  const tm = 15 - Math.floor(Math.min(u, 4.2) * 1.5);

  const pn = m => {
    const p = u >= L[m] ? pk[m] : null;
    let bodyHtml = '';

    if (qt === 'mcq') {
      bodyHtml = q[1].map((o, i) => {
        let c = p === i ? 'sel' : '';
        if (rev) {
          if (i === q[2]) c = 'ok';
          else if (p === i) c = 'no';
        }
        return `<div class='pvo ${c}'><b>${'ABCD'[i]}</b>${o}${rev && i === q[2] ? '<em>✓</em>' : ''}</div>`;
      }).join('');
    } else if (qt === 'blank') {
      const B = getBlankData(q, qIdx);
      const totalB = B.blankIndices.length;
      const startT = m ? 0.9 : 0.4;
      const typedCount = Math.max(0, Math.min(totalB, Math.floor(((u - startT) / (L[m] - startT)) * (totalB + 0.5))));
      let bCounter = 0;

      const slotsHtml = B.chars.map((ch, idx) => {
        if (ch === ' ') return `<span style='width:6px'></span>`;
        if (!B.mask[idx]) return `<span class='pv-bslot clue'>${ch}</span>`;
        const bPos = bCounter++;
        const isFilled = bPos < typedCount;
        const wrongChar = B.keys.find(kc => kc !== ch) || 'X';
        const dispChar = isFilled ? (!ok[m] && bPos === totalB - 1 ? wrongChar : ch) : '_';
        let cls = isFilled ? 'Typed' : '';
        if (rev) cls = ok[m] ? 'ok' : 'no';
        return `<span class='pv-bslot ${cls}'>${dispChar}</span>`;
      }).join('');

      const activeKeyIdx = (typedCount > 0 && typedCount <= totalB && !rev && u < K[m])
        ? B.keys.indexOf(B.chars[B.blankIndices[Math.min(totalB - 1, typedCount - 1)]])
        : -1;

      bodyHtml = `<div class='pv-blank-wrap'>${slotsHtml}</div>
        <div class='pv-kpad'>
          ${B.keys.slice(0, 7).map((kc, ki) => `<div class='pv-key ${ki === activeKeyIdx ? 'tap' : ''}'>${kc}</div>`).join('')}
          <div class='pv-key'>⌫</div>
        </div>`;
    } else {
      // Drag & Drop preview
      const isDragging = u >= L[m] - 0.8 && u < L[m];
      let dzClass = '';
      let dzText = `🖐️ Seret kartu ke sini`;
      if (isDragging) {
        dzClass = 'over';
        dzText = `📥 Lepaskan: "${q[1][pk[m]]}"`;
      } else if (p !== null) {
        dzClass = rev ? (ok[m] ? 'ok' : 'no') : 'filled';
        dzText = `⠿ ${q[1][p]}${rev ? (ok[m] ? ' ✓' : ' ✗') : ''}`;
      }
      bodyHtml = `<div class='pv-dz ${dzClass}'>${dzText}</div>
        <div class='pv-dgrid'>
          ${q[1].map((o, i) => {
            let dc = p === i ? 'gone' : '';
            if (rev && i === q[2] && !ok[m]) dc = 'ok';
            return `<div class='pv-dcard ${dc}'><i>⠿</i><span>${o}</span></div>`;
          }).join('')}
        </div>`;
    }

    const statusText = u >= K[m]
      ? ic('lock', 13) + ' Terkunci'
      : qt === 'blank' ? 'Mengetik huruf…'
      : qt === 'drag' ? 'Menyeret kartu…'
      : 'Memilih opsi…';

    return `<div class='pvp ${m ? 'r' : 'b'}'>
      <div class='pvn' style='display:flex;align-items:center;gap:4px'>
        <span>${m ? 'Tim Merah' : 'Tim Biru'}</span>
        <span class='pv-qtype'>${qtLabel}</span>
      </div>
      <div class='pvq'>${formatStem(q[0], qt)}</div>
      ${bodyHtml}
      <div class='pvl'>${statusText}</div>
    </div>`;
  };

  return `<div class='pvh'>
      <div class='pvh-left'>
        <span class='sc d b' style='font-size:1.15rem;padding:4px 12px;height:36px;display:inline-flex;align-items:center;border-radius:6px'>${sh[0]}</span>
        <span class='tag' style='background:#fff;height:36px;display:inline-flex;align-items:center;margin:0'>Arena: ${THEMES[th][1]}</span>
      </div>
      <div class='pvh-mid'>
        <div class='timer d' style='font-size:1.35rem;width:44px;height:44px;line-height:44px;margin:0;display:grid;place-items:center;border:2.5px solid #000;box-shadow:2px 2px 0 #000'>${tm}</div>
      </div>
      <div class='pvh-right'>
        <span class='tag' style='background:var(--y);height:36px;display:inline-flex;align-items:center;margin:0'>🏁 Balapan 2 Tim</span>
        <span class='sc d r' style='font-size:1.15rem;padding:4px 12px;height:36px;display:inline-flex;align-items:center;border-radius:6px'>${sh[1]}</span>
      </div>
    </div>
    <div class='pvc'>
      ${pn(0)}
      <div>${scene(THEMES[th][0], pos[0], pos[1], T)}</div>
      ${pn(1)}
    </div>
    <div class='prog'>
      <i style='width:${((k + (rev ? 1 : 0)) / 3) * 100}%'></i>
      <span>Simulasi Soal ${k + 1}/3 · Bentuk Soal: ${qtLabel}</span>
    </div>`;
}

function tutorialModal() {
  if (!S.tutOpen) return '';
  return `<div class="modal" onclick="if(event.target===this)toggleTut(false)">
    <div class="tut-card" role="dialog" aria-modal="true" aria-label="Tutorial Penggunaan QuizRace">
      <div class="tut-head">
        <div style="display:flex;align-items:center;gap:10px">
          ${ic('help', 26)}
          <h3 style="font-size:1.25rem;color:#fff">Tahapan Penggunaan QuizRace di Layar IFP</h3>
        </div>
        <button type="button" class="btn w" style="padding:5px 12px;font-size:0.8rem" onclick="toggleTut(false)">✕ Tutup</button>
      </div>
      <div class="tut-body">
        <div class="tut-step">
          <span class="tut-step-num">Langkah 1</span>
          <h4>Buat Soal dengan AI</h4>
          <p>Ketik topik, pilih <b>jenjang &amp; kelas</b> (SD, SMP, SMA/SMK), lalu <b>AI</b> membuat soalnya otomatis dalam hitungan detik.</p>
        </div>
        <div class="tut-step">
          <span class="tut-step-num">Langkah 2</span>
          <h4>Pilih Bentuk Interaksi Soal</h4>
          <p>Tentukan gaya bermain di layar sentuh IFP: <b>Pilihan Ganda</b>, <b>Fill in the Blanks</b> (ketuk huruf rumpang), <b>Drag &amp; Drop</b> (seret kartu), atau <b>Campuran 3-in-1</b>.</p>
        </div>
        <div class="tut-step">
          <span class="tut-step-num">Langkah 3</span>
          <h4>Atur Mode Skor &amp; Waktu</h4>
          <p>Pilih mekanisme lomba (<b>Balapan 2 Tim</b>, <b>Rebutan Cepat</b>, <b>Beruntun</b>, atau <b>Taruhan Poin</b>) serta atur batas waktu per soal (10–60 detik).</p>
        </div>
        <div class="tut-step">
          <span class="tut-step-num">Langkah 4</span>
          <h4>Duel 2 Tim di IFP &amp; Evaluasi</h4>
          <p>Dua siswa maju ke sisi <b>Kiri (Biru)</b> dan <b>Kanan (Merah)</b> layar IFP untuk menjawab serempak, lalu bahas kunci jawaban bersama di akhir sesi.</p>
        </div>
      </div>
      <div class="tut-foot">
        <span style="font-size:0.85rem;font-weight:700">💡 Tips: Klik tombol <b>Layar Penuh</b> di pojok kanan atas untuk tampilan optimal di IFP.</span>
        <div style="display:flex;gap:10px">
          <button type="button" class="btn w" onclick="toggleTut(false)">Tutup</button>
          <button type="button" class="btn" onclick="S.tutOpen=false;startFlow()">Mulai Atur Lomba</button>
        </div>
      </div>
    </div>
  </div>`;
}

function landing() {
  const pvBtns = [
    ['mcq', '📝 Pilihan Ganda'],
    ['blank', '✏️ Fill Blanks'],
    ['drag', '🖐️ Drag & Drop'],
    ['auto', '🔄 Rotasi Otomatis']
  ].map(([k, lbl]) =>
    `<button class='pv-tab ${S.pvType === k ? 'on' : ''}' data-pv='${k}' onclick='setPvType("${k}")'>${lbl}</button>`
  ).join('');

  return head(fullBtnHtml()) +
    `<main class="hero-page">
      <div class="hero">
        <section class="hero-center">
          <h1 class="hero-title">Kelas jadi <span>lomba.</span></h1>
          <p class="hero-lead">Kuis interaktif 2 tim khusus layar sentuh <b>Interactive Flat Panel (IFP)</b> dan proyektor kelas. Dua siswa maju dan berduel langsung di sisi kiri &amp; kanan layar!</p>

          <div class="hero-cta">
            <button class="btn cta-main" onclick="startFlow()">Mulai Atur Lomba</button>
            <button type="button" class="tut-trigger" onclick="toggleTut(true)">${ic('help', 22)} Lihat Tutorial Penggunaan</button>
          </div>
        </section>

        <section class="pv">
          <div class="pv-topbar">
            <div class="pv-title">
              <span class="pv-dots"><i style="background:#EF4444"></i><i style="background:#FFD23F"></i><i style="background:#00E36B"></i></span>
              <span>Preview Layar IFP</span>
            </div>
            <div class="pv-tabs" style="margin:0" aria-label="Pilih model preview">${pvBtns}</div>
          </div>
          <div class="pv-canvas" id="heroBox">${heroView(2.2)}</div>
        </section>
      </div>
    </main>` + tutorialModal();
}

/* ==========================================================================
   Game Loop & Stage Animation
   ========================================================================== */
let gl = 0;
let cur = [0, 0];

function gloop(now) {
  const el = $('#gsc');
  if (!el || !(S.view === 'game' || S.view === 'done')) {
    gl = 0;
    return;
  }
  const to = prog();
  cur = cur.map((c, i) => c + (to[i] - c) * 0.07);
  el.innerHTML = scene(S.theme, cur[0], cur[1], now / 1000);
  gl = requestAnimationFrame(gloop);
}

/* ==========================================================================
   4-Step Setup Wizard
   ========================================================================== */
const pcard = (b, i) =>
  `<button type='button' class='pc ${b.id === S.pkg ? 'on' : ''}' style='--c:${MAPEL.lain[2]}' onclick='pickPkg(${i})'>
    <div class='ph'><span>${MAPEL.lain[0]}</span>${esc(b.meta || 'Umum')}</div>
    <div class='pb'>
      <h3 style='font-size:1.05rem'>${b.name}</h3>
      <div>
        <span class='tag'>${b.qs.length} soal</span>
        <span class='tag' style='background:#000;color:#fff'>AI</span>
      </div>
    </div>
  </button>`;

function renderStepper() {
  const p = pkg();
  const steps = [
    [1, '1. Buat Soal', p ? `${p.name} (${p.qs.length} soal)` : 'Ketik topik soal'],
    [2, '2. Bentuk Soal', qtypeObj()[2]],
    [3, '3. Mode & Skor', `${mode()[2]} · ${S.time} dtk`],
    [4, '4. Tim & Arena', `${TN[S.theme]} · ${S.n1} vs ${S.n2}`]
  ];
  return `<nav class='stepper' aria-label='Langkah pengaturan lomba'>
    ${steps.map(([num, title, sub]) => {
      const locked = num > 1 && !p;
      const cls = S.step === num ? 'on' : S.step > num ? 'done' : '';
      const badge = S.step > num ? '✓' : num;
      return `<button type='button' class='step-btn ${cls}' ${locked ? 'disabled' : ''} onclick='goStep(${num})'>
        <span class='step-num'>${badge}</span>
        <span class='step-info'><b>${title}</b><small>${esc(sub)}</small></span>
      </button>`;
    }).join('')}
  </nav>`;
}

function setupStep2() {
  const demos = {
    mcq: `<span class='qt-demo-lbl'>Gambaran Tampilan di Layar IFP:</span>
      <div class='qt-mock-q'>Alat ukur suhu adalah…</div>
      <div class='qt-mock-mcq'>
        <div class='qt-mock-opt'><b>A</b>Barometer</div>
        <div class='qt-mock-opt hit'><b>B</b>Termometer ✓</div>
        <div class='qt-mock-opt'><b>C</b>Neraca</div>
        <div class='qt-mock-opt'><b>D</b>Higrometer</div>
      </div>`,
    blank: `<span class='qt-demo-lbl'>Gambaran Tampilan di Layar IFP:</span>
      <div class='qt-mock-q'>Alat ukur suhu adalah <span class='q-blank-mark'>____</span></div>
      <div class='qt-mock-slots'>
        <span class='qt-mslot'>T</span>
        <span class='qt-mslot in'>E</span>
        <span class='qt-mslot'>R</span>
        <span class='qt-mslot'>M</span>
        <span class='qt-mslot cur'>_</span>
        <span class='qt-mslot'>M</span>
        <span class='qt-mslot'>E</span>
        <span class='qt-mslot'>T</span>
        <span class='qt-mslot'>E</span>
        <span class='qt-mslot'>R</span>
      </div>
      <div class='qt-mock-keys'>
        <span class='qt-mkey tap'>O 👆</span>
        <span class='qt-mkey'>A</span>
        <span class='qt-mkey'>I</span>
        <span class='qt-mkey'>K</span>
        <span class='qt-mkey'>S</span>
        <span class='qt-mkey' style='background:#E5E7EB'>⌫ Hapus</span>
      </div>`,
    drag: `<span class='qt-demo-lbl'>Gambaran Tampilan di Layar IFP:</span>
      <div class='qt-mock-dz'>📥 Kotak Target: Lepaskan Kartu di Sini</div>
      <div class='qt-mock-drow'>
        <span class='qt-mock-dcard lifting'><span style='background:#fff;border:1px solid #000;padding:0 3px'>⠿</span> Termometer 👆↗</span>
        <span class='qt-mock-dcard'><span style='background:var(--y);border:1px solid #000;padding:0 3px'>⠿</span> Barometer</span>
        <span class='qt-mock-dcard'><span style='background:var(--y);border:1px solid #000;padding:0 3px'>⠿</span> Neraca</span>
      </div>`,
    mix: `<span class='qt-demo-lbl'>Gambaran Rotasi Otomatis Tiap Nomor Soal:</span>
      <div class='qt-mock-mix'>
        <div class='qt-mix-box' style='border-top:5px solid #3B82F6'>
          <small>Soal #1</small>
          📝 Pilihan Ganda<br><span style='font-size:0.65rem;color:#4B5563'>[A] [B] [C] [D]</span>
        </div>
        <b style='font-size:1rem'>➔</b>
        <div class='qt-mix-box' style='border-top:5px solid #00E36B'>
          <small>Soal #2</small>
          ✏️ Fill Blanks<br><span style='font-size:0.65rem;color:#4B5563'>[T] [_] [R] [M]</span>
        </div>
        <b style='font-size:1rem'>➔</b>
        <div class='qt-mix-box' style='border-top:5px solid #FFD23F'>
          <small>Soal #3</small>
          🖐️ Drag &amp; Drop<br><span style='font-size:0.65rem;color:#4B5563'>[⠿ Kartu] ➔ [📥]</span>
        </div>
      </div>`
  };

  return head(`${fullBtnHtml()}<button class='btn w' onclick='gL()'>Beranda</button>`) +
    `<div class='wrap'>
      ${renderStepper()}
      <div class='step-head'>
        <div>
          <h2>Langkah 2 · Pilih Bentuk Soal (Interaksi IFP)</h2>
          <p>Tentukan cara siswa menjawab soal di layar sentuh Interactive Flat Panel:</p>
        </div>
        <span class='tag' style='background:var(--y)'>Langkah 2 dari 4</span>
      </div>
      <div class='qtype-grid'>
        ${QTYPES.map((qt, k) => `
          <button type='button' class='qt-card ${S.qtype === qt[0] ? 'on' : ''}' style='--c:${qt[4]}' onclick='S.qtype=QTYPES[${k}][0];render()'>
            <div class='qt-head'>
              <span class='qt-ic'>${qt[1]}</span>
              <h3>${qt[2]}</h3>
            </div>
            <div class='qt-body'>
              <p>${qt[3]}</p>
              <div class='qt-demo'>${demos[qt[0]]}</div>
            </div>
          </button>
        `).join('')}
      </div>
      <div class='selbar'>
        <button class='btn w' onclick='S.step=1;render()'>Kembali</button>
        <button class='btn big' onclick='S.step=3;render()'>Lanjut ke Langkah 3</button>
      </div>
    </div>`;
}

function setupStep3() {
  return head(`${fullBtnHtml()}<button class='btn w' onclick='gL()'>Beranda</button>`) +
    `<div class='wrap'>
      ${renderStepper()}
      <div class='step-head'>
        <div>
          <h2>Langkah 3 · Mode Kompetisi &amp; Durasi Waktu</h2>
          <p>Pilih aturan perhitungan poin dan batas waktu menjawab untuk setiap soal:</p>
        </div>
        <span class='tag' style='background:var(--y)'>Langkah 3 dari 4</span>
      </div>
      <h3 style='margin-bottom:10px'>Aturan Poin &amp; Kompetisi</h3>
      <div class='qtype-grid' style='margin-bottom:24px'>
        ${MODES.map((m, k) => `
          <button type='button' class='qt-card ${S.mode === m[0] ? 'on' : ''}' style='--c:${m[4]}' onclick='S.mode=MODES[${k}][0];render()'>
            <div class='qt-head'>
              <span class='qt-ic'>${m[1]}</span>
              <h3>${m[2]}</h3>
            </div>
            <div class='qt-body'>
              <p>${m[3]}</p>
            </div>
          </button>
        `).join('')}
      </div>
      <div class='card' style='margin-bottom:24px'>
        <h3 style='margin-bottom:10px'>⏱️ Durasi Waktu Tiap Soal</h3>
        <p style='margin:0 0 12px;font-size:0.9rem'>Rekomendasi untuk Fill in the Blanks / Drag &amp; Drop di IFP: <b>20 – 30 detik</b>.</p>
        <div>
          ${TIMES.map(t => `<button class='pill ${S.time === t ? 'on' : ''}' onclick='S.time=${t};render()'>${S.time === t ? '✓ ' : ''}${t} detik</button>`).join('')}
        </div>
      </div>
      <div class='selbar'>
        <button class='btn w' onclick='S.step=2;render()'>Kembali</button>
        <button class='btn big' onclick='S.step=4;render()'>Lanjut ke Langkah 4</button>
      </div>
    </div>`;
}

function setupStep4() {
  const p = pkg();
  if (!p) return setup1();
  return head(`${fullBtnHtml()}<button class='btn w' onclick='gL()'>Beranda</button>`) +
    `<div class='wrap'>
      ${renderStepper()}
      <div class='step-head'>
        <div>
          <h2>Langkah 4 · Nama Tim &amp; Tema Arena Balapan</h2>
          <p>Atur nama kedua tim dan pilih animasi balapan yang tampil di tengah layar IFP:</p>
        </div>
        <span class='tag' style='background:var(--g)'>Langkah Terakhir (4/4)</span>
      </div>
      <div class='row' style='margin-bottom:22px'>
        <div class='card' style='border-top:8px solid var(--b)'>
          <label for='n1'>Nama Tim 1 (Sisi Kiri IFP · Biru)</label>
          <input type='text' id='n1' value='${esc(S.n1)}' oninput='S.n1=this.value'>
        </div>
        <div class='card' style='border-top:8px solid var(--r)'>
          <label for='n2'>Nama Tim 2 (Sisi Kanan IFP · Merah)</label>
          <input type='text' id='n2' value='${esc(S.n2)}' oninput='S.n2=this.value'>
        </div>
      </div>
      <h3 style='margin:0 0 10px'>Pilih Tema Visual Arena Balapan</h3>
      <div class='th'>
        ${THEMES.map((t, k) => `
          <button class='${S.theme === t[0] ? 'on' : ''}' onclick='S.theme=THEMES[${k}][0];render()'>
            ${scene(t[0], 0.55, 0.35)}${t[1]}
          </button>
        `).join('')}
      </div>
      <div class='summary-box'>
        <div class='summary-item'><small>1. Paket Materi</small><b>${p.meta} · ${p.name} (${p.qs.length} soal)</b></div>
        <div class='summary-item'><small>2. Bentuk Soal IFP</small><b>${qtypeObj()[2]}</b></div>
        <div class='summary-item'><small>3. Mode &amp; Waktu</small><b>${mode()[2]} (${S.time} dtk/soal)</b></div>
        <div class='summary-item'><small>4. Arena</small><b>${TN[S.theme]}</b></div>
      </div>
      <div class='selbar' style='margin-top:20px'>
        <button class='btn w' onclick='S.step=3;render()'>Kembali</button>
        <button class='btn big' style='font-size:1.25rem;padding:16px 28px' onclick='start()'>Mulai Lomba Sekarang</button>
      </div>
    </div>`;
}

function setup() {
  if (S.step > 1 && !hasPkg()) S.step = 1;
  if (S.step === 2) return setupStep2();
  if (S.step === 3) return setupStep3();
  if (S.step === 4) return setupStep4();
  return setup1();
}

function setup1() {
  const p = pkg();
  const mine = BANK.map((b, i) =>
    `<button type='button' class='saved-item ${b.id === S.pkg ? 'on' : ''}' onclick='pickPkg(${i})'>
      <div class='saved-item-main'>
        <div class='saved-item-title'>${esc(b.name)}</div>
        <div class='saved-meta'>${esc(b.meta || 'Sekolah')} · ${b.qs.length} soal</div>
      </div>
      <span class='saved-pick-badge'>${b.id === S.pkg ? '✓ Terpilih' : 'Pilih'}</span>
    </button>`
  ).join('');

  return head(`${fullBtnHtml()}<button class='btn w' onclick='gL()'>Beranda</button>`) +
    `<div class='wrap'>
      ${renderStepper()}
      ${aiPanel2()}
      ${p ? `
      <div class='ai-ready-card' role='region' aria-label='Paket Soal Terpilih'>
        <div class='ai-ready-top'>
          <div class='ai-ready-info'>
            <div class='ai-ready-badges'>
              <span class='tag' style='background:var(--y);font-weight:800'>${esc(p.meta || 'Umum')}</span>
              <span class='ready-status-pill'>✓ ${p.qs.length} Soal Siap Dimainkan</span>
            </div>
            <h3 class='ai-ready-name'>${esc(p.name)}</h3>
          </div>
          <div class='ai-ready-actions'>
            <button type='button' class='btn w btn-sm' onclick='aiDel()' title='Hapus paket ini'>Hapus Paket</button>
            <button type='button' class='btn big btn-next-step' onclick='S.step=2;render()'>
              Lanjut ke Langkah 2 ➔
            </button>
          </div>
        </div>

        <details class='ai-ready-details'>
          <summary>
            <span class='summary-title'>
              <span class='summary-chevron'>▶</span>
              Lihat ${p.qs.length} Butir Soal &amp; Kunci Jawaban
            </span>
            <span class='summary-hint'>Klik untuk pratinjau</span>
          </summary>
          <div class='ai-ready-qlist'>
            ${p.qs.map((q, idx) => `
              <div class='ai-qitem'>
                <div class='ai-qitem-num'>${idx + 1}</div>
                <div class='ai-qitem-body'>
                  <div class='ai-qitem-text'>${esc(q[0])}</div>
                  <div class='ai-qitem-meta'>
                    <span class='ai-qitem-key'>Kunci: <b>${'ABCD'[q[2]]}. ${esc(q[1][q[2]])}</b></span>
                    ${q[3] ? `<span class='ai-qitem-expl'>💡 ${esc(q[3])}</span>` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </details>
      </div>` : ''}
      ${mine ? `
      <div class='ai-saved-section'>
        <div class='ai-saved-header'>
          <div class='ai-saved-title'>Riwayat Paket Soal Tersimpan (${BANK.length})</div>
          <small class='ai-saved-hint'>Pilih salah satu paket untuk dimainkan kembali</small>
        </div>
        <div class='ai-saved-list'>${mine}</div>
      </div>` : ''}
    </div>`;
}

/* ==========================================================================
   Gameplay Logic (Pilihan Ganda, Fill in the Blanks, Drag & Drop)
   ========================================================================== */
let tm = null;

function updatePanel(t) {
  if (S.view === 'game' && !S.over) {
    const el = $('#side-col-' + t);
    if (el) {
      el.outerHTML = panel(t);
      return;
    }
  }
  render();
}

function start() {
  if (!hasPkg() || !Q().length) {
    goStep(1);
    return;
  }
  Object.assign(S, {
    i: 0,
    sc: [0, 0],
    hist: [],
    win: null,
    stk: [0, 0],
    tTime: [0, 0],
    okCnt: [0, 0],
    fastCnt: [0, 0],
    winByTime: false
  });
  cur = [0, 0];
  S.n1 = S.n1.trim() || 'Tim Biru';
  S.n2 = S.n2.trim() || 'Tim Merah';
  newRound();
  go('game');
  playStart();
  if (typeof startBgm === 'function') startBgm();
}

function newRound() {
  S.pick = [null, null];
  S.lock = [null, null];
  S.st = [1, 1];
  S.blankIn = [[], []];
  S.blankCur = [0, 0];
  S.blankStr = ['', ''];
  S.over = false;
  S.left = S.time;
  S.roundStart = performance.now();
  clearInterval(tm);
  tm = setInterval(() => {
    S.left--;
    if (S.left <= 5 && S.left > 0) playTick(S.left);
    const t = $('#tm');
    if (t) {
      t.textContent = S.left;
      t.classList.toggle('low', S.left <= 5);
    }
    if (S.left <= 0) endRound();
  }, 1000);
}

function pickOpt(t, o) {
  if (S.over || S.lock[t] !== null || (S.mode === 'turn' && t !== S.i % 2)) return;
  S.pick[t] = o;
  playSelect();
  updatePanel(t);
}

function clearDrop(t) {
  if (S.over || S.lock[t] !== null) return;
  S.pick[t] = null;
  playSelect();
  updatePanel(t);
}

function syncBlankPick(t, B) {
  const total = B.blankIndices.length;
  const arr = S.blankIn[t];
  let allFilled = arr.length === total && arr.every(v => v !== null && v !== undefined && v !== '');
  if (allFilled) {
    let bPos = 0;
    const built = B.chars.map((c, idx) => B.mask[idx] ? arr[bPos++] : c).join('');
    S.blankStr[t] = built;
    S.pick[t] = built === B.upper ? Q()[S.i][2] : -1;
  } else {
    S.blankStr[t] = '';
    S.pick[t] = null;
  }
}

function tapBlankKey(t, kIdx) {
  if (S.over || S.lock[t] !== null || (S.mode === 'turn' && t !== S.i % 2)) return;
  const q = Q()[S.i];
  const B = getBlankData(q, S.i);
  const total = B.blankIndices.length;
  if (!total) return;

  if (S.blankIn[t].length !== total) {
    S.blankIn[t] = Array(total).fill(null);
  }

  let cIdx = S.blankCur[t];
  if (cIdx < 0 || cIdx >= total) cIdx = 0;

  S.blankIn[t][cIdx] = B.keys[kIdx];

  // Move cursor to next empty slot, or next slot
  let nextEmpty = S.blankIn[t].findIndex((v, idx) => idx > cIdx && !v);
  if (nextEmpty < 0) nextEmpty = S.blankIn[t].findIndex(v => !v);
  S.blankCur[t] = nextEmpty >= 0 ? nextEmpty : Math.min(total - 1, cIdx + 1);

  syncBlankPick(t, B);
  playSelect();
  updatePanel(t);
}

function tapBlankSlot(t, sIdx) {
  if (S.over || S.lock[t] !== null || (S.mode === 'turn' && t !== S.i % 2)) return;
  const q = Q()[S.i];
  const B = getBlankData(q, S.i);
  const total = B.blankIndices.length;
  if (S.blankIn[t].length !== total) {
    S.blankIn[t] = Array(total).fill(null);
  }
  if (S.blankIn[t][sIdx]) {
    S.blankIn[t][sIdx] = null;
  }
  S.blankCur[t] = sIdx;
  syncBlankPick(t, B);
  playSelect();
  updatePanel(t);
}

function backBlank(t) {
  if (S.over || S.lock[t] !== null || (S.mode === 'turn' && t !== S.i % 2)) return;
  const q = Q()[S.i];
  const B = getBlankData(q, S.i);
  const total = B.blankIndices.length;
  if (S.blankIn[t].length !== total) {
    S.blankIn[t] = Array(total).fill(null);
  }
  let cIdx = S.blankCur[t];
  if (S.blankIn[t][cIdx]) {
    S.blankIn[t][cIdx] = null;
  } else if (cIdx > 0) {
    cIdx--;
    S.blankIn[t][cIdx] = null;
    S.blankCur[t] = cIdx;
  }
  syncBlankPick(t, B);
  playSelect();
  updatePanel(t);
}

function clearBlank(t) {
  if (S.over || S.lock[t] !== null || (S.mode === 'turn' && t !== S.i % 2)) return;
  const q = Q()[S.i];
  const B = getBlankData(q, S.i);
  S.blankIn[t] = Array(B.blankIndices.length).fill(null);
  S.blankCur[t] = 0;
  syncBlankPick(t, B);
  playSelect();
  updatePanel(t);
}

function setStake(t, v) {
  if (S.over || S.lock[t] !== null) return;
  S.st[t] = v;
  updatePanel(t);
}

function lockIt(t) {
  if (S.over || S.pick[t] === null || S.lock[t] !== null || (S.mode === 'turn' && t !== S.i % 2)) return;
  const elapsed = (performance.now() - (S.roundStart || performance.now())) / 1000;
  S.lock[t] = Math.max(0.1, Math.min(S.time, +elapsed.toFixed(2)));
  playLock();
  const right = S.pick[t] === Q()[S.i][2];
  const m = S.mode;
  if ((m === 'buzz' && right) || m === 'turn' || (S.lock[0] !== null && S.lock[1] !== null)) {
    endRound();
  } else {
    updatePanel(t);
  }
}

function endRound() {
  if (S.over) return;
  clearInterval(tm);
  S.over = true;
  const q = Q()[S.i];
  const m = S.mode;
  const qt = curQType();
  const ok = [0, 1].map(t => S.lock[t] !== null && S.pick[t] === q[2]);
  const d = [0, 0];

  let w = -1;
  if (ok[0] && ok[1]) {
    if (S.lock[0] < S.lock[1]) w = 0;
    else if (S.lock[1] < S.lock[0]) w = 1;
    else w = -2; // exact millisecond tie
  } else if (ok[0]) {
    w = 0;
  } else if (ok[1]) {
    w = 1;
  }

  if (w === 0 || w === 1) {
    S.fastCnt[w] = (S.fastCnt[w] || 0) + 1;
  }

  [0, 1].forEach(t => {
    if (ok[t]) {
      S.okCnt[t] = (S.okCnt[t] || 0) + 1;
      S.tTime[t] = +((S.tTime[t] || 0) + (S.lock[t] || 0)).toFixed(2);
    }
    if (m === 'race') {
      // In Balapan 2 Tim: fastest correct gets +2 (1 right + 1 speed bonus), second correct gets +1
      if (ok[t]) {
        d[t] = (w === t || w === -2) ? 2 : 1;
      }
    } else if (m === 'buzz') {
      if (ok[t] && (w === t || w === -2)) d[t] = 1;
    } else if (m === 'streak') {
      const sk = Math.min(3, (S.stk[t] || 0) + 1);
      S.stk[t] = ok[t] ? (S.stk[t] || 0) + 1 : 0;
      if (ok[t]) d[t] = sk;
    } else if (m === 'bet') {
      const sk = S.st[t];
      if (ok[t]) d[t] = sk;
      else if (S.lock[t] !== null) d[t] = -sk;
    } else {
      if (ok[t]) d[t] = 1;
    }
    S.sc[t] = Math.max(0, S.sc[t] + d[t]);
  });

  S.hist.push({
    i: S.i,
    qt,
    pick: [...S.pick],
    blankStr: [...S.blankStr],
    lock: [...S.lock],
    ok,
    d,
    w
  });
  S.rw = w;
  S.dd = d;

  if (m === 'streak' && Math.max(S.stk[0], S.stk[1]) >= 2) {
    playStreak(Math.max(S.stk[0], S.stk[1]));
  } else {
    (ok[0] || ok[1]) ? playCorrectSound() : playIncorrectSound();
  }
  render();
}

function nextQ() {
  if (!S.over) return;
  playNext();
  if (S.i + 1 >= Q().length) {
    finish();
    return;
  }
  S.i++;
  newRound();
  render();
}

function finish() {
  const [a, b] = S.sc;
  S.winByTime = false;
  if (a > b) {
    S.win = 0;
  } else if (b > a) {
    S.win = 1;
  } else if (S.okCnt[0] !== S.okCnt[1]) {
    S.win = S.okCnt[0] > S.okCnt[1] ? 0 : 1;
  } else if (S.okCnt[0] > 0 && S.tTime[0] !== S.tTime[1]) {
    // Fair tie-breaker: cumulative response time across ALL correct answers from Question 1 to end
    S.win = S.tTime[0] < S.tTime[1] ? 0 : 1;
    S.winByTime = true;
  } else {
    S.win = -1;
  }
  if (typeof stopBgm === 'function') stopBgm();
  S.view = 'done';
  render();
  S.win < 0 ? playLoseSound() : playWinSound();

  // Trigger celebration confetti
  for (let k = 0; k < 60; k++) {
    const c = document.createElement('i');
    c.className = 'cf';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = ['#FFD23F', '#3B82F6', '#EF4444', '#00E36B'][k % 4];
    c.style.animationDuration = 2 + Math.random() * 2.5 + 's';
    c.style.animationDelay = Math.random() * 1.2 + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 6500);
  }
}

function exitGame() {
  if (S.xc) {
    S.xc = 0;
    clearInterval(tm);
    go('setup');
  } else {
    S.xc = 1;
    render();
    setTimeout(() => {
      S.xc = 0;
      if (S.view === 'game') render();
    }, 3000);
  }
}

function renderBlankBody(t, q, dis) {
  const B = getBlankData(q, S.i);
  const total = B.blankIndices.length;
  const arr = S.blankIn[t].length === total ? S.blankIn[t] : Array(total).fill(null);
  const curIdx = S.blankCur[t];
  const isRight = S.pick[t] === q[2];

  // Group characters by word so multi-word answers wrap cleanly
  let bPos = 0;
  let wordsHtml = `<span class='bw-word'>`;
  B.chars.forEach((ch, idx) => {
    if (ch === ' ') {
      wordsHtml += `</span><span class='bw-word'>`;
      return;
    }
    if (!B.mask[idx]) {
      wordsHtml += `<span class='b-char'>${esc(ch)}</span>`;
    } else {
      const sIdx = bPos++;
      const val = arr[sIdx];
      let cls = val ? 'filled' : '';
      if (!dis && sIdx === curIdx) cls += ' cur';
      if (S.over) {
        cls = (val === ch && S.lock[t] !== null) ? 'ok' : 'no';
      }
      const disp = S.over && !val ? ch : (val || '_');
      wordsHtml += `<button type='button' class='b-slot ${cls}' ${dis ? 'disabled' : ''} onclick='tapBlankSlot(${t},${sIdx})'>${esc(disp)}</button>`;
    }
  });
  wordsHtml += `</span>`;

  return `<div class='blank-stage'>
      ${wordsHtml}
      ${S.over && !isRight ? `<div style='width:100%;text-align:center;font-size:0.85rem;font-weight:800;margin-top:4px'>Jawaban tepat: <span style='background:var(--g);padding:2px 6px;border:1.5px solid #000'>${esc(B.ans)}</span></div>` : ''}
    </div>
    <div class='blank-pad'>
      ${B.keys.map((kc, ki) => `<button type='button' class='b-key' ${dis ? 'disabled' : ''} onclick='tapBlankKey(${t},${ki})'>${esc(kc)}</button>`).join('')}
      <button type='button' class='b-key act' ${dis ? 'disabled' : ''} onclick='backBlank(${t})'>⌫ Hapus</button>
      <button type='button' class='b-key act' ${dis ? 'disabled' : ''} onclick='clearBlank(${t})'>🔄 Reset</button>
    </div>`;
}

function renderDragBody(t, q, dis) {
  const p = S.pick[t];
  const hasPick = p !== null && p >= 0 && p < 4;
  let dzCls = '';
  let dzInner = `<div class='dz-hint'>🖐️ Seret &amp; lepas kartu jawaban ke sini</div>`;

  if (hasPick) {
    dzCls = 'filled';
    if (S.over) {
      dzCls = p === q[2] ? 'ok' : 'no';
    }
    dzInner = `<div class='dz-val'><span class='grip' style='display:inline-grid;place-items:center;width:24px;height:24px;background:#fff;border:2px solid #000;font-size:0.8rem'>⠿</span><span>${q[1][p]}</span></div>` +
      (!dis ? `<button type='button' class='dz-clear' onclick='event.stopPropagation();clearDrop(${t})'>× Ganti</button>` : '');
  } else if (S.over) {
    dzCls = 'no';
    dzInner = `<div class='dz-val'>Belum ada kartu jawaban</div>`;
  }

  return `<div class='drop-zone ${dzCls}' id='dropZone-${t}' data-team='${t}' ${hasPick && !dis ? `data-drag-from-zone='1' data-opt='${p}'` : ''}>
      ${dzInner}
    </div>
    <div class='drag-deck'>
      ${q[1].map((o, k) => {
        let cl = p === k ? 'in-slot' : '';
        if (S.over) {
          if (k === q[2]) cl = 'ok';
          else if (p === k) cl = 'no';
        }
        return `<button type='button' class='drag-card ${cl}' data-team='${t}' data-opt='${k}' ${dis ? 'disabled' : ''}>
          <span class='grip'>⠿</span>
          <span>${o}</span>
        </button>`;
      }).join('')}
    </div>`;
}

function scoreBox(t) {
  const c = t ? 'r' : 'b';
  const nm = t ? S.n2 : S.n1;
  const tn = S.mode === 'turn';
  const off = tn && t !== S.i % 2;
  return `
    <div class='team-score-card ${c}' id='score-card-${t}'>
      <div class='sc-val-box ${c}'>${S.sc[t]}</div>
      <div class='sc-meta-box'>
        <div class='sc-team-title'>${nm}</div>
        <div class='sc-tags-row'>
          ${S.mode === 'streak' && S.stk[t] > 0 ? `<span class='tag mini' style='background:var(--y)'>${ic('flame', 13)} ${S.stk[t]} beruntun</span>` : ''}
          ${tn ? (off ? `<span class='tag mini'>Giliran lawan</span>` : `<span class='tag mini' style='background:var(--y)'>Giliranmu!</span>`) : ''}
          <span class='sc-pts-label'>Poin Lomba</span>
        </div>
      </div>
    </div>`;
}

function panel(t) {
  const q = Q()[S.i];
  const qt = curQType();
  const c = t ? 'r' : 'b';
  const nm = t ? S.n2 : S.n1;
  const lk = S.lock[t] !== null;
  const tn = S.mode === 'turn';
  const off = tn && t !== S.i % 2;
  const dis = S.over || lk || off;

  const qtBadge = qt === 'blank' ? '✏️ Fill in the Blanks'
    : qt === 'drag' ? '🖐️ Drag & Drop'
    : '📝 Pilihan Ganda';

  let interactionHtml = '';
  if (qt === 'mcq') {
    interactionHtml = q[1].map((o, k) => {
      let cl = S.pick[t] === k ? 'sel' : '';
      if (S.over) {
        if (k === q[2]) cl = 'ok';
        else if (S.pick[t] === k) cl = 'no';
      }
      return `<button class='opt ${cl}' ${dis ? 'disabled' : ''} onclick='pickOpt(${t},${k})'><b>${'ABCD'[k]}</b>${o}</button>`;
    }).join('');
  } else if (qt === 'blank') {
    interactionHtml = renderBlankBody(t, q, dis);
  } else {
    interactionHtml = renderDragBody(t, q, dis);
  }

  const hintText = qt === 'blank'
    ? 'Sentuh huruf untuk mengisi kotak kosong, lalu Kunci Jawaban'
    : qt === 'drag'
    ? 'Seret kartu ke kotak target (atau ketuk kartu), lalu Kunci Jawaban'
    : `Tombol Cepat: ${t ? '7 8 9 0 + Enter' : '1 2 3 4 + Q'}`;

  return `
  <div class='team-side-col' id='side-col-${t}'>
    ${scoreBox(t)}
    <section class='pan ${c}' id='pan-${t}' style='${off ? 'opacity:.45' : ''}'>
      <div class='pan-header'>
        <span class='pan-q-label'>Pertanyaan Soal</span>
        <span class='tag mini' style='background:#FEF08A'>${qtBadge}</span>
      </div>
      <div class='q'>${formatStem(q[0], qt)}</div>
      <div class='pan-body'>
        ${interactionHtml}
      </div>
      <div class='pan-footer'>
        ${S.mode === 'bet' ? `
          <div style='display:flex;gap:6px;align-items:center;margin-bottom:8px'>
            <b style='font-size:0.8rem'>TARUHAN</b>
            ${[1, 2, 3].map(v => `<button class='pill ${S.st[t] === v ? 'on' : ''}' style='margin:0' ${S.over || lk ? 'disabled' : ''} onclick='setStake(${t},${v})'>×${v}</button>`).join('')}
          </div>
        ` : ''}
        <button class='btn ${lk ? 'k' : ''}' style='width:100%' ${dis || S.pick[t] === null ? 'disabled' : ''} onclick='lockIt(${t})'>
          ${lk ? `${ic('lock', 16)} Terkunci (${S.lock[t].toFixed(1)} dtk)` : 'Kunci Jawaban'}
        </button>
        <div style='font-size:0.75rem;margin-top:6px'>${hintText}</div>
      </div>
    </section>
  </div>`;
}

function game() {
  const q = Q()[S.i];
  const n = Q().length;
  const qt = curQType();
  const qtMeta = qtypeObj(qt);
  const w = S.rw;
  const m = S.mode;
  const d = S.dd || [0, 0];
  const sg = v => (v > 0 ? '+' : '') + v;

  let roundHeaderHtml = '';
  if (w === 0) {
    roundHeaderHtml = `
      <div class='round-winner-banner win-blue'>
        <span class='winner-icon'>⚡</span>
        <span class='winner-text'><b>${esc(S.n1)}</b> ${m === 'buzz' ? 'paling cepat mengunci jawaban!' : 'tercepat &amp; unggul di ronde ini!'}</span>
      </div>`;
  } else if (w === 1) {
    roundHeaderHtml = `
      <div class='round-winner-banner win-red'>
        <span class='winner-icon'>⚡</span>
        <span class='winner-text'><b>${esc(S.n2)}</b> ${m === 'buzz' ? 'paling cepat mengunci jawaban!' : 'tercepat &amp; unggul di ronde ini!'}</span>
      </div>`;
  } else if (w === -2) {
    roundHeaderHtml = `
      <div class='round-winner-banner win-tie'>
        <span class='winner-icon'>🤝</span>
        <span class='winner-text'>Kedua tim menjawab benar bersamaan!</span>
      </div>`;
  } else {
    roundHeaderHtml = `
      <div class='round-winner-banner win-none'>
        <span class='winner-icon'>⏱️</span>
        <span class='winner-text'>${m === 'bet' && (d[0] || d[1]) ? 'Poin ronde ini diperbarui!' : 'Ronde ini selesai tanpa pemenang.'}</span>
      </div>`;
  }

  const teamCard = (t) => {
    const isWin = w === t;
    const isBlue = t === 0;
    const nm = isBlue ? S.n1 : S.n2;
    const tmVal = S.lock[t];
    const tmStr = tmVal !== null ? `${tmVal.toFixed(1)} dtk` : '—';
    const pts = d[t];
    const ptCls = pts > 0 ? 'pos' : pts < 0 ? 'neg' : 'zero';
    return `
      <div class='round-team-item ${isBlue ? 'blue' : 'red'} ${isWin ? 'won' : ''}'>
        <div class='team-item-head'>
          <span class='team-dot'></span>
          <span class='team-name'>${esc(nm)}</span>
          ${isWin ? `<span class='team-fast-tag'>⚡ Unggul</span>` : ''}
        </div>
        <div class='team-item-stats'>
          <span class='team-pts ${ptCls}'>${sg(pts)} poin</span>
          <span class='team-time'>⏱️ ${tmStr}</span>
        </div>
      </div>
    `;
  };

  const ban = S.over ? `
    <div class='round-result-card' role='region' aria-label='Hasil Ronde'>
      ${roundHeaderHtml}

      <div class='round-teams-row'>
        ${teamCard(0)}
        ${teamCard(1)}
      </div>

      <div class='round-answer-box'>
        <div class='key-header'>
          <span class='key-pill'>KUNCI JAWABAN</span>
          <span class='key-text'><b>${'ABCD'[q[2]]}.</b> ${esc(q[1][q[2]])}</span>
        </div>
        ${q[3] ? `
          <div class='round-expl'>
            <div class='expl-label'>💡 Pembahasan:</div>
            <div class='expl-body'>${esc(q[3])}</div>
          </div>
        ` : ''}
      </div>

      <button type='button' class='round-next-btn' onclick='nextQ()' autofocus>
        <span>${S.i + 1 >= n ? 'Lihat Peringkat &amp; Hasil Akhir' : 'Lanjut ke Soal Berikutnya'}</span>
        <span class='key-shortcut'>Spasi ␣</span>
      </button>
    </div>
  ` : '';

  return `<div class='arena'>
    <div class='top'>
      <div class='top-left-info'>
        <span class='tag' style='background:var(--y)'>Soal ${S.i + 1} dari ${n}</span>
        <span class='tag'>${mode()[1]} ${mode()[2]}</span>
      </div>
      <div class='timer d ${S.left <= 5 ? 'low' : ''}' id='tm'>${S.left}</div>
      <div style='text-align:right;display:flex;gap:8px;align-items:center;justify-content:flex-end'>
        <button class='btn w' onclick='toggleBgm()' aria-label='Musik Latar' title='Musik Latar (Backsound)'>${S.bgmOff || S.mute ? '🔇 Musik' : '🎵 Musik'}</button>
        <button class='btn w' onclick='toggleMute()' aria-label='Suara' title='Efek Suara &amp; Musik'>${ic(S.mute ? 'mute' : 'sound', 18)}</button>
        ${fullBtnHtml(true)}
        <button class='btn w' onclick='exitGame()'>${S.xc ? 'Yakin keluar?' : 'Keluar'}</button>
      </div>
    </div>
    <div class='cols'>
      ${panel(0)}
      <section class='arena-mid ${S.over ? 'is-over' : ''}'>
        <div class='stage'><div id='gsc'>${scene(S.theme, cur[0], cur[1], 0)}</div></div>
        ${ban}
      </section>
      ${panel(1)}
    </div>
    <div class='prog'>
      <i style='width:${((S.i + (S.over ? 1 : 0)) / n) * 100}%'></i>
      <span>Soal ${S.i + 1} dari ${n} · ${qtMeta[2]}</span>
    </div>
  </div>`;
}

function done() {
  const w = S.win;
  const t = w < 0 ? 'Hasil Seri!' : (w ? S.n2 : S.n1) + ' Juara! 🏆';
  const tieNote = S.winByTime
    ? `<div style="margin:6px 0"><span class="tag" style="background:var(--y)">⚡ Menang Akumulasi Waktu Tercepat (Soal 1 s/d Akhir)</span></div>`
    : '';
  return game() + `
    <div class="modal">
      <div class="card">
        <div style="margin-bottom:6px">${ic('trophy', 84)}</div>
        <h2>${t}</h2>
        ${tieNote}
        <p class="d" style="font-size:1.6rem;margin:10px 0">${S.n1} ${S.sc[0]} : ${S.sc[1]} ${S.n2}</p>
        <div style="font-size:0.88rem;background:#FAF6EE;border:2px solid #000;padding:8px 10px;margin-bottom:14px;text-align:left">
          <div><b>📊 Statistik Keseluruhan (Soal 1 – ${Q().length}):</b></div>
          <div>• <b>${esc(S.n1)}:</b> ${S.okCnt[0]} benar · ${S.fastCnt[0]}× tercepat · Total waktu benar: <b>${S.tTime[0].toFixed(1)} dtk</b></div>
          <div>• <b>${esc(S.n2)}:</b> ${S.okCnt[1]} benar · ${S.fastCnt[1]}× tercepat · Total waktu benar: <b>${S.tTime[1].toFixed(1)} dtk</b></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn k" onclick="go('review')">Lihat Pembahasan</button>
          <button class="btn w" onclick="go('setup')">Main Lagi</button>
        </div>
      </div>
    </div>`;
}

function review() {
  return head('<button class="btn w" onclick="go(\'setup\')">Atur Lomba Baru</button>') +
    `<div class="wrap">
      <h2 style="margin-bottom:14px">Pembahasan Lengkap</h2>
      ${S.hist.map(h => {
        const q = Q()[h.i];
        const qtLabel = h.qt === 'blank' ? '✏️ Fill in the Blanks'
          : h.qt === 'drag' ? '🖐️ Drag & Drop'
          : '📝 Pilihan Ganda';
        return `<div class="card rv">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
            <b>#${h.i + 1}. ${q[0]}</b>
            <span class="tag">${qtLabel}</span>
          </div>
          <div style='margin:6px 0'>
            ${q[1].map((o, k) => `
              <span class="tg" style="background:${k === q[2] ? 'var(--g)' : '#fff'}">
                ${'ABCD'[k]}. ${o}${k === q[2] ? ' ✓' : ''}
              </span>
            `).join('')}
          </div>
          ${[0, 1].map(t => {
            let ansDesc = 'tidak menjawab';
            if (h.pick[t] !== null && h.lock[t] !== null) {
              if (h.qt === 'blank') {
                ansDesc = (h.blankStr && h.blankStr[t] ? h.blankStr[t] : q[1][q[2]]) + (h.ok[t] ? ' (Benar)' : ' (Salah)');
              } else if (h.pick[t] >= 0 && h.pick[t] < 4) {
                ansDesc = `${'ABCD'[h.pick[t]]}. ${q[1][h.pick[t]]}` + (h.ok[t] ? ' (Benar)' : ' (Salah)');
              }
            }
            return `<span class="tg" style="background:${h.ok[t] ? 'var(--g)' : '#FCA5A5'}">
              ${t ? S.n2 : S.n1}: ${esc(ansDesc)}
            </span>`;
          }).join('')}
          ${q[3] ? `<div class="review-expl-box"><b>💡 Pembahasan:</b> ${esc(q[3])}</div>` : ''}
        </div>`;
      }).join('')}
      <button class="btn big" onclick="go(\'setup\')">Kembali ke Pengaturan</button>
    </div>`;
}

/* ==========================================================================
   Multi-Touch Pointer Drag-and-Drop Engine (IFP Ready)
   ========================================================================== */
const activeDrags = new Map();

function isNearDropZone(clientX, clientY, team) {
  const dz = $('#dropZone-' + team);
  if (!dz) return false;
  const r = dz.getBoundingClientRect();
  const pad = 28;
  return clientX >= r.left - pad && clientX <= r.right + pad &&
         clientY >= r.top - pad && clientY <= r.bottom + pad;
}

document.addEventListener('pointerdown', e => {
  if (S.view !== 'game' || S.over) return;
  const card = e.target.closest('.drag-card, .drop-zone[data-drag-from-zone="1"]');
  if (!card || card.disabled) return;

  const t = +card.dataset.team;
  const opt = +card.dataset.opt;
  if (Number.isNaN(t) || Number.isNaN(opt) || S.lock[t] !== null) return;

  e.preventDefault();
  try {
    card.setPointerCapture(e.pointerId);
  } catch (err) {}

  activeDrags.set(e.pointerId, {
    t,
    opt,
    fromZone: card.classList.contains('drop-zone'),
    startX: e.clientX,
    startY: e.clientY,
    moved: false,
    ghost: null
  });
});

document.addEventListener('pointermove', e => {
  const d = activeDrags.get(e.pointerId);
  if (!d) return;

  const dx = e.clientX - d.startX;
  const dy = e.clientY - d.startY;
  if (!d.moved && Math.hypot(dx, dy) > 7) {
    d.moved = true;
    const q = Q()[S.i];
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.style.borderTop = `8px solid ${d.t ? C2 : C1}`;
    ghost.innerHTML = `<span class='grip' style='display:inline-grid;place-items:center;width:24px;height:24px;background:#fff;border:2px solid #000'>⠿</span><span>${q[1][d.opt]}</span>`;
    document.body.appendChild(ghost);
    d.ghost = ghost;
  }

  if (d.ghost) {
    d.ghost.style.left = e.clientX + 'px';
    d.ghost.style.top = e.clientY + 'px';
    const dz = $('#dropZone-' + d.t);
    if (dz) {
      dz.classList.toggle('drop-over', isNearDropZone(e.clientX, e.clientY, d.t));
    }
  }
});

function endPointerDrag(e) {
  const d = activeDrags.get(e.pointerId);
  if (!d) return;
  activeDrags.delete(e.pointerId);

  if (d.ghost) d.ghost.remove();
  const dz = $('#dropZone-' + d.t);
  if (dz) dz.classList.remove('drop-over');

  if (e.type === 'pointercancel' || S.over || S.lock[d.t] !== null) return;

  if (!d.moved) {
    // Quick tap on card or zone
    if (!d.fromZone) {
      pickOpt(d.t, d.opt);
    }
  } else {
    // Drag completed
    if (isNearDropZone(e.clientX, e.clientY, d.t)) {
      pickOpt(d.t, d.opt);
    } else if (d.fromZone) {
      clearDrop(d.t);
    }
  }
}

document.addEventListener('pointerup', endPointerDrag);
document.addEventListener('pointercancel', endPointerDrag);

/* ==========================================================================
   Render & Global Key Handlers
   ========================================================================== */
function render() {
  // Clean up any leftover drag ghosts on full render
  activeDrags.forEach(d => { if (d.ghost) d.ghost.remove(); });
  activeDrags.clear();

  const v = S.view;
  const app = $('#app');
  if (!app) return;

  app.innerHTML = v === 'landing' ? landing()
    : v === 'setup' ? setup()
    : v === 'game' ? game()
    : v === 'done' ? done()
    : review();

  clearInterval(heroTimer);
  if ((v === 'game' || v === 'done') && !gl) {
    gl = requestAnimationFrame(gloop);
  }
  if (v === 'landing' && !matchMedia('(prefers-reduced-motion:reduce)').matches) {
    heroTick();
    heroTimer = setInterval(heroTick, 80);
  }
}

// Keyboard shortcuts for classrooms
document.addEventListener('keydown', e => {
  if (S.view !== 'game' || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  const k = e.key;

  if (S.over && (k === ' ' || k === 'Enter')) {
    e.preventDefault();
    nextQ();
    return;
  }

  const m1 = '1234';
  const m2 = '7890';

  if (m1.includes(k)) {
    pickOpt(0, +k - 1);
  } else if (m2.includes(k)) {
    pickOpt(1, m2.indexOf(k));
  } else if (k === 'q' || k === 'Q') {
    lockIt(0);
  } else if (k === 'Enter') {
    e.preventDefault();
    lockIt(1);
  }
});

// Initial boot
render();

