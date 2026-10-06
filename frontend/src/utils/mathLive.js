// utils/mathLive.js
//
// Format tersimpan (DB / render ke siswa):  \( ... \) inline, $$ ... $$ blok.
// Format MathLive mode-teks:                $ ... $  inline, $$ ... $$ blok.

/**
 * Ubah format tersimpan (DB) menjadi format MathLive mode-teks.
 * - \( ... \)  →  $ ... $   (inline)
 * - $$ ... $$  →  dibiarkan (sudah sama)
 */
export function keMathLive(teks) {
  return (teks ?? '').replace(/\\\(([\s\S]+?)\\\)/g, '$$$1$$')
}

/**
 * Ubah format MathLive mode-teks menjadi format tersimpan (DB).
 * - $ ... $    →  \( ... \)   (inline)
 * - $$ ... $$  →  $$ ... $$   (blok, diberi spasi konsisten)
 * - \[ ... \]  →  $$ ... $$   (normalisasi kalau MathLive mengeluarkan blok
 *                              dalam format \[...\] di versi tertentu)
 */
export function keFormatSimpan(teks) {
  return (teks ?? '')
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `$$ ${m.trim()} $$`)
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => `$$ ${m.trim()} $$`)
    .replace(/\$(?!\$)([^$\n]+?)\$(?!\$)/g, (_, m) => `\\( ${m.trim()} \\)`)
}