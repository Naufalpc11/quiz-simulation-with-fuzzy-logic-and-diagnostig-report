import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import {
  isLoggedIn,
  fetchMe,
  clearSession,
  setNotice,
  SessionExpiredError,
} from '../services/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'login', component: LoginView, meta: { tamu: true } },
    { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { butuhLogin: true } },
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
    if (sudahDivalidasi) return true

    try {
      await fetchMe()
      sudahDivalidasi = true
      return true
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

  // Sudah login tapi membuka halaman login lagi: langsung ke dashboard.
  if (to.meta.tamu && isLoggedIn()) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
