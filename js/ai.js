/**
 * QuizRace – AI Question Generator (sisi browser)
 * Pembuatan soal dilakukan di server (/api/generate) sehingga API key tidak pernah ada di browser.
 * Server memakai Google AI Studio dan Groq Cloud secara bergantian (failover otomatis).
 */

const DIFF = [
  ['mudah', 'Mudah'],
  ['sedang', 'Sedang'],
  ['sulit', 'Sulit']
];
const N_CHOICES = [
  [5, '5 Soal'],
  [10, '10 Soal']
];
const MAX_SAVED_PACKS = 12;

// Pilihan mata pelajaran menurut jenjang sekolah (SD, SMP, SMA/SMK)
const MAPEL_BY_JENJANG = {
  sd: ['Matematika', 'Bahasa Indonesia', 'IPAS', 'PPKn', 'Bahasa Inggris', 'Pendidikan Agama'],
  smp: ['Matematika', 'IPA', 'IPS', 'Bahasa Indonesia', 'Bahasa Inggris', 'Informatika', 'PPKn', 'Pendidikan Agama'],
  sma: ['Matematika', 'Fisika', 'Kimia', 'Biologi', 'Ekonomi', 'Sejarah', 'Geografi', 'Sosiologi', 'Bahasa Indonesia', 'Bahasa Inggris', 'Informatika']
};

const PLACEHOLDER_BY_JENJANG = {
  sd: 'Ketik topik soal di sini… (contoh: Pecahan senilai, Siklus air)',
  smp: 'Ketik topik soal di sini… (contoh: Sistem pencernaan manusia, Teorema Pythagoras)',
  sma: 'Ketik topik soal di sini… (contoh: Hukum Newton, Ikatan kimia)'
};

// String sanitizers for secure HTML injection
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
const san = s => String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

const jenjangObj = (id = S.ai.jenjang) => JENJANG.find(j => j[0] === id) || JENJANG[1];
const mapelList = (id = S.ai.jenjang) => MAPEL_BY_JENJANG[id] || [];

function initAIState(state) {
  state.ai = {
    topic: '',
    jenjang: 'smp',
    cls: 8,
    mapel: '',
    n: 10,
    diff: 'sedang',
    src: '',
    busy: false,
    msg: '',
    ok: false
  };
}

function saveAI() {
  try {
    localStorage.setItem('edurace_ai', JSON.stringify(BANK));
  } catch (e) {
    console.warn('Gagal menyimpan paket ke localStorage:', e);
  }
}

function setJenjang(id) {
  const j = jenjangObj(id);
  S.ai.jenjang = j[0];
  S.ai.cls = j[3].length ? j[3][Math.min(1, j[3].length - 1)] : 8;
  S.ai.mapel = '';
  render();
}

function aiDel() {
  const k = BANK.findIndex(b => b.id === S.pkg);
  if (k >= 0) BANK.splice(k, 1);
  S.pkg = null;
  saveAI();
  render();
}

/**
 * Minta server membuat soal (Gemini → Groq, atau sebaliknya sebagai cadangan)
 */
