# Use Case Log Frontend

Penanda halaman frontend yang sudah dibuat, berdasarkan daftar use case di `Use_Case_log.md`.
Pembagian "kelar" dan "belum kelar" tetap mengikuti `Use_Case_log.md`. Kolom **Status FE** menunjukkan kondisi halaman di frontend (branch `frontend`, per 4 Oktober 2026).

Keterangan Status FE:
- **Selesai**: halaman sudah ada dan tersambung ke backend.
- **Sebagian**: halaman sudah ada, tapi data masih contoh atau belum tersimpan ke server.
- **Belum**: halaman belum dibuat.

## Use Case kelar

### Super Admin

| No | Use Case | Status FE | Halaman | Dikerjakan |
|---|---|---|---|---|
| 1 | Melihat List Akun | Selesai | `/akun` (Kelola Akun) | Ojan |
| 2 | Hapus Akun | Selesai | `/akun`, tombol Hapus | Ojan |
| 3 | Menambahkan Akun | Selesai | `/akun`, tombol + Tambah Akun | Ojan |

### All User

| No | Use Case | Status FE | Halaman | Dikerjakan |
|---|---|---|---|---|
| 1 | Login | Selesai | `/` (Login) | Ojan |
| 2 | Reset Password | Selesai | `/`, tombol Lupa Password. Halaman ganti password dari backend | Ojan |
| 3 | Logout | Selesai | Ikon keluar di header admin, menu profil mahasiswa | Ojan (admin), Anitya (mahasiswa) |

### Pengguna/Mahasiswa

| No | Use Case | Status FE | Halaman | Dikerjakan |
|---|---|---|---|---|
| 1 | Melihat Soal (tanpa kunci jawaban & pembahasan) | Selesai | `/latihan/:id` (daftar kuis per bab), `/kuis/:id/kerjakan` | Anitya |

### Admin

| No | Use Case | Status FE | Halaman | Dikerjakan |
|---|---|---|---|---|
| 1 | Melihat Bab | Selesai | `/bab` (Kelola Bab) | Ojan |
| 2 | Menambahkan Bab | Selesai | `/bab/tambah` | Ojan |
| 3 | Mengedit Bab | Selesai | `/bab/:id/edit` | Ojan |
| 4 | Menghapus Bab | Selesai | `/bab`, tombol Hapus | Ojan |
| 5 | Melihat Kuis | Selesai | `/bab/:id/kuis` (klik nama bab) | Ojan |
| 6 | Menambahkan Kuis | Selesai | `/kuis/tambah` | Ojan |
| 7 | Mengedit Kuis | Selesai | `/kuis/:id/edit` | Ojan |
| 8 | Menghapus Kuis | Selesai | `/bab/:id/kuis`, tombol Hapus | Ojan |
| 9 | Melihat Soal | Selesai | `/kuis/:id/soal` (Edit Soal) | Ojan |
| 10 | Menambahkan Soal | Selesai | `/kuis/tambah`, `/kuis/:id/soal` | Ojan |
| 11 | Mengedit Soal | Selesai | `/kuis/:id/soal` | Ojan |
| 12 | Menghapus Soal | Selesai | `/kuis/:id/soal`, tombol Hapus Soal | Ojan |

## Yang Belum Kelar

### Pengguna

| No | Use Case | Status FE | Halaman | Dikerjakan | Catatan |
|---|---|---|---|---|---|
| 1 | Melihat Akun | Selesai | `/profil`, `/profil/edit-foto` | Anitya | Ganti foto masih disimpan di browser, belum ke endpoint `/api/mahasiswa/profil/foto` |
| 2 | Melihat Roadmap | Sebagian | `/peta-belajar`, `/peta-belajar/:id/roadmap` | Anitya | Daftar bab dari backend, isi roadmap masih data contoh |
| 3 | Melihat Report Mahasiswa | Sebagian | `/statistik`, `/kuis/:id/hasil` | Anitya | Nilai statistik masih data contoh, hasil kuis dibaca dari browser |
| 4 | Mengerjakan Kuis | Sebagian | `/kuis/:id/kerjakan` | Anitya | Soal dari backend, jawaban belum dikirim ke server (endpoint pengerjaan belum ada) |

### Admin

| No | Use Case | Status FE | Halaman | Dikerjakan | Catatan |
|---|---|---|---|---|---|
| 1 | Melihat Akun | Belum | - | - | |
| 2 | Mengedit Akun | Belum | - | - | Fungsi `updateProfile` (`PUT /api/auth/me`) sudah ada di `services/auth.js`, belum dipakai halaman mana pun |
| 3 | Melihat Report Mahasiswa | Belum | - | - | Menu Rekap di header admin masih teks (wireframe HA5 Rekap nilai) |

## Halaman pendukung

| Halaman | Isi | Dikerjakan |
|---|---|---|
| `/dashboard` | Latihan: daftar bab untuk mahasiswa | Anitya |
