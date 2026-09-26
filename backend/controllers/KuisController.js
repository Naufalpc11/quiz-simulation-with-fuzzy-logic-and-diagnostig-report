// controllers/KuisController.js
import { supabaseAdmin } from '../config/db.js';
import { successResponse, errorResponse } from '../models/apiResponse.js';

const KUIS_COLUMNS = 'idKuis, idUser, idBab, judul, deskripsi, durasi, tanggalDibuat';

// Menampilkan semua kuis — bisa diakses semua role yang sudah login.
// Bisa difilter per bab lewat query ?idBab=... (dipakai mahasiswa: pilih bab dulu, baru lihat kuis-nya)
export const getAllKuis = async (req, res) => {
  try {
    const { idBab } = req.query;

    let query = supabaseAdmin
      .from('Kuis')
      .select(KUIS_COLUMNS)
      .order('tanggalDibuat', { ascending: false });

    if (idBab) {
      query = query.eq('idBab', idBab);
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
      .from('Kuis')
      .select(KUIS_COLUMNS)
      .eq('idKuis', id)
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
    const { idBab, judul, deskripsi, durasi } = req.body;

    if (!idBab || !judul || !judul.trim()) {
      return res.status(400).json(errorResponse({ message: 'idBab dan judul wajib diisi.' }));
    }

    const durasiInt = Number(durasi);
    if (durasi === undefined || durasi === null || !Number.isInteger(durasiInt) || durasiInt <= 0) {
      return res.status(400).json(errorResponse({ message: 'durasi wajib diisi dan harus berupa bilangan bulat positif.' }));
    }

    const { data, error } = await supabaseAdmin
      .from('Kuis')
      .insert({
        idUser: req.currentUser.id,
        idBab,
        judul: judul.trim(),
        deskripsi: deskripsi ?? null,
        durasi: durasiInt,
      })
      .select(KUIS_COLUMNS)
      .single();

    if (error) {
      // 23503 = foreign key violation — idBab yang dikirim tidak ada
      if (error.code === '23503') {
        return res.status(400).json(errorResponse({ message: 'Bab yang dipilih tidak ditemukan.' }));
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
    const { idBab, judul, deskripsi, durasi } = req.body;

    if (idBab === undefined && judul === undefined && deskripsi === undefined && durasi === undefined) {
      return res.status(400).json(errorResponse({ message: 'Tidak ada data yang diubah.' }));
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from('Kuis')
      .select('idKuis, idUser')
      .eq('idKuis', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json(errorResponse({ message: 'Kuis tidak ditemukan.' }));
    }

    // idUser NULL = pembuatnya sudah dihapus, kuisnya diwariskan ke semua admin.
    if (existing.idUser !== null && existing.idUser !== req.currentUser.id) {
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
    if (idBab !== undefined) updatePayload.idBab = idBab;
    if (durasi !== undefined) {
      const durasiInt = Number(durasi);
      if (!Number.isInteger(durasiInt) || durasiInt <= 0) {
        return res.status(400).json(errorResponse({ message: 'durasi harus berupa bilangan bulat positif.' }));
      }
      updatePayload.durasi = durasiInt;
    }

    const { data, error } = await supabaseAdmin
      .from('Kuis')
      .update(updatePayload)
      .eq('idKuis', id)
      .select(KUIS_COLUMNS)
      .single();

    if (error) {
      if (error.code === '23503') {
        return res.status(400).json(errorResponse({ message: 'Bab yang dipilih tidak ditemukan.' }));
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
      .from('Kuis')
      .select('idKuis, judul, idUser')
      .eq('idKuis', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json(errorResponse({ message: 'Kuis tidak ditemukan.' }));
    }

    // idUser NULL = pembuatnya sudah dihapus, kuisnya diwariskan ke semua admin.
    if (existing.idUser !== null && existing.idUser !== req.currentUser.id) {
      return res.status(403).json(
        errorResponse({ message: 'Kamu hanya bisa menghapus kuis yang kamu buat sendiri.' }),
      );
    }

    const { error } = await supabaseAdmin.from('Kuis').delete().eq('idKuis', id);

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
