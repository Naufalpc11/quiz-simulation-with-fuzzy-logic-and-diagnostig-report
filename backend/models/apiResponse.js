export function successResponse({ message = 'OK', data = null } = {}) {
  return data === null
    ? { status: 'success', message }
    : { status: 'success', message, data };
}

// `code` opsional: dipakai kalau frontend perlu membedakan jenis error tanpa
// mencocokkan teks pesan (misalnya PIN_DIBUTUHKAN vs PIN_SALAH).
export function errorResponse({ message = 'Error', code } = {}) {
  return code
    ? { status: 'error', message, code }
    : { status: 'error', message };
}
