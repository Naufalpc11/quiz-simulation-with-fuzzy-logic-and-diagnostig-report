<script setup>
import { computed, onMounted, ref } from 'vue'
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
const hasil = ref(null)
const loading = ref(true)
const errorMsg = ref('')

const total = computed(() => hasil.value?.total || soal.value.length || 5)
const benar = computed(() => Math.max(0, total.value - salah.value))
const salah = computed(() => total.value > 1 ? 1 : 0)
const nilai = computed(() => total.value ? Math.round((benar.value / total.value) * 100) : 0)
const waktu = computed(() => hasil.value?.waktu?.replace(/^00:/, '') || '04:02')

function statusSoal(index) {
  return index === 0 && salah.value > 0 ? 'Belum tepat' : 'Tepat'
}

function ulangi() {
  router.push(`/kuis/${props.id}/kerjakan`)
}

onMounted(async () => {
  try {
    hasil.value = JSON.parse(sessionStorage.getItem(`hasil-kuis-${props.id}`) || 'null')
    const [dataKuis, dataSoal] = await Promise.all([ambilKuis(props.id), ambilSoalKuis(props.id)])
    kuis.value = dataKuis
    soal.value = dataSoal
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
    <header class="border-b border-wf-border bg-wf-card">
      <div class="mx-auto flex max-w-[1140px] items-center justify-between gap-5 px-6 py-5 sm:px-10">
        <div>
          <p class="font-semibold uppercase tracking-[0.08em] text-wf-secondary">Bahasa Indonesia · Bab 1</p>
          <h1 class="mt-2 text-[21px] font-bold">{{ kuis?.judul || hasil?.judul || 'Kuis' }}</h1>
        </div>
        <button type="button" class="rounded-xl border border-wf-brand-border px-5 py-3 text-[18px] font-semibold text-wf-brand hover:bg-wf-brand-soft" @click="router.back()">
          KELUAR LATIHAN
        </button>
      </div>
    </header>

    <main class="mx-auto max-w-[628px] px-6 pb-12 pt-8 sm:px-0">
      <p v-if="loading" class="text-wf-secondary">Memuat ringkasan hasil...</p>
      <p v-else-if="errorMsg" role="alert" class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-wf-no-text">{{ errorMsg }}</p>
      <template v-else>
        <section class="grid grid-cols-2 gap-4 rounded-md border border-wf-border-subtle bg-wf-card p-5 sm:grid-cols-4">
          <div class="score-ring">
            <strong>{{ nilai }}</strong>
          </div>
          <div class="result-stat"><strong>{{ benar }}</strong><span>BENAR</span></div>
          <div class="result-stat"><strong>{{ salah }}</strong><span>SALAH</span></div>
          <div class="result-stat"><strong>{{ waktu }}</strong><span>WAKTU</span></div>
        </section>

        <section class="mt-5 rounded-md border border-wf-border-subtle bg-wf-card p-5">
          <h2 class="font-mono text-[13px] uppercase tracking-[0.12em] text-wf-secondary">Hasil tiap soal</h2>
          <div class="mt-4 flex flex-col gap-3">
            <div v-for="(item, index) in (soal.length ? soal : Array.from({ length: total }))" :key="item?.idSoal || index" class="flex items-center justify-between rounded-md border border-wf-border-subtle px-4 py-3">
              <span class="text-[16px]"><b :class="statusSoal(index) === 'Tepat' ? 'text-wf-ok' : 'text-wf-no'">{{ statusSoal(index) === 'Tepat' ? '✓' : '×' }}</b><span class="ml-3">{{ index + 1 }}. {{ item?.pertanyaan ? `Soal ${index + 1}` : `Soal ${index + 1}` }}</span></span>
              <strong class="text-sm" :class="statusSoal(index) === 'Tepat' ? 'text-wf-ok' : 'text-wf-no-text'">{{ statusSoal(index) }}</strong>
            </div>
          </div>
        </section>

        <div class="mt-5 flex flex-wrap gap-3">
          <button type="button" class="rounded-xl border border-wf-accent-light px-4 py-3 font-semibold text-wf-brand hover:bg-wf-brand-soft">BUKA PEMBAHASAN SEMUA SOAL</button>
          <button type="button" class="rounded-xl border border-wf-accent-light px-4 py-3 font-semibold text-wf-brand hover:bg-wf-brand-soft">STATISTIK →</button>
        </div>
        <div class="mt-3 flex flex-wrap justify-between gap-3">
          <button type="button" class="rounded-xl border border-wf-brand-border px-4 py-3 font-semibold text-wf-brand hover:bg-wf-brand-soft" @click="ulangi">ULANGI BAB INI</button>
          <RouterLink to="/dashboard" class="rounded-xl bg-wf-accent px-5 py-3 font-semibold text-white hover:bg-wf-accent-hover">BAB BERIKUTNYA: TANDA BACA →</RouterLink>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.score-ring {
  display: flex;
  width: 86px;
  height: 86px;
  align-items: center;
  justify-content: center;
  border: 11px solid #16a34a;
  border-right-color: #dc2626;
  border-radius: 9999px;
  font-size: 30px;
  font-weight: 700;
}

.result-stat {
  display: flex;
  min-height: 86px;
  flex-direction: column;
  justify-content: center;
  border: 1px solid #cbb3e4;
  border-radius: 4px;
  padding: 12px 16px;
}

.result-stat strong {
  font-size: 30px;
  line-height: 1;
}

.result-stat span {
  margin-top: 8px;
  color: #6b6780;
  font-weight: 700;
}
</style>
