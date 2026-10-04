<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ambilDaftarBab } from '../services/bab'
import { getAvatar, getUser, keluar, SessionExpiredError } from '../services/auth'
import logoImage from '../assets/logo-esikap.png'
import avatarImage from '../assets/icons/avatar.svg'

const router = useRouter()
const user = ref(getUser())
const avatar = ref(getAvatar() || avatarImage)
const bab = ref([])
const loading = ref(true)
const errorMsg = ref('')
const notice = ref('')
const loggingOut = ref(false)
const profileOpen = ref(false)

const contohBab = [
  { namaBab: 'Ejaan', kataKunci: 'ejaan', deskripsi: 'Kata baku, imbuhan di-, dan kata depan di.', selesai: 2, total: 2 },
  { namaBab: 'Tanda Baca', kataKunci: 'tanda baca', deskripsi: 'Koma, titik dua, tanda hubung, dan kutipan.', selesai: 1, total: 2 },
  { namaBab: 'Paragraf', kataKunci: 'paragraf', deskripsi: 'Kepaduan, pola pengembangan, dan kalimat topik.', selesai: 0, total: 2 },
  { namaBab: 'Kalimat Efektif', kataKunci: 'kalimat efektif', deskripsi: 'Kehematan, kesepadanan, kesejajaran, dan kelogisan.', selesai: 2, total: 2 },
]

const daftarBab = computed(() => {
  if (!bab.value.length) return contohBab

  const sudahAda = new Set()
  return [...bab.value]
    .sort((a, b) => (a.urutanBab ?? 0) - (b.urutanBab ?? 0))
    .filter((item) => {
      if (item.idBab && sudahAda.has(item.idBab)) return false
      if (item.idBab) sudahAda.add(item.idBab)
      return true
    })
    .map((item) => {
      const nama = (item.namaBab || '').toLowerCase()
      const contoh = contohBab.find((data) => nama.includes(data.kataKunci))
      return {
        ...item,
        deskripsi: item.deskripsi || contoh?.deskripsi || 'Materi dan latihan pada bab ini.',
        selesai: item.selesai ?? contoh?.selesai ?? 0,
        total: item.total ?? contoh?.total ?? 0,
      }
    })
})

function statusBab(item) {
  if (item.selesai === item.total) return { label: 'Selesai', kelas: 'bg-wf-ok text-white' }
  if (item.selesai > 0) return { label: 'Sedang', kelas: 'bg-wf-accent-light text-wf-text border border-wf-accent' }
  return { label: 'Belum mulai', kelas: 'bg-wf-no text-white' }
}

function persentase(item) {
  return item.total ? Math.round((item.selesai / item.total) * 100) : 0
}

function bukaBab(item) {
  notice.value = `Latihan ${item.namaBab} akan segera tersedia.`
}

async function handleLogout() {
  loggingOut.value = true
  await keluar()
  loggingOut.value = false
  router.push('/')
}

