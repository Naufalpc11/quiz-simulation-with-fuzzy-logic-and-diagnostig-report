<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ambilBab } from '../services/bab'
import { ambilDaftarKuis } from '../services/kuis'
import { getAvatar, getUser, keluar, SessionExpiredError } from '../services/auth'
import logoImage from '../assets/logo-esikap.png'
import avatarImage from '../assets/icons/avatar.svg'

const props = defineProps({ id: { type: String, required: true } })
const router = useRouter()
const user = ref(getUser())
const avatar = ref(getAvatar() || avatarImage)
const bab = ref(null)
const kuis = ref([])
const loading = ref(true)
const errorMsg = ref('')
const notice = ref('')
const loggingOut = ref(false)

const contohKuis = [
  {
    judul: 'kuis 1: Kata Baku',
    deskripsi: 'Pengertian, ciri-ciri, dan pemilihan kata baku.',
    jumlahSoal: 5,
    durasi: 20,
    statusBelajar: 'Perlu diulang',
    nilai: 50,
  },
  {
    judul: 'kuis 2: Imbuhan di- dan Kata Depan di',
    deskripsi: 'Penulisan serangkai untuk imbuhan, terpisah untuk kata depan.',
    jumlahSoal: 5,
    durasi: 20,
    statusBelajar: 'Selesai',
    nilai: 100,
  },
  {
    judul: 'kuis 3 : campuran Ejaan',
    deskripsi: 'Gabungan Tahap 1 dan Tahap 2 dalam satu set soal.',
    jumlahSoal: 5,
    durasi: 20,
    statusBelajar: 'Selesai',
    nilai: 80,
  },
]

const daftarKuis = computed(() => kuis.value.length ? kuis.value : contohKuis)

function statusKuis(item, index) {
  if (item.statusBelajar) return item.statusBelajar
  return index === 0 ? 'Perlu diulang' : 'Selesai'
}

function statusKelas(status) {
  return status === 'Perlu diulang'
    ? 'bg-wf-no text-white'
    : 'bg-wf-ok text-white'
}

function ulangi(item) {
  if (item.idKuis) {
    router.push(`/kuis/${item.idKuis}/kerjakan`)
    return
  }
  notice.value = `Latihan "${item.judul}" belum memiliki ID kuis dari server.`
}

function formatRingkasan() {
  const jumlah = daftarKuis.value.length
  const soal = daftarKuis.value.reduce((sum, item) => sum + (item.jumlahSoal || 0), 0)
  return `${jumlah} latihan · 1 ujian · ${soal} soal · dibuka oleh ${bab.value?.dibuatOlehNama || 'Guru'}`
}

async function handleLogout() {
  loggingOut.value = true
  await keluar()
  router.push('/')
}

onMounted(async () => {
  try {
    const [dataBab, dataKuis] = await Promise.all([
      ambilBab(props.id),
      ambilDaftarKuis(props.id),
    ])
    bab.value = dataBab
    kuis.value = dataKuis
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
        <div class="flex flex-wrap items-center gap-x-8 lg:gap-x-10">
          <RouterLink to="/dashboard" class="block h-10 w-[105px] sm:w-[125px]">
            <img :src="logoImage" alt="eSikap" class="size-full object-contain" />
          </RouterLink>
          <nav class="flex items-center gap-x-7 text-[16px] sm:text-[17px]">
            <RouterLink to="/dashboard" class="border-b-2 border-wf-brand py-1 text-wf-text">Latihan</RouterLink>
            <button type="button" class="py-1 text-wf-secondary">Statistik</button>
            <button type="button" class="py-1 text-wf-secondary">History</button>
          </nav>
        </div>
        <div class="flex items-center gap-3 text-sm text-wf-secondary sm:text-[15px]">
          <span>{{ user?.nama || 'Mahasiswa' }}<span v-if="user?.username"> · {{ user.username }}</span></span>
          <img :src="avatar" alt="" class="size-8 rounded-full object-cover" />
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-[1000px] px-6 pb-12 pt-9 sm:px-10 lg:px-0">
      <p class="font-mono text-[13px] uppercase tracking-[0.12em] text-wf-secondary">
        <RouterLink to="/dashboard" class="hover:text-wf-brand">← Bab</RouterLink>
        <span class="mx-2">/</span>{{ bab?.namaBab || 'Memuat...' }}
      </p>
      <h1 class="mt-4 text-[27px] font-bold sm:text-[30px]">{{ bab?.namaBab || 'Latihan' }}</h1>
      <p class="mt-1 text-[16px] text-wf-secondary">{{ formatRingkasan() }}</p>

      <p v-if="loading" class="mt-8 text-wf-secondary">Memuat daftar latihan...</p>
      <p v-else-if="errorMsg" role="alert" class="mt-8 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-wf-no-text">
        {{ errorMsg }}
      </p>
      <template v-else>
        <p v-if="notice" role="status" class="mt-6 rounded-md border border-wf-brand-border bg-wf-brand-soft px-4 py-3 text-sm text-wf-brand">
          {{ notice }}
        </p>
        <section class="mt-6 flex flex-col gap-5">
          <article
            v-for="(item, index) in daftarKuis"
            :key="item.idKuis || item.judul"
            class="rounded-md border bg-wf-card px-5 py-5 sm:px-5"
            :class="index === 0 ? 'border-2 border-wf-brand' : 'border-wf-border-subtle'"
          >
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div class="min-w-0 flex-1">
                <p class="font-mono text-[13px] uppercase tracking-[0.12em] text-wf-secondary">Latihan {{ index + 1 }}</p>
                <h2 class="mt-2 text-[20px] font-bold">{{ item.judul }}</h2>
                <p class="mt-1 text-[16px] text-wf-secondary">{{ item.deskripsi || 'Latihan pilihan ganda untuk menguji pemahaman materi.' }}</p>
                <p class="mt-2 font-mono text-[13px] uppercase tracking-[0.1em] text-wf-muted">
                  {{ item.jumlahSoal || 0 }} soal · bobot 100 poin · durasi {{ item.durasi || 20 }} menit
                </p>
              </div>
              <div class="flex items-center gap-5">
                <div class="text-right">
                  <span class="rounded-md px-2 py-1 text-[16px] font-semibold" :class="statusKelas(statusKuis(item, index))">
                    {{ statusKuis(item, index) }}
                  </span>
                  <p class="mt-3 font-mono text-[13px] text-wf-secondary">Nilai terakhir {{ item.nilai ?? '—' }}</p>
                </div>
                <button type="button" class="rounded-xl border border-wf-brand-border px-5 py-4 text-[20px] font-semibold text-wf-brand hover:bg-wf-brand-soft" @click="ulangi(item)">
                  ULANGI
                </button>
              </div>
            </div>
          </article>
        </section>
      </template>
    </main>
  </div>
</template>
