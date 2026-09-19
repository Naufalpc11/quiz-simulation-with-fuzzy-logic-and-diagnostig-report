// controllers/KuisController.js
import { supabaseAdmin } from '../config/db.js';
import { successResponse, errorResponse } from '../models/apiResponse.js';

const KUIS_COLUMNS = 'id, id_akun, id_topik, judul, deskripsi, tanggal_dibuat';

// Menampilkan semua kuis — bisa diakses semua role yang sudah login.
// Bisa difilter per topik lewat query ?id_topik=... (dipakai mahasiswa: pilih topik dulu, baru lihat kuis-nya)
export const getAllKuis = async (req, res) => {
  try {
    const { id_topik } = req.query;

    let query = supabaseAdmin
      .from('kuis')
      .select(KUIS_COLUMNS)
      .order('tanggal_dibuat', { ascending: false });

    if (id_topik) {
      query = query.eq('id_topik', id_topik);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json(errorResponse({ message: error.message }));
    }

    return res.json(
      successResponse({ message: 'Berhasil mengambil daftar kuis.', data }),
    );
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal mengambil daftar kuis.' }));
  }
};

export const getKuisById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('kuis')
      .select(KUIS_COLUMNS)
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json(errorResponse({ message: 'Kuis tidak ditemukan.' }));
    }

    return res.json(successResponse({ message: 'Berhasil mengambil kuis.', data }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal mengambil kuis.' }));
  }
};

// Hanya admin (guru) yang bisa membuat kuis — pemiliknya adalah guru yang sedang login
export const createKuis = async (req, res) => {
  try {
    const { id_topik, judul, deskripsi } = req.body;

    if (!id_topik || !judul || !judul.trim()) {
      return res.status(400).json(errorResponse({ message: 'id_topik dan judul wajib diisi.' }));
    }

    const { data, error } = await supabaseAdmin
      .from('kuis')
      .insert({
        id_akun: req.currentUser.id,
        id_topik,
        judul: judul.trim(),
        deskripsi: deskripsi ?? null,
      })
      .select(KUIS_COLUMNS)
      .single();

    if (error) {
      // 23503 = foreign key violation — id_topik yang dikirim tidak ada
      if (error.code === '23503') {
        return res.status(400).json(errorResponse({ message: 'Topik yang dipilih tidak ditemukan.' }));
      }
      return res.status(500).json(errorResponse({ message: error.message || 'Gagal membuat kuis.' }));
    }

    return res.status(201).json(successResponse({ message: 'Kuis berhasil dibuat.', data }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal membuat kuis.' }));
  }
};

// Hanya admin pembuat kuis ini sendiri yang boleh mengubahnya
export const updateKuis = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_topik, judul, deskripsi } = req.body;

    if (id_topik === undefined && judul === undefined && deskripsi === undefined) {
      return res.status(400).json(errorResponse({ message: 'Tidak ada data yang diubah.' }));
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from('kuis')
      .select('id, id_akun')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json(errorResponse({ message: 'Kuis tidak ditemukan.' }));
    }

    if (existing.id_akun !== req.currentUser.id) {
      return res.status(403).json(
        errorResponse({ message: 'Kamu hanya bisa mengubah kuis yang kamu buat sendiri.' }),
      );
    }

    const updatePayload = {};
    if (judul !== undefined) {
      if (!judul.trim()) {
        return res.status(400).json(errorResponse({ message: 'Judul tidak boleh kosong.' }));
      }
      updatePayload.judul = judul.trim();
    }
    if (deskripsi !== undefined) updatePayload.deskripsi = deskripsi;
    if (id_topik !== undefined) updatePayload.id_topik = id_topik;

    const { data, error } = await supabaseAdmin
      .from('kuis')
      .update(updatePayload)
      .eq('id', id)
      .select(KUIS_COLUMNS)
      .single();

    if (error) {
      if (error.code === '23503') {
        return res.status(400).json(errorResponse({ message: 'Topik yang dipilih tidak ditemukan.' }));
      }
      return res.status(500).json(errorResponse({ message: error.message || 'Gagal memperbarui kuis.' }));
    }

    return res.json(successResponse({ message: 'Kuis berhasil diperbarui.', data }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal memperbarui kuis.' }));
  }
};

// Hanya admin pembuat kuis ini sendiri yang boleh menghapusnya
export const deleteKuis = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existing, error: findError } = await supabaseAdmin
      .from('kuis')
      .select('id, judul, id_akun')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json(errorResponse({ message: 'Kuis tidak ditemukan.' }));
    }

    if (existing.id_akun !== req.currentUser.id) {
      return res.status(403).json(
        errorResponse({ message: 'Kamu hanya bisa menghapus kuis yang kamu buat sendiri.' }),
      );
    }

    const { error } = await supabaseAdmin.from('kuis').delete().eq('id', id);

    if (error) {
      // 23503 = foreign key violation — masih dipakai pengerjaan_kuis
      if (error.code === '23503') {
        return res.status(409).json(
          errorResponse({ message: 'Kuis tidak bisa dihapus karena masih ada pengerjaan yang terkait.' }),
        );
      }
      return res.status(500).json(errorResponse({ message: error.message || 'Gagal menghapus kuis.' }));
    }

    return res.json(successResponse({ message: `Kuis "${existing.judul}" berhasil dihapus.` }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal menghapus kuis.' }));
  }
};
