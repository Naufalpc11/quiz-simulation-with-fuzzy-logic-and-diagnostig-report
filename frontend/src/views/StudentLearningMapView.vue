<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ambilDaftarBab } from '../services/bab'
import { ambilDaftarKuis } from '../services/kuis'
import { getAvatar, getUser, SessionExpiredError } from '../services/auth'
import logoImage from '../assets/logo-esikap.png'
import avatarImage from '../assets/icons/avatar.svg'
import StudentHeader from '../components/StudentHeader.vue'

const router = useRouter()
const user = ref(getUser())
const avatar = ref(getAvatar() || avatarImage)
const bab = ref([])
const kuis = ref([])
const loading = ref(true)
const errorMsg = ref('')
const notice = ref('')

const fallbackRoadmap = [
  {
    namaBab: 'Ejaan',
    ringkasan: 'Prioritas utama. Nilai terakhir 60 — 2 dari 5 soal belum tepat.',
    cakupan: 'kata baku, imbuhan di-, dan kata depan di.',
    detail: '5 soal · nilai terakhir 60 · perlu diulang',
    status: 'roadmap',
  },
  {
    namaBab: 'Ejaan',
    ringkasan: 'Sudah lulus dengan nilai 80, tapi Tahap 1 Kata Baku masih lemah.',
    cakupan: 'kata baku, imbuhan di-, dan kata depan di.',
    detail: '5 soal · nilai terakhir 80 · Tahap 1 perlu diperkuat',
    status: 'roadmap',
  },
  {
    namaBab: 'Paragraf',
    ringkasan: 'Belum pernah dikerjakan. Terbuka setelah Tanda Baca mencapai nilai minimal 70.',
    cakupan: 'kepaduan, pola pengembangan, dan kalimat topik.',
    detail: '5 soal · belum ada nilai',
    status: 'terkunci',
  },
  {
    namaBab: 'Diksi',
    ringkasan: 'Belum pernah dikerjakan. Dianjurkan setelah Paragraf selesai.',
    cakupan: 'pilihan kata, makna denotatif dan referensi.',
    detail: '5 soal · belum ada nilai',
    status: 'terkunci',
  },
  {
    namaBab: 'Kalimat Efektif',
    ringkasan: 'Sudah kuat dengan nilai 94. Tidak perlu diulang.',
    cakupan: 'kehematan, kesepadanan, kesejajaran, dan kelogisan.',
    detail: '5 soal · nilai terakhir 94 · belum selesai',
    status: 'roadmap',
  },
]

const roadmap = computed(() => bab.value.map((item, index) => {
  const kuisBab = kuis.value.filter((quiz) => String(quiz.idBab) === String(item.idBab))
  const kuisTersedia = kuisBab.filter((quiz) => quiz.tersedia)
  const selesai = kuisTersedia.filter((quiz) => quiz.statusBelajar === 'Selesai').length
  const hasilTerakhir = kuisTersedia.find((quiz) => quiz.statusBelajar === 'Selesai')
  const template = fallbackRoadmap[index % fallbackRoadmap.length]
  const terkunci = !hasilTerakhir

  return {
    ...template,
    namaBab: item.namaBab,
    status: terkunci ? 'terkunci' : 'roadmap',
    ringkasan: terkunci
      ? 'Belum dibuka oleh dosen.'
      : selesai
        ? `${selesai} kuis selesai. Roadmap dapat digunakan untuk memperkuat materi bab ini.`
        : 'Kuis bab ini sudah tersedia untuk dikerjakan.',
    detail: terkunci
      ? kuisTersedia.length ? 'Kerjakan kuis untuk membuka roadmap' : 'Belum ada kuis yang dibuka'
      : `${selesai} dari ${kuisTersedia.length} kuis selesai`,
    idPengerjaan: hasilTerakhir?.idPengerjaanTerakhir ?? null,
  }
}))

function bukaRoadmap(item) {
  if (item.status === 'terkunci' || !item.idPengerjaan) {
    notice.value = `Roadmap ${item.namaBab} baru tersedia setelah Anda menyelesaikan kuis.`
    return
  }
  const itemBab = bab.value.find((data) => data.namaBab === item.namaBab)
  if (itemBab?.idBab) {
    router.push({
      path: `/peta-belajar/${itemBab.idBab}/roadmap`,
      query: { pengerjaan: item.idPengerjaan },
    })
  }
  else notice.value = `Roadmap ${item.namaBab} akan segera tersedia.`
}

function riwayatSoal(item) {
  notice.value = `Riwayat soal ${item.namaBab} akan segera tersedia.`
}

onMounted(async () => {
  try {
    const [dataBab, dataKuis] = await Promise.all([
      ambilDaftarBab(),
      ambilDaftarKuis(),
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
    <StudentHeader active="peta" />

    <main class="mx-auto max-w-[780px] px-6 pb-12 pt-8 sm:px-0">
      <h1 class="text-[21px] font-bold sm:text-[23px]">Peta belajar saya, Bahasa Indonesia</h1>
      <p class="mt-1 text-[14px] text-wf-secondary">Pilih bab untuk membuka roadmap belajarnya. Status tiap bab diambil dari nilai kuis terakhir Anda.</p>
      <p v-if="notice" role="status" class="mt-4 rounded-md border border-wf-brand-border bg-wf-brand-soft px-4 py-3 text-sm text-wf-brand">{{ notice }}</p>
      <p v-if="errorMsg" role="alert" class="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-wf-no-text">{{ errorMsg }}</p>
      <p v-if="loading" class="mt-6 text-wf-secondary">Memuat peta belajar...</p>

      <section v-else class="mt-5 flex flex-col gap-3">
        <article v-for="(item, index) in roadmap" :key="`${item.namaBab}-${index}`" class="grid gap-4 rounded-md border border-wf-border-subtle bg-wf-card p-4 sm:grid-cols-[32px_minmax(0,1fr)_290px] sm:items-center">
          <div class="flex size-7 items-center justify-center rounded-full border-2 border-wf-brand text-sm">{{ index + 1 }}</div>
          <div>
            <h2 class="text-[14px] font-bold">{{ item.namaBab }}</h2>
            <p class="mt-1 text-[12px] leading-5 text-wf-secondary">{{ item.ringkasan }}</p>
            <p class="mt-1 text-[12px] leading-5 text-wf-secondary">Cakupan: {{ item.cakupan }}</p>
            <p class="mt-1 text-[12px] text-wf-secondary">{{ item.detail }}</p>
          </div>
          <div class="flex flex-wrap justify-start gap-3 sm:justify-end">
            <button type="button" class="rounded-xl border border-wf-brand-border px-4 py-3 text-sm font-semibold text-wf-brand hover:bg-wf-brand-soft" @click="riwayatSoal(item)">
              RIWAYAT SOAL
            </button>
            <button
              type="button"
              class="rounded-xl px-4 py-3 text-sm font-semibold"
              :class="item.status === 'terkunci' ? 'border border-red-400 text-wf-no-text' : 'bg-wf-brand text-white hover:bg-wf-accent-hover'"
              :disabled="item.status === 'terkunci'"
              @click="bukaRoadmap(item)"
            >
              {{ item.status === 'terkunci' ? 'TERKUNCI' : 'LIHAT ROADMAP' }}
            </button>
          </div>
        </article>
      </section>
    </main>
  </div>
</template>
