<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAvatar, getUser, keluar } from '../services/auth'
import logoImage from '../assets/logo-esikap.png'
import avatarImage from '../assets/icons/avatar.svg'

defineProps({ active: { type: String, default: '' } })

const router = useRouter()
const user = ref(getUser())
const avatar = ref(getAvatar() || avatarImage)
const profileOpen = ref(false)
const loggingOut = ref(false)

async function handleLogout() {
  loggingOut.value = true
  await keluar()
  router.push('/')
}
</script>

<template>
  <header class="border-b border-wf-border bg-wf-card px-6 py-4 sm:px-10 lg:px-[6.7%]">
    <div class="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap items-center gap-x-8 gap-y-2 lg:gap-x-10">
        <RouterLink to="/dashboard" class="block h-10 w-[105px] shrink-0 sm:w-[125px]">
          <img :src="logoImage" alt="eSikap" class="size-full object-contain" />
        </RouterLink>
        <nav class="flex flex-wrap items-center gap-x-7 gap-y-1 text-[16px] sm:text-[17px]">
          <RouterLink to="/dashboard" class="py-1" :class="active === 'latihan' ? 'border-b-2 border-wf-brand text-wf-text' : 'text-wf-secondary hover:text-wf-text'">Latihan</RouterLink>
          <RouterLink to="/statistik" class="py-1" :class="active === 'statistik' ? 'border-b-2 border-wf-brand text-wf-text' : 'text-wf-secondary hover:text-wf-text'">Statistik</RouterLink>
          <RouterLink to="/peta-belajar" class="py-1" :class="active === 'peta' ? 'border-b-2 border-wf-brand text-wf-text' : 'text-wf-secondary hover:text-wf-text'">Peta belajar</RouterLink>
        </nav>
      </div>

      <div class="relative flex items-center gap-3 text-sm text-wf-secondary sm:text-[15px]">
        <button type="button" class="flex items-center gap-3 rounded-lg px-2 py-1 text-left hover:bg-wf-muted-surface focus:outline-none focus:ring-2 focus:ring-wf-brand/20" aria-haspopup="menu" :aria-expanded="profileOpen" @click="profileOpen = !profileOpen">
          <span>{{ user?.nama || 'Mahasiswa' }}<span v-if="user?.username"> · {{ user.username }}</span></span>
          <img :src="avatar" alt="" class="size-8 shrink-0 rounded-full object-cover" />
        </button>
        <div v-if="profileOpen" class="absolute right-0 top-12 z-20 w-64 overflow-hidden rounded-lg border border-wf-border-subtle bg-wf-card shadow-lg" role="menu">
          <div class="border-b border-wf-border-subtle px-4 py-3">
            <p class="font-semibold text-wf-text">{{ user?.nama || 'Mahasiswa' }}</p>
            <p class="mt-1 break-all text-xs text-wf-secondary">{{ user?.email || 'Email tidak tersedia' }}</p>
            <p class="mt-2 inline-block rounded border border-wf-brand-border px-2 py-0.5 text-xs text-wf-brand">{{ user?.role || 'Mahasiswa' }}</p>
          </div>
          <RouterLink to="/profil" role="menuitem" class="block px-4 py-3 text-sm text-wf-text hover:bg-wf-muted-surface" @click="profileOpen = false">Akun saya</RouterLink>
          <button type="button" role="menuitem" class="block w-full border-t border-wf-border-subtle px-4 py-3 text-left text-sm text-wf-no-text hover:bg-red-50 disabled:opacity-60" :disabled="loggingOut" @click="handleLogout">
            {{ loggingOut ? 'Keluar...' : 'Keluar' }}
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
