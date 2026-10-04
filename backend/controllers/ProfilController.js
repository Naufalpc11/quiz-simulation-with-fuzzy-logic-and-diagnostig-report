// controllers/ProfilController.js
import { supabaseAdmin } from '../config/db.js';
import { successResponse, errorResponse } from '../models/apiResponse.js';
import {
  BUCKET_FOTO_PROFIL, urlFotoProfil, deteksiJenisGambar,
} from '../services/fotoProfilService.js';

const storage = () => supabaseAdmin.storage.from(BUCKET_FOTO_PROFIL);

// Mengganti foto profil milik user yang sedang login (multipart/form-data, field "foto").
export const updateFotoProfil = async (req, res) => {
  try {
    if (!req.file) {
      // Bedakan penyebab umumnya supaya mudah dilacak dari Postman/frontend
      const message = !req.is('multipart/form-data')
        ? 'Body harus berupa multipart/form-data dengan file pada field "foto".'
        : typeof req.body?.foto === 'string'
          ? 'Field "foto" terkirim sebagai teks, bukan file. Ubah tipe field menjadi File.'
          : 'File foto wajib diunggah pada field "foto".';
      return res.status(400).json(errorResponse({ message }));
    }

    const jenis = deteksiJenisGambar(req.file.buffer);
    if (!jenis) {
      return res.status(400).json(errorResponse({ message: 'Format foto harus JPG, PNG, atau WEBP.' }));
    }

    const idUser = req.currentUser.id;
    const fotoLama = req.currentUser.fotoProfil;

    // Nama file selalu baru, jadi URL lama yang ter-cache browser/CDN tidak menampilkan foto lama.
    const pathBaru = `${idUser}/${Date.now()}.${jenis.ext}`;

    const { error: uploadError } = await storage().upload(pathBaru, req.file.buffer, {
      contentType: jenis.mime,
      upsert: false,
    });

    if (uploadError) {
      return res.status(500).json(errorResponse({ message: uploadError.message || 'Gagal mengunggah foto.' }));
    }

    const { error: updateError } = await supabaseAdmin
      .from('User')
      .update({ fotoProfil: pathBaru })
      .eq('idUser', idUser);

    if (updateError) {
      // rollback file baru kalau profil gagal diperbarui, biar tidak jadi file "yatim"
      await storage().remove([pathBaru]);
      return res.status(500).json(errorResponse({ message: updateError.message || 'Gagal menyimpan foto profil.' }));
    }

    // Foto lama dihapus terakhir; kalau gagal, profil tetap benar dan hanya tersisa file sampah.
    if (fotoLama) {
      const { error: removeError } = await storage().remove([fotoLama]);
      if (removeError) console.error('Gagal menghapus foto profil lama:', removeError.message);
    }

    return res.json(
      successResponse({
        message: 'Foto profil berhasil diperbarui.',
        data: { foto_profil: urlFotoProfil(pathBaru) },
      }),
    );
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal memperbarui foto profil.' }));
  }
};

// Menghapus foto profil milik user yang sedang login (kembali ke avatar default).
export const deleteFotoProfil = async (req, res) => {
  try {
    const idUser = req.currentUser.id;
    const fotoLama = req.currentUser.fotoProfil;

    if (!fotoLama) {
      return res.status(404).json(errorResponse({ message: 'Belum ada foto profil.' }));
    }

    const { error: updateError } = await supabaseAdmin
      .from('User')
      .update({ fotoProfil: null })
      .eq('idUser', idUser);

    if (updateError) {
      return res.status(500).json(errorResponse({ message: updateError.message || 'Gagal menghapus foto profil.' }));
    }

    const { error: removeError } = await storage().remove([fotoLama]);
    if (removeError) console.error('Gagal menghapus file foto profil:', removeError.message);

    return res.json(successResponse({ message: 'Foto profil berhasil dihapus.' }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal menghapus foto profil.' }));
  }
};
