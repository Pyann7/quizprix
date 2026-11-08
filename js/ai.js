/**
 * EduRace – AI Question Generator (sisi browser)
 * Pembuatan soal dilakukan di server (/api/generate) sehingga API key tidak pernah ada di browser.
 * Server memakai Google AI Studio dan Groq Cloud secara bergantian (failover otomatis).
 *
 * Antarmuka bergaya kotak prompt (seperti ChatGPT / Claude / Gemini):
 * Guru langsung mengetik topik soal di kotak utama, dengan pengaturan ringkas di bagian bawah kotak.
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

// Contoh topik cepat per jenjang agar guru langsung paham apa yang perlu diketik
const CONTOH_TOPIK = {
  sd: ['Pecahan senilai dan campuran', 'Siklus air dan perubahan wujud benda', 'Pancasila dan lambang negara'],
  smp: ['Sistem pencernaan manusia', 'Teorema Pythagoras', 'Teks prosedur dan ciri kebahasaannya'],
  sma: ['Hukum Newton tentang gerak', 'Ikatan kimia dan struktur atom', 'Permintaan, penawaran, dan keseimbangan pasar']
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

function pickContohTopik(t) {
  S.ai.topic = t;
  render();
  const el = document.getElementById('at');
  if (el) el.focus();
}

function aiDel() {
  const k = BANK.findIndex(b => b.id === S.pkg);
  if (k >= 0) BANK.splice(k, 1);
  S.pkg = BANK.length ? BANK[0].id : null;
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
    a.msg = 'Ketik topik soal terlebih dahulu di kotak di atas, contoh: Sistem pencernaan manusia.';
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
    a.msg = `Berhasil! ${qs.length} soal "${a.topic.trim()}" sudah siap. Klik "Lanjut ke Langkah 2" di bawah.`;
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
 * Formulir pembuat soal AI (Langkah 1) – gaya kotak prompt ChatGPT / Claude / Gemini
 */
function aiPanel2() {
  const a = S.ai;
  const j = jenjangObj();
  const list = mapelList();
  const contoh = CONTOH_TOPIK[j[0]] || CONTOH_TOPIK.smp;

  const opt = (v, label, cur) => `<option value="${esc(String(v))}"${String(cur) === String(v) ? ' selected' : ''}>${label}</option>`;

  const jenjangSel = `<label class='chip-sel'><span>Jenjang:</span><select aria-label='Jenjang' onchange='setJenjang(this.value)'>${JENJANG.map(x => opt(x[0], x[1], a.jenjang)).join('')}</select></label>`;
  const kelasSel = j[3].length
    ? `<label class='chip-sel'><span>Kelas:</span><select aria-label='Kelas' onchange='S.ai.cls=+this.value'>${j[3].map(k => opt(k, 'Kelas ' + k, a.cls)).join('')}</select></label>`
    : '';
  const mapelSel = `<label class='chip-sel'><span>Mapel:</span><select aria-label='Mata pelajaran' onchange='S.ai.mapel=this.value'>${opt('', 'Otomatis', a.mapel)}${list.map(m => opt(m, m, a.mapel)).join('')}</select></label>`;
  const nSel = `<label class='chip-sel'><span>Jumlah:</span><select aria-label='Jumlah soal' onchange='S.ai.n=+this.value'>${N_CHOICES.map(([v, label]) => opt(v, label, a.n)).join('')}</select></label>`;
  const dSel = `<label class='chip-sel'><span>Tingkat:</span><select aria-label='Tingkat kesulitan' onchange='S.ai.diff=this.value'>${DIFF.map(v => opt(v, v.charAt(0).toUpperCase() + v.slice(1), a.diff)).join('')}</select></label>`;

  const chipsHtml = contoh.map(c =>
    `<button type='button' class='prompt-chip' onclick='pickContohTopik("${esc(c)}")'>${esc(c)}</button>`
  ).join('');

  return `<div class='chatbox'>
    <h2 class='chat-title d'>Mau buat soal tentang apa hari ini?</h2>
    <p class='chat-sub'>Ketik topik atau bab pelajaran di kotak bawah ini, lalu tekan <b>Buat Soal</b>.</p>
    <div class='chat-input'>
      <textarea id='at' rows='3' maxlength='200' ${a.busy ? 'disabled' : ''}
        placeholder='Ketik topik soal di sini… (contoh: ${esc(contoh[0])})'
        aria-label='Tulis topik soal'
        oninput='S.ai.topic=this.value'
        onkeydown='if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();aiGen()}'>${esc(a.topic)}</textarea>
      <div class='chat-bar'>
        <div class='chat-opts'>${jenjangSel}${kelasSel}${mapelSel}${nSel}${dSel}</div>
        <button type='button' class='chat-send' ${a.busy ? 'disabled' : ''} onclick='aiGen()'>${a.busy ? 'Sedang Membuat…' : 'Buat Soal'}</button>
      </div>
    </div>
    <div class='prompt-examples'>
      <span>Contoh topik:</span>
      ${chipsHtml}
    </div>
    ${a.busy ? `<p class='chat-hint'>Sedang menyusun soal dengan AI, mohon tunggu sekitar 10–25 detik…</p>` : ''}
    <details class='ai-more'>
      <summary>Punya teks bacaan atau materi sendiri? (opsional)</summary>
      <textarea id='as' rows='4' class='chat-src' placeholder='Tempel ringkasan materi atau teks bacaan di sini. Jika diisi, soal akan dibuat berdasarkan teks ini.' oninput='S.ai.src=this.value'>${esc(a.src)}</textarea>
    </details>
    ${a.msg ? `<div class='aimsg' role='status' style='background:${a.ok ? '#D1FAE5' : '#FEE2E2'}'>${esc(a.msg)}</div>` : ''}
  </div>`;
}
