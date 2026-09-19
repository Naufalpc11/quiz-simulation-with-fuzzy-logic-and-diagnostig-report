import express from 'express';
import {
    login, logout, refresh, me, resetPasswordPage, forgotPassword, resetPassword
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
router.post('/forgot-password', batasLupaPassword, forgotPassword);
router.get('/reset-password-page', resetPasswordPage); // dibuka dari link di email
router.post('/reset-password', resetPassword);          // dipanggil dari fetch() di halaman itu

export default router;
