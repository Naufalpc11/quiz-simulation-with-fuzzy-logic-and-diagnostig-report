<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminHeader from '../components/AdminHeader.vue'
import { takeNotice, SessionExpiredError } from '../services/auth'
import { ambilBab } from '../services/bab'
import { ambilDaftarKuis, hapusKuis } from '../services/kuis'

// Figma "HA1 Admin — kelola kuiz": kuis milik SATU bab. Dibuka dari Kelola Bab
// dengan klik nama bab (/bab/:id/kuis).
const props = defineProps({ id: { type: String, required: true } })

const router = useRouter()

const bab = ref(null)
const daftarKuis = ref([])
const memuat = ref(true)
const gagalMuat = ref(false)
const errorMsg = ref('')
const infoMsg = ref('')
const cari = ref('')
const filterStatus = ref('semua')

// Kolom status (terbit/draf) belum ada di tabel Kuis. Chip filternya baru
// muncul kalau backend sudah mengirimkannya.
const adaStatus = computed(() => daftarKuis.value.some((k) => k.status))

const kuisTersaring = computed(() => {
  const kata = cari.value.trim().toLowerCase()
  return daftarKuis.value.filter(
    (k) =>
      (!kata || k.judul.toLowerCase().includes(kata)) &&
      (filterStatus.value === 'semua' || k.status === filterStatus.value),
  )
})

