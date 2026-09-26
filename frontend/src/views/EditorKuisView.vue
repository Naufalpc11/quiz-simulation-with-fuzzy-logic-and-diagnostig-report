<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import AdminHeader from '../components/AdminHeader.vue'
import { setNotice, SessionExpiredError } from '../services/auth'
import {
  TINGKAT_KESULITAN,
  EndpointBelumAdaError,
  hurufOpsi,
  ambilDaftarBab,
  ambilKuis,
  buatKuis,
  ubahKuis,
  ambilSoalKuis,
  simpanSoalKuis,
} from '../services/kuis'
import pencilIcon from '../assets/icons/pencil.svg'
import fileIcon from '../assets/icons/file.svg'
import fileUpIcon from '../assets/icons/file-up.svg'
import downloadIcon from '../assets/icons/arrow-down-to-line.svg'
import trashIcon from '../assets/icons/trash-2.svg'
import radioCheckedIcon from '../assets/icons/radio-checked.svg'

// Satu halaman untuk dua keperluan:
// - /kuis/tambah      → membuat kuis baru beserta soalnya
// - /kuis/:id/soal    → mengedit soal kuis yang sudah ada
const props = defineProps({ id: { type: String, default: null } })

const route = useRoute()
const router = useRouter()

const MAKS_OPSI = 6
const MIN_OPSI = 2

const modeEdit = computed(() => Boolean(props.id))
const metode = ref('manual')

const daftarBab = ref([])
const info = ref({ judul: '', idBab: null, deskripsi: '' })
const daftarSoal = ref([soalKosong()])
const indeksAktif = ref(0)

const memuat = ref(true)
const menyimpan = ref(false)
const errorMsg = ref('')
const infoMsg = ref('')
const sudahCobaSimpan = ref(false)

// Kalau kuis sudah terbuat tapi soalnya gagal tersimpan, percobaan
// berikutnya cukup memperbarui kuis itu, bukan membuat kuis kembar.
const idKuisTersimpan = ref(props.id)

function soalKosong() {
  return {
    pertanyaan: '',
    opsi: ['', '', '', '', ''],
    kunci: null,
    difficulty: 'Sedang',
    targetTime: 60,
    pembahasan: '',
    ringkasan: '',
  }
}

const soal = computed(() => daftarSoal.value[indeksAktif.value])
const namaBabAktif = computed(
  () => daftarBab.value.find((b) => b.idBab === info.value.idBab)?.namaBab ?? '',
)

// ── Validasi ──

function masalahSoal(s) {
  if (!s.pertanyaan.trim()) return 'pertanyaan masih kosong'
  if (s.opsi.length < MIN_OPSI) return `minimal ${MIN_OPSI} opsi jawaban`
  if (s.opsi.some((o) => !o.trim())) return 'ada opsi jawaban yang kosong'
  if (s.kunci === null) return 'jawaban benar belum dipilih'
  if (!(Number(s.targetTime) > 0)) return 'durasi harus lebih dari 0 detik'
  return null
}

const jumlahLengkap = computed(() => daftarSoal.value.filter((s) => !masalahSoal(s)).length)

function kelasNomor(i) {
  if (i === indeksAktif.value) return 'bg-wf-brand-soft border-2 border-wf-brand text-wf-brand'
  if (sudahCobaSimpan.value && masalahSoal(daftarSoal.value[i])) return 'bg-red-50 border border-wf-no text-wf-no'
  if (!masalahSoal(daftarSoal.value[i])) return 'bg-wf-card border border-wf-brand-border text-wf-secondary'
  return 'bg-wf-card border border-wf-border text-wf-secondary'
}

// ── Navigasi soal ──

function pindahKe(i) {
  indeksAktif.value = i
}

function tambahSoal() {
  daftarSoal.value.push(soalKosong())
  indeksAktif.value = daftarSoal.value.length - 1
}

function selanjutnya() {
  if (indeksAktif.value === daftarSoal.value.length - 1) tambahSoal()
  else indeksAktif.value += 1
}

function hapusSoalAktif() {
  if (daftarSoal.value.length === 1) return
  if (!window.confirm(`Hapus soal ${indeksAktif.value + 1}?`)) return
  daftarSoal.value.splice(indeksAktif.value, 1)
  indeksAktif.value = Math.min(indeksAktif.value, daftarSoal.value.length - 1)
}

