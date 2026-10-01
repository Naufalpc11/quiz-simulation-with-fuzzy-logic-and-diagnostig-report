// Salinan backend/config/roles.js. Kolom User.role berupa teks bebas, jadi
// salah ketik tidak ditolak database; selalu pakai konstanta ini.
export const ROLE = Object.freeze({
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MAHASISWA: 'Mahasiswa',
})
