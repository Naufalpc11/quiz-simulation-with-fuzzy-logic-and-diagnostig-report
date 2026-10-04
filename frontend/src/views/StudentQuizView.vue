<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ambilKuis, ambilSoalKuis } from '../services/kuis'
import { getAvatar, getUser, SessionExpiredError } from '../services/auth'
import logoImage from '../assets/logo-esikap.png'
import avatarImage from '../assets/icons/avatar.svg'

const props = defineProps({ id: { type: String, required: true } })
const router = useRouter()
const user = ref(getUser())
const avatar = ref(getAvatar() || avatarImage)
const kuis = ref(null)
const soal = ref([])
const jawaban = ref({})
const ragu = ref(new Set())
const nomorAktif = ref(0)
const sisaDetik = ref(40 * 60)
const loading = ref(true)
const errorMsg = ref('')
const submitted = ref(false)
let timerId

const soalAktif = computed(() => soal.value[nomorAktif.value])
const terjawab = computed(() => Object.keys(jawaban.value).length)
const jumlahRagu = computed(() => [...ragu.value].filter((index) => jawaban.value[index] !== undefined).length)
const belumDijawab = computed(() => soal.value.length - terjawab.value)
const waktu = computed(() => {
  const menit = Math.floor(sisaDetik.value / 60).toString().padStart(2, '0')
  const detik = (sisaDetik.value % 60).toString().padStart(2, '0')
  return `00:${menit}:${detik}`
})

function pilihJawaban(indexOpsi) {
  jawaban.value = { ...jawaban.value, [nomorAktif.value]: indexOpsi }
}

function toggleRagu() {
  const salinan = new Set(ragu.value)
  if (salinan.has(nomorAktif.value)) salinan.delete(nomorAktif.value)
  else salinan.add(nomorAktif.value)
  ragu.value = salinan
}

function statusNomor(index) {
  if (index === nomorAktif.value) return 'aktif'
  if (ragu.value.has(index)) return 'ragu'
  if (jawaban.value[index] !== undefined) return 'terjawab'
  return 'kosong'
}

function formatOpsi(teks) {
  return teks.replace(/^[A-Z]\.\s*/, '')
}

function keluarUjian() {
  if (window.confirm('Keluar dari ujian? Jawaban yang belum dikirim akan tetap tersimpan di halaman ini.')) {
    router.back()
  }
}

function kirimJawaban() {
  if (!window.confirm('Kirim jawaban sekarang? Setelah dikirim, jawaban tidak dapat diubah.')) return
  submitted.value = true
}

function hitungMundur() {
  if (sisaDetik.value <= 0) {
    kirimJawaban()
    return
  }
  sisaDetik.value -= 1
}

