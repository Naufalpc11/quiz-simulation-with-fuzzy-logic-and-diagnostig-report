// controllers/KuisController.js
import { supabaseAdmin } from '../config/db.js';
import { successResponse, errorResponse } from '../models/apiResponse.js';
import { ROLE } from '../config/roles.js';
import { buatPasswordKuis } from '../utils/passwordKuis.js';

// pembuat:User(nama) = nama dosen pembuat lewat FK Kuis.idUser, supaya daftar kuis
// dalam satu bab bisa dibedakan ("Kuis 1 - Dosen A", "Kuis 1 - Dosen B").
const KUIS_COLUMNS = 'idKuis, idUser, idBab, judul, deskripsi, durasi, tanggalDibuat, pin, pembuat:User(nama)';

// Password kuis dibuat otomatis oleh server saat kuis dibuat (lihat utils/passwordKuis.js):
// tepat 8 karakter ASCII yang bisa dicetak (huruf besar/kecil, angka, simbol), tanpa spasi.
// Kolom Kuis.pin harus bertipe teks dan tidak boleh dibatasi CHECK "hanya angka".
const PIN_FORMAT = /^[\x21-\x7E]{8}$/;
const PIN_TIDAK_VALID = 'Password kuis harus berupa teks 8 karakter tanpa spasi.';

// idUser NULL = pembuatnya sudah dihapus, kuisnya diwariskan ke semua admin.
const bisaDikelola = (kuis, user) =>
  user.role === ROLE.ADMIN && (kuis.idUser === null || kuis.idUser === user.id);

// Password hanya terlihat oleh dosen yang boleh mengelola kuis ini. Mahasiswa dan dosen lain
// cukup tahu apakah kuis sudah dibuka (adaPin), bukan password-nya.
const keRespons = ({ pin, pembuat, ...kuis }, user) => {
  const kelola = bisaDikelola(kuis, user);
  return {
    ...kuis,
    namaPembuat: pembuat?.nama ?? null,
    adaPin: pin !== null,
    bisaDikelola: kelola,
    ...(kelola && { pin }),
  };
};

// Menampilkan semua kuis — bisa diakses semua role yang sudah login.
// Bisa difilter per bab lewat query ?idBab=... (dipakai mahasiswa: pilih bab dulu, baru lihat kuis-nya)
export const getAllKuis = async (req, res) => {
  try {
    const { idBab } = req.query;

    // Soal(count) = jumlah soal per kuis, ditampilkan frontend di daftar kuis ("· 10 soal").
    let query = supabaseAdmin
      .from('Kuis')
      .select(`${KUIS_COLUMNS}, Soal(count)`)
      .order('tanggalDibuat', { ascending: false });

    if (idBab) {
      query = query.eq('idBab', idBab);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json(errorResponse({ message: error.message }));
    }

    const daftar = data.map(({ Soal, ...kuis }) => ({
      ...keRespons(kuis, req.currentUser),
      jumlahSoal: Soal[0]?.count ?? 0,
    }));

    return res.json(
      successResponse({ message: 'Berhasil mengambil daftar kuis.', data: daftar }),
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

    return res.json(successResponse({ message: 'Berhasil mengambil kuis.', data: keRespons(data, req.currentUser) }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal mengambil kuis.' }));
  }
};

// Hanya admin (guru) yang bisa membuat kuis — pemiliknya adalah guru yang sedang login
export const createKuis = async (req, res) => {
  try {
    // pin tidak diterima dari client: password dibuat otomatis oleh server.
    const { idBab, judul, deskripsi, durasi } = req.body;

    if (!idBab || !judul || !judul.trim()) {
      return res.status(400).json(errorResponse({ message: 'idBab dan judul wajib diisi.' }));
    }

    // durasi opsional: kalau tidak dikirim database memakai default kolomnya (30 menit).
    const payload = {
      idUser: req.currentUser.id,
      idBab,
      judul: judul.trim(),
      deskripsi: deskripsi ?? null,
      pin: buatPasswordKuis(),
    };
    if (durasi !== undefined && durasi !== null) {
      const durasiInt = Number(durasi);
      if (!Number.isInteger(durasiInt) || durasiInt <= 0) {
        return res.status(400).json(errorResponse({ message: 'durasi harus berupa bilangan bulat positif.' }));
      }
      payload.durasi = durasiInt;
    }

    const { data, error } = await supabaseAdmin
      .from('Kuis')
      .insert(payload)
      .select(KUIS_COLUMNS)
      .single();

    if (error) {
      // 23503 = foreign key violation — idBab yang dikirim tidak ada
      if (error.code === '23503') {
        return res.status(400).json(errorResponse({ message: 'Bab yang dipilih tidak ditemukan.' }));
      }
      return res.status(500).json(errorResponse({ message: error.message || 'Gagal membuat kuis.' }));
    }

    return res.status(201).json(successResponse({ message: 'Kuis berhasil dibuat.', data: keRespons(data, req.currentUser) }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal membuat kuis.' }));
  }
};

// Hanya admin pembuat kuis ini sendiri yang boleh mengubahnya
export const updateKuis = async (req, res) => {
  try {
    const { id } = req.params;
    // generatePin: true = buat password baru (dipakai tombol "Generate" di pop-up password).
    const { idBab, judul, deskripsi, durasi, pin, generatePin } = req.body;

    if (idBab === undefined && judul === undefined && deskripsi === undefined
      && durasi === undefined && pin === undefined && generatePin === undefined) {
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

    if (!bisaDikelola(existing, req.currentUser)) {
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
    // pin: null = menutup kuis lagi (mahasiswa tidak bisa memulai attempt baru).
    // Kalau dikirim, harus sesuai format password kuis.
    if (pin !== undefined) {
      if (pin !== null && (typeof pin !== 'string' || !PIN_FORMAT.test(pin))) {
        return res.status(400).json(errorResponse({ message: PIN_TIDAK_VALID }));
      }
      updatePayload.pin = pin;
    }
    // Password baru hanya dibuat kalau diminta eksplisit; menyimpan/mengedit kuis tidak mengubahnya.
    if (generatePin === true) updatePayload.pin = buatPasswordKuis();

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

    return res.json(successResponse({ message: 'Kuis berhasil diperbarui.', data: keRespons(data, req.currentUser) }));
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

    if (!bisaDikelola(existing, req.currentUser)) {
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