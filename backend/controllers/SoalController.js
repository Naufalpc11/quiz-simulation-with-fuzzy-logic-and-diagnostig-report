// controllers/SoalController.js
import { supabaseAdmin } from '../config/db.js';
import { ROLE } from '../config/roles.js';
import { successResponse, errorResponse } from '../models/apiResponse.js';

const SOAL_COLUMNS = 'idSoal, idKuis, pertanyaan, difficulty, poin, pembahasan';
const OPSI_COLUMNS = 'idOpsi, opsi, isCorrect';

// Disimpan sebagai angka supaya bisa dirata-rata (HasilAnalisis.rataDifficulty).
// Fuzzy service menerima teks, jadi pakai DIFFICULTY_LABEL saat menilai —
// angka yang dikirim langsung ke fuzzy diam-diam dianggap "Sedang".
export const DIFFICULTY_LABEL = Object.freeze({ 1: 'Mudah', 2: 'Sedang', 3: 'Sulit' });

const MIN_OPSI = 2;
const MAX_OPSI = 5;

const difficultyValid = (nilai) => Object.hasOwn(DIFFICULTY_LABEL, nilai) && Number.isInteger(nilai);
const poinValid = (nilai) => nilai === null || (Number.isInteger(nilai) && nilai >= 0);
const teksTerisi = (nilai) => typeof nilai === 'string' && nilai.trim() !== '';

// Mengembalikan pesan error, atau null kalau daftar opsinya valid.
const cekOpsi = (opsi) => {
  if (!Array.isArray(opsi) || opsi.length < MIN_OPSI || opsi.length > MAX_OPSI) {
    return `Opsi jawaban harus berisi ${MIN_OPSI} sampai ${MAX_OPSI} pilihan.`;
  }
  if (!opsi.every((o) => teksTerisi(o?.opsi))) {
    return 'Setiap opsi jawaban wajib berisi teks.';
  }
  if (opsi.filter((o) => o.isCorrect === true).length !== 1) {
    return 'Harus ada tepat satu opsi jawaban yang benar.';
  }
  return null;
};

// Admin melihat kunci jawaban dan pembahasan. Mahasiswa tidak, supaya
// jawabannya tidak bisa diintip lewat Network tab sebelum mengerjakan kuis.
const bentukSoal = (soal, isAdmin) => {
  if (isAdmin) return soal;
  const { pembahasan, OpsiJawaban, ...sisa } = soal;
  return { ...sisa, OpsiJawaban: OpsiJawaban.map(({ isCorrect, ...o }) => o) };
};

// Soal tidak punya pemilik sendiri — pemiliknya adalah pembuat kuisnya.
// Mengembalikan pesan error + status, atau null kalau admin ini boleh mengurusnya.
const cekAksesKuis = async (idKuis, currentUserId) => {
  // Soal tanpa kuis = bank soal, boleh diurus admin mana pun.
  if (idKuis === null) return null;

  const { data: kuis, error } = await supabaseAdmin
    .from('Kuis')
    .select('idKuis, idUser')
    .eq('idKuis', idKuis)
    .maybeSingle();

  // Soal.idKuis belum punya foreign key ke Kuis, jadi keberadaan kuisnya dicek di sini.
  if (error || !kuis) {
    return { status: 400, message: 'Kuis yang dipilih tidak ditemukan.' };
  }

  // idUser NULL = pembuatnya sudah dihapus, kuisnya diwariskan ke semua admin.
  if (kuis.idUser !== null && kuis.idUser !== currentUserId) {
    return { status: 403, message: 'Kamu hanya bisa mengelola soal pada kuis yang kamu buat sendiri.' };
  }

  return null;
};

// Menampilkan soal beserta opsinya — bisa diakses semua role yang sudah login.
// Bisa difilter per kuis lewat query ?idKuis=...
export const getAllSoal = async (req, res) => {
  try {
    const { idKuis } = req.query;

    let query = supabaseAdmin
      .from('Soal')
      .select(`${SOAL_COLUMNS}, OpsiJawaban(${OPSI_COLUMNS})`)
      .order('idSoal', { ascending: true })
      .order('opsi', { referencedTable: 'OpsiJawaban', ascending: true });

    if (idKuis) {
      query = query.eq('idKuis', idKuis);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json(errorResponse({ message: error.message }));
    }

    const isAdmin = req.currentUser.role === ROLE.ADMIN;
    return res.json(
      successResponse({ message: 'Berhasil mengambil daftar soal.', data: data.map((s) => bentukSoal(s, isAdmin)) }),
    );
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal mengambil daftar soal.' }));
  }
};

