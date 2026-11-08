/**
 * EduRace – AI Question Generator (sisi browser)
 * Pembuatan soal dilakukan di server (/api/generate) sehingga API key tidak pernah ada di browser.
 * Server memakai Google AI Studio dan Groq Cloud secara bergantian (failover otomatis).
 *
 * Desain UI/UX:
 * - Satu kartu komposer terpadu (tanpa tumpukan tombol).
 * - Bilah konteks minimalis di bagian atas kartu (Jenjang, Kelas, Mapel, Jumlah, Tingkat).
 * - Area ketik topik yang fokus dan ringkas di tengah.
 * - Bilah aksi di bawah dengan lampiran teks opsional & tombol utama "Buat Soal".
 */

const DIFF = ['mudah', 'sedang', 'sulit'];
const N_CHOICES = [[5, '5 Soal'], [10, '10 Soal']];
const MAX_SAVED_PACKS = 12;

// Pilihan mata pelajaran menurut jenjang sekolah (SD, SMP, SMA/SMK)
const MAPEL_BY_JENJANG = {
  sd: ['Matematika', 'Bahasa Indonesia', 'IPAS', 'PPKn', 'Bahasa Inggris', 'Pendidikan Agama'],
  smp: ['Matematika', 'IPA', 'IPS', 'Bahasa Indonesia', 'Bahasa Inggris', 'Informatika', 'PPKn', 'Pendidikan Agama'],
  sma: ['Matematika', 'Fisika', 'Kimia', 'Biologi', 'Ekonomi', 'Sejarah', 'Geografi', 'Sosiologi', 'Bahasa Indonesia', 'Bahasa Inggris', 'Informatika']
};

// Contoh topik singkat per jenjang
const CONTOH_TOPIK = {
  sd: ['Pecahan senilai', 'Siklus air', 'Pancasila & lambangnya'],
  smp: ['Sistem pencernaan manusia', 'Teorema Pythagoras', 'Teks prosedur'],
  sma: ['Hukum Newton', 'Ikatan kimia', 'Permintaan & penawaran']
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
    showSrc: false,
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

function toggleAiSrc() {
  S.ai.showSrc = !S.ai.showSrc;
  render();
  if (S.ai.showSrc) {
    const el = document.getElementById('as');
    if (el) el.focus();
  }
}

function pickContohTopik(t) {
  S.ai.topic = t;
  render();
  const el = document.getElementById('at');
  if (el) el.focus();
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
        src: a.src.trim().slice(0, 6000)
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
      throw new Error(data && data.error ? data.error : 'Layanan sedang bermasalah. Coba lagi sebentar.');
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
    a.msg = `Berhasil membuat ${qs.length} soal "${a.topic.trim()}". Silakan klik "Lanjut ke Langkah 2" di bawah.`;
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
 * Komposer pembuat soal AI (Langkah 1) – minimalis, padat, sesuai kaidah UI/UX
 */
function aiPanel2() {
  const a = S.ai;
  const j = jenjangObj();
  const list = mapelList();
  const contoh = CONTOH_TOPIK[j[0]] || CONTOH_TOPIK.smp;

  const opt = (v, label, cur) => `<option value="${esc(String(v))}"${String(cur) === String(v) ? ' selected' : ''}>${label}</option>`;

  return `<div class='ai-shell'>
    <div class='ai-header'>
      <h2 class='ai-title d'>Buat Soal Kuis dengan AI</h2>
      <p class='ai-subtitle'>Pilih tingkat kelas &amp; mata pelajaran, lalu ketik topik materi yang ingin diujikan.</p>
    </div>

    <div class='ai-composer'>
      <div class='ai-ctx-bar' aria-label='Pengaturan soal'>
        <div class='ai-field'>
          <label for='sel-jenjang'>Jenjang</label>
          <select id='sel-jenjang' onchange='setJenjang(this.value)'>
            ${JENJANG.map(x => opt(x[0], x[1], a.jenjang)).join('')}
          </select>
        </div>
        <span class='ai-sep' aria-hidden='true'></span>
        <div class='ai-field'>
          <label for='sel-kelas'>Kelas</label>
          <select id='sel-kelas' onchange='S.ai.cls=+this.value'>
            ${j[3].map(k => opt(k, 'Kelas ' + k, a.cls)).join('')}
          </select>
        </div>
        <span class='ai-sep' aria-hidden='true'></span>
        <div class='ai-field ai-field-grow'>
          <label for='sel-mapel'>Mata Pelajaran</label>
          <select id='sel-mapel' onchange='S.ai.mapel=this.value'>
            ${opt('', 'Semua / Otomatis', a.mapel)}
            ${list.map(m => opt(m, m, a.mapel)).join('')}
          </select>
        </div>
        <span class='ai-sep' aria-hidden='true'></span>
        <div class='ai-field'>
          <label for='sel-n'>Jumlah</label>
          <select id='sel-n' onchange='S.ai.n=+this.value'>
            ${N_CHOICES.map(([v, label]) => opt(v, label, a.n)).join('')}
          </select>
        </div>
        <span class='ai-sep' aria-hidden='true'></span>
        <div class='ai-field'>
          <label for='sel-diff'>Kesulitan</label>
          <select id='sel-diff' onchange='S.ai.diff=this.value'>
            ${DIFF.map(v => opt(v, v.charAt(0).toUpperCase() + v.slice(1), a.diff)).join('')}
          </select>
        </div>
      </div>

      <div class='ai-prompt-body'>
        <textarea id='at' rows='2' maxlength='200' ${a.busy ? 'disabled' : ''}
          placeholder='Ketik topik atau materi soal di sini… (contoh: ${esc(contoh[0])})'
          aria-label='Tulis topik soal'
          oninput='S.ai.topic=this.value'
          onkeydown='if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();aiGen()}'>${esc(a.topic)}</textarea>

        ${a.showSrc || a.src ? `
        <div class='ai-src-box'>
          <div class='ai-src-head'>
            <span>Teks Bacaan / Materi Sumber (Opsional)</span>
            <button type='button' class='ai-link-btn' onclick='S.ai.src="";S.ai.showSrc=false;render()'>Tutup</button>
          </div>
          <textarea id='as' rows='3' placeholder='Tempel ringkasan materi atau bacaan di sini agar soal dibuat khusus dari teks ini…' oninput='S.ai.src=this.value'>${esc(a.src)}</textarea>
        </div>` : ''}
      </div>

      <div class='ai-footer-bar'>
        <div class='ai-footer-left'>
          ${!a.showSrc && !a.src ? `<button type='button' class='ai-link-btn' onclick='toggleAiSrc()'>+ Lampirkan teks bacaan</button><span class='ai-dot'>·</span>` : ''}
          <span class='ai-ex-label'>Contoh:</span>
          ${contoh.map((c, idx) => `<button type='button' class='ai-ex-link' onclick='pickContohTopik("${esc(c)}")'>${esc(c)}</button>${idx < contoh.length - 1 ? `<span class='ai-dot'>,</span>` : ''}`).join('')}
        </div>
        <button type='button' class='ai-submit-btn' ${a.busy ? 'disabled' : ''} onclick='aiGen()'>
          ${a.busy ? 'Menyusun Soal…' : 'Buat Soal'}
        </button>
      </div>
    </div>

    ${a.busy ? `<div class='ai-status-note'>Sedang menyusun soal dengan AI, mohon tunggu sekitar 10–25 detik…</div>` : ''}
    ${a.msg ? `<div class='aimsg ${a.ok ? 'ok' : 'err'}' role='status'>${esc(a.msg)}</div>` : ''}
  </div>`;
}
