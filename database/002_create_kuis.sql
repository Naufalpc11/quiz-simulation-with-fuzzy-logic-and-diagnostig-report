-- Jalankan di Supabase SQL Editor
create table public.kuis (
  id uuid primary key default gen_random_uuid(),
  id_akun uuid not null references public.user(id) on delete cascade,
  id_topik uuid not null references public.topik(id),
  judul text not null,
  deskripsi text,
  tanggal_dibuat timestamptz not null default now()
);

create index idx_kuis_id_akun on public.kuis(id_akun);
create index idx_kuis_id_topik on public.kuis(id_topik);
