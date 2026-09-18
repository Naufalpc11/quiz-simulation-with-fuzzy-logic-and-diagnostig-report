-- Jalankan di Supabase SQL Editor
create table public.topik (
  id uuid primary key default gen_random_uuid(),
  nama_topik text not null,
  deskripsi text,
  dibuat_oleh uuid not null references public.user(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_topik_dibuat_oleh on public.topik(dibuat_oleh);
