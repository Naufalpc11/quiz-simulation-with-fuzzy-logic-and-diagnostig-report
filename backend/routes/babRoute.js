// routes/babRoute.js
import express from 'express';
import {
  getAllBab, getBabById, createBab, updateBab, deleteBab,
} from '../controllers/BabController.js';
import { verifyLoggedIn } from '../middleware/verifyLoggedIn.js';
import { verifyAdmin } from '../middleware/verifyAdmin.js';

const router = express.Router();

router.get('/', verifyLoggedIn, getAllBab);
router.get('/:id', verifyLoggedIn, getBabById);
router.post('/', verifyAdmin, createBab);
router.put('/:id', verifyAdmin, updateBab);
router.delete('/:id', verifyAdmin, deleteBab);

export default router;
