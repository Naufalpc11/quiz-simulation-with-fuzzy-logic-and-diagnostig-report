<script setup>
import { ref, onMounted, watch } from 'vue'
import 'mathlive/fonts.css'
import { MathfieldElement } from 'mathlive'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  singleLine: { type: Boolean, default: false },
  dense: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const container = ref(null)
const kosong = ref(!props.modelValue)
let mf = null
let sedangSisip = false

onMounted(() => {
  mf = new MathfieldElement()
  mf.defaultMode = 'text'
  if (props.dense) mf.classList.add('dense')
  mf.setValue(props.modelValue ?? '', { suppressChangeNotifications: true })
  kosong.value = !mf.value
  // Placeholder bawaan MathLive sengaja tidak dipakai (dirender sebagai rumus).

  if (props.singleLine || props.dense) {
    mf.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        mf.blur()
      }
    })
  }

  // Menu "Insert Matrix", "Insert", dan keyboard virtual mengirim LaTeX mentah.
  // Di mode teks itu jadi karakter biasa, jadi sisipkan ulang sebagai rumus.
  mf.addEventListener('beforeinput', (e) => {
    if (sedangSisip) return
    const data = e.data
    if (
      mf.mode === 'text' &&
      typeof data === 'string' &&
      data.length > 1 &&
      /^\\[a-zA-Z]+/.test(data)
    ) {
      e.preventDefault()
      sedangSisip = true
      mf.insert(data, { format: 'latex', mode: 'math', selectionMode: 'placeholder' })
      sedangSisip = false
    }
  })

  mf.addEventListener('input', () => {
    kosong.value = !mf.value
    emit('update:modelValue', mf.value)
  })
  container.value.appendChild(mf)
})

watch(
  () => props.modelValue,
  (v) => {
    if (mf && mf.value !== (v ?? '')) mf.value = v ?? ''
    kosong.value = !(v ?? '')
  },
)
</script>

<template>
  <div class="math-field-box" :class="{ dense }">
    <div ref="container" />
    <span v-if="kosong && placeholder" class="math-field-placeholder">{{ placeholder }}</span>
  </div>
</template>

<style>
.math-field-box {
  position: relative;
}
.math-field-box math-field {
  display: block;
  background: transparent;
  border: 1px solid var(--wf-border, #d4d4d8);
  border-radius: 0.375rem;
  padding: 1rem;
  min-height: 100px;
  font-size: 1.0625rem;
  line-height: 1.5rem;
  color: inherit;
}
.math-field-box math-field.dense {
  min-height: 0;
  padding: 0.65rem 1rem;
}
.math-field-box math-field:focus-within {
  outline: 2px solid var(--wf-brand, #6366f1);
  outline-offset: -1px;
}
/* Placeholder teks biasa, font mengikuti aplikasi */
.math-field-placeholder {
  position: absolute;
  top: 1rem;
  left: 1rem;
  right: 3rem;
  pointer-events: none;
  font-family: inherit;
  font-size: 1.0625rem;
  line-height: 1.5rem;
  color: var(--wf-muted, #71717a);
  opacity: 0.8;
}
.math-field-box.dense .math-field-placeholder {
  top: 0.65rem;
}
</style>