// middleware/verifySuperAdmin.js
import { errorResponse } from '../models/apiResponse.js';
import { ROLE } from '../config/roles.js';

// Wajib dipasang SETELAH verifyLoggedIn. Token, profil, dan sesi aktif sudah
// dicek di sana, jadi di sini tinggal memastikan role-nya.
export const verifySuperadmin = (req, res, next) => {
  if (req.currentUser?.role !== ROLE.SUPER_ADMIN) {
    return res.status(403).json(errorResponse({ message: 'Hanya superadmin yang dapat mengakses endpoint ini.' }));
  }
  next();
};
