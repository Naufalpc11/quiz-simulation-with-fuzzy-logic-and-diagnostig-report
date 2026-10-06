<script setup>
import { computed } from 'vue'
import katex from 'katex'
import 'katex/dist/katex.min.css'

// Menampilkan teks soal/opsi/pembahasan yang disimpan dengan format:
//   \( ... \)  = rumus inline
//   $$ ... $$  = rumus blok
// Teks di luar rumus ditampilkan apa adanya (di-escape, jadi aman).
const props = defineProps({ teks: { type: String, default: '' } })

const POLA = /\$\$([\s\S]+?)\$\$|\\\(([\s\S]+?)\\\)/g

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const html = computed(() => {
  const teks = props.teks ?? ''
  let hasil = ''
  let terakhir = 0

  for (const m of teks.matchAll(POLA)) {
    hasil += escapeHtml(teks.slice(terakhir, m.index))
    const blok = m[1] !== undefined
    const latex = (m[1] ?? m[2]).trim()
    hasil += katex.renderToString(latex, { displayMode: blok, throwOnError: false })
    terakhir = m.index + m[0].length
  }

  return hasil + escapeHtml(teks.slice(terakhir))
})
</script>

<template>
  <span class="math-text" v-html="html"></span>
</template>

<style>
.math-text {
  white-space: pre-line;
}
</style>