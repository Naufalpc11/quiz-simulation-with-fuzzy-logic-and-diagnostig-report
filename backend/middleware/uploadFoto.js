// middleware/uploadFoto.js
import multer from 'multer';
import { errorResponse } from '../models/apiResponse.js';
import { UKURAN_MAKS_FOTO } from '../services/fotoProfilService.js';

// File disimpan di memori (bukan disk) karena langsung diteruskan ke Supabase Storage.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UKURAN_MAKS_FOTO, files: 1 },
}).single('foto');

// Bungkus multer supaya error-nya keluar dalam format errorResponse, bukan HTML bawaan Express.
export const uploadFoto = (req, res, next) => {
  upload(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Ukuran foto maksimal 2 MB.'
        : err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Kirim satu file pada field "foto".'
          : err.message;
      return res.status(400).json(errorResponse({ message }));
    }

    return res.status(400).json(errorResponse({ message: err.message || 'Gagal membaca file yang diunggah.' }));
  });
};
