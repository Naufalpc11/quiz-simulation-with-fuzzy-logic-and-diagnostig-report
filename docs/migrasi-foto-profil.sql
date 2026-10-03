-- Migrasi: foto profil pengguna
-- Jalankan sekali di Supabase → SQL Editor SEBELUM menjalankan backend versi ini,
-- karena middleware verifyLoggedIn ikut membaca kolom "fotoProfil".

-- 1. Kolom path foto di Storage (bukan URL penuh), NULL = belum punya foto
alter table public."User"
  add column if not exists "fotoProfil" text;

-- 2. Bucket publik untuk foto profil: maks 2 MB, hanya JPG/PNG/WEBP.
--    Upload & hapus hanya lewat backend (service role), jadi tidak perlu
--    policy insert/update/delete untuk anon atau authenticated.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('foto-profil', 'foto-profil', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