// ── Opsi jawaban ──

function tambahOpsi() {
  if (soal.value.opsi.length < MAKS_OPSI) soal.value.opsi.push('')
}

function hapusOpsi(i) {
  const s = soal.value
  if (s.opsi.length <= MIN_OPSI) return
  s.opsi.splice(i, 1)
  // Kunci ikut bergeser karena huruf opsi setelahnya ikut maju satu.
  if (s.kunci === i) s.kunci = null
  else if (s.kunci !== null && s.kunci > i) s.kunci -= 1
}

// ── Perubahan belum tersimpan ──

const snapshotAwal = ref('')
const bersih = ref(false)

function snapshot() {
  return JSON.stringify({ info: info.value, soal: daftarSoal.value })
}

const adaPerubahan = computed(() => !bersih.value && snapshot() !== snapshotAwal.value)

onBeforeRouteLeave(() => {
  if (adaPerubahan.value && !window.confirm('Perubahan belum disimpan. Tetap keluar?')) return false
})

function cegahTutupTab(e) {
  if (adaPerubahan.value) e.preventDefault()
}

// ── Muat data ──

function tanganiError(err) {
  if (err instanceof SessionExpiredError) {
    bersih.value = true
    router.push('/')
    return
  }
  errorMsg.value = err.message
}

