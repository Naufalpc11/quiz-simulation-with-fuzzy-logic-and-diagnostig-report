// middleware/rateLimiter.js
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { errorResponse } from '../models/apiResponse.js';

const MENIT = 60 * 1000;

const tolak = (pesan) => (req, res) => res.status(429).json(errorResponse({ message: pesan }));

// Kunci per email supaya serangan dari banyak IP ke satu akun tetap tertahan.
// Kalau email tidak dikirim, jatuh kembali ke IP (ipKeyGenerator menangani IPv6).
const kunciEmail = (req) => {
  const email = req.body?.email;
  return typeof email === 'string' && email.trim()
    ? `email:${email.trim().toLowerCase()}`
    : `ip:${ipKeyGenerator(req.ip)}`;
};

// Menahan satu IP yang mencoba banyak akun sekaligus.
// skipSuccessfulRequests: login yang benar tidak ikut dihitung, jadi pengguna
// sah yang wajar bolak-balik login tidak pernah kena.
export const batasLoginPerIp = rateLimit({
  windowMs: 15 * MENIT,
  limit: 30,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: tolak('Terlalu banyak percobaan login dari perangkat ini. Coba lagi dalam 15 menit.'),
});

// Menahan tebakan password beruntun ke satu akun tertentu.
export const batasLoginPerAkun = rateLimit({
  windowMs: 15 * MENIT,
  limit: 8,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: kunciEmail,
  handler: tolak('Terlalu banyak percobaan login untuk akun ini. Coba lagi dalam 15 menit atau gunakan Lupa Password.'),
});

// Menahan tebakan PIN kuis. Wajib dipasang SETELAH verifyLoggedIn karena kuncinya
// akun mahasiswa: PIN 4 digit hanya punya 10.000 kemungkinan.
// Hanya PIN salah yang dihitung (ditandai controller lewat res.locals.pinSalah), jadi
// melanjutkan attempt atau permintaan pertama tanpa PIN tidak menghabiskan jatah.
export const batasPinKuis = rateLimit({
  windowMs: 15 * MENIT,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `pin:${req.currentUser?.id ?? ipKeyGenerator(req.ip)}`,
  requestWasSuccessful: (req, res) => !res.locals.pinSalah,
  skipSuccessfulRequests: true,
  handler: tolak('Terlalu banyak percobaan PIN. Coba lagi dalam 15 menit.'),
});

// Supabase sendiri membatasi pengiriman email 1 jam sekali. Batas ini menahan
// permintaannya lebih awal supaya tidak menghabiskan kuota email proyek.
export const batasLupaPassword = rateLimit({
  windowMs: 60 * MENIT,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: kunciEmail,
  handler: (req, res) => {
    const message = 'Terlalu banyak permintaan reset password. Coba lagi dalam satu jam.';

    console.warn('[RESET_PASSWORD_RATE_LIMIT]', {
      waktu: new Date().toISOString(),
      status: 429,
      pesan: message,
    });

    return res.status(429).json(errorResponse({ message }));
  },
});
