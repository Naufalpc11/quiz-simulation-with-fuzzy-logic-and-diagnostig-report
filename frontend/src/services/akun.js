import { kirimTerautentikasi } from './auth'

// Endpoint /api/account hanya untuk Super Admin. Backend belum punya
// endpoint ubah akun, jadi yang tersedia hanya lihat, tambah, dan hapus.

export async function ambilDaftarAkun() {
  return (await kirimTerautentikasi('/account', { method: 'GET' })).data
}

export async function buatAkun(data) {
  return (await kirimTerautentikasi('/account', { body: data })).data
}

export async function hapusAkun(id) {
  return (await kirimTerautentikasi(`/account/${id}`, { method: 'DELETE' })).message
}

// Aturan yang sama dengan validPassword() di AccountController, supaya
// form bisa menunjukkan syarat yang belum terpenuhi sebelum dikirim.
export function syaratPassword(password) {
  return [
    { label: 'Minimal 8 karakter', ok: password.length >= 8 },
    { label: 'Huruf besar', ok: /[A-Z]/.test(password) },
    { label: 'Huruf kecil', ok: /[a-z]/.test(password) },
    { label: 'Angka', ok: /\d/.test(password) },
    { label: 'Simbol (@ # $ ! _ -)', ok: /[@#$!_\-]/.test(password) },
  ]
}
