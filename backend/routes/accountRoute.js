// routes/accountRoute.js
import express from 'express';
import { 
    getAllUsers, createAccount, deleteAccount 
} from '../controllers/AccountController.js';
import { verifySuperadmin } from '../middleware/verifySuperAdmin.js';

const router = express.Router();

router.get('/', getAllUsers);
router.post('/', verifySuperadmin, createAccount);
router.delete('/:id', verifySuperadmin, deleteAccount);

export default router;