onMounted(async () => {
  window.addEventListener('beforeunload', cegahTutupTab)
  try {
    daftarBab.value = await ambilDaftarBab()

    if (modeEdit.value) {
      const kuis = await ambilKuis(props.id)
      info.value = { judul: kuis.judul, idBab: kuis.idBab, deskripsi: kuis.deskripsi ?? '' }

      try {
        const soalLama = await ambilSoalKuis(props.id)
        if (soalLama.length) daftarSoal.value = soalLama
      } catch (err) {
        if (!(err instanceof EndpointBelumAdaError)) throw err
        infoMsg.value = 'Soal lama belum bisa dimuat karena endpoint soal belum tersedia di backend.'
      }
    } else {
      // ?idBab=... dari link lain dipilih lebih dulu, kalau tidak ada pakai bab pertama.
      const dariQuery = daftarBab.value.find((b) => String(b.idBab) === route.query.idBab)
      info.value.idBab = (dariQuery ?? daftarBab.value[0])?.idBab ?? null
    }
  } catch (err) {
    tanganiError(err)
  } finally {
    snapshotAwal.value = snapshot()
    memuat.value = false
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', cegahTutupTab)
  if (urlBerkas.value) URL.revokeObjectURL(urlBerkas.value)
})

// ── Simpan ──

async function simpan() {
  errorMsg.value = ''
  infoMsg.value = ''
  sudahCobaSimpan.value = true

  if (!info.value.judul.trim()) {
    errorMsg.value = 'Nama kuis wajib diisi.'
    return
  }
  if (!info.value.idBab) {
    errorMsg.value = 'Pilih bab untuk kuis ini.'
    return
  }
  const indeksSalah = daftarSoal.value.findIndex((s) => masalahSoal(s))
  if (indeksSalah !== -1) {
    indeksAktif.value = indeksSalah
    errorMsg.value = `Soal ${indeksSalah + 1}: ${masalahSoal(daftarSoal.value[indeksSalah])}.`
    return
  }

  menyimpan.value = true
  const dataKuis = {
    judul: info.value.judul,
    idBab: info.value.idBab,
    deskripsi: info.value.deskripsi.trim() || null,
  }

  try {
    if (idKuisTersimpan.value) {
      await ubahKuis(idKuisTersimpan.value, dataKuis)
    } else {
      const kuis = await buatKuis(dataKuis)
      idKuisTersimpan.value = kuis.idKuis
    }

    await simpanSoalKuis(idKuisTersimpan.value, daftarSoal.value)

    bersih.value = true
    setNotice(`Kuis "${dataKuis.judul}" berhasil disimpan dengan ${daftarSoal.value.length} soal.`)
    router.push('/kuis')
  } catch (err) {
    if (err instanceof EndpointBelumAdaError) {
      errorMsg.value =
        'Info kuis sudah tersimpan, tetapi soalnya belum: endpoint soal belum tersedia di backend. ' +
        'Jangan tutup halaman ini kalau soalnya ingin dipertahankan.'
    } else {
      tanganiError(err)
    }
  } finally {
    menyimpan.value = false
  }
}

function batal() {
  router.push('/kuis')
}

// ── Tab Dokumen ──

const TIPE_DOKUMEN = ['pdf', 'doc', 'docx']
const MAKS_UKURAN = 10 * 1024 * 1024

const berkas = ref(null)
const urlBerkas = ref('')
const errorBerkas = ref('')
const sedangSeret = ref(false)
const inputBerkas = ref(null)

function ekstensi(nama) {
  return nama.split('.').pop().toLowerCase()
}

function formatUkuran(byte) {
  return `${(byte / (1024 * 1024)).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`
}

function pilihBerkas(file) {
  errorBerkas.value = ''
  if (!file) return
  if (!TIPE_DOKUMEN.includes(ekstensi(file.name))) {
    errorBerkas.value = 'Format berkas harus PDF, DOC, atau DOCX.'
    return
  }
  if (file.size > MAKS_UKURAN) {
    errorBerkas.value = 'Ukuran berkas maksimal 10 MB.'
    return
  }
  if (urlBerkas.value) URL.revokeObjectURL(urlBerkas.value)
  berkas.value = file
  urlBerkas.value = URL.createObjectURL(file)
}

function saatDrop(e) {
  sedangSeret.value = false
  pilihBerkas(e.dataTransfer.files[0])
}

function hapusBerkas() {
  if (urlBerkas.value) URL.revokeObjectURL(urlBerkas.value)
  berkas.value = null
  urlBerkas.value = ''
  if (inputBerkas.value) inputBerkas.value.value = ''
}
</script>

<template>
  <div class="min-h-screen bg-wf-page text-wf-text">
    <AdminHeader />

    <main class="px-4 sm:px-10 lg:px-20 pt-10 pb-14 flex flex-col gap-6">
      <!-- Judul halaman -->
      <div class="flex flex-col gap-2">
        <p class="font-mono text-[15px] leading-5 tracking-[1px] text-wf-secondary">
          <RouterLink to="/kuis" class="hover:underline">← Kuis</RouterLink>
          / {{ modeEdit ? 'EDIT SOAL' : 'TAMBAH KUIS' }}
        </p>
        <h1 class="text-[28px] leading-9 font-semibold">{{ modeEdit ? 'Edit Soal' : 'Tambah Kuis' }}</h1>
        <p class="text-[17px] leading-6 text-wf-secondary">
          {{
            modeEdit
              ? 'Ubah pertanyaan, pilihan jawaban, jawaban benar, dan pembahasan.'
              : 'Pilih cara membuat kuis, sesuaikan dengan kebutuhan.'
          }}
        </p>
      </div>

      <!-- Metode pembuatan -->
      <div v-if="!modeEdit" class="flex flex-wrap gap-3" role="tablist" aria-label="Metode pembuatan">
        <button
          v-for="tab in [
            { nilai: 'manual', label: 'Input Manual', ikon: pencilIcon },
            { nilai: 'dokumen', label: 'Dokumen', ikon: fileIcon },
          ]"
          :key="tab.nilai"
          type="button"
          role="tab"
          :aria-selected="metode === tab.nilai"
          @click="metode = tab.nilai"
          class="flex items-center gap-2 px-5 py-3 rounded-md text-[17px] leading-6"
          :class="
            metode === tab.nilai
              ? 'bg-wf-brand-soft border-2 border-wf-brand text-wf-brand font-semibold'
              : 'bg-wf-card border border-wf-border text-wf-secondary'
          "
        >
          <span class="size-[18px] shrink-0"><img :src="tab.ikon" alt="" class="size-full" /></span>
          {{ tab.label }}
        </button>
      </div>

      <p v-if="memuat" class="text-wf-muted">Memuat data...</p>

      <!-- ════════ INPUT MANUAL ════════ -->
      <section
        v-else-if="metode === 'manual'"
        class="bg-wf-card border border-wf-border-subtle rounded-xl p-5 lg:p-7 flex flex-col gap-6"
      >
        <p v-if="!modeEdit" class="-mt-1 text-[14px] leading-normal text-wf-secondary">
          Tambahkan pertanyaan, pilihan jawaban, jawaban benar, dan pembahasan.
        </p>

        <!-- Baris judul -->
        <div class="flex flex-wrap items-end gap-4">
          <div class="flex-1 min-w-[260px] flex flex-col gap-1">
            <p class="text-[15px] leading-5 font-semibold tracking-[1px] uppercase min-h-7">
              {{ namaBabAktif }}
            </p>
            <div class="flex flex-wrap gap-4">
              <label class="flex flex-col gap-2 w-full sm:w-[360px]">
                <span class="font-mono font-bold text-[16px] lg:text-[18px] leading-5 tracking-[1px] text-wf-muted">NAMA KUIS</span>
                <input
                  v-model="info.judul"
                  type="text"
                  placeholder="mis. Huruf Kapital"
                  class="bg-wf-card border border-wf-border rounded-md p-4 text-[17px] leading-6 placeholder:text-wf-muted focus:outline-none focus:ring-2 focus:ring-wf-brand"
                />
              </label>
              <label class="flex flex-col gap-2 w-full sm:w-[260px]">
                <span class="font-mono font-bold text-[16px] lg:text-[18px] leading-5 tracking-[1px] text-wf-muted">BAB</span>
                <select
                  v-model="info.idBab"
                  class="bg-wf-card border border-wf-border rounded-md p-4 text-[17px] leading-6 focus:outline-none focus:ring-2 focus:ring-wf-brand"
                >
                  <option :value="null" disabled>Pilih bab</option>
                  <option v-for="bab in daftarBab" :key="bab.idBab" :value="bab.idBab">{{ bab.namaBab }}</option>
                </select>
              </label>
            </div>
          </div>

          <div class="flex gap-4">
            <button
              type="button"
              @click="batal"
              class="rounded-xl bg-wf-no border border-wf-no-border px-6 py-4 text-[20px] lg:text-[22px] leading-7 font-semibold tracking-[0.2px] text-white"
            >
              BATAL
            </button>
            <button
              type="button"
              @click="simpan"
              :disabled="menyimpan"
              class="rounded-xl bg-wf-accent hover:bg-wf-accent-hover px-6 py-4 text-[20px] lg:text-[22px] leading-7 font-semibold tracking-[0.2px] text-white disabled:opacity-60 min-w-[190px]"
            >
              {{ menyimpan ? 'MENYIMPAN...' : 'SIMPAN KUIS' }}
            </button>
          </div>
        </div>

        <p v-if="infoMsg" role="status" class="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-[15px] text-amber-800">
          {{ infoMsg }}
        </p>
        <p v-if="errorMsg" role="alert" class="rounded-md bg-red-50 border border-wf-no-border px-4 py-3 text-[15px] text-wf-no-text">
          {{ errorMsg }}
        </p>

        <div class="flex flex-col lg:flex-row gap-6 items-start">
          <!-- Kolom kiri: isi soal -->
          <div class="flex-1 min-w-0 w-full flex flex-col gap-5">
            <div class="flex items-center gap-3">
              <p class="flex-1 text-[17px] lg:text-[19px] leading-5 font-semibold tracking-[1px]">
                PENGISIAN SOAL {{ indeksAktif + 1 }}
              </p>
              <span class="bg-wf-brand-soft border border-wf-brand-border rounded-md px-2 py-1 text-[17px] lg:text-[19px] leading-[22px] font-semibold tracking-[0.5px]">
                Pilihan ganda
              </span>
            </div>

            <div class="flex flex-col gap-2">
              <label for="pertanyaan" class="text-[16px] lg:text-[18px] leading-5 font-semibold tracking-[1px] text-wf-muted">
                PERTANYAAN
              </label>
              <textarea
                id="pertanyaan"
                v-model="soal.pertanyaan"
                rows="5"
                placeholder="Tulis pertanyaan di sini, termasuk stimulus bila ada."
                class="border border-wf-border-subtle rounded-md p-4 text-[17px] lg:text-[19px] leading-[26px] placeholder:text-wf-muted focus:outline-none focus:ring-2 focus:ring-wf-brand"
              ></textarea>

              <label class="flex flex-col gap-2 w-full sm:w-[360px] mt-1">
                <span class="font-mono text-[15px] leading-5 tracking-[1px] text-wf-secondary">DURASI (DETIK)</span>
                <input
                  v-model.number="soal.targetTime"
                  type="number"
                  min="1"
                  class="bg-wf-card border border-wf-border rounded-md p-4 text-[17px] leading-6 focus:outline-none focus:ring-2 focus:ring-wf-brand"
                />
                <span class="text-[13px] text-wf-muted">Target waktu mengerjakan soal ini, dipakai penilaian fuzzy.</span>
              </label>
            </div>

            <div class="flex items-center gap-3">
              <button
                type="button"
                @click="pindahKe(indeksAktif - 1)"
                :disabled="indeksAktif === 0"
                class="rounded-xl border px-4 lg:px-5 py-3 text-[16px] lg:text-[19px] leading-[26px] font-semibold tracking-[0.2px] disabled:bg-wf-muted-surface disabled:border-wf-border-subtle disabled:text-wf-muted bg-wf-card border-wf-brand-border text-wf-brand"
              >
                ← SEBELUMNYA
              </button>
              <p class="flex-1 text-center text-[16px] lg:text-[19px] leading-[26px] text-wf-secondary">
                Soal {{ indeksAktif + 1 }} dari {{ daftarSoal.length }}
              </p>
              <button
                type="button"
                @click="selanjutnya"
                class="rounded-xl bg-wf-card border border-wf-brand-border px-4 lg:px-5 py-3 text-[16px] lg:text-[19px] leading-[26px] font-semibold tracking-[0.2px] text-wf-brand"
              >
                {{ indeksAktif === daftarSoal.length - 1 ? '+ SOAL BARU' : 'SELANJUTNYA →' }}
              </button>
            </div>

            <div class="flex items-center gap-3 font-semibold">
              <p class="flex-1 text-[15px] leading-5 tracking-[1px] text-wf-muted">OPSI JAWABAN</p>
              <button
                type="button"
                @click="tambahOpsi"
                :disabled="soal.opsi.length >= MAKS_OPSI"
                class="text-[17px] lg:text-[19px] leading-[26px] text-wf-brand disabled:text-wf-muted"
              >
                + Tambah opsi
              </button>
            </div>

            <ul class="flex flex-col gap-3">
              <li v-for="(_, i) in soal.opsi" :key="i" class="flex items-center gap-3">
                <span class="size-12 shrink-0 flex items-center justify-center bg-wf-muted-surface border border-wf-border rounded-md text-[19px] font-semibold">
                  {{ hurufOpsi(i) }}
                </span>
                <input
                  v-model="soal.opsi[i]"
                  type="text"
                  :aria-label="`Opsi ${hurufOpsi(i)}`"
                  :placeholder="`Isi opsi ${hurufOpsi(i)}`"
                  class="flex-1 min-w-0 border border-wf-border-subtle rounded-md px-4 py-3 text-[17px] lg:text-[19px] leading-[26px] placeholder:text-wf-muted focus:outline-none focus:ring-2 focus:ring-wf-brand"
                />
                <button
                  type="button"
                  @click="hapusOpsi(i)"
                  :disabled="soal.opsi.length <= MIN_OPSI"
                  :aria-label="`Hapus opsi ${hurufOpsi(i)}`"
                  class="text-[19px] font-semibold text-wf-no disabled:text-wf-border px-1"
                >
                  ✕
                </button>
              </li>
            </ul>

            <label class="flex flex-col gap-2">
              <span class="text-[15px] leading-5 font-semibold tracking-[1px] text-wf-muted">PEMBAHASAN</span>
              <textarea
                v-model="soal.pembahasan"
                rows="4"
                placeholder="Jelaskan mengapa jawaban tersebut benar."
                class="border border-wf-border-subtle rounded-md p-4 text-[17px] lg:text-[19px] leading-[26px] placeholder:text-wf-muted focus:outline-none focus:ring-2 focus:ring-wf-brand"
              ></textarea>
            </label>

            <label class="flex flex-col gap-2">
              <span class="text-[15px] leading-5 font-semibold tracking-[1px] text-wf-muted">RINGKASAN</span>
              <textarea
                v-model="soal.ringkasan"
                rows="4"
                placeholder="Ringkasan materi singkat untuk laporan diagnostik."
                class="border border-wf-border-subtle rounded-md p-4 text-[17px] lg:text-[19px] leading-[26px] placeholder:text-wf-muted focus:outline-none focus:ring-2 focus:ring-wf-brand"
              ></textarea>
            </label>

            <button
              v-if="daftarSoal.length > 1"
              type="button"
              @click="hapusSoalAktif"
              class="self-start text-[15px] text-wf-no-text hover:underline"
            >
              Hapus soal {{ indeksAktif + 1 }}
            </button>
          </div>

          <!-- Kolom kanan -->
          <aside class="w-full lg:w-[320px] shrink-0 flex flex-col gap-5">
            <div class="border border-wf-border-subtle rounded-xl p-5 flex flex-col gap-3">
              <p class="text-[15px] leading-5 font-semibold tracking-[1px] text-wf-muted">NAVIGASI SOAL</p>
              <div class="grid grid-cols-5 gap-2">
                <button
                  v-for="(_, i) in daftarSoal"
                  :key="i"
                  type="button"
                  @click="pindahKe(i)"
                  :aria-current="i === indeksAktif ? 'step' : undefined"
                  :aria-label="`Soal ${i + 1}`"
                  class="h-12 rounded-md text-[19px] font-semibold"
                  :class="kelasNomor(i)"
                >
                  {{ i + 1 }}
                </button>
                <button
                  type="button"
                  @click="tambahSoal"
                  aria-label="Tambah soal"
                  class="h-12 rounded-md border border-dashed border-wf-brand-border text-[19px] font-semibold text-wf-brand"
                >
                  +
                </button>
              </div>
              <p class="text-[15px] lg:text-[17px] leading-6 text-wf-muted">
                {{ daftarSoal.length }} soal · {{ jumlahLengkap }} lengkap
              </p>
            </div>

            <div class="border border-wf-border-subtle rounded-xl p-5 flex flex-col gap-3">
              <p class="text-[15px] leading-5 font-semibold tracking-[1px] text-wf-muted">PENGATURAN SOAL</p>
              <label for="kesulitan" class="text-[15px] leading-5 font-semibold tracking-[1px] text-wf-secondary">
                TINGKAT KESULITAN
              </label>
              <select
                id="kesulitan"
                v-model="soal.difficulty"
                class="bg-wf-card border border-wf-border rounded-md px-4 py-3 text-[17px] lg:text-[19px] leading-[26px] focus:outline-none focus:ring-2 focus:ring-wf-brand"
              >
                <option v-for="t in TINGKAT_KESULITAN" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>

            <fieldset class="border border-wf-border-subtle rounded-xl p-5 flex flex-col gap-3">
              <legend class="sr-only">Jawaban yang benar</legend>
              <p class="text-[15px] leading-5 font-semibold tracking-[1px] text-wf-muted">JAWABAN YANG BENAR</p>
              <p class="text-[15px] lg:text-[17px] leading-6 text-wf-secondary">Pilih satu opsi sebagai jawaban benar.</p>
              <label
                v-for="(teks, i) in soal.opsi"
                :key="i"
                class="flex items-center gap-2.5 px-3.5 py-3 rounded-md cursor-pointer"
                :class="soal.kunci === i ? 'bg-wf-brand-soft border-2 border-wf-brand' : 'bg-wf-card border border-wf-border-subtle'"
              >
                <input
                  v-model="soal.kunci"
                  type="radio"
                  name="kunci"
                  :value="i"
                  :aria-label="`Opsi ${hurufOpsi(i)} benar`"
                  class="sr-only"
                />
                <span class="size-5 shrink-0">
                  <img v-if="soal.kunci === i" :src="radioCheckedIcon" alt="" class="size-full" />
                  <span v-else class="block size-full rounded-full border border-wf-border"></span>
                </span>
                <span class="text-[19px] leading-[26px] font-semibold">{{ hurufOpsi(i) }}</span>
                <span
                  class="flex-1 min-w-0 truncate text-[15px] lg:text-[17px] leading-6"
                  :class="soal.kunci === i ? 'text-wf-text' : 'text-wf-muted'"
                >
                  {{ teks || '(kosong)' }}
                </span>
              </label>
            </fieldset>
          </aside>
        </div>
      </section>

      <!-- ════════ DOKUMEN ════════ -->
      <section
        v-else
        class="bg-wf-card border border-wf-border-subtle rounded-md shadow-sm p-6 flex flex-col gap-6"
      >
        <div class="flex flex-col gap-1">
          <h2 class="text-[22px] leading-[30px] font-semibold">Unggah dokumen kuis</h2>
          <p class="text-[17px] leading-6 text-wf-secondary">Lampirkan PDF atau dokumen berisi soal dan kunci jawaban.</p>
        </div>

        <p role="status" class="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-[15px] text-amber-800">
          Segera hadir: ekstraksi soal dari dokumen masih dikerjakan di backend. Untuk sekarang gunakan
          <button type="button" class="underline font-semibold" @click="metode = 'manual'">Input Manual</button>.
        </p>

        <label class="flex flex-col gap-2">
          <span class="font-mono text-[15px] leading-5 tracking-[1px] text-wf-secondary">NAMA KUIS</span>
          <input
            v-model="info.judul"
            type="text"
            placeholder="mis. Huruf Kapital"
            class="border border-wf-border rounded-md p-4 text-[17px] leading-6 placeholder:text-wf-muted focus:outline-none focus:ring-2 focus:ring-wf-brand"
          />
        </label>

        <div class="flex flex-col gap-2">
          <span class="font-mono text-[15px] leading-5 tracking-[1px] text-wf-secondary">DOKUMEN / LAMPIRAN</span>
          <label
            @dragover.prevent="sedangSeret = true"
            @dragleave="sedangSeret = false"
            @drop.prevent="saatDrop"
            class="flex flex-col items-center gap-2 p-7 rounded-md border border-dashed cursor-pointer text-center"
            :class="sedangSeret ? 'bg-wf-brand-soft border-wf-brand' : 'bg-wf-muted-surface border-wf-border'"
          >
            <input
              ref="inputBerkas"
              type="file"
              accept=".pdf,.doc,.docx"
              class="sr-only"
              @change="pilihBerkas($event.target.files[0])"
            />
            <span class="size-7"><img :src="fileUpIcon" alt="" class="size-full" /></span>
            <span class="text-[17px] leading-6 text-wf-secondary">Seret berkas ke sini atau klik untuk memilih</span>
            <span class="font-mono text-[15px] leading-5 tracking-[1px] text-wf-muted">PDF, DOC, atau DOCX · maksimal 10 MB</span>
          </label>
          <p v-if="errorBerkas" role="alert" class="text-[15px] text-wf-no">{{ errorBerkas }}</p>
        </div>

        <div v-if="berkas" class="flex items-center gap-4 p-4 border border-wf-border rounded-md">
          <span class="size-12 shrink-0 flex items-center justify-center bg-wf-brand-soft rounded-md text-[13px] font-bold text-wf-brand uppercase">
            {{ ekstensi(berkas.name) }}
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-[17px] leading-6 font-semibold truncate">{{ berkas.name }}</p>
            <p class="text-[15px] leading-5 text-wf-muted">{{ formatUkuran(berkas.size) }}</p>
          </div>
          <div class="flex gap-3">
            <a
              :href="urlBerkas"
              :download="berkas.name"
              class="flex flex-col gap-1.5 px-3 py-2 border border-wf-border rounded-md text-[15px] text-wf-brand"
            >
              <span class="size-4"><img :src="downloadIcon" alt="" class="size-full" /></span>
              Unduh
            </a>
            <button
              type="button"
              @click="hapusBerkas"
              class="flex flex-col items-start gap-1.5 px-3 py-2 border border-wf-border rounded-md text-[15px] text-wf-secondary"
            >
              <span class="size-4"><img :src="trashIcon" alt="" class="size-full" /></span>
              Hapus
            </button>
          </div>
        </div>

        <div class="h-px bg-wf-border-subtle"></div>

        <div class="flex justify-end gap-4">
          <button
            type="button"
            @click="batal"
            class="rounded-xl bg-wf-card border border-wf-brand-border px-6 py-4 text-[18px] leading-6 font-semibold tracking-[0.2px] text-wf-brand"
          >
            BATAL
          </button>
          <button
            type="button"
            disabled
            title="Menunggu endpoint unggah dokumen di backend"
            class="rounded-xl bg-wf-accent-hover px-6 py-4 text-[18px] leading-6 font-semibold tracking-[0.2px] text-white opacity-50 cursor-not-allowed"
          >
            SIMPAN KUIS
          </button>
        </div>
      </section>
    </main>
  </div>
</template>
