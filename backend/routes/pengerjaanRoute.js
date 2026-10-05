import express from 'express';
import {
  mulaiPengerjaan, simpanJawaban, submitPengerjaan, getPengerjaan, getPembahasan,
} from '../controllers/PengerjaanController.js';
import { verifyLoggedIn } from '../middleware/verifyLoggedIn.js';
import { verifyMahasiswa } from '../middleware/verifyMahasiswa.js';
import { batasPinKuis } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(verifyLoggedIn, verifyMahasiswa);
router.post('/', batasPinKuis, mulaiPengerjaan);
router.put('/:idPengerjaan/jawaban', simpanJawaban);
router.post('/:idPengerjaan/submit', submitPengerjaan);
router.get('/:idPengerjaan/pembahasan', getPembahasan);
router.get('/:idPengerjaan', getPengerjaan);

export default router;