export const getSoalById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('Soal')
      .select(`${SOAL_COLUMNS}, OpsiJawaban(${OPSI_COLUMNS})`)
      .eq('idSoal', id)
      .order('opsi', { referencedTable: 'OpsiJawaban', ascending: true })
      .single();

    if (error || !data) {
      return res.status(404).json(errorResponse({ message: 'Soal tidak ditemukan.' }));
    }

    const isAdmin = req.currentUser.role === ROLE.ADMIN;
    return res.json(successResponse({ message: 'Berhasil mengambil soal.', data: bentukSoal(data, isAdmin) }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal mengambil soal.' }));
  }
};

// Hanya admin (guru). Soal dan opsinya dikirim sekaligus:
// { idKuis?, pertanyaan, difficulty, poin?, pembahasan?, opsi: [{ opsi, isCorrect }] }
export const createSoal = async (req, res) => {
  try {
    const { idKuis = null, pertanyaan, difficulty, poin = null, pembahasan = null, opsi } = req.body;

    if (!teksTerisi(pertanyaan)) {
      return res.status(400).json(errorResponse({ message: 'Pertanyaan wajib diisi.' }));
    }
    if (!difficultyValid(difficulty)) {
      return res.status(400).json(errorResponse({ message: 'difficulty wajib diisi: 1 (Mudah), 2 (Sedang), atau 3 (Sulit).' }));
    }
    if (!poinValid(poin)) {
      return res.status(400).json(errorResponse({ message: 'Poin harus berupa angka bulat tidak negatif.' }));
    }
    const opsiError = cekOpsi(opsi);
    if (opsiError) {
      return res.status(400).json(errorResponse({ message: opsiError }));
    }

    const akses = await cekAksesKuis(idKuis, req.currentUser.id);
    if (akses) {
      return res.status(akses.status).json(errorResponse({ message: akses.message }));
    }

    const { data: soal, error: soalError } = await supabaseAdmin
      .from('Soal')
      .insert({ idKuis, pertanyaan: pertanyaan.trim(), difficulty, poin, pembahasan })
      .select(SOAL_COLUMNS)
      .single();

    if (soalError) {
      return res.status(500).json(errorResponse({ message: soalError.message || 'Gagal membuat soal.' }));
    }

    const { data: opsiBaru, error: opsiInsertError } = await supabaseAdmin
      .from('OpsiJawaban')
      .insert(opsi.map((o) => ({ idSoal: soal.idSoal, opsi: o.opsi.trim(), isCorrect: o.isCorrect === true })))
      .select(OPSI_COLUMNS);

    if (opsiInsertError) {
      // rollback soal kalau opsinya gagal, biar tidak ada soal tanpa pilihan jawaban
      await supabaseAdmin.from('Soal').delete().eq('idSoal', soal.idSoal);
      return res.status(500).json(errorResponse({ message: opsiInsertError.message || 'Gagal menyimpan opsi jawaban.' }));
    }

    return res.status(201).json(
      successResponse({ message: 'Soal berhasil dibuat.', data: { ...soal, OpsiJawaban: opsiBaru } }),
    );
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal membuat soal.' }));
  }
};

