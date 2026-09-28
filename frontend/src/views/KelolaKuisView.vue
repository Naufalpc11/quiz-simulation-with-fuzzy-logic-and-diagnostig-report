<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminHeader from '../components/AdminHeader.vue'
import { takeNotice, SessionExpiredError } from '../services/auth'
import { ambilDaftarBab, ambilDaftarKuis, ubahKuis, hapusKuis } from '../services/kuis'

const router = useRouter()

const daftarBab = ref([])
const daftarKuis = ref([])
const memuat = ref(true)
const errorMsg = ref('')
const infoMsg = ref('')
const cari = ref('')
const filterStatus = ref('semua')

// Kolom status (terbit/draf) belum ada di tabel Kuis. Chip filternya baru
// muncul kalau backend sudah mengirimkannya.
const adaStatus = computed(() => daftarKuis.value.some((k) => k.status))

const grupKuis = computed(() => {
  const kata = cari.value.trim().toLowerCase()
  const tersaring = daftarKuis.value.filter(
    (k) =>
      (!kata || k.judul.toLowerCase().includes(kata)) &&
      (filterStatus.value === 'semua' || k.status === filterStatus.value),
  )

  // daftarBab sudah terurut dari backend (urutanBab), jadi grup ikut urutan itu.
  const grup = daftarBab.value
    .map((bab) => ({
      id: bab.idBab,
      nama: bab.namaBab,
      kuis: tersaring.filter((k) => k.idBab === bab.idBab),
    }))
    .filter((g) => g.kuis.length > 0)

  const idBabDikenal = new Set(daftarBab.value.map((b) => b.idBab))
  const yatim = tersaring.filter((k) => !idBabDikenal.has(k.idBab))
  if (yatim.length) grup.push({ id: 'lainnya', nama: 'Tanpa bab', kuis: yatim })

  return grup
})

