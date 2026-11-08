/**
 * EduRace – Data Dasar & Paket Soal AI
 * Tidak ada bank soal bawaan: semua soal dibuat oleh AI (lihat js/ai.js dan api/generate.js).
 */

// Mengacak urutan pilihan jawaban agar posisi kunci tidak selalu sama
const shuffleQuestion = (q) => {
  const o = q[1].map((text, idx) => [text, idx === q[2]]);
  for (let i = o.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [o[i], o[j]] = [o[j], o[i]];
  }
  return [q[0], o.map(x => x[0]), o.findIndex(x => x[1]), q[3]];
};

// Metadata ikon (diisi oleh js/icons.js): [ikon, nama, warna aksen]
const MAPEL = {
  lain: ['💡', 'Umum', '#FDBA74']
};

// Daftar jenjang pendidikan yang didukung: [id, label, label singkat, daftar kelas]
const JENJANG = [
  ['sd', 'SD / MI', 'SD', [1, 2, 3, 4, 5, 6]],
  ['smp', 'SMP / MTs', 'SMP', [7, 8, 9]],
  ['sma', 'SMA / SMK / MA', 'SMA', [10, 11, 12]]
];

// Soal contoh khusus untuk animasi preview di halaman depan (bukan bank soal)
const DEMO_QS = [
  ['Alat ukur suhu adalah…', ['Barometer', 'Termometer', 'Higrometer', 'Neraca'], 1, 'Termometer mengukur suhu.'],
  ['Ibu kota Indonesia adalah…', ['Bandung', 'Surabaya', 'Jakarta', 'Medan'], 2, 'Jakarta adalah ibu kota Indonesia.'],
  ['Hasil dari 7 × 8 adalah…', ['54', '56', '63', '48'], 1, '7 × 8 = 56.'],
  ['Planet terdekat dari Matahari adalah…', ['Venus', 'Bumi', 'Merkurius', 'Mars'], 2, 'Merkurius paling dekat dengan Matahari.'],
  ['Gas yang dihirup manusia untuk bernapas adalah…', ['Oksigen', 'Nitrogen', 'Helium', 'Karbon'], 0, 'Manusia menghirup oksigen.'],
  ['Bahasa pemrograman untuk halaman web adalah…', ['Excel', 'Word', 'HTML', 'Paint'], 2, 'HTML menyusun struktur halaman web.']
].map(shuffleQuestion);

// Paket soal hasil AI yang tersimpan di browser (riwayat), dimuat dari localStorage
const BANK = [];
try {
  const saved = JSON.parse(localStorage.getItem('edurace_ai') || '[]');
  saved.forEach(b => {
    if (!b || !Array.isArray(b.qs) || !b.qs.length) return;
    if (!b.meta) {
      b.meta = (b.kls ? 'Kelas ' + b.kls : 'Umum') + (b.mp && b.mp !== 'lain' ? ' · ' + b.mp.toUpperCase() : '');
    }
    BANK.push(b);
  });
  // Bersihkan sisa API key lama di perangkat (kunci kini hanya ada di server)
  localStorage.removeItem('edurace_key');
} catch (e) {
  console.warn('Gagal memuat paket AI dari localStorage:', e);
}
