// controllers/TopikController.js
import { supabaseAdmin } from '../config/db.js';
import { successResponse, errorResponse } from '../models/apiResponse.js';

const TOPIK_COLUMNS = 'id, nama_topik, deskripsi, dibuat_oleh, created_at, updated_at';

// Menampilkan semua topik — bisa diakses semua role yang sudah login (guru, superadmin, mahasiswa)
export const getAllTopik = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('topik')
      .select(TOPIK_COLUMNS)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json(errorResponse({ message: error.message }));
    }

    return res.json(
      successResponse({ message: 'Berhasil mengambil daftar topik.', data }),
    );
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal mengambil daftar topik.' }));
  }
};

export const getTopikById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('topik')
      .select(TOPIK_COLUMNS)
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json(errorResponse({ message: 'Topik tidak ditemukan.' }));
    }

    return res.json(successResponse({ message: 'Berhasil mengambil topik.', data }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal mengambil topik.' }));
  }
};

// Hanya admin (guru) yang bisa membuat topik — pemiliknya adalah guru yang sedang login
export const createTopik = async (req, res) => {
  try {
    const { nama_topik, deskripsi } = req.body;

    if (!nama_topik || !nama_topik.trim()) {
      return res.status(400).json(errorResponse({ message: 'Nama topik wajib diisi.' }));
    }

    const { data, error } = await supabaseAdmin
      .from('topik')
      .insert({
        nama_topik: nama_topik.trim(),
        deskripsi: deskripsi ?? null,
        dibuat_oleh: req.currentUser.id,
      })
      .select(TOPIK_COLUMNS)
      .single();

    if (error) {
      return res.status(500).json(errorResponse({ message: error.message || 'Gagal membuat topik.' }));
    }

    return res.status(201).json(successResponse({ message: 'Topik berhasil dibuat.', data }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal membuat topik.' }));
  }
};

// Hanya admin pembuat topik ini sendiri yang boleh mengubahnya
export const updateTopik = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_topik, deskripsi } = req.body;

    if (nama_topik === undefined && deskripsi === undefined) {
      return res.status(400).json(errorResponse({ message: 'Tidak ada data yang diubah.' }));
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from('topik')
      .select('id, dibuat_oleh')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json(errorResponse({ message: 'Topik tidak ditemukan.' }));
    }

    if (existing.dibuat_oleh !== req.currentUser.id) {
      return res.status(403).json(
        errorResponse({ message: 'Kamu hanya bisa mengubah topik yang kamu buat sendiri.' }),
      );
    }

    const updatePayload = { updated_at: new Date().toISOString() };
    if (nama_topik !== undefined) {
      if (!nama_topik.trim()) {
        return res.status(400).json(errorResponse({ message: 'Nama topik tidak boleh kosong.' }));
      }
      updatePayload.nama_topik = nama_topik.trim();
    }
    if (deskripsi !== undefined) updatePayload.deskripsi = deskripsi;

    const { data, error } = await supabaseAdmin
      .from('topik')
      .update(updatePayload)
      .eq('id', id)
      .select(TOPIK_COLUMNS)
      .single();

    if (error) {
      return res.status(500).json(errorResponse({ message: error.message || 'Gagal memperbarui topik.' }));
    }

    return res.json(successResponse({ message: 'Topik berhasil diperbarui.', data }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal memperbarui topik.' }));
  }
};

// Hanya admin pembuat topik ini sendiri yang boleh menghapusnya
export const deleteTopik = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existing, error: findError } = await supabaseAdmin
      .from('topik')
      .select('id, nama_topik, dibuat_oleh')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json(errorResponse({ message: 'Topik tidak ditemukan.' }));
    }

    if (existing.dibuat_oleh !== req.currentUser.id) {
      return res.status(403).json(
        errorResponse({ message: 'Kamu hanya bisa menghapus topik yang kamu buat sendiri.' }),
      );
    }

    const { error } = await supabaseAdmin.from('topik').delete().eq('id', id);

    if (error) {
      // 23503 = foreign key violation — masih dipakai kuis/hasil analisis
      if (error.code === '23503') {
        return res.status(409).json(
          errorResponse({ message: 'Topik tidak bisa dihapus karena masih dipakai oleh kuis atau hasil analisis.' }),
        );
      }
      return res.status(500).json(errorResponse({ message: error.message || 'Gagal menghapus topik.' }));
    }

    return res.json(successResponse({ message: `Topik "${existing.nama_topik}" berhasil dihapus.` }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal menghapus topik.' }));
  }
};