// Hanya admin pemilik kuis soal ini. Kalau `opsi` dikirim, seluruh opsi lama diganti.
export const updateSoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { idKuis, pertanyaan, difficulty, poin, pembahasan, opsi } = req.body;

    if ([idKuis, pertanyaan, difficulty, poin, pembahasan, opsi].every((v) => v === undefined)) {
      return res.status(400).json(errorResponse({ message: 'Tidak ada data yang diubah.' }));
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from('Soal')
      .select('idSoal, idKuis')
      .eq('idSoal', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json(errorResponse({ message: 'Soal tidak ditemukan.' }));
    }

    // Hanya 403 yang menghalangi. Kuis lama yang sudah hilang (400) tidak boleh
    // mengunci soalnya — soal itu tetap boleh diubah atau dipindah ke kuis lain.
    const aksesLama = await cekAksesKuis(existing.idKuis, req.currentUser.id);
    if (aksesLama?.status === 403) {
      return res.status(403).json(errorResponse({ message: aksesLama.message }));
    }

    const updatePayload = {};
    if (idKuis !== undefined && idKuis !== existing.idKuis) {
      const aksesBaru = await cekAksesKuis(idKuis, req.currentUser.id);
      if (aksesBaru) {
        return res.status(aksesBaru.status).json(errorResponse({ message: aksesBaru.message }));
      }
      updatePayload.idKuis = idKuis;
    }
    if (pertanyaan !== undefined) {
      if (!teksTerisi(pertanyaan)) {
        return res.status(400).json(errorResponse({ message: 'Pertanyaan tidak boleh kosong.' }));
      }
      updatePayload.pertanyaan = pertanyaan.trim();
    }
    if (difficulty !== undefined) {
      if (!difficultyValid(difficulty)) {
        return res.status(400).json(errorResponse({ message: 'difficulty harus 1 (Mudah), 2 (Sedang), atau 3 (Sulit).' }));
      }
      updatePayload.difficulty = difficulty;
    }
    if (poin !== undefined) {
      if (!poinValid(poin)) {
        return res.status(400).json(errorResponse({ message: 'Poin harus berupa angka bulat tidak negatif.' }));
      }
      updatePayload.poin = poin;
    }
    if (pembahasan !== undefined) updatePayload.pembahasan = pembahasan;

    if (opsi !== undefined) {
      const opsiError = cekOpsi(opsi);
      if (opsiError) {
        return res.status(400).json(errorResponse({ message: opsiError }));
      }
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error } = await supabaseAdmin.from('Soal').update(updatePayload).eq('idSoal', id);
      if (error) {
        return res.status(500).json(errorResponse({ message: error.message || 'Gagal memperbarui soal.' }));
      }
    }

    if (opsi !== undefined) {
      const { data: opsiLama, error: opsiLamaError } = await supabaseAdmin
        .from('OpsiJawaban')
        .select('idOpsi')
        .eq('idSoal', id);

      if (opsiLamaError) {
        return res.status(500).json(errorResponse({ message: opsiLamaError.message }));
      }

      // Opsi baru dimasukkan dulu, baru opsi lama dihapus. Kalau salah satu
      // langkah gagal, soalnya tetap punya satu set opsi yang utuh.
      const { data: opsiBaru, error: insertError } = await supabaseAdmin
        .from('OpsiJawaban')
        .insert(opsi.map((o) => ({ idSoal: id, opsi: o.opsi.trim(), isCorrect: o.isCorrect === true })))
        .select('idOpsi');

      if (insertError) {
        return res.status(500).json(errorResponse({ message: insertError.message || 'Gagal menyimpan opsi jawaban.' }));
      }

      const { error: deleteError } = await supabaseAdmin
        .from('OpsiJawaban')
        .delete()
        .in('idOpsi', opsiLama.map((o) => o.idOpsi));

      if (deleteError) {
        await supabaseAdmin.from('OpsiJawaban').delete().in('idOpsi', opsiBaru.map((o) => o.idOpsi));
        // 23503 = foreign key violation — opsi lama sudah dipilih mahasiswa di JawabanMahasiswa
        if (deleteError.code === '23503') {
          return res.status(409).json(
            errorResponse({ message: 'Opsi jawaban tidak bisa diganti karena soal ini sudah pernah dijawab mahasiswa.' }),
          );
        }
        return res.status(500).json(errorResponse({ message: deleteError.message || 'Gagal mengganti opsi jawaban.' }));
      }
    }

    const { data, error } = await supabaseAdmin
      .from('Soal')
      .select(`${SOAL_COLUMNS}, OpsiJawaban(${OPSI_COLUMNS})`)
      .eq('idSoal', id)
      .order('opsi', { referencedTable: 'OpsiJawaban', ascending: true })
      .single();

    if (error) {
      return res.status(500).json(errorResponse({ message: error.message }));
    }

    return res.json(successResponse({ message: 'Soal berhasil diperbarui.', data }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal memperbarui soal.' }));
  }
};

// Hanya admin pemilik kuis soal ini
export const deleteSoal = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existing, error: findError } = await supabaseAdmin
      .from('Soal')
      .select('idSoal, idKuis')
      .eq('idSoal', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json(errorResponse({ message: 'Soal tidak ditemukan.' }));
    }

    const akses = await cekAksesKuis(existing.idKuis, req.currentUser.id);
    if (akses?.status === 403) {
      return res.status(403).json(errorResponse({ message: akses.message }));
    }

    // Soal yang sudah dijawab mahasiswa jangan dihapus — riwayat nilainya ikut hilang.
    const { count, error: countError } = await supabaseAdmin
      .from('JawabanMahasiswa')
      .select('idJawaban', { count: 'exact', head: true })
      .eq('idSoal', id);

    if (countError) {
      return res.status(500).json(errorResponse({ message: countError.message }));
    }
    if (count > 0) {
      return res.status(409).json(
        errorResponse({ message: 'Soal tidak bisa dihapus karena sudah pernah dijawab mahasiswa.' }),
      );
    }

    const { error: opsiError } = await supabaseAdmin.from('OpsiJawaban').delete().eq('idSoal', id);
    if (opsiError) {
      return res.status(500).json(errorResponse({ message: opsiError.message || 'Gagal menghapus opsi jawaban.' }));
    }

    const { error } = await supabaseAdmin.from('Soal').delete().eq('idSoal', id);
    if (error) {
      return res.status(500).json(errorResponse({ message: error.message || 'Gagal menghapus soal.' }));
    }

    return res.json(successResponse({ message: 'Soal berhasil dihapus.' }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal menghapus soal.' }));
  }
};
