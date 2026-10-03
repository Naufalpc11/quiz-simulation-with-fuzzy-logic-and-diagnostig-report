-- ==============================================================================
-- USULAN SKEMA TABEL PENGERJAAN KUIS & JAWABAN MAHASISWA (e-SIKAP)
-- Referensi untuk Tim Backend & Database Supabase
-- ==============================================================================

-- 1. Tabel PengerjaanKuis: Menyimpan sesi dan ringkasan evaluasi kuis mahasiswa
CREATE TABLE IF NOT EXISTS public."PengerjaanKuis" (
    "idPengerjaan" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "idUser" UUID NOT NULL REFERENCES public."User"("idUser") ON DELETE CASCADE,
    "idKuis" UUID NOT NULL REFERENCES public."Kuis"("idKuis") ON DELETE CASCADE,
    "skorFuzzy" NUMERIC(5, 2) NOT NULL,
    "kategoriFuzzy" TEXT NOT NULL,
    "totalSoal" INTEGER NOT NULL,
    "totalBenar" INTEGER NOT NULL,
    "totalSalah" INTEGER NOT NULL,
    "akurasi" NUMERIC(5, 2) NOT NULL,
    "rataRataWaktu" NUMERIC(6, 2) NOT NULL,
    "durasiPengerjaan" INTEGER NOT NULL, -- dalam detik
    "rekomendasi" TEXT,
    "distribusiTingkat" JSONB,
    "distribusiKesulitan" JSONB,
    "tanggalPengerjaan" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indeks untuk pencarian riwayat cepat
CREATE INDEX IF NOT EXISTS idx_pengerjaan_id_user ON public."PengerjaanKuis"("idUser");
CREATE INDEX IF NOT EXISTS idx_pengerjaan_id_kuis ON public."PengerjaanKuis"("idKuis");
CREATE INDEX IF NOT EXISTS idx_pengerjaan_tanggal ON public."PengerjaanKuis"("tanggalPengerjaan" DESC);

-- 2. Tabel JawabanMahasiswa: Menyimpan detail jawaban per butir soal beserta waktu & evaluasinya
CREATE TABLE IF NOT EXISTS public."JawabanMahasiswa" (
    "idJawaban" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "idPengerjaan" UUID NOT NULL REFERENCES public."PengerjaanKuis"("idPengerjaan") ON DELETE CASCADE,
    "idSoal" BIGINT NOT NULL REFERENCES public."Soal"("idSoal") ON DELETE CASCADE,
    "idOpsi" BIGINT REFERENCES public."OpsiJawaban"("idOpsi") ON DELETE SET NULL,
    "responseTime" NUMERIC(6, 2) NOT NULL, -- dalam detik
    "isCorrect" BOOLEAN NOT NULL,
    "skorFuzzy" NUMERIC(5, 2) NOT NULL,
    "kategoriFuzzy" TEXT NOT NULL
);

-- Indeks untuk relasi jawaban
CREATE INDEX IF NOT EXISTS idx_jawaban_id_pengerjaan ON public."JawabanMahasiswa"("idPengerjaan");
CREATE INDEX IF NOT EXISTS idx_jawaban_id_soal ON public."JawabanMahasiswa"("idSoal");

-- Keamanan RLS (Row Level Security)
ALTER TABLE public."PengerjaanKuis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."JawabanMahasiswa" ENABLE ROW LEVEL SECURITY;

-- Mahasiswa hanya boleh melihat hasil pengerjaannya sendiri; Admin/Super Admin boleh melihat semua
CREATE POLICY "Mahasiswa dapat melihat pengerjaannya sendiri"
    ON public."PengerjaanKuis"
    FOR SELECT
    USING (auth.uid() = "idUser" OR EXISTS (
        SELECT 1 FROM public."User" u WHERE u."idUser" = auth.uid() AND u."role" IN ('Admin', 'Super Admin')
    ));

CREATE POLICY "Mahasiswa dapat menambahkan pengerjaan"
    ON public."PengerjaanKuis"
    FOR INSERT
    WITH CHECK (auth.uid() = "idUser");

CREATE POLICY "Mahasiswa dapat melihat detail jawabannya sendiri"
    ON public."JawabanMahasiswa"
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public."PengerjaanKuis" p
        WHERE p."idPengerjaan" = "JawabanMahasiswa"."idPengerjaan"
          AND (p."idUser" = auth.uid() OR EXISTS (
              SELECT 1 FROM public."User" u WHERE u."idUser" = auth.uid() AND u."role" IN ('Admin', 'Super Admin')
          ))
    ));

CREATE POLICY "Mahasiswa dapat menambahkan detail jawaban"
    ON public."JawabanMahasiswa"
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public."PengerjaanKuis" p
        WHERE p."idPengerjaan" = "JawabanMahasiswa"."idPengerjaan" AND p."idUser" = auth.uid()
    ));
