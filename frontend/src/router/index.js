import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import KelolaKuisView from '../views/KelolaKuisView.vue'
import EditorKuisView from '../views/EditorKuisView.vue'
import {
  isLoggedIn,
  fetchMe,
  getUser,
  clearSession,
  setNotice,
  halamanAwal,
  SessionExpiredError,
} from '../services/auth'

// Endpoint tulis Bab/Kuis di backend hanya menerima role 'admin' (guru).
const khususAdmin = { butuhLogin: true, role: 'admin' }

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'login', component: LoginView, meta: { tamu: true } },
    { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { butuhLogin: true } },
    { path: '/kuis', name: 'kelola-kuis', component: KelolaKuisView, meta: khususAdmin },
    { path: '/kuis/tambah', name: 'tambah-kuis', component: EditorKuisView, meta: khususAdmin },
    { path: '/kuis/:id/soal', name: 'edit-soal', component: EditorKuisView, props: true, meta: khususAdmin },
    // Alamat ngawur diarahkan ke login, bukan halaman kosong.
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// Sesi divalidasi ke server sekali per pemuatan halaman. Navigasi berikutnya
// cukup mengandalkan jawaban 401, jadi tidak ada panggilan /me berulang.
let sudahDivalidasi = false

router.beforeEach(async (to) => {
  if (!isLoggedIn()) {
    sudahDivalidasi = false
  }

  if (to.meta.butuhLogin) {
    // Adanya token di browser belum berarti sesinya masih hidup di server:
    // bisa saja sudah dicabut karena akun dipakai login di perangkat lain.
    if (!isLoggedIn()) return { name: 'login' }

    if (!sudahDivalidasi) {
      try {
        await fetchMe()
        sudahDivalidasi = true
      } catch (err) {
        clearSession()
        // SessionExpiredError sudah menitipkan pesannya sendiri. Sisanya,
        // misalnya backend mati, perlu dijelaskan apa adanya ke pengguna.
        if (!(err instanceof SessionExpiredError)) {
          setNotice(err.message)
        }
        return { name: 'login' }
      }
    }

    // Role dicek setelah /me supaya memakai profil terbaru dari server.
    if (to.meta.role && getUser()?.role !== to.meta.role) {
      return halamanAwal()
    }
    return true
  }

  // Sudah login tapi membuka halaman login lagi: langsung ke halaman awal.
  if (to.meta.tamu && isLoggedIn()) {
    return halamanAwal()
  }

  return true
})

export default router
