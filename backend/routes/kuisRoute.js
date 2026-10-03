// routes/kuisRoute.js
import express from 'express';
import {
  getAllKuis, getKuisById, createKuis, updateKuis, deleteKuis,
} from '../controllers/KuisController.js';
import { getSoalKuis, simpanSoalKuis } from '../controllers/SoalController.js';
import { verifyLoggedIn } from '../middleware/verifyLoggedIn.js';
import { verifyAdmin } from '../middleware/verifyAdmin.js';

const router = express.Router();

router.get('/', verifyLoggedIn, getAllKuis);
router.get('/:id', verifyLoggedIn, getKuisById);
router.post('/', verifyLoggedIn, verifyAdmin, createKuis);
router.put('/:id', verifyLoggedIn, verifyAdmin, updateKuis);
router.delete('/:id', verifyLoggedIn, verifyAdmin, deleteKuis);

// Soal satu kuis sekaligus — dipakai halaman editor soal di frontend
router.get('/:idKuis/soal', verifyLoggedIn, getSoalKuis);
router.put('/:idKuis/soal', verifyLoggedIn, verifyAdmin, simpanSoalKuis);

export default router;
