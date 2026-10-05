-- Bab dipakai bersama semua dosen, kuis milik dosen pembuatnya dan dikunci PIN.
-- Jalankan sekali di Supabase SQL Editor SEBELUM menjalankan backend versi ini.
-- Aman dijalankan ulang.

-- 1. PIN kuis: 4-8 digit angka. NULL = dosen belum membuka kuis,
--    mahasiswa belum bisa memulai pengerjaan.
ALTER TABLE public."Kuis"
  ADD COLUMN IF NOT EXISTS pin text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kuis_pin_format') THEN
    ALTER TABLE public."Kuis"
      ADD CONSTRAINT kuis_pin_format CHECK (pin IS NULL OR pin ~ '^[0-9]{4,8}$');
  END IF;
END $$;

-- 2. Nama bab unik tanpa membedakan huruf besar/kecil dan spasi di ujung.
--    Gagal kalau sudah ada nama dobel; rapikan dulu datanya.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bab_nama_unik
  ON public."Bab" (lower(btrim("namaBab")));

-- 3. Akun dosen dihapus -> bab & kuis buatannya tetap ada tanpa pemilik
--    (bisa dikelola dosen mana pun), bukan ikut terhapus atau menghalangi penghapusan akun.
DO $$
DECLARE
  target record;
  fk record;
BEGIN
  FOR target IN
    SELECT * FROM (VALUES ('Kuis', 'idUser'), ('Bab', 'dibuatOleh')) AS t(tabel, kolom)
  LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL', target.tabel, target.kolom);

    FOR fk IN
      SELECT c.conname, c.confdeltype
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
      WHERE c.contype = 'f'
        AND c.conrelid = format('public.%I', target.tabel)::regclass
        AND c.confrelid = 'public."User"'::regclass
        AND a.attname = target.kolom
    LOOP
      IF fk.confdeltype <> 'n' THEN  -- 'n' = ON DELETE SET NULL
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', target.tabel, fk.conname);
        EXECUTE format(
          'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public."User" ("idUser") ON DELETE SET NULL',
          target.tabel, fk.conname, target.kolom
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;
