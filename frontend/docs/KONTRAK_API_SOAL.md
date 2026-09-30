# Kontrak API Soal (untuk tim backend)

Halaman **Kelola Kuis** dan **Tambah Kuis / Edit Soal** di frontend sudah jadi.
Bab dan Kuis memakai endpoint yang sudah ada. Yang **belum ada** di backend:

1. Endpoint soal per kuis (`GET` dan `PUT /api/kuis/:idKuis/soal`)
2. Kolom `ringkasan` dan `targetTime` di tabel `Soal`
3. (Opsional) `jumlahSoal` dan `status` di respons `GET /api/kuis`
4. (Nanti) Endpoint unggah dokumen untuk tab "Dokumen"

Selama nomor 1 belum ada, frontend tetap bisa membuat kuis. Saat menyimpan soal,
frontend menampilkan pesan "endpoint soal belum tersedia di backend".

Semua respons memakai format `apiResponse.js` yang sudah ada:
`{ status: 'success' | 'error', message, data? }`.

---

## 1. `GET /api/kuis/:idKuis/soal`

- Middleware: `verifyLoggedIn`
- Urutan: sesuai urutan soal saat disimpan. Opsi diurutkan sesuai labelnya (A, B, C, ...).

```json
{
  "status": "success",
  "message": "Berhasil mengambil soal.",
  "data": [
    {
      "idSoal": 12,
      "pertanyaan": "Huruf kapital dipakai sebagai huruf pertama pada...",
      "difficulty": "Mudah",
      "targetTime": 60,
      "pembahasan": "Huruf kapital dipakai untuk nama hari dan bulan...",
      "ringkasan": "Nama hari dan bulan diawali huruf kapital.",
      "opsi": [
        { "idOpsi": 40, "opsi": "A. Kata penghubung \"dan\"", "isCorrect": false },
        { "idOpsi": 41, "opsi": "B. Nama hari dan bulan", "isCorrect": true }
      ]
    }
  ]
}
```

Bentuk ini hanya contoh. Yang dibaca frontend: `pertanyaan`, `difficulty`, `targetTime`,
`pembahasan`, `ringkasan`, `opsi[].opsi`, dan `opsi[].isCorrect`.

## 2. `PUT /api/kuis/:idKuis/soal`

- Middleware: `verifyAdmin`, dengan aturan pemilik yang sama seperti `updateKuis`
  (`idUser` kuis NULL atau sama dengan `req.currentUser.id`).
- Fungsinya **mengganti seluruh soal kuis**: soal lama dan opsinya dihapus, lalu yang
  dikirim dimasukkan ulang sesuai urutan array. Editor selalu mengirim daftar lengkap.

Body:

```json
{
  "soal": [
    {
      "pertanyaan": "Huruf kapital dipakai sebagai huruf pertama pada...",
      "difficulty": "Mudah",
      "targetTime": 60,
      "pembahasan": "Huruf kapital dipakai untuk ...",
      "ringkasan": null,
      "opsi": [
        { "opsi": "A. Kata penghubung \"dan\"", "isCorrect": false },
        { "opsi": "B. Nama hari dan bulan", "isCorrect": true }
      ]
    }
  ]
}
```

Yang sudah divalidasi di frontend, tapi tetap sebaiknya dicek ulang di backend:

| Field | Aturan |
|---|---|
| `pertanyaan` | wajib, tidak kosong |
| `difficulty` | `Mudah` / `Sedang` / `Sulit` (sama dengan `DIFFICULTY_LEVELS` di `services/fuzzy/membership.js`) |
| `targetTime` | bilangan > 0, **dalam detik**; dipakai `fuzzifyResponseTime` |
| `opsi` | minimal 2, maksimal 6, tepat **satu** yang `isCorrect: true` |
| `opsi[].opsi` | sudah berisi label (`"A. ..."`), sama seperti data hasil `Ekstrak Soal/extract_soal.js` |
| `pembahasan`, `ringkasan` | boleh `null` |

Respons sukses: `200` dengan `data` berupa daftar soal yang tersimpan (bentuknya sama dengan GET).
Frontend hanya memakai `message`.

Catatan: supaya kuis tidak tertinggal dalam keadaan setengah tersimpan (soal lama sudah
terhapus tapi soal baru gagal masuk), sebaiknya proses hapus dan simpan ini dijalankan
dalam satu transaksi, misalnya lewat fungsi RPC Postgres.

## 3. Kolom baru di tabel `Soal`

```sql
ALTER TABLE public."Soal" ADD COLUMN IF NOT EXISTS "ringkasan"  text;
ALTER TABLE public."Soal" ADD COLUMN IF NOT EXISTS "targetTime" integer NOT NULL DEFAULT 60;
```

`materi` dan `poin` di tabel `Soal` belum dipakai editor. Kalau `materi` perlu diisi,
frontend bisa mengirim nama bab.

## 4. (Opsional) Tambahan di `GET /api/kuis`

- `jumlahSoal` (number): kalau ada, akan tampil di baris kuis ("Dibuat 3 Sep 2026 · 10 soal").
- `status` (`'terbit'` | `'draf'`): kalau ada, chip filter Terbit/Draf otomatis muncul
  di halaman Kelola Kuis. Kalau tidak ada, chip-nya disembunyikan.

## 5. (Nanti) Unggah dokumen

Tab "Dokumen" sudah bisa memilih berkas PDF/DOC/DOCX (maksimal 10 MB), tapi tombol simpannya
masih nonaktif. Usulan: `POST /api/kuis/:idKuis/soal/dokumen` (multipart, field `berkas`),
yang mengembalikan hasil ekstraksi dengan bentuk yang sama seperti `GET` di atas. Hasil itu
lalu dibuka di editor supaya guru bisa memeriksanya sebelum menyimpan dengan `PUT`.
