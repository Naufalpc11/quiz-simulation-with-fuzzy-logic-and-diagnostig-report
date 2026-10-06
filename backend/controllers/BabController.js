// controllers/BabController.js
import { supabaseAdmin } from '../config/db.js';
import { successResponse, errorResponse } from '../models/apiResponse.js';

const BAB_COLUMNS = 'idBab, namaBab, deskripsi, urutanBab, dibuatOleh, tanggalDibuat, tanggalDiupdate';

// Nomor bab dipakai untuk mengurutkan daftar, jadi harus benar-benar angka bulat.
// Minimal 1 — tidak ada bab nomor 0, meski dikirim paksa lewat API.
const urutanValid = (nilai) => Number.isInteger(nilai) && nilai >= 1;

// 23505 = unique violation pada idx_bab_nama_unik (nama bab unik, tidak peka huruf besar/kecil)
const namaBabDobel = (res, namaBab) =>
  res.status(409).json(errorResponse({ message: `Bab dengan nama "${namaBab}" sudah ada.` }));

// Menampilkan semua bab — bisa diakses semua role yang sudah login (guru, superadmin, mahasiswa).
// Diurutkan dari bab pertama, bukan dari yang terbaru dibuat.
export const getAllBab = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('Bab')
      .select(BAB_COLUMNS)
      .order('urutanBab', { ascending: true });

    if (error) {
      return res.status(500).json(errorResponse({ message: error.message }));
    }

    return res.json(
      successResponse({ message: 'Berhasil mengambil daftar bab.', data }),
    );
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal mengambil daftar bab.' }));
  }
};

export const getBabById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('Bab')
      .select(BAB_COLUMNS)
      .eq('idBab', id)
      .single();

    if (error || !data) {
      return res.status(404).json(errorResponse({ message: 'Bab tidak ditemukan.' }));
    }

    return res.json(successResponse({ message: 'Berhasil mengambil bab.', data }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal mengambil bab.' }));
  }
};

// Hanya admin (guru) yang bisa membuat bab. dibuatOleh hanya catatan pembuat:
// bab dipakai bersama, semua dosen bisa mengisinya dengan kuis masing-masing.
export const createBab = async (req, res) => {
  try {
    const { namaBab, deskripsi, urutanBab } = req.body;

    if (!namaBab || !namaBab.trim()) {
      return res.status(400).json(errorResponse({ message: 'Nama bab wajib diisi.' }));
    }

    if (urutanBab !== undefined && !urutanValid(urutanBab)) {
      return res.status(400).json(errorResponse({ message: 'Urutan bab harus berupa angka bulat minimal 1.' }));
    }

    const { data, error } = await supabaseAdmin
      .from('Bab')
      .insert({
        namaBab: namaBab.trim(),
        deskripsi: deskripsi ?? null,
        urutanBab: urutanBab ?? 1,
        dibuatOleh: req.currentUser.id,
      })
      .select(BAB_COLUMNS)
      .single();

    if (error) {
      if (error.code === '23505') return namaBabDobel(res, namaBab.trim());
      return res.status(500).json(errorResponse({ message: error.message || 'Gagal membuat bab.' }));
    }

    return res.status(201).json(successResponse({ message: 'Bab berhasil dibuat.', data }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal membuat bab.' }));
  }
};

// Bab dipakai bersama, jadi admin (dosen) mana pun boleh mengubahnya
export const updateBab = async (req, res) => {
  try {
    const { id } = req.params;
    const { namaBab, deskripsi, urutanBab } = req.body;

    if (namaBab === undefined && deskripsi === undefined && urutanBab === undefined) {
      return res.status(400).json(errorResponse({ message: 'Tidak ada data yang diubah.' }));
    }

    const updatePayload = { tanggalDiupdate: new Date().toISOString() };
    if (namaBab !== undefined) {
      if (!namaBab.trim()) {
        return res.status(400).json(errorResponse({ message: 'Nama bab tidak boleh kosong.' }));
      }
      updatePayload.namaBab = namaBab.trim();
    }
    if (deskripsi !== undefined) updatePayload.deskripsi = deskripsi;
    if (urutanBab !== undefined) {
      if (!urutanValid(urutanBab)) {
        return res.status(400).json(errorResponse({ message: 'Urutan bab harus berupa angka bulat minimal 1.' }));
      }
      updatePayload.urutanBab = urutanBab;
    }

    const { data, error } = await supabaseAdmin
      .from('Bab')
      .update(updatePayload)
      .eq('idBab', id)
      .select(BAB_COLUMNS)
      .maybeSingle();

    if (error) {
      if (error.code === '23505') return namaBabDobel(res, updatePayload.namaBab);
      return res.status(500).json(errorResponse({ message: error.message || 'Gagal memperbarui bab.' }));
    }

    if (!data) {
      return res.status(404).json(errorResponse({ message: 'Bab tidak ditemukan.' }));
    }

    return res.json(successResponse({ message: 'Bab berhasil diperbarui.', data }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal memperbarui bab.' }));
  }
};

// Admin (dosen) mana pun boleh menghapus bab, asalkan sudah tidak ada kuis di dalamnya.
// Kuis milik dosen lain tidak boleh ikut hilang hanya karena bab-nya dihapus.
export const deleteBab = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existing, error: findError } = await supabaseAdmin
      .from('Bab')
      .select('idBab, namaBab, Kuis(count)')
      .eq('idBab', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json(errorResponse({ message: 'Bab tidak ditemukan.' }));
    }

    const jumlahKuis = existing.Kuis[0]?.count ?? 0;
    if (jumlahKuis > 0) {
      return res.status(409).json(
        errorResponse({ message: `Bab "${existing.namaBab}" masih berisi ${jumlahKuis} kuis. Hapus semua kuisnya terlebih dahulu.` }),
      );
    }

    const { error } = await supabaseAdmin.from('Bab').delete().eq('idBab', id);

    if (error) {
      // 23503 = foreign key violation — kuis masuk di sela pengecekan, atau masih dipakai hasil analisis/roadmap
      if (error.code === '23503') {
        return res.status(409).json(
          errorResponse({ message: 'Bab tidak bisa dihapus karena masih dipakai oleh kuis atau hasil analisis.' }),
        );
      }
      return res.status(500).json(errorResponse({ message: error.message || 'Gagal menghapus bab.' }));
    }

    return res.json(successResponse({ message: `Bab "${existing.namaBab}" berhasil dihapus.` }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal menghapus bab.' }));
  }
};