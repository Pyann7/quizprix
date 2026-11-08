/**
 * EduRace – AI Question Generator (sisi browser)
 * Pembuatan soal dilakukan di server (/api/generate) sehingga API key tidak pernah ada di browser.
 * Server memakai Google AI Studio dan Groq Cloud secara bergantian (failover otomatis).
 *
 * Alur dibuat sesederhana mungkin untuk guru: pilih jenjang → pilih mapel → tulis topik → buat soal.
 * Pilihan berupa tombol (bukan ketikan) agar prompt singkat, hasil tepat sasaran, dan kuota API hemat.
 */

const DIFF = ['mudah', 'sedang', 'sulit'];
const N_CHOICES = [[5, '5 soal', 'Cepat'], [10, '10 soal', 'Disarankan']];
const MAX_SAVED_PACKS = 12;

// Pilihan mata pelajaran menurut jenjang (jenjang tanpa daftar → ketik bidang secara bebas)
const MAPEL_BY_JENJANG = {
  sd: ['Matematika', 'Bahasa Indonesia', 'IPAS', 'PPKn', 'Bahasa Inggris', 'Pendidikan Agama'],
  smp: ['Matematika', 'IPA', 'IPS', 'Bahasa Indonesia', 'Bahasa Inggris', 'Informatika', 'PPKn', 'Pendidikan Agama'],
  sma: ['Matematika', 'Fisika', 'Kimia', 'Biologi', 'Ekonomi', 'Sejarah', 'Geografi', 'Sosiologi', 'Bahasa Indonesia', 'Bahasa Inggris', 'Informatika'],
  pt: [],
  umum: []
};

// String sanitizers for secure HTML injection
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
const san = s => String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

const jenjangObj = (id = S.ai.jenjang) => JENJANG.find(j => j[0] === id) || JENJANG[1];
const mapelList = (id = S.ai.jenjang) => MAPEL_BY_JENJANG[id] || [];

