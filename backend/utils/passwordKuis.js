import { randomInt, timingSafeEqual } from 'node:crypto';

const KARAKTER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*-_?';

// 8 karakter acak dari huruf besar, huruf kecil, angka, dan karakter spesial.
// Menggunakan crypto.randomInt (bukan Math.random) supaya tidak mudah ditebak.
export const buatPasswordKuis = (panjang = 8) =>
  Array.from({ length: panjang }, () => KARAKTER[randomInt(KARAKTER.length)]).join('');

// Membandingkan PIN dengan waktu konstan supaya tidak bisa ditebak lewat selisih waktu respons.
export const samaPassword = (input, asli) => {
  const a = Buffer.from(String(input ?? ''));
  const b = Buffer.from(String(asli ?? ''));
  return a.length === b.length && timingSafeEqual(a, b);
};