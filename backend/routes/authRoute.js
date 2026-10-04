import express from 'express';
import {
    login, logout, refresh, me, updateMe, resetPasswordPage,
    forgotPassword, resetPassword, resetPasswordBackground
} from '../controllers/AuthController.js';
import { verifyLoggedIn } from '../middleware/verifyLoggedIn.js';
import {
    batasLoginPerIp, batasLoginPerAkun, batasLupaPassword
} from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/login', batasLoginPerIp, batasLoginPerAkun, login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.get('/me', verifyLoggedIn, me);
router.put('/me', verifyLoggedIn, updateMe);

// JANGAN DI OTAK ATIK!! INI ADALAH ENDPOINT PAKETAN UNTUK RESET PASSWORD
router.post('/forgot-password', batasLupaPassword, forgotPassword);
router.get('/reset-password-page', resetPasswordPage); // dibuka dari link di email
router.get('/reset-password-background', resetPasswordBackground);
router.post('/reset-password', resetPassword);          // dipanggil dari fetch() di halaman itu

export default router;