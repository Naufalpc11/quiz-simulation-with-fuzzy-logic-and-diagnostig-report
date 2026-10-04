-- Quiz attempt persistence. Run once in Supabase SQL Editor.
-- IDs follow the existing UUID-based Bab/Kuis/Soal schema.

CREATE TABLE IF NOT EXISTS public."PengerjaanKuis" (
  "idPengerjaan" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "idUser" uuid NOT NULL REFERENCES public."User" ("idUser") ON DELETE CASCADE,
  "idKuis" uuid NOT NULL REFERENCES public."Kuis" ("idKuis") ON DELETE CASCADE,
  attempt integer NOT NULL DEFAULT 1,
  score double precision NOT NULL DEFAULT 0,
  "waktuMulai" timestamptz NOT NULL DEFAULT now(),
  "waktuSelesai" timestamptz,
  status text NOT NULL DEFAULT 'berlangsung',
  "skorFuzzy" double precision NOT NULL DEFAULT 0,
  "kategoriFuzzy" text NOT NULL DEFAULT 'Belum dievaluasi',
  "totalSoal" integer NOT NULL DEFAULT 0,
  "totalBenar" integer NOT NULL DEFAULT 0,
  "totalSalah" integer NOT NULL DEFAULT 0,
  akurasi double precision NOT NULL DEFAULT 0,
  "rataRataWaktu" double precision NOT NULL DEFAULT 0,
  "durasiPengerjaan" integer NOT NULL DEFAULT 0,
  rekomendasi text,
  "distribusiTingkat" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "distribusiKesulitan" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "hasilDetail" jsonb NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE public."PengerjaanKuis"
  ADD COLUMN IF NOT EXISTS attempt integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS score double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "waktuMulai" timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "waktuSelesai" timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'berlangsung',
  ADD COLUMN IF NOT EXISTS "skorFuzzy" double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "kategoriFuzzy" text NOT NULL DEFAULT 'Belum dievaluasi',
  ADD COLUMN IF NOT EXISTS "totalSoal" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalBenar" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalSalah" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS akurasi double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "rataRataWaktu" double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "durasiPengerjaan" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rekomendasi text,
  ADD COLUMN IF NOT EXISTS "distribusiTingkat" jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "distribusiKesulitan" jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "hasilDetail" jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public."PengerjaanKuis"
SET status = 'selesai'
WHERE "waktuSelesai" IS NOT NULL AND status = 'berlangsung';

CREATE TABLE IF NOT EXISTS public."JawabanMahasiswa" (
  "idJawaban" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "idPengerjaan" uuid NOT NULL REFERENCES public."PengerjaanKuis" ("idPengerjaan") ON DELETE CASCADE,
  "idSoal" uuid NOT NULL REFERENCES public."Soal" ("idSoal") ON DELETE CASCADE,
  "idOpsi" uuid REFERENCES public."OpsiJawaban" ("idOpsi") ON DELETE SET NULL,
  benar boolean NOT NULL DEFAULT false,
  waktujawab integer NOT NULL DEFAULT 0,
  "isCorrect" boolean NOT NULL DEFAULT false,
  "responseTime" numeric(8, 2) NOT NULL DEFAULT 0,
  "skorFuzzy" double precision NOT NULL DEFAULT 0,
  "kategoriFuzzy" varchar(30) NOT NULL DEFAULT 'Belum dievaluasi',
  "tanggalDibuat" timestamptz DEFAULT now()
);

ALTER TABLE public."JawabanMahasiswa"
  ADD COLUMN IF NOT EXISTS benar boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS waktujawab integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "isCorrect" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "responseTime" numeric(8, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "skorFuzzy" double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "kategoriFuzzy" varchar(30) NOT NULL DEFAULT 'Belum dievaluasi';

CREATE UNIQUE INDEX IF NOT EXISTS idx_jawaban_pengerjaan_soal
  ON public."JawabanMahasiswa" ("idPengerjaan", "idSoal");

CREATE INDEX IF NOT EXISTS idx_pengerjaan_user_kuis_status
  ON public."PengerjaanKuis" ("idUser", "idKuis", status);

ALTER TABLE public."PengerjaanKuis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."JawabanMahasiswa" ENABLE ROW LEVEL SECURITY;

-- Store a submission and its per-question grading atomically. The backend
-- computes all grading values; the client cannot set correct answers/scores.
CREATE OR REPLACE FUNCTION public.finalize_pengerjaan_kuis(
  p_id_pengerjaan uuid,
  p_id_user uuid,
  p_result jsonb,
  p_answers jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public."PengerjaanKuis"
  SET status = 'selesai',
      "waktuSelesai" = now(),
      score = COALESCE((p_result->>'akurasi')::double precision, 0),
      "skorFuzzy" = COALESCE((p_result->>'skorFuzzy')::double precision, 0),
      "kategoriFuzzy" = COALESCE(p_result->>'kategoriFuzzy', 'Sangat Rendah'),
      "totalSoal" = COALESCE((p_result->>'totalSoal')::integer, 0),
      "totalBenar" = COALESCE((p_result->>'totalBenar')::integer, 0),
      "totalSalah" = COALESCE((p_result->>'totalSalah')::integer, 0),
      akurasi = COALESCE((p_result->>'akurasi')::double precision, 0),
      "rataRataWaktu" = COALESCE((p_result->>'rataRataWaktu')::double precision, 0),
      "durasiPengerjaan" = COALESCE((p_result->>'totalWaktuPengerjaan')::integer, 0),
      rekomendasi = p_result->>'rekomendasi',
      "distribusiTingkat" = COALESCE(p_result->'distribusiTingkat', '{}'::jsonb),
      "distribusiKesulitan" = COALESCE(p_result->'distribusiKesulitan', '{}'::jsonb),
      "hasilDetail" = COALESCE(p_result->'detailItems', '[]'::jsonb)
  WHERE "idPengerjaan" = p_id_pengerjaan
    AND "idUser" = p_id_user
    AND status = 'berlangsung';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count = 0 THEN
    RAISE EXCEPTION 'Pengerjaan tidak ditemukan atau sudah selesai.'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public."JawabanMahasiswa" (
    "idPengerjaan", "idSoal", "idOpsi", benar, waktujawab, "isCorrect",
    "responseTime", "skorFuzzy", "kategoriFuzzy"
  )
  SELECT p_id_pengerjaan, item."idSoal", item."idOpsi", item.benar,
         item."responseTime"::integer, item.benar, item."responseTime",
         item."skorFuzzy", item."kategoriFuzzy"
  FROM jsonb_to_recordset(p_answers) AS item(
    "idSoal" uuid,
    "idOpsi" uuid,
    benar boolean,
    "responseTime" numeric,
    "skorFuzzy" double precision,
    "kategoriFuzzy" text
  )
  ON CONFLICT ("idPengerjaan", "idSoal") DO UPDATE
  SET "idOpsi" = EXCLUDED."idOpsi",
      benar = EXCLUDED.benar,
      waktujawab = EXCLUDED.waktujawab,
      "isCorrect" = EXCLUDED."isCorrect",
      "responseTime" = EXCLUDED."responseTime",
      "skorFuzzy" = EXCLUDED."skorFuzzy",
      "kategoriFuzzy" = EXCLUDED."kategoriFuzzy";
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_pengerjaan_kuis(uuid, uuid, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_pengerjaan_kuis(uuid, uuid, jsonb, jsonb) TO service_role;

ALTER TABLE public."Soal"
  ADD COLUMN IF NOT EXISTS "targetTime" integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS ringkasan text,
  ADD COLUMN IF NOT EXISTS urutan integer;