onMounted(async () => {
  try {
    bab.value = await ambilDaftarBab()
  } catch (err) {
    if (err instanceof SessionExpiredError) {
      router.push('/')
      return
    }
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-wf-page text-wf-text">
    <header class="border-b border-wf-border bg-wf-card px-6 py-4 sm:px-10 lg:px-[6.7%]">
      <div class="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-x-8 gap-y-2 lg:gap-x-10">
          <RouterLink to="/dashboard" class="block h-10 w-[105px] shrink-0 sm:w-[125px]">
            <img :src="logoImage" alt="eSikap" class="size-full object-contain" />
          </RouterLink>
          <nav class="flex flex-wrap items-center gap-x-7 gap-y-1 text-[16px] sm:text-[17px]">
            <RouterLink to="/dashboard" class="border-b-2 border-wf-brand py-1 text-wf-text">
              Latihan
            </RouterLink>
            <button type="button" class="py-1 text-wf-secondary hover:text-wf-text" @click="notice = 'Statistik belajar akan segera tersedia.'">
              Statistik
            </button>
            <button type="button" class="py-1 text-wf-secondary hover:text-wf-text" @click="notice = 'Peta belajar akan segera tersedia.'">
              Peta belajar
            </button>
            <button type="button" class="py-1 text-wf-secondary hover:text-wf-text" @click="notice = 'Panduan belajar akan segera tersedia.'">
              Panduan
            </button>
          </nav>
        </div>

        <div class="relative flex items-center gap-3 text-sm text-wf-secondary sm:text-[15px]">
          <button
            type="button"
            class="flex items-center gap-3 rounded-lg px-2 py-1 text-left hover:bg-wf-muted-surface focus:outline-none focus:ring-2 focus:ring-wf-brand/20"
            aria-haspopup="menu"
            :aria-expanded="profileOpen"
            @click="profileOpen = !profileOpen"
          >
            <span>{{ user?.nama || 'Mahasiswa' }}<span v-if="user?.username"> · {{ user.username }}</span></span>
            <img :src="avatar" alt="" class="size-8 shrink-0 rounded-full object-cover" />
          </button>
          <div
            v-if="profileOpen"
            class="absolute right-0 top-12 z-20 w-64 overflow-hidden rounded-lg border border-wf-border-subtle bg-wf-card shadow-lg"
            role="menu"
          >
            <div class="border-b border-wf-border-subtle px-4 py-3">
              <p class="font-semibold text-wf-text">{{ user?.nama || 'Mahasiswa' }}</p>
              <p class="mt-1 break-all text-xs text-wf-secondary">{{ user?.email || 'Email tidak tersedia' }}</p>
              <p class="mt-2 inline-block rounded border border-wf-brand-border px-2 py-0.5 text-xs text-wf-brand">
                {{ user?.role || 'Mahasiswa' }}
              </p>
            </div>
            <RouterLink
              to="/profil"
              role="menuitem"
              class="block px-4 py-3 text-sm text-wf-text hover:bg-wf-muted-surface"
              @click="profileOpen = false"
            >
              Akun saya
            </RouterLink>
            <button
              type="button"
              role="menuitem"
              class="block w-full border-t border-wf-border-subtle px-4 py-3 text-left text-sm text-wf-no-text hover:bg-red-50 disabled:opacity-60"
              :disabled="loggingOut"
              @click="handleLogout"
            >
              {{ loggingOut ? 'Keluar...' : 'Keluar' }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-[1200px] px-6 pb-12 pt-9 sm:px-10 lg:px-0">
      <section class="mb-5">
        <h1 class="text-[24px] font-bold leading-tight sm:text-[26px]">
          Halo, {{ user?.nama || 'Mahasiswa' }}! Lanjutkan belajarmu
        </h1>
        <p class="mt-2 text-[16px] leading-6 text-wf-secondary sm:text-[17px]">
          Pilih bab untuk melihat daftar latihan di dalamnya. Tiap latihan berisi beberapa soal pilihan ganda.
        </p>
      </section>

      <p v-if="notice" role="status" class="mb-5 rounded-lg border border-wf-brand-border bg-wf-brand-soft px-4 py-3 text-sm text-wf-brand">
        {{ notice }}
      </p>
      <p v-if="errorMsg" role="alert" class="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ errorMsg }}
      </p>
      <p v-if="loading" class="py-8 text-center text-wf-secondary">Memuat daftar bab...</p>

      <section v-else class="grid gap-5 md:grid-cols-2">
        <article
          v-for="(item, index) in daftarBab"
          :key="item.idBab || item.namaBab"
          class="rounded-md border border-wf-border-subtle bg-wf-card p-5 shadow-[0_1px_2px_rgba(27,25,48,0.02)] sm:p-5"
        >
          <div class="flex items-start justify-between gap-4">
            <span class="font-mono text-[13px] uppercase tracking-[0.12em] text-wf-secondary">
              Bab {{ index + 1 }}
            </span>
            <span class="rounded-md px-2 py-1 text-[14px] font-semibold leading-5" :class="statusBab(item).kelas">
              {{ statusBab(item).label }}
            </span>
          </div>
          <h2 class="mt-5 text-[19px] font-bold">{{ item.namaBab }}</h2>
          <p class="mt-1 min-h-12 text-[15px] leading-6 text-wf-secondary">{{ item.deskripsi }}</p>

          <div class="mt-4 h-1.5 overflow-hidden rounded-full bg-wf-brand-soft">
            <div class="h-full rounded-full bg-wf-brand transition-all" :style="{ width: `${persentase(item)}%` }"></div>
          </div>
          <div class="mt-3 flex items-center justify-between font-mono text-[13px] text-wf-secondary">
            <span>{{ item.selesai }} dari {{ item.total }} tahap selesai</span>
            <strong class="text-wf-text">{{ persentase(item) }}%</strong>
          </div>

          <button
            type="button"
            class="mt-5 w-full rounded-xl border border-wf-brand-border px-4 py-3 text-[18px] font-bold text-wf-brand transition hover:bg-wf-brand-soft focus:outline-none focus:ring-2 focus:ring-wf-brand/30"
            :class="{ 'border-wf-accent bg-wf-accent text-white hover:bg-wf-accent-hover': index === 0 }"
            @click="bukaBab(item)"
          >
            BUKA BAB <span aria-hidden="true" class="ml-1 text-[22px] leading-none">→</span>
          </button>
        </article>
      </section>
    </main>
  </div>
</template>
