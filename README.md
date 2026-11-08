# QuizPrix – Kelas Jadi Lomba 🏁

Kuis interaktif 2 tim untuk **IFP (Interactive Flat Panel)** dan proyektor kelas, untuk **semua jenjang sekolah** (SD/MI, SMP/MTs, SMA/SMK/MA). Frontend web murni (HTML, CSS, JS Vanilla) + satu fungsi serverless di **Vercel** untuk membuat soal dengan AI.

Tidak ada bank soal bawaan: guru mengetik topik, memilih jenjang/kelas, lalu AI membuat soalnya.

---

## ✨ Fitur

- **Soal dibuat AI** untuk topik & mata pelajaran apa pun (5 atau 10 soal per permintaan agar hemat kuota API gratis, 3 tingkat kesulitan, teks bacaan opsional).
- **4 bentuk soal** untuk layar sentuh: Pilihan Ganda, Fill in the Blanks, Drag & Drop, dan Campuran 3-in-1 (multi-touch 2 tim sekaligus).
- **4 aturan skor**: Balapan 2 Tim (benar & tercepat +2, benar kedua +1), Rebutan Cepat, Beruntun, Taruhan Poin.
- **8 tema arena** animasi dan pembahasan di akhir permainan.
- Paket soal hasil AI tersimpan di browser (maks. 12 terakhir) sehingga bisa dimainkan ulang.

---

## 🤖 Pembuatan Soal: 2 Layanan AI dengan Failover

```text
Browser ──POST /api/generate──▶ Vercel Function (api/generate.js)
                                   ├─ 1) Google AI Studio (Gemini)   ← utama
                                   └─ 2) Groq Cloud                  ← cadangan otomatis
```

- API key **hanya ada di server (Environment Variables Vercel)** — tidak pernah dikirim ke browser atau disimpan di repo.
- Jika layanan utama error, timeout (25 dtk), kena batas kuota, atau mengembalikan soal tidak valid, server **otomatis memakai layanan cadangan** sehingga soal tetap terbuat.
- Hasil divalidasi di server: 4 pilihan unik, indeks jawaban 0–3, tanpa soal ganda.
- Pembatas permintaan sederhana: 12 permintaan / 10 menit per IP.

### Pengaturan di Vercel

1. Deploy repo ini ke Vercel (Framework Preset: **Other**, tanpa build command).
2. Buka **Project → Settings → Environment Variables**, tambahkan:

   | Nama | Isi | Wajib |
   | :--- | :--- | :---: |
   | `GEMINI_API_KEY` | Kunci dari [Google AI Studio](https://aistudio.google.com/apikey) | ✅ |
   | `GROQ_API_KEY` | Kunci dari [Groq Console](https://console.groq.com/keys) | ✅ |
   | `PRIMARY_AI` | `gemini` (default) atau `groq` | – |
   | `GEMINI_MODEL` | default `gemini-2.0-flash` | – |
   | `GROQ_MODEL` | default `llama-3.3-70b-versatile` | – |

3. **Redeploy** agar variabel terbaca. Fungsi diberi batas 60 detik di `vercel.json`.

> Cukup satu kunci pun aplikasi tetap jalan (layanan yang tidak punya kunci dilewati), tetapi dua kunci memberi cadangan saat salah satunya bermasalah.

### Menjalankan Lokal

Fungsi `/api/generate` tidak ada jika `index.html` dibuka langsung dari file. Gunakan Vercel CLI:

```bash
npm i -g vercel
cp .env.example .env.local   # isi GEMINI_API_KEY dan GROQ_API_KEY
vercel dev
```

Buka `http://localhost:3000`. (`.env.local` sudah diabaikan oleh `.gitignore`.)

---

## 📁 Struktur Proyek

```text
edurace/
├── index.html
├── vercel.json             # batas durasi fungsi AI
├── package.json
├── .env.example            # contoh variabel lingkungan (tanpa nilai rahasia)
├── api/
│   └── generate.js         # Vercel Function: Gemini → Groq (failover), validasi hasil
├── css/style.css
└── js/
    ├── data/questions.js   # helper, daftar jenjang, soal demo preview, riwayat paket (localStorage)
    ├── icons.js            # ikon SVG mandiri
    ├── audio.js            # efek suara Web Audio API
    ├── scenes.js           # animasi arena SVG
    ├── ai.js               # formulir pembuat soal & pemanggil /api/generate
    └── app.js              # state, alur wizard, game, tampilan
```

---

## 🔒 Catatan Keamanan

- Jangan menaruh API key di file JS/HTML atau commit `.env*` (sudah diabaikan).
- Jika kunci pernah tampil di chat/repo, buat ulang (rotate) di Google AI Studio / Groq Console.
- Atur batas pemakaian/budget di dashboard masing-masing penyedia agar penyalahgunaan tidak membebani kuota.
- Pembatas IP di fungsi bersifat *best-effort* (memori instance serverless); untuk lalu lintas besar gunakan Vercel Firewall/Rate Limiting.

