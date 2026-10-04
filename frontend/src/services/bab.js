import { kirimTerautentikasi } from './auth'

export async function ambilDaftarBab() {
  return (await kirimTerautentikasi('/bab', { method: 'GET' })).data
}

export async function ambilBab(idBab) {
  return (await kirimTerautentikasi(`/bab/${idBab}`, { method: 'GET' })).data
}

export async function buatBab(data) {
  return (await kirimTerautentikasi('/bab', { body: data })).data
}

export async function ubahBab(idBab, data) {
  return (await kirimTerautentikasi(`/bab/${idBab}`, { method: 'PUT', body: data })).data
}

export async function hapusBab(idBab) {
  return (await kirimTerautentikasi(`/bab/${idBab}`, { method: 'DELETE' })).message
}
