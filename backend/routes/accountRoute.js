import express from 'express';
import {
  getAllUsers, createAccount, deleteAccount
} from '../controllers/AccountController.js';
import { verifyLoggedIn } from '../middleware/verifyLoggedIn.js';
import { verifySuperadmin } from '../middleware/verifySuperAdmin.js';

const router = express.Router();

router.get('/', verifyLoggedIn, verifySuperadmin, getAllUsers);
router.post('/', verifyLoggedIn, verifySuperadmin, createAccount);
router.delete('/:id', verifyLoggedIn, verifySuperadmin, deleteAccount);

export default router;