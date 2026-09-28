<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { keluar, getUser, takeNotice } from '../services/auth'

const router = useRouter()
const user = ref(getUser())
const loggingOut = ref(false)
const notice = ref('')

onMounted(() => {
  notice.value = takeNotice() || ''
})

async function handleLogout() {
  loggingOut.value = true
  await keluar()
  loggingOut.value = false
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-xl font-semibold text-gray-900">
          Halo, {{ user?.nama || 'Pengguna' }}
        </h1>
        <button
          @click="handleLogout"
          :disabled="loggingOut"
          class="text-sm text-red-600 hover:underline"
        >
          {{ loggingOut ? 'Keluar...' : 'Logout' }}
        </button>
      </div>

      <p
        v-if="notice"
        class="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800"
      >
        {{ notice }}
      </p>

      <p class="text-gray-500">Daftar topik kuis akan muncul di sini.</p>
    </div>
  </div>
</template>