function formatTanggal(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function keteranganKuis(kuis) {
  const bagian = [`Dibuat ${formatTanggal(kuis.tanggalDibuat)}`]
  if (kuis.jumlahSoal != null) bagian.push(`${kuis.jumlahSoal} soal`)
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

async function muat() {
  memuat.value = true
  errorMsg.value = ''
  try {
    const [bab, kuis] = await Promise.all([ambilDaftarBab(), ambilDaftarKuis()])
    daftarBab.value = bab
    daftarKuis.value = kuis
  } catch (err) {
    tanganiError(err)
  } finally {
    memuat.value = false
  }
}

onMounted(() => {
  infoMsg.value = takeNotice() || ''
  muat()
})

// ── Edit info kuis (judul, bab, deskripsi) ──

const sedangDiedit = ref(null)
const menyimpanEdit = ref(false)
const errorEdit = ref('')

function bukaEdit(kuis) {
  errorEdit.value = ''
  sedangDiedit.value = {
    idKuis: kuis.idKuis,
    judul: kuis.judul,
    idBab: kuis.idBab,
    deskripsi: kuis.deskripsi ?? '',
  }
}

async function simpanEdit() {
  const data = sedangDiedit.value
  if (!data.judul.trim()) {
    errorEdit.value = 'Nama kuis wajib diisi.'
    return
  }

  menyimpanEdit.value = true
  errorEdit.value = ''
  try {
    const hasil = await ubahKuis(data.idKuis, {
      judul: data.judul,
      idBab: data.idBab,
      deskripsi: data.deskripsi.trim() || null,
    })
    daftarKuis.value = daftarKuis.value.map((k) => (k.idKuis === hasil.idKuis ? { ...k, ...hasil } : k))
    infoMsg.value = 'Kuis berhasil diperbarui.'
    sedangDiedit.value = null
  } catch (err) {
    if (err instanceof SessionExpiredError) return router.push('/')
    errorEdit.value = err.message
  } finally {
    menyimpanEdit.value = false
  }
}

// ── Hapus ──

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
        <h1 class="text-[28px] leading-9 font-semibold">Kelola Kuis</h1>
        <p class="text-[17px] lg:text-[19px] leading-[26px] text-wf-secondary">
          Tambah, ubah, dan hapus kuis beserta soalnya. Kuis dikelompokkan per bab.
        </p>
      </div>

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
          to="/kuis/tambah"
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

      <p v-if="memuat" class="text-wf-muted">Memuat daftar kuis...</p>

      <div
        v-else-if="!errorMsg && daftarKuis.length === 0"
        class="bg-wf-card border border-dashed border-wf-border rounded-md px-6 py-10 text-center text-wf-secondary"
      >
        <p class="text-[19px] font-semibold text-wf-text">Belum ada kuis</p>
        <p class="mt-1 text-[15px]">
          <template v-if="daftarBab.length">Klik <b>+ TAMBAH KUIS</b> untuk membuat kuis pertama.</template>
          <template v-else>Belum ada bab. Kuis harus masuk ke salah satu bab, jadi buat bab lebih dulu.</template>
        </p>
      </div>

      <p v-else-if="!errorMsg && grupKuis.length === 0" class="text-wf-muted">
        Tidak ada kuis yang cocok dengan pencarian.
      </p>

      <section v-for="grup in grupKuis" :key="grup.id" class="flex flex-col gap-4">
        <div class="flex items-center justify-between font-mono">
          <h2 class="text-[17px] leading-6 tracking-[0.6px] text-wf-secondary uppercase">{{ grup.nama }}</h2>
          <p class="text-[15px] leading-5 tracking-[1px] text-wf-muted">{{ grup.kuis.length }} kuis</p>
        </div>

        <article
          v-for="kuis in grup.kuis"
          :key="kuis.idKuis"
          class="bg-wf-card border border-wf-border-subtle rounded-md px-6 py-5 flex flex-wrap items-center gap-x-6 gap-y-3"
        >
          <div class="flex-1 min-w-[240px] flex flex-col gap-2">
            <h3 class="text-[19px] leading-[26px] font-semibold">{{ kuis.judul }}</h3>
            <p class="font-mono text-[14px] lg:text-[15px] leading-5 tracking-[1px] text-wf-muted">
              {{ keteranganKuis(kuis) }}
            </p>
          </div>

          <div class="flex items-center gap-6 text-[17px] leading-6">
            <span
              v-if="kuis.status"
              class="px-2 py-1 rounded-md border font-semibold tracking-[0.5px]"
              :class="kuis.status === 'terbit' ? 'bg-wf-accent-light border-wf-accent-hover' : 'bg-wf-brand-soft border-wf-brand-border'"
            >
              {{ kuis.status === 'terbit' ? 'Terbit' : 'Draf' }}
            </span>
            <RouterLink :to="`/kuis/${kuis.idKuis}/soal`" class="text-wf-brand hover:underline">Edit Soal</RouterLink>
            <button type="button" @click="bukaEdit(kuis)" class="text-wf-brand hover:underline">Edit</button>
            <button type="button" @click="handleHapus(kuis)" class="text-wf-no-text hover:underline">Hapus</button>
          </div>
        </article>
      </section>
    </main>

    <!-- Dialog edit info kuis -->
    <div
      v-if="sedangDiedit"
      class="fixed inset-0 z-20 bg-black/40 flex items-center justify-center p-4"
      @click.self="sedangDiedit = null"
    >
      <form
        @submit.prevent="simpanEdit"
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-dialog-edit"
        class="w-full max-w-lg bg-wf-card rounded-xl p-6 flex flex-col gap-4 shadow-xl"
      >
        <h2 id="judul-dialog-edit" class="text-[22px] leading-[30px] font-semibold">Edit Kuis</h2>

        <label class="flex flex-col gap-2">
          <span class="font-mono text-[15px] tracking-[1px] text-wf-secondary">NAMA KUIS</span>
          <input
            v-model="sedangDiedit.judul"
            type="text"
            class="border border-wf-border rounded-md px-4 py-3 text-[17px] focus:outline-none focus:ring-2 focus:ring-wf-brand"
          />
        </label>

        <label class="flex flex-col gap-2">
          <span class="font-mono text-[15px] tracking-[1px] text-wf-secondary">BAB</span>
          <select
            v-model="sedangDiedit.idBab"
            class="border border-wf-border rounded-md px-4 py-3 text-[17px] bg-wf-card focus:outline-none focus:ring-2 focus:ring-wf-brand"
          >
            <option v-for="bab in daftarBab" :key="bab.idBab" :value="bab.idBab">{{ bab.namaBab }}</option>
          </select>
        </label>

        <label class="flex flex-col gap-2">
          <span class="font-mono text-[15px] tracking-[1px] text-wf-secondary">DESKRIPSI (OPSIONAL)</span>
          <textarea
            v-model="sedangDiedit.deskripsi"
            rows="3"
            class="border border-wf-border rounded-md px-4 py-3 text-[17px] focus:outline-none focus:ring-2 focus:ring-wf-brand"
          ></textarea>
        </label>

        <p v-if="errorEdit" role="alert" class="text-[15px] text-wf-no">{{ errorEdit }}</p>

        <div class="flex justify-end gap-3">
          <button
            type="button"
            @click="sedangDiedit = null"
            class="rounded-xl border border-wf-brand-border px-5 py-3 font-semibold text-wf-brand"
          >
            BATAL
          </button>
          <button
            type="submit"
            :disabled="menyimpanEdit"
            class="rounded-xl bg-wf-accent-hover px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            {{ menyimpanEdit ? 'MENYIMPAN...' : 'SIMPAN' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
