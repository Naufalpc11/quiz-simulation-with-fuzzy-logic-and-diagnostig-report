-- Jalankan di Supabase SQL Editor
-- Mendokumentasikan tabel session_login yang sudah ada di proyek, supaya
-- skemanya bisa dibuat ulang dari nol (misalnya saat bikin project Supabase
-- baru untuk staging atau saat anggota tim menyiapkan lingkungan sendiri).
--
-- Satu baris per akun, bukan riwayat. Barisnya ditimpa tiap kali login.
--   logout_time NULL  -> pengguna sedang aktif
--   logout_time terisi -> sesi terakhir sudah ditutup

create table public.session_login (
  email text primary key,
  last_login timestamptz,
  logout_time timestamptz,
  -- Diturunkan otomatis dari email, tidak boleh diisi manual.
  -- Dipotong 20 karakter agar sama dengan aturan username di public.user.
  username text generated always as (left(split_part(email, '@', 1), 20)) stored
);

-- Backend memakai upsert dengan onConflict 'email', jadi keunikan email wajib.
-- Sudah dijamin oleh primary key di atas.

-- Tabel ini hanya diakses backend lewat service role key.
-- RLS dinyalakan tanpa policy apa pun, sehingga anon key tidak bisa
-- membaca maupun menulis isinya.
alter table public.session_login enable row level security;
