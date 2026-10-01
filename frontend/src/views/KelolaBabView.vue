<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminHeader from '../components/AdminHeader.vue'
import { ambilDaftarBab, buatBab, hapusBab, ubahBab } from '../services/bab'

const router = useRouter()

const daftarBab = ref([])
const loading = ref(true)
const search = ref('')
const filterStatus = ref('semua')
const showForm = ref(false)
const errorMsg = ref('')
const infoMsg = ref('')
const sedangMengedit = ref(false)

const form = ref({
  idBab: null,
  judul: '',
  nomor: 1,
  ringkasan: '',
})

const fallbackData = [
  {
    idBab: 1,
    namaBab: 'Ejaan',
    urutanBab: 1,
    deskripsi: 'Bab ini membahas dasar penulisan kata depan “di”, contoh penggunaan, dan latihan untuk memperkuat pemahaman peserta didik.',
    tanggalDibuat: '2026-09-03T00:00:00.000Z',
    jumlahKuis: 1,
  },
  {
    idBab: 2,
    namaBab: 'Tata Bahasa',
    urutanBab: 2,
    deskripsi: 'Materi yang fokus pada penggunaan tanda baca, struktur kalimat, dan penyusunan paragraf yang benar.',
    tanggalDibuat: '2026-09-05T00:00:00.000Z',
    jumlahKuis: 2,
  },
  {
    idBab: 3,
    namaBab: 'Kosakata',
    urutanBab: 3,
    deskripsi: 'Mengasah kemampuan peserta didik memilih kata yang tepat untuk menyampaikan ide dengan lancar.',
    tanggalDibuat: '2026-09-09T00:00:00.000Z',
    jumlahKuis: 1,
  },
]

