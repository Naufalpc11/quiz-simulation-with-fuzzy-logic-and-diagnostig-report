import express from 'express';
import { 
    login, logout, resetPasswordPage, forgotPassword, resetPassword
} from '../controllers/AuthController.js';

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.get('/reset-password-page', resetPasswordPage); // dibuka dari link di email
router.post('/reset-password', resetPassword);          // dipanggil dari fetch() di halaman itu

export default router;