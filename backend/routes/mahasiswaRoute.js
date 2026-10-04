// routes/mahasiswaRoute.js
import express from 'express';
import { updateFotoProfil, deleteFotoProfil } from '../controllers/ProfilController.js';
import { verifyLoggedIn } from '../middleware/verifyLoggedIn.js';
import { verifyMahasiswa } from '../middleware/verifyMahasiswa.js';
import { uploadFoto } from '../middleware/uploadFoto.js';

const router = express.Router();

// Semua endpoint di sini hanya untuk mahasiswa yang sedang login
router.use(verifyLoggedIn, verifyMahasiswa);

router.put('/profil/foto', uploadFoto, updateFotoProfil);
router.delete('/profil/foto', deleteFotoProfil);

export default router;
