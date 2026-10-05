// routes/soalRoute.js
import express from 'express';
import {
  getAllSoal, getSoalById, createSoal, updateSoal, deleteSoal,
} from '../controllers/SoalController.js';
import { verifyLoggedIn } from '../middleware/verifyLoggedIn.js';
import { verifyAdmin } from '../middleware/verifyAdmin.js';

const router = express.Router();

// Khusus dosen: mahasiswa mendapat soal lewat POST /api/pengerjaan setelah lolos PIN
router.get('/', verifyLoggedIn, verifyAdmin, getAllSoal);
router.get('/:id', verifyLoggedIn, verifyAdmin, getSoalById);
router.post('/', verifyLoggedIn, verifyAdmin, createSoal);
router.put('/:id', verifyLoggedIn, verifyAdmin, updateSoal);
router.delete('/:id', verifyLoggedIn, verifyAdmin, deleteSoal);

export default router;
