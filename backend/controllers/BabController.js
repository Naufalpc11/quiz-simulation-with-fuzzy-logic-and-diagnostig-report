// controllers/BabController.js
import { supabaseAdmin } from '../config/db.js';
import { successResponse, errorResponse } from '../models/apiResponse.js';

const BAB_COLUMNS = 'idBab, namaBab, deskripsi, urutanBab, dibuatOleh, tanggalDibuat, tanggalDiupdate';

// Nomor bab dipakai untuk mengurutkan daftar, jadi harus benar-benar angka bulat.
// "3" dari body JSON yang salah ketik akan tertolak di sini, bukan jadi urutan aneh di daftar.
const urutanValid = (nilai) => Number.isInteger(nilai) && nilai >= 0;

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

// Hanya admin (guru) yang bisa membuat bab — pemiliknya adalah guru yang sedang login
export const createBab = async (req, res) => {
  try {
    const { namaBab, deskripsi, urutanBab } = req.body;

    if (!namaBab || !namaBab.trim()) {
      return res.status(400).json(errorResponse({ message: 'Nama bab wajib diisi.' }));
    }

    if (urutanBab !== undefined && !urutanValid(urutanBab)) {
      return res.status(400).json(errorResponse({ message: 'Urutan bab harus berupa angka bulat tidak negatif.' }));
    }

    const { data, error } = await supabaseAdmin
      .from('Bab')
      .insert({
        namaBab: namaBab.trim(),
        deskripsi: deskripsi ?? null,
        urutanBab: urutanBab ?? 0,
        dibuatOleh: req.currentUser.id,
      })
      .select(BAB_COLUMNS)
      .single();

    if (error) {
      return res.status(500).json(errorResponse({ message: error.message || 'Gagal membuat bab.' }));
    }

    return res.status(201).json(successResponse({ message: 'Bab berhasil dibuat.', data }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal membuat bab.' }));
  }
};

// Hanya admin pembuat bab ini sendiri yang boleh mengubahnya
export const updateBab = async (req, res) => {
  try {
    const { id } = req.params;
    const { namaBab, deskripsi, urutanBab } = req.body;

    if (namaBab === undefined && deskripsi === undefined && urutanBab === undefined) {
      return res.status(400).json(errorResponse({ message: 'Tidak ada data yang diubah.' }));
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from('Bab')
      .select('idBab, dibuatOleh')
      .eq('idBab', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json(errorResponse({ message: 'Bab tidak ditemukan.' }));
    }

    // dibuatOleh NULL = pembuatnya sudah dihapus. Bab-nya tetap dipakai semua orang,
    // jadi admin mana pun boleh mengurusnya. Tanpa ini bab itu terkunci selamanya.
    if (existing.dibuatOleh !== null && existing.dibuatOleh !== req.currentUser.id) {
      return res.status(403).json(
        errorResponse({ message: 'Kamu hanya bisa mengubah bab yang kamu buat sendiri.' }),
      );
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
        return res.status(400).json(errorResponse({ message: 'Urutan bab harus berupa angka bulat tidak negatif.' }));
      }
      updatePayload.urutanBab = urutanBab;
    }

    const { data, error } = await supabaseAdmin
      .from('Bab')
      .update(updatePayload)
      .eq('idBab', id)
      .select(BAB_COLUMNS)
      .single();

    if (error) {
      return res.status(500).json(errorResponse({ message: error.message || 'Gagal memperbarui bab.' }));
    }

    return res.json(successResponse({ message: 'Bab berhasil diperbarui.', data }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal memperbarui bab.' }));
  }
};

// Hanya admin pembuat bab ini sendiri yang boleh menghapusnya
export const deleteBab = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existing, error: findError } = await supabaseAdmin
      .from('Bab')
      .select('idBab, namaBab, dibuatOleh')
      .eq('idBab', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json(errorResponse({ message: 'Bab tidak ditemukan.' }));
    }

    // dibuatOleh NULL = pembuatnya sudah dihapus. Bab-nya tetap dipakai semua orang,
    // jadi admin mana pun boleh mengurusnya. Tanpa ini bab itu terkunci selamanya.
    if (existing.dibuatOleh !== null && existing.dibuatOleh !== req.currentUser.id) {
      return res.status(403).json(
        errorResponse({ message: 'Kamu hanya bisa menghapus bab yang kamu buat sendiri.' }),
      );
    }

    const { error } = await supabaseAdmin.from('Bab').delete().eq('idBab', id);

    if (error) {
      // 23503 = foreign key violation — masih dipakai kuis/hasil analisis
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