async function aiGen() {
  const a = S.ai;
  if (a.busy) return;

  if (!a.topic.trim()) {
    a.msg = 'Ketik topik soal terlebih dahulu di kotak di atas.';
    a.ok = false;
    render();
    const el = document.getElementById('at');
    if (el) el.focus();
    return;
  }

  a.busy = true;
  a.msg = '';
  a.ok = false;
  render();

  try {
    const j = jenjangObj();
    const resp = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: a.topic.trim(),
        jenjang: j[0],
        kelas: j[3].length ? String(a.cls) : '',
        mapel: a.mapel.trim(),
        n: a.n,
        diff: a.diff,
        src: ''
      })
    });

    let data = null;
    try {
      data = await resp.json();
    } catch (e) {
      throw new Error(resp.status === 404
        ? 'Layanan pembuat soal belum aktif. Buka lewat alamat website (bukan membuka file langsung).'
        : 'Layanan sedang bermasalah. Coba lagi sebentar.');
    }
    if (!resp.ok) {
      const extra = data && Array.isArray(data.detail) && data.detail.length ? ` (${data.detail.join(' | ')})` : '';
      throw new Error((data && data.error ? data.error : 'Layanan sedang bermasalah. Coba lagi sebentar.') + extra);
    }

    const qs = (data.questions || [])
      .filter(x => x && x.pertanyaan && Array.isArray(x.pilihan) && x.pilihan.length === 4 && Number.isInteger(x.jawaban) && x.jawaban >= 0 && x.jawaban < 4)
      .map(x => shuffleQuestion([san(x.pertanyaan), x.pilihan.map(san), x.jawaban, san(x.pembahasan || '')]));

    if (!qs.length) throw new Error('Soal yang dibuat kurang sesuai. Silakan coba lagi.');

    const meta = [j[2], j[3].length ? 'Kelas ' + a.cls : '', a.mapel.trim()].filter(Boolean).join(' · ');
    const id = 'ai' + Date.now();
    BANK.unshift({
      id,
      jenjang: j[0],
      kls: j[3].length ? a.cls : 0,
      mp: 'lain',
      meta: san(meta),
      name: san(a.topic.trim()),
      qs
    });
    while (BANK.length > MAX_SAVED_PACKS) BANK.pop();

    S.pkg = id;
    saveAI();
    a.ok = true;
    a.msg = `Berhasil membuat ${qs.length} soal "${a.topic.trim()}".`;
  } catch (err) {
    let detail = err.message || 'Terjadi kesalahan. Coba lagi.';
    if (/Failed to fetch|NetworkError/i.test(detail)) {
      detail = 'Tidak ada koneksi internet. Periksa jaringan lalu coba lagi.';
    }
    a.ok = false;
    a.msg = detail;
  }

  a.busy = false;
  render();
}

/**
 * Komposer pembuat soal AI (Langkah 1) – lega, bersih, tanpa teks berlebih
 */
function aiPanel2() {
  const a = S.ai;
  const j = jenjangObj();
  const list = mapelList();
  const ph = PLACEHOLDER_BY_JENJANG[j[0]] || PLACEHOLDER_BY_JENJANG.smp;

  const opt = (v, label, cur) => `<option value="${esc(String(v))}"${String(cur) === String(v) ? ' selected' : ''}>${label}</option>`;

  return `<div class='ai-shell'>
    <h2 class='ai-title d'>Mau buat soal tentang apa?</h2>

    <div class='ai-composer'>
      <textarea id='at' rows='3' maxlength='200' ${a.busy ? 'disabled' : ''}
        placeholder='${esc(ph)}'
        aria-label='Tulis topik soal'
        oninput='S.ai.topic=this.value'
        onkeydown='if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();aiGen()}'>${esc(a.topic)}</textarea>

      <div class='ai-toolbar'>
        <div class='ai-selects'>
          <select aria-label='Jenjang' onchange='setJenjang(this.value)'>
            ${JENJANG.map(x => opt(x[0], x[1], a.jenjang)).join('')}
          </select>
          <select aria-label='Kelas' onchange='S.ai.cls=+this.value'>
            ${j[3].map(k => opt(k, 'Kelas ' + k, a.cls)).join('')}
          </select>
          <select aria-label='Mata Pelajaran' onchange='S.ai.mapel=this.value'>
            ${opt('', 'Semua Mapel', a.mapel)}
            ${list.map(m => opt(m, m, a.mapel)).join('')}
          </select>
          <select aria-label='Jumlah Soal' onchange='S.ai.n=+this.value'>
            ${N_CHOICES.map(([v, label]) => opt(v, label, a.n)).join('')}
          </select>
          <select aria-label='Tingkat Kesulitan' onchange='S.ai.diff=this.value'>
            ${DIFF.map(([v, label]) => opt(v, label, a.diff)).join('')}
          </select>
        </div>

        <button type='button' class='ai-submit-btn' ${a.busy ? 'disabled' : ''} onclick='aiGen()'>
          ${a.busy ? 'Menyusun Soal…' : 'Buat Soal'}
        </button>
      </div>
    </div>

    ${a.busy ? `<div class='ai-status-note'>Sedang menyusun soal dengan AI, mohon tunggu sekitar 10–25 detik…</div>` : ''}
    ${a.msg ? `
      <div class='aimsg ${a.ok ? 'ok' : 'err'}' role='status'>
        <span class='aimsg-ic'>${a.ok ? '✓' : '⚠️'}</span>
        <span>${esc(a.msg)}</span>
      </div>` : ''}
  </div>`;
}