function formatTanggal(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Bab dipakai bersama, jadi satu bab bisa berisi kuis dari beberapa dosen.
// bisaDikelola dari backend: false = kuis dosen lain, hanya bisa dilihat.
const milikSendiri = (kuis) => kuis.bisaDikelola !== false

function keteranganKuis(kuis) {
  const bagian = [`Dibuat ${formatTanggal(kuis.tanggalDibuat)}`]
  if (kuis.namaPembuat) bagian.push(`oleh ${milikSendiri(kuis) ? 'kamu' : kuis.namaPembuat}`)
  if (kuis.jumlahSoal != null) bagian.push(`${kuis.jumlahSoal} soal`)
  if (kuis.durasi) bagian.push(`${kuis.durasi} menit`)
  if (kuis.deskripsi) bagian.push(kuis.deskripsi)
  return bagian.join(' · ')
}

function tanganiError(err) {
  if (err instanceof SessionExpiredError) {
    router.push('/')
    return
  }
  errorMsg.value = err.message
}

onMounted(async () => {
  // Pesan sukses titipan halaman Tambah Kuis / Edit Kuis / Edit Soal.
  infoMsg.value = takeNotice() || ''
  try {
    const [dataBab, kuis] = await Promise.all([ambilBab(props.id), ambilDaftarKuis(props.id)])
    bab.value = dataBab
    daftarKuis.value = kuis
  } catch (err) {
    gagalMuat.value = true
    tanganiError(err)
  } finally {
    memuat.value = false
  }
})

async function handleHapus(kuis) {
  if (!window.confirm(`Hapus kuis "${kuis.judul}"? Tindakan ini tidak bisa dibatalkan.`)) return

  errorMsg.value = ''
  infoMsg.value = ''
  try {
    infoMsg.value = await hapusKuis(kuis.idKuis)
    daftarKuis.value = daftarKuis.value.filter((k) => k.idKuis !== kuis.idKuis)
  } catch (err) {
    tanganiError(err)
  }
}
</script>

<template>
  <div class="min-h-screen bg-wf-page text-wf-text">
    <AdminHeader />

    <main class="px-4 sm:px-10 lg:px-20 py-10 flex flex-col gap-6">
      <div class="flex flex-col gap-2">
        <p class="font-mono text-[15px] leading-5 tracking-[1px] text-wf-secondary uppercase">
          <RouterLink to="/bab" class="hover:underline normal-case">← Bab</RouterLink>
          <template v-if="bab"> / {{ bab.namaBab }}</template> / KELOLA KUIS
        </p>
        <h1 class="text-[28px] leading-9 font-semibold">Kelola Kuis</h1>
        <p class="text-[17px] lg:text-[19px] leading-[26px] text-wf-secondary">
          Tambah, ubah, dan hapus kuis beserta soalnya<template v-if="bab"> di bab {{ bab.namaBab }}</template>.
        </p>
      </div>

      <p v-if="memuat" class="text-wf-muted">Memuat daftar kuis...</p>

      <p
        v-else-if="gagalMuat"
        role="alert"
        class="rounded-md bg-red-50 border border-wf-no-border px-4 py-3 text-[15px] text-wf-no-text"
      >
        {{ errorMsg }} <RouterLink to="/bab" class="underline font-semibold">Kembali ke daftar bab</RouterLink>
      </p>

      <template v-else>
        <div class="flex flex-wrap items-center gap-4 lg:gap-6">
          <input
            v-model="cari"
            type="search"
            placeholder="Cari judul kuis"
            aria-label="Cari judul kuis"
            class="flex-1 min-w-[240px] bg-wf-card border border-wf-border rounded-md p-4 text-[17px] lg:text-[19px] leading-[26px] placeholder:text-wf-muted focus:outline-none focus:ring-2 focus:ring-wf-brand"
          />

          <div v-if="adaStatus" class="flex items-center gap-3" role="group" aria-label="Filter status">
            <button
              v-for="opsi in [
                { nilai: 'semua', label: 'Semua kuis' },
                { nilai: 'terbit', label: 'Terbit' },
                { nilai: 'draf', label: 'Draf' },
              ]"
              :key="opsi.nilai"
              type="button"
              @click="filterStatus = opsi.nilai"
              :aria-pressed="filterStatus === opsi.nilai"
              class="px-2 py-1 rounded-md border text-[17px] font-semibold tracking-[0.5px]"
              :class="
                filterStatus === opsi.nilai
                  ? 'bg-wf-ok border-wf-brand-border text-white'
                  : 'bg-wf-brand-soft border-wf-brand-border text-wf-text'
              "
            >
              {{ opsi.label }}
            </button>
          </div>

          <RouterLink
            :to="`/kuis/tambah?idBab=${id}`"
            class="ml-auto rounded-xl bg-wf-accent hover:bg-wf-accent-hover px-6 py-4 text-[20px] lg:text-[22px] leading-7 font-semibold tracking-[0.2px] text-white transition"
          >
            + TAMBAH KUIS
          </RouterLink>
        </div>

        <p v-if="infoMsg" role="status" class="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-[15px] text-green-800">
          {{ infoMsg }}
        </p>
        <p v-if="errorMsg" role="alert" class="rounded-md bg-red-50 border border-wf-no-border px-4 py-3 text-[15px] text-wf-no-text">
          {{ errorMsg }}
        </p>

        <div
          v-if="daftarKuis.length === 0"
          class="bg-wf-card border border-dashed border-wf-border rounded-md px-6 py-10 text-center text-wf-secondary"
        >
          <p class="text-[19px] font-semibold text-wf-text">Belum ada kuis di bab ini</p>
          <p class="mt-1 text-[15px]">Klik <b>+ TAMBAH KUIS</b> untuk membuat kuis pertama.</p>
        </div>

        <p v-else-if="kuisTersaring.length === 0" class="text-wf-muted">
          Tidak ada kuis yang cocok dengan pencarian.
        </p>

        <section v-else class="flex flex-col gap-4">
          <div class="flex items-center justify-between font-mono">
            <h2 class="text-[17px] leading-6 tracking-[0.6px] text-wf-secondary">KUIS</h2>
            <p class="text-[15px] leading-5 tracking-[1px] text-wf-muted">{{ daftarKuis.length }} kuis</p>
          </div>

          <article
            v-for="kuis in kuisTersaring"
            :key="kuis.idKuis"
            class="bg-wf-card border border-wf-border-subtle rounded-md px-6 py-5 flex flex-wrap items-center gap-x-6 gap-y-3"
          >
            <div class="flex-1 min-w-[240px] flex flex-col gap-2">
              <h3 class="text-[19px] leading-[26px] font-semibold">{{ kuis.judul }}</h3>
              <p class="font-mono text-[14px] lg:text-[15px] leading-5 tracking-[1px] text-wf-muted">
                {{ keteranganKuis(kuis) }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <span
                v-if="kuis.status"
                class="px-2 py-1 rounded-md border text-[17px] font-semibold tracking-[0.5px]"
                :class="kuis.status === 'terbit' ? 'bg-wf-accent-light border-wf-accent-hover' : 'bg-wf-brand-soft border-wf-brand-border'"
              >
                {{ kuis.status === 'terbit' ? 'Terbit' : 'Draf' }}
              </span>
              <template v-if="milikSendiri(kuis)">
                <RouterLink :to="`/kuis/${kuis.idKuis}/soal`" class="tombol-aksi">Edit Soal</RouterLink>
                <RouterLink :to="`/kuis/${kuis.idKuis}/edit`" class="tombol-aksi">Edit</RouterLink>
                <button type="button" @click="handleHapus(kuis)" class="tombol-aksi-bahaya">Hapus</button>
              </template>
              <RouterLink v-else :to="`/kuis/${kuis.idKuis}/soal`" class="tombol-aksi">Lihat</RouterLink>
            </div>
          </article>
        </section>
      </template>
    </main>
  </div>
</template>
