// routes/kuisRoute.js
import express from 'express';
import {
  getAllKuis, getKuisById, createKuis, updateKuis, deleteKuis,
} from '../controllers/KuisController.js';
import { verifyLoggedIn } from '../middleware/verifyLoggedIn.js';
import { verifyAdmin } from '../middleware/verifyAdmin.js';

const router = express.Router();

router.get('/', verifyLoggedIn, getAllKuis);
router.get('/:id', verifyLoggedIn, getKuisById);
router.post('/', verifyAdmin, createKuis);
router.put('/:id', verifyAdmin, updateKuis);
router.delete('/:id', verifyAdmin, deleteKuis);

export default router;
