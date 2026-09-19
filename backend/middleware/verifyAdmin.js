// middleware/verifyAdmin.js
import { supabase, supabaseAdmin } from '../config/db.js';
import { errorResponse } from '../models/apiResponse.js';

export const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json(errorResponse({ message: 'Token akses tidak ditemukan.' }));
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      return res.status(401).json(errorResponse({ message: 'Token tidak valid atau sudah kedaluwarsa.' }));
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user')
      .select('id, nama, username, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json(errorResponse({ message: 'Profil pengguna tidak ditemukan.' }));
    }

    if (profile.role !== 'admin') {
      return res.status(403).json(errorResponse({ message: 'Hanya admin (guru) yang dapat mengakses endpoint ini.' }));
    }

    req.currentUser = { id: userData.user.id, email: userData.user.email, ...profile };
    next();
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal memverifikasi akses.' }));
  }
};
