<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getUser, keluar } from '../services/auth'
import logoImage from '../assets/logo-esikap.png'
import avatarImage from '../assets/icons/avatar.svg'

const route = useRoute()
const router = useRouter()
const user = getUser()
const loggingOut = ref(false)

// Rekap dan Panduan belum punya halaman, jadi tampil sebagai teks saja.
const menu = [
  { label: 'Kuis', to: '/kuis' },
  { label: 'Rekap' },
  { label: 'Panduan' },
]

function aktif(item) {
  return item.to && route.path.startsWith(item.to)
}

async function handleLogout() {
  loggingOut.value = true
  await keluar()
  router.push('/')
}
</script>

<template>
  <header
    class="bg-wf-card border-b border-wf-border px-4 sm:px-10 lg:px-20 py-4 lg:py-6 flex flex-wrap items-center justify-between gap-4"
  >
    <div class="flex items-center gap-6 lg:gap-10">
      <RouterLink to="/kuis" class="block h-10 w-[125px] shrink-0">
        <img :src="logoImage" alt="eSikap" class="size-full object-contain" />
      </RouterLink>
      <nav class="flex items-center gap-6 lg:gap-10 text-[17px] lg:text-[19px] leading-[26px]">
        <template v-for="item in menu" :key="item.label">
          <RouterLink
            v-if="item.to"
            :to="item.to"
            class="py-1 border-b-2"
            :class="aktif(item) ? 'border-wf-brand text-wf-text' : 'border-transparent text-wf-secondary hover:text-wf-text'"
          >
            {{ item.label }}
          </RouterLink>
          <span v-else class="py-1 text-wf-secondary/60 cursor-not-allowed" title="Segera hadir">
            {{ item.label }}
          </span>
        </template>
      </nav>
    </div>

    <div class="flex items-center gap-4">
      <p class="text-[15px] lg:text-[17px] leading-6 text-wf-secondary">
        Admin<span v-if="user?.nama"> · {{ user.nama }}</span>
      </p>
      <img :src="avatarImage" alt="" class="size-8 shrink-0" />
      <button
        type="button"
        @click="handleLogout"
        :disabled="loggingOut"
        class="text-[15px] text-wf-no-text hover:underline disabled:opacity-60"
      >
        {{ loggingOut ? 'Keluar...' : 'Keluar' }}
      </button>
    </div>
  </header>
</template>