onMounted(async () => {
  try {
    const [dataKuis, dataSoal] = await Promise.all([
      ambilKuis(props.id),
      ambilSoalKuis(props.id),
    ])
    kuis.value = dataKuis
    soal.value = dataSoal
    sisaDetik.value = Math.max(1, (dataKuis.durasi || 40) * 60)
    timerId = window.setInterval(hitungMundur, 1000)
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

onBeforeUnmount(() => window.clearInterval(timerId))
</script>

<template>
  <div class="min-h-screen bg-wf-page text-wf-text">
    <header class="border-b border-wf-border bg-wf-card">
      <div class="mx-auto flex max-w-[1140px] items-center justify-between gap-5 px-6 py-5 sm:px-10">
        <div>
          <p class="font-semibold uppercase tracking-[0.08em] text-wf-secondary">Bahasa Indonesia · Bab 1</p>
          <h1 class="mt-2 text-[21px] font-bold">{{ kuis?.judul || 'Kuis' }}</h1>
        </div>
        <div class="flex items-center gap-5">
          <div class="text-right">
            <p class="font-semibold uppercase tracking-[0.08em] text-wf-secondary">Sisa waktu</p>
            <strong class="text-[20px]">{{ waktu }}</strong>
          </div>
          <button type="button" class="rounded-xl border border-wf-brand-border px-5 py-3 text-[18px] font-semibold text-wf-brand hover:bg-wf-brand-soft" @click="keluarUjian">
            KELUAR UJIAN
          </button>
        </div>
      </div>
      <div class="h-1.5 bg-wf-brand-soft">
        <div class="h-full bg-wf-brand transition-all" :style="{ width: `${soal.length ? ((nomorAktif + 1) / soal.length) * 100 : 0}%` }"></div>
      </div>
    </header>

    <main class="mx-auto max-w-[990px] px-6 pb-12 pt-9 sm:px-10 lg:px-0">
      <p v-if="loading" class="text-wf-secondary">Memuat soal...</p>
      <p v-else-if="errorMsg" role="alert" class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-wf-no-text">{{ errorMsg }}</p>
      <section v-else-if="submitted" class="rounded-md border border-green-200 bg-green-50 p-8 text-center">
        <h2 class="text-2xl font-bold text-wf-ok">Jawaban berhasil dikirim</h2>
        <p class="mt-2 text-wf-secondary">Hasil pengerjaan akan diproses oleh sistem.</p>
        <button type="button" class="mt-6 rounded-xl bg-wf-accent px-6 py-3 font-bold text-white" @click="router.back()">KEMBALI KE LATIHAN</button>
      </section>
      <section v-else-if="soal.length" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_305px]">
        <article class="rounded-md border border-wf-border-subtle bg-wf-card p-6 sm:p-7">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <p class="font-mono text-[14px] uppercase tracking-[0.12em] text-wf-secondary">Soal {{ nomorAktif + 1 }} dari {{ soal.length }}</p>
            <div class="flex gap-2">
              <span class="rounded-md border border-wf-brand-border px-2 py-1 text-sm text-wf-secondary">{{ soalAktif.difficulty || 'Sedang' }}</span>
              <span class="rounded-md border border-wf-brand-border px-2 py-1 text-sm text-wf-secondary">Tingkat: {{ soalAktif.difficulty || 'Mudah' }}</span>
            </div>
          </div>
          <h2 class="mt-6 text-[18px] font-bold leading-6">{{ soalAktif.pertanyaan }}</h2>
          <p class="mt-5 font-mono text-[15px] text-wf-secondary">Pilih salah satu:</p>
          <div class="mt-5 flex flex-col gap-3">
            <label
              v-for="(opsi, indexOpsi) in soalAktif.opsi"
              :key="opsi.idOpsi || opsi.opsi"
              class="flex cursor-pointer items-center gap-4 rounded-md border px-4 py-4 text-[19px] transition"
              :class="jawaban[nomorAktif] === indexOpsi ? 'border-2 border-wf-brand bg-wf-brand-soft' : 'border-wf-border hover:border-wf-brand-border'"
            >
              <input v-model="jawaban[nomorAktif]" type="radio" :value="indexOpsi" class="size-5 accent-wf-brand" @change="pilihJawaban(indexOpsi)" />
              <span class="font-semibold">{{ String.fromCharCode(65 + indexOpsi) }}</span>
              <span>{{ formatOpsi(opsi.opsi) }}</span>
            </label>
          </div>
          <div class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-wf-border-subtle pt-5">
            <button type="button" :disabled="nomorAktif === 0" class="rounded-xl border border-wf-border-subtle px-5 py-3 text-[17px] font-semibold text-wf-secondary disabled:opacity-40" @click="nomorAktif--">← SEBELUMNYA</button>
            <button type="button" class="rounded-xl border border-wf-brand-border px-5 py-3 text-[17px] font-semibold text-wf-brand hover:bg-wf-brand-soft" @click="toggleRagu">
              {{ ragu.has(nomorAktif) ? 'HAPUS TANDA RAGU' : 'TANDAI RAGU' }}
            </button>
            <button type="button" :disabled="nomorAktif === soal.length - 1" class="rounded-xl border border-wf-brand-border px-5 py-3 text-[17px] font-semibold text-wf-brand disabled:opacity-40" @click="nomorAktif++">SELANJUTNYA →</button>
          </div>
        </article>

        <aside class="flex flex-col gap-6">
          <div class="rounded-md border border-wf-border-subtle bg-wf-card p-5">
            <h2 class="font-mono text-[15px] uppercase tracking-[0.12em] text-wf-secondary">Navigasi soal</h2>
            <div class="mt-5 grid grid-cols-4 gap-3">
              <button
                v-for="(_, index) in soal"
                :key="index"
                type="button"
                class="h-11 rounded-md border text-[19px] font-semibold"
                :class="{
                  'border-2 border-wf-brand text-wf-text': statusNomor(index) === 'aktif',
                  'border-wf-brand-border bg-wf-brand-soft': statusNomor(index) === 'terjawab',
                  'border-dashed border-red-400': statusNomor(index) === 'ragu',
                  'border-wf-border-subtle text-wf-secondary': statusNomor(index) === 'kosong',
                }"
                @click="nomorAktif = index"
              >
                {{ index + 1 }}
              </button>
            </div>
            <p class="mt-5 font-mono text-[13px] text-wf-secondary">{{ terjawab }} terjawab · {{ jumlahRagu }} ragu · {{ belumDijawab }} belum</p>
          </div>
          <div class="rounded-md border border-wf-border-subtle bg-wf-card p-5">
            <h2 class="font-mono text-[15px] uppercase tracking-[0.12em] text-wf-secondary">Keterangan</h2>
            <div class="mt-5 space-y-3 text-sm text-wf-secondary">
              <p><span class="legend border-2 border-wf-brand"></span> Soal aktif</p>
              <p><span class="legend border-wf-brand-border bg-wf-brand-soft"></span> Sudah dijawab</p>
              <p><span class="legend border-wf-border-subtle"></span> Belum dijawab</p>
            </div>
          </div>
          <button type="button" class="rounded-xl bg-wf-accent px-5 py-4 text-[19px] font-bold text-white hover:bg-wf-accent-hover" @click="kirimJawaban">
            KIRIM JAWABAN
          </button>
        </aside>
      </section>
      <p v-else class="rounded-md border border-wf-border-subtle bg-wf-card p-8 text-center text-wf-secondary">Soal untuk kuis ini belum tersedia.</p>
    </main>
  </div>
</template>

<style scoped>
.legend {
  display: inline-block;
  width: 1.35rem;
  height: 1.35rem;
  margin-right: .5rem;
  vertical-align: middle;
  border-radius: .35rem;
}
</style>
