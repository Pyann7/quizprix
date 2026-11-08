/**
 * EduRace – Serverless AI Question Generator (Vercel Function)
 *
 * API key TIDAK pernah dikirim ke browser. Simpan di Vercel → Settings → Environment Variables:
 *   GEMINI_API_KEY  (Google AI Studio)
 *   GROQ_API_KEY    (Groq Cloud)
 * Opsional: PRIMARY_AI=gemini|groq, GEMINI_MODEL, GROQ_MODEL
 *
 * Alur: coba penyedia utama; jika error / timeout / hasil tidak valid → otomatis pindah ke cadangan.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const PROVIDER_TIMEOUT_MS = 25000;

const JENJANG_LABEL = {
  sd: 'SD/MI',
  smp: 'SMP/MTs',
  sma: 'SMA/SMK/MA',
  pt: 'Perguruan Tinggi',
  umum: 'peserta umum/pelatihan'
};
const DIFF_OK = ['mudah', 'sedang', 'sulit'];
const N_OK = [5, 10];

// Pembatas sederhana per IP (best-effort pada serverless): 12 permintaan / 10 menit
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const win = 10 * 60 * 1000;
  const arr = (hits.get(ip) || []).filter(t => now - t < win);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 500) {
    for (const [k, v] of hits) if (!v.some(t => now - t < win)) hits.delete(k);
  }
  return arr.length > 12;
}

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max);

function buildPrompt(p) {
  const level = JENJANG_LABEL[p.jenjang] + (p.kelas ? ` kelas ${p.kelas}` : '');
  const curriculum = ['sd', 'smp', 'sma'].includes(p.jenjang) ? ' (Kurikulum Merdeka Indonesia)' : '';
  const subject = p.mapel ? `, mata pelajaran/bidang ${p.mapel}` : '';
  const english = /inggris|english/i.test(p.mapel)
    ? 'Soal dan pilihan jawaban dalam bahasa Inggris, pembahasan dalam bahasa Indonesia.'
    : 'Gunakan bahasa Indonesia.';
  return `Buat ${p.n} soal kuis interaktif untuk ${level}${curriculum}${subject}, topik: ${p.topic}. ` +
    `Tingkat kesulitan ${p.diff}, sesuaikan kedalaman materi dengan jenjang tersebut. ${english} ` +
    `Gunakan kalimat pertanyaan yang diakhiri tanda "…" atau memiliki bagian rumpang "___" agar cocok dimainkan dalam mode Pilihan Ganda, Fill in the Blanks, maupun Drag and Drop. ` +
    `Tiap soal punya tepat 4 pilihan singkat dan padat (1-3 kata, maksimal 35 karakter), satu jawaban benar, dan pembahasan 1-2 kalimat. ` +
    `Field "jawaban" berisi indeks 0-3 (0=A, 1=B, 2=C, 3=D). Pastikan semua fakta akurat dan tidak ada soal ganda.` +
    (p.src ? `\nGunakan HANYA materi berikut sebagai sumber fakta:\n${p.src}` : '') +
    `\nKeluarkan HANYA JSON valid dengan bentuk {"soal":[{"pertanyaan":"...","pilihan":["...","...","...","..."],"jawaban":0,"pembahasan":"..."}]} tanpa teks lain.`;
}

function withTimeout(ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, done: () => clearTimeout(timer) };
}

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY belum diatur');
  const t = withTimeout(PROVIDER_TIMEOUT_MS);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
      method: 'POST',
      signal: t.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              soal: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    pertanyaan: { type: 'STRING' },
                    pilihan: { type: 'ARRAY', items: { type: 'STRING' } },
                    jawaban: { type: 'INTEGER' },
                    pembahasan: { type: 'STRING' }
                  },
                  required: ['pertanyaan', 'pilihan', 'jawaban', 'pembahasan']
                }
              }
            },
            required: ['soal']
          }
        }
      })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = data.candidates?.[0]?.content?.parts?.map(x => x.text || '').join('');
    if (!text) throw new Error('respon kosong');
    return text;
  } finally {
    t.done();
  }
}

async function callGroq(prompt) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY belum diatur');
  const t = withTimeout(PROVIDER_TIMEOUT_MS);
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: t.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Kamu pembuat soal kuis pendidikan. Balas hanya dengan JSON valid.' },
          { role: 'user', content: prompt }
        ]
      })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('respon kosong');
    return text;
  } finally {
    t.done();
  }
}

// Ubah teks JSON model menjadi daftar soal yang tervalidasi
function normalize(text, want) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    const m = String(text).match(/[\[{][\s\S]*[\]}]/);
    if (!m) throw new Error('JSON tidak valid');
    parsed = JSON.parse(m[0]);
  }
  const arr = Array.isArray(parsed) ? parsed : (parsed.soal || parsed.questions || parsed.data || []);
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    if (!x || typeof x.pertanyaan !== 'string' || !Array.isArray(x.pilihan) || x.pilihan.length !== 4) continue;
    const ans = Number(x.jawaban);
    if (!Number.isInteger(ans) || ans < 0 || ans > 3) continue;
    const choices = x.pilihan.map(c => clean(c, 60));
    if (choices.some(c => !c) || new Set(choices.map(c => c.toLowerCase())).size !== 4) continue;
    const q = clean(x.pertanyaan, 300);
    const key = q.toLowerCase();
    if (!q || seen.has(key)) continue;
    seen.add(key);
    out.push({ pertanyaan: q, pilihan: choices, jawaban: ans, pembahasan: clean(x.pembahasan, 400) });
    if (out.length >= want) break;
  }
  if (out.length < Math.max(3, Math.ceil(want * 0.6))) throw new Error('soal valid terlalu sedikit');
  return out;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Gunakan metode POST.' });
  }

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'x').split(',')[0].trim();
  if (limited(ip)) {
    return res.status(429).json({ error: 'Terlalu banyak permintaan. Coba lagi beberapa menit lagi.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const jenjang = Object.keys(JENJANG_LABEL).includes(body.jenjang) ? body.jenjang : 'umum';
  const n = N_OK.includes(Number(body.n)) ? Number(body.n) : 10;
  const p = {
    topic: clean(body.topic, 200),
    jenjang,
    kelas: clean(body.kelas, 10),
    mapel: clean(body.mapel, 60),
    diff: DIFF_OK.includes(body.diff) ? body.diff : 'sedang',
    n,
    src: clean(body.src, 6000)
  };
  if (!p.topic) {
    return res.status(400).json({ error: 'Isi topik soal terlebih dahulu.' });
  }

  const prompt = buildPrompt(p);
  const providers = { gemini: callGemini, groq: callGroq };
  const labels = { gemini: 'Google AI Studio (Gemini)', groq: 'Groq Cloud' };
  const first = process.env.PRIMARY_AI === 'groq' ? 'groq' : 'gemini';
  const order = [first, first === 'gemini' ? 'groq' : 'gemini'];

  const failures = [];
  for (let i = 0; i < order.length; i++) {
    const name = order[i];
    try {
      const text = await providers[name](prompt);
      const questions = normalize(text, n);
      return res.status(200).json({
        questions,
        provider: name,
        providerLabel: labels[name],
        fallback: i > 0
      });
    } catch (err) {
      const reason = err && err.name === 'AbortError' ? 'timeout' : (err && err.message) || 'error';
      failures.push(`${labels[name]}: ${reason}`);
      console.error(`[generate] ${name} gagal: ${reason}`);
    }
  }

  return res.status(502).json({
    error: 'Kedua layanan AI sedang tidak dapat membuat soal. Coba lagi sebentar.',
    detail: failures
  });
};