function initAIState(state) {
  // Nilai awal sudah terisi (SMP kelas 8, 10 soal, sedang) sehingga guru cukup memilih mapel & menulis topik
  state.ai = {
    topic: '',
    jenjang: 'smp',
    cls: 8,
    mapel: '',
    other: false,
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
  S.ai.cls = j[3].length ? j[3][Math.min(1, j[3].length - 1)] : 0;
  S.ai.mapel = '';
  S.ai.other = false;
  render();
}

function setMapel(name) {
  S.ai.mapel = name;
  S.ai.other = false;
  render();
}

function setMapelOther() {
  S.ai.mapel = '';
  S.ai.other = true;
  render();
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

  const needMapel = mapelList().length > 0;
  if (needMapel && !a.mapel.trim()) {
    a.msg = 'Pilih mata pelajaran dulu.';
    a.ok = false;
    render();
    return;
  }
  if (!a.topic.trim()) {
    a.msg = 'Tulis topik soalnya dulu, contoh: Sistem pencernaan manusia.';
    a.ok = false;
    render();
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
        ? 'Layanan pembuat soal belum aktif. Buka lewat alamat website EduRace (bukan membuka file langsung).'
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
    a.msg = `Berhasil! ${qs.length} soal sudah siap. Klik "Lanjut ke Langkah 2".`;
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
 * Formulir pembuat soal AI (Langkah 1) – 4 langkah singkat
 */
function aiPanel2() {
  const a = S.ai;
  const j = jenjangObj();
  const list = mapelList();

  const jenjangSeg = `<div class='seg seg-wrap'>${JENJANG.map(x =>
    `<button type='button' class='${a.jenjang === x[0] ? 'on' : ''}' onclick='setJenjang("${x[0]}")'>${x[1]}</button>`).join('')}</div>`;

  const kelasSeg = j[3].length
    ? `<label style='margin-top:12px'>Kelas</label><div class='seg seg-wrap'>${j[3].map(k => `<button type='button' class='${a.cls === k ? 'on' : ''}' onclick='S.ai.cls=${k};render()'>${k}</button>`).join('')}</div>`
    : '';

  let mapelBody;
  if (list.length) {
    mapelBody = `<div class='seg seg-wrap'>${list.map(m =>
      `<button type='button' class='${!a.other && a.mapel === m ? 'on' : ''}' onclick='setMapel("${m}")'>${m}</button>`).join('')}
      <button type='button' class='${a.other ? 'on' : ''}' onclick='setMapelOther()'>Lainnya…</button></div>
      ${a.other ? `<input type='text' id='am' value='${esc(a.mapel)}' placeholder='Tulis nama mata pelajaran' oninput='S.ai.mapel=this.value' aria-label='Nama mata pelajaran' style='margin-top:12px'>` : ''}`;
  } else {
    mapelBody = `<input type='text' id='am' value='${esc(a.mapel)}' placeholder='mis. Akuntansi Dasar, Pelatihan K3, Pengetahuan Umum' oninput='S.ai.mapel=this.value' aria-label='Bidang atau mata kuliah'>`;
  }

  const nSeg = `<div class='seg'>${N_CHOICES.map(([v, label, hint]) => `<button type='button' class='${a.n === v ? 'on' : ''}' onclick='S.ai.n=${v};render()'>${label}<small>${hint}</small></button>`).join('')}</div>`;
  const dSeg = `<div class='seg'>${DIFF.map((v, i) => `<button type='button' class='${a.diff === v ? 'on' : ''}' onclick='S.ai.diff=DIFF[${i}];render()'>${v}</button>`).join('')}</div>`;

  return `<div class='aip'>
    <div class='aih d'>Buat soal dalam 4 langkah singkat</div>
    <div class='aib'>
      <div class='ais'>
        <div class='ain'>1</div>
        <div>
          <h4>Pilih jenjang${j[3].length ? ' dan kelas' : ''}</h4>
          ${jenjangSeg}
          ${kelasSeg}
        </div>
      </div>
      <div class='ais'>
        <div class='ain'>2</div>
        <div>
          <h4>${list.length ? 'Pilih mata pelajaran' : 'Tulis bidang / mata kuliah (boleh dikosongkan)'}</h4>
          ${mapelBody}
        </div>
      </div>
      <div class='ais'>
        <div class='ain'>3</div>
        <div>
          <h4>Tulis topik atau bab</h4>
          <input type='text' id='at' value='${esc(a.topic)}' placeholder='Contoh: Sistem pencernaan manusia' oninput='S.ai.topic=this.value' aria-label='Topik'>
          <details class='ai-more'>
            <summary>Punya teks bacaan sendiri? (boleh dilewati)</summary>
            <textarea id='as' rows='4' style='width:100%;font:inherit;padding:10px;background:#fff;margin-top:8px' placeholder='Tempel teks di sini. Jika diisi, soal hanya dibuat dari teks ini.' oninput='S.ai.src=this.value'>${esc(a.src)}</textarea>
          </details>
        </div>
      </div>
      <div class='ais'>
        <div class='ain'>4</div>
        <div>
          <h4>Jumlah soal dan tingkat kesulitan</h4>
          <div class='ag3' style='grid-template-columns:repeat(auto-fit,minmax(220px,1fr))'>
            <div>${nSeg}</div>
            <div>${dSeg}</div>
          </div>
        </div>
      </div>
      <button type='button' class='btn big' style='width:100%' ${a.busy ? 'disabled' : ''} onclick='aiGen()'>${a.busy ? 'Sedang membuat soal… mohon tunggu sekitar 10–30 detik' : 'Buat Soal Sekarang'}</button>
      ${a.msg ? `<div class='aimsg' role='status' style='background:${a.ok ? '#D1FAE5' : '#FEE2E2'}'>${esc(a.msg)}</div>` : ''}
    </div>
  </div>`;
}
