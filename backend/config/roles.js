// config/roles.js
// Kolom User.role berupa teks bebas (bukan enum), jadi database tidak menolak
// salah ketik. Selalu pakai konstanta ini, jangan tulis string role langsung.
export const ROLE = Object.freeze({
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MAHASISWA: 'Mahasiswa',
});
