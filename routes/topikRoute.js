// routes/topikRoute.js
import express from 'express';
import {
  getAllTopik, getTopikById, createTopik, updateTopik, deleteTopik,
} from '../controllers/TopikController.js';
import { verifyLoggedIn } from '../middleware/verifyLoggedIn.js';
import { verifyAdmin } from '../middleware/verifyAdmin.js';

const router = express.Router();

router.get('/', verifyLoggedIn, getAllTopik);
router.get('/:id', verifyLoggedIn, getTopikById);
router.post('/', verifyAdmin, createTopik);
router.put('/:id', verifyAdmin, updateTopik);
router.delete('/:id', verifyAdmin, deleteTopik);

export default router;