function formatTanggal(iso) {
  if (!iso) return '-' 
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function normalizeBab(bab) {
  return {
    idBab: bab.idBab ?? bab.id,
    namaBab: bab.namaBab ?? bab.judul,
    urutanBab: Number(bab.urutanBab ?? bab.nomor ?? 1),
    deskripsi: bab.deskripsi ?? '',
    tanggalDibuat: bab.tanggalDibuat ?? new Date().toISOString(),
    jumlahKuis: bab.jumlahKuis ?? bab.jumlah_kuis ?? 0,
  }
}

const daftarYangTampil = computed(() => {
  const kata = search.value.trim().toLowerCase()
  const statusMatch =
    filterStatus.value === 'semua'
      ? () => true
      : (bab) => (filterStatus.value === 'terbit' ? bab.jumlahKuis > 0 : bab.jumlahKuis === 0)

  return daftarBab.value.filter((bab) => {
    const nama = bab.namaBab.toLowerCase()
    const cocokCari = !kata || nama.includes(kata)
    return cocokCari && statusMatch(bab)
  })
})

function resetForm() {
  form.value = {
    idBab: null,
    judul: '',
    nomor: 1,
    ringkasan: '',
  }
  sedangMengedit.value = false
  errorMsg.value = ''
}

function bukaFormBaru() {
  resetForm()
  showForm.value = true
}

function bukaEditBab(bab) {
  form.value = {
    idBab: bab.idBab,
    judul: bab.namaBab,
    nomor: bab.urutanBab,
    ringkasan: bab.deskripsi || '',
  }
  sedangMengedit.value = true
  showForm.value = true
  errorMsg.value = ''
}

async function muatBab() {
  loading.value = true
  try {
    const data = await ambilDaftarBab()
    daftarBab.value = (data || []).map(normalizeBab)
  } catch (err) {
    console.warn('Backend bab belum siap, memakai data contoh.', err)
    daftarBab.value = fallbackData.map(normalizeBab)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  muatBab()
})

async function simpanBab() {
  if (!form.value.judul.trim()) {
    errorMsg.value = 'Judul bab wajib diisi.'
    return
  }

  const payload = {
    namaBab: form.value.judul.trim(),
    urutanBab: Number(form.value.nomor) || 1,
    deskripsi: form.value.ringkasan.trim(),
  }

  try {
    if (form.value.idBab) {
      const result = await ubahBab(form.value.idBab, payload)
      const index = daftarBab.value.findIndex((bab) => bab.idBab === form.value.idBab)
      if (index >= 0) {
        daftarBab.value[index] = normalizeBab(result)
      }
      infoMsg.value = 'Bab berhasil diperbarui.'
    } else {
      const result = await buatBab(payload)
      daftarBab.value.unshift(normalizeBab(result))
      infoMsg.value = 'Bab baru berhasil ditambahkan.'
    }

    showForm.value = false
    resetForm()
  } catch (err) {
    errorMsg.value = err?.message || 'Gagal menyimpan bab.'
  }
}

async function hapusBabSaatIni(idBab) {
  if (!window.confirm('Hapus bab ini?')) return

  try {
    await hapusBab(idBab)
    daftarBab.value = daftarBab.value.filter((bab) => bab.idBab !== idBab)
    infoMsg.value = 'Bab berhasil dihapus.'
  } catch (err) {
    errorMsg.value = err?.message || 'Gagal menghapus bab.'
  }
}

function keteranganBab(bab) {
  const tanggal = formatTanggal(bab.tanggalDibuat)
  const menit = Math.max(3, bab.urutanBab * 2 + 4)
  const kuis = bab.jumlahKuis ?? 0
  return `${tanggal} • ${menit} menit baca • dipakai ${kuis} kuis`
}
</script>

<template>
  <div class="min-h-screen bg-wf-page text-wf-text">
    <AdminHeader />

    <main class="px-4 sm:px-10 lg:px-20 py-8 lg:py-10">
      <section class="max-w-6xl mx-auto">
        <h1 class="text-[34px] leading-tight font-semibold mb-2">Kelola Bab</h1>
        <p class="text-[17px] lg:text-[19px] leading-[30px] text-wf-secondary mb-8">
          Tambah, ubah, dan hapus materi bacaan. Materi dikelompokkan per topik dan tampil di daftar pengguna.
        </p>

        <div class="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
          <input
            v-model="search"
            type="search"
            placeholder="Cari judul bab"
            class="flex-1 min-w-[260px] bg-wf-card border border-wf-border rounded-md px-4 py-3 text-[18px] focus:outline-none focus:ring-2 focus:ring-wf-brand"
          />

          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              @click="filterStatus = 'semua'"
              :class="filterStatus === 'semua' ? 'bg-green-500 text-white' : 'bg-wf-card text-wf-text border border-wf-border'"
              class="px-4 py-2 rounded-md text-[17px] font-medium transition"
            >
              Semua Bab
            </button>
            <button
              type="button"
              @click="filterStatus = 'terbit'"
              :class="filterStatus === 'terbit' ? 'bg-amber-400 text-white' : 'bg-wf-card text-wf-text border border-wf-border'"
              class="px-4 py-2 rounded-md text-[17px] font-medium transition"
            >
              Terbit
            </button>
            <button
              type="button"
              @click="filterStatus = 'draf'"
              :class="filterStatus === 'draf' ? 'bg-purple-100 text-wf-brand border border-wf-brand-border' : 'bg-wf-card text-wf-text border border-wf-border'"
              class="px-4 py-2 rounded-md text-[17px] font-medium transition"
            >
              Draf
            </button>
          </div>

          <button
            type="button"
            @click="bukaFormBaru"
            class="ml-auto rounded-xl bg-wf-accent hover:bg-wf-accent-hover text-white font-semibold text-[18px] px-6 py-3 transition"
          >
            + Tambah Bab
          </button>
        </div>

        <p v-if="infoMsg" class="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-[15px] text-green-800">
          {{ infoMsg }}
        </p>
        <p v-if="errorMsg" class="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-[15px] text-red-700">
          {{ errorMsg }}
        </p>

        <div class="rounded-xl border border-wf-border bg-wf-card overflow-hidden">
          <div class="flex items-center justify-between px-5 py-3 border-b border-wf-border bg-wf-muted-surface text-[15px] text-wf-secondary uppercase tracking-[0.08em]">
            <span>Bab</span>
            <span class="text-right">{{ daftarYangTampil.length }} materi</span>
          </div>

          <div v-if="loading" class="px-6 py-12 text-wf-secondary text-[16px]">
            Memuat daftar bab...
          </div>

          <div v-else-if="daftarYangTampil.length === 0" class="px-6 py-12 text-center text-wf-secondary text-[16px]">
            Tidak ada bab yang sesuai dengan pencarian.
          </div>

          <div v-else>
            <article
              v-for="bab in daftarYangTampil"
              :key="bab.idBab"
              class="flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 py-4 border-b border-wf-border-subtle last:border-0"
            >
              <div class="flex-1 min-w-0">
                <h2 class="text-[22px] leading-tight font-semibold text-wf-text mb-1">{{ bab.namaBab }}</h2>
                <p class="text-[15px] text-wf-secondary">{{ keteranganBab(bab) }}</p>
              </div>

              <div class="flex items-center gap-3">
                <button
                  type="button"
                  class="px-3 py-2 rounded-md border border-wf-brand-border bg-wf-brand-soft text-wf-brand font-semibold text-[15px]"
                >
                  Terbit
                </button>
                <button type="button" @click="bukaEditBab(bab)" class="text-wf-brand text-[15px] font-medium hover:underline">
                  Edit
                </button>
                <button type="button" @click="hapusBabSaatIni(bab.idBab)" class="text-wf-no-text text-[15px] font-medium hover:underline">
                  Hapus
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>

    <div
      v-if="showForm"
      class="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 py-8 overflow-y-auto"
      @click.self="showForm = false"
    >
      <div class="w-full max-w-4xl rounded-[14px] border border-[#54b9ee] bg-[#f7f7fa] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
        <div class="border border-dashed border-[#43b8f5] rounded-[10px] p-4 md:p-6">
          <div class="mb-4 flex items-center gap-3 text-[13px] font-medium uppercase tracking-[0.12em] text-wf-secondary">
            <span class="inline-block">Bab</span>
            <span class="text-wf-muted">&gt;</span>
            <span>{{ sedangMengedit ? 'Ubah' : 'Tambah' }} Bab</span>
          </div>

          <h2 class="text-[28px] md:text-[32px] font-semibold text-wf-text mb-2">
            {{ sedangMengedit ? 'Ubah Bab' : 'Tambah Bab' }}
          </h2>

          <p class="text-[16px] md:text-[17px] leading-[28px] text-wf-secondary mb-6">
            Pilih cara membuat bab, lalu lengkapi informasi yang diperlukan untuk materi, tujuan, dan ringkasan.
          </p>

          <div class="rounded-md border border-[#7eceff] bg-white/50 p-3 md:p-4 mb-6">
            <button type="button" class="inline-flex items-center gap-2 text-[18px] font-medium text-wf-brand">
              <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-wf-brand-soft text-wf-brand">✎</span>
              Input Manual
            </button>
          </div>

          <div class="bg-white/50 border border-[#d5d7ef] rounded-md p-4 md:p-5">
            <h3 class="text-[20px] md:text-[22px] font-semibold mb-4">Tulis Bab secara manual</h3>

            <div class="grid md:grid-cols-2 gap-5 mb-5">
              <label class="block">
                <span class="mb-2 block text-[13px] font-semibold uppercase tracking-[0.1em] text-wf-secondary">Judul Bab</span>
                <input
                  v-model="form.judul"
                  type="text"
                  class="w-full rounded-md border border-wf-border bg-white px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-wf-brand"
                  placeholder="Bab 1: Ejaan"
                />
              </label>

              <label class="block">
                <span class="mb-2 block text-[13px] font-semibold uppercase tracking-[0.1em] text-wf-secondary">Nomor Bab</span>
                <input
                  v-model.number="form.nomor"
                  type="number"
                  min="1"
                  class="w-full rounded-md border border-wf-border bg-white px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-wf-brand"
                />
              </label>
            </div>

            <label class="block mb-6">
              <span class="mb-2 block text-[13px] font-semibold uppercase tracking-[0.1em] text-wf-secondary">Ringkasan Bab</span>
              <textarea
                v-model="form.ringkasan"
                rows="6"
                class="w-full rounded-md border border-wf-border bg-white px-3 py-3 text-[16px] resize-none focus:outline-none focus:ring-2 focus:ring-wf-brand"
                placeholder="Bab ini membahas dasar penulisan kata depan “di”, contoh penggunaan, dan latihan untuk memperkuat pemahaman peserta didik."
              />
            </label>

            <div class="flex justify-end gap-3">
              <button
                type="button"
                @click="showForm = false"
                class="rounded-md border border-wf-border bg-white px-6 py-3 text-[15px] font-semibold text-wf-text hover:bg-wf-page transition"
              >
                Kembali
              </button>
              <button
                type="button"
                @click="simpanBab"
                class="rounded-md bg-wf-accent hover:bg-wf-accent-hover px-7 py-3 text-[15px] font-semibold text-white transition"
              >
                {{ sedangMengedit ? 'Simpan Bab' : 'Simpan Bab' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
