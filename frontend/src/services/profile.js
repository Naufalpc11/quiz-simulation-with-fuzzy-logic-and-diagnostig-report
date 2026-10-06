import { kirimTerautentikasi } from './auth'

export async function ambilProfilSaya() {
  return (await kirimTerautentikasi('/profile', { method: 'GET' })).data
}