# API pengerjaan kuis

Semua endpoint pengerjaan memerlukan bearer token mahasiswa. ID kuis, soal,
opsi, dan pengerjaan menggunakan UUID sesuai skema Supabase saat ini.

## Memeriksa relasi data lama

Skrip ekstraksi kini menolak upload tanpa `ID_KUIS` UUID dan memasangkan setiap
soal ke kuis tersebut. Soal lama yang telanjur tersimpan dengan `idKuis = NULL`
tidak bisa dipasangkan otomatis tanpa mengetahui kuis tujuan. Periksa dan
petakan soal terlebih dahulu:

```sql
SELECT "idSoal", pertanyaan
FROM public."Soal"
WHERE "idKuis" IS NULL;
```

Setelah memastikan UUID kuis dan soal yang tepat, tautkan hanya baris yang
sudah diverifikasi:

```sql
UPDATE public."Soal"
SET "idKuis" = 'UUID-KUIS-YANG-VALID'
WHERE "idSoal" IN ('UUID-SOAL-1', 'UUID-SOAL-2')
  AND "idKuis" IS NULL;
```

Pastikan kuis memiliki `idBab` yang valid dan setiap soal mempunyai opsi serta
tepat satu kunci jawaban sebelum mencoba pengerjaan.

## Persiapan database

Jalankan [`migrations/20261004_quiz_attempts.sql`](./migrations/20261004_quiz_attempts.sql)
di Supabase SQL Editor sebelum menjalankan endpoint. Migrasi menambah status
pengerjaan, ringkasan hasil fuzzy, detail jawaban, dan fungsi penyimpanan submit
atomik. Migrasi juga menambahkan `targetTime`, `ringkasan`, dan `urutan` pada
tabel `Soal` jika kolom itu belum tersedia.

Pastikan setiap soal memiliki `idKuis` yang menunjuk ke kuis valid, minimal dua
opsi, dan tepat satu opsi dengan `isCorrect = true`. Untuk skrip ekstraksi,
set `ID_KUIS` ke UUID kuis yang dituju sebelum upload. Jangan menggunakan ID
angka atau `null`.

## Mulai / lanjutkan pengerjaan

`POST /api/pengerjaan`

```json
{ "idKuis": "5a44ab47-a51b-40f1-a904-fc3f0ed4f287" }
```

Membuat attempt baru atau melanjutkan attempt berstatus `berlangsung` untuk
mahasiswa dan kuis yang sama. Respons berisi objek `pengerjaan`, metadata `kuis`,
soal dengan opsi tanpa kunci jawaban, dan jawaban tersimpan untuk pemulihan sesi.

## Simpan jawaban

`PUT /api/pengerjaan/{idPengerjaan}/jawaban`

```json
{
  "jawaban": [
    {
      "idSoal": "uuid-soal",
      "idOpsi": "uuid-opsi",
      "waktuPengerjaan": 18
    }
  ]
}
```

Backend memvalidasi bahwa soal bagian dari kuis dan opsi bagian dari soal.
Frontend tidak mengirim atau menentukan status benar.

## Submit

`POST /api/pengerjaan/{idPengerjaan}/submit`

```json
{
  "jawaban": [
    {
      "idSoal": "uuid-soal",
      "idOpsi": "uuid-opsi",
      "waktuPengerjaan": 18
    }
  ]
}
```

Jawaban dinilai dengan kunci dari database; soal yang tidak dijawab dihitung
salah. Backend menghitung akurasi, durasi, skor fuzzy, kategori, distribusi,
dan rekomendasi, lalu menyimpan hasil dan jawaban dalam satu transaksi DB.
Submit berulang untuk attempt selesai mengembalikan hasil yang sama.

## Hasil dan pembahasan

- `GET /api/pengerjaan/{idPengerjaan}` mengembalikan ringkasan resmi hanya jika
  attempt milik mahasiswa yang sedang login dan sudah selesai.
- `GET /api/pengerjaan/{idPengerjaan}/pembahasan` mengembalikan pilihan,
  kunci, status benar/salah, pembahasan, dan ringkasan. Endpoint menolak attempt
  yang belum selesai.

Hasil frontend membawa `idPengerjaan` sebagai query `pengerjaan` ke halaman
hasil. Hasil lokal `sessionStorage` tidak digunakan sebagai nilai resmi.
