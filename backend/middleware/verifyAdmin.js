// middleware/verifyAdmin.js
import { errorResponse } from '../models/apiResponse.js';
import { ROLE } from '../config/roles.js';

// Wajib dipasang SETELAH verifyLoggedIn. Token, profil, dan sesi aktif sudah
// dicek di sana, jadi di sini tinggal memastikan role-nya.
export const verifyAdmin = (req, res, next) => {
  if (req.currentUser?.role !== ROLE.ADMIN) {
    return res.status(403).json(errorResponse({ message: 'Hanya admin (guru) yang dapat mengakses endpoint ini.' }));
  }
  next();
};
