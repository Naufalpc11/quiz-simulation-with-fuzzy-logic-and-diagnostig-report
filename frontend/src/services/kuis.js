import { kirimTerautentikasi } from './auth'

// Endpoint Bab dan Kuis sudah ada di backend. Endpoint Soal belum; bentuk
// yang diharapkan frontend ditulis di docs/KONTRAK_API_SOAL.md supaya tim
// backend bisa menyamakan tanpa menebak.

export const TINGKAT_KESULITAN = ['Mudah', 'Sedang', 'Sulit']

// Dilempar kalau route-nya belum dibuat di backend. Express membalas 404
// berupa HTML, jadi payload-nya kosong, beda dengan 404 "data tidak ada".
export class EndpointBelumAdaError extends Error {
  constructor(message = 'Endpoint ini belum tersedia di backend.') {
    super(message)
    this.name = 'EndpointBelumAdaError'
  }
}

async function panggil(path, opsi) {
  try {
    return await kirimTerautentikasi(path, opsi)
  } catch (err) {
    if (err.status === 404 && !err.payload) throw new EndpointBelumAdaError()
    throw err
  }
}

// ── Bab ──

export async function ambilDaftarBab() {
  return (await panggil('/bab', { method: 'GET' })).data
}

// ── Kuis ──

export async function ambilDaftarKuis() {
  return (await panggil('/kuis', { method: 'GET' })).data
}

export async function ambilKuis(idKuis) {
  return (await panggil(`/kuis/${idKuis}`, { method: 'GET' })).data
}

export async function buatKuis(data) {
  return (await panggil('/kuis', { body: data })).data
}

export async function ubahKuis(idKuis, data) {
  return (await panggil(`/kuis/${idKuis}`, { method: 'PUT', body: data })).data
}

export async function hapusKuis(idKuis) {
  return (await panggil(`/kuis/${idKuis}`, { method: 'DELETE' })).message
}

// ── Soal (menunggu backend) ──

// Opsi disimpan di database lengkap dengan labelnya ("A. teks"), mengikuti
// data hasil Ekstrak Soal. Di editor labelnya dilepas supaya urutan opsi
// bisa diubah tanpa guru mengetik ulang hurufnya.
const LABEL_OPSI = /^[A-Z]\.\s*/

export function hurufOpsi(index) {
  return String.fromCharCode(65 + index)
}

function keEditor(soal) {
  const opsi = soal.opsi ?? []
  const kunci = opsi.findIndex((o) => o.isCorrect)
  return {
    pertanyaan: soal.pertanyaan ?? '',
    opsi: opsi.map((o) => (o.opsi ?? '').replace(LABEL_OPSI, '')),
    kunci: kunci === -1 ? null : kunci,
    difficulty: soal.difficulty ?? 'Sedang',
    targetTime: soal.targetTime ?? 60,
    pembahasan: soal.pembahasan ?? '',
    ringkasan: soal.ringkasan ?? '',
  }
}

function keApi(soal) {
  return {
    pertanyaan: soal.pertanyaan.trim(),
    difficulty: soal.difficulty,
    targetTime: Number(soal.targetTime),
    pembahasan: soal.pembahasan.trim() || null,
    ringkasan: soal.ringkasan.trim() || null,
    opsi: soal.opsi.map((teks, i) => ({
      opsi: `${hurufOpsi(i)}. ${teks.trim()}`,
      isCorrect: i === soal.kunci,
    })),
  }
}

export async function ambilSoalKuis(idKuis) {
  const payload = await panggil(`/kuis/${idKuis}/soal`, { method: 'GET' })
  return payload.data.map(keEditor)
}

// Menimpa seluruh soal milik kuis. Editor selalu mengirim daftar lengkap,
// jadi backend tidak perlu melacak soal mana yang ditambah atau dihapus.
export async function simpanSoalKuis(idKuis, daftarSoal) {
  const payload = await panggil(`/kuis/${idKuis}/soal`, {
    method: 'PUT',
    body: { soal: daftarSoal.map(keApi) },
  })
  return payload.data
}
