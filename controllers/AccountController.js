// controllers/AccountController.js
import { supabaseAdmin } from '../config/db.js';
import { successResponse, errorResponse } from '../models/apiResponse.js';

const VALID_ROLES = ['admin', 'pengguna'];

// Menampilkan semua user (role admin & user) — gabungan dari auth.users (id, email) dan public.user (nama, role)
export const getAllUsers = async (req, res) => {
  try {
    // Ambil data profil dari public.user
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('user')
      .select('id, nama, role')
      .in('role', VALID_ROLES);

    if (profileError) {
      return res.status(500).json(errorResponse({ message: profileError.message }));
    }

    // auth.users tidak bisa diquery lewat PostgREST biasa, jadi pakai Admin API
    let allAuthUsers = [];
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data: authPage, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (authError) {
        return res.status(500).json(errorResponse({ message: authError.message }));
      }

      allAuthUsers = allAuthUsers.concat(authPage.users);

      if (authPage.users.length < perPage) break;
      page += 1;
    }

    const authMap = new Map(allAuthUsers.map((u) => [u.id, u.email]));

    // Gabungkan berdasarkan id
    const users = profiles
      .filter((profile) => authMap.has(profile.id))
      .map((profile) => ({
        id: profile.id,
        nama: profile.nama,
        email: authMap.get(profile.id),
        role: profile.role,
      }));

    return res.json(
      successResponse({
        message: 'Berhasil mengambil daftar user.',
        data: users,
      }),
    );
  } catch (error) {
    return res.status(500).json(
      errorResponse({ message: error.message || 'Gagal mengambil daftar user.' }),
    );
  }
};

const validPassword = (password) => {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[@#$!_\-]/.test(password);
  return minLength && hasUpper && hasLower && hasDigit && hasSpecial;
};

const getUsernameFromEmail = (email) => email.split('@')[0];

export const createAccount = async (req, res) => {
  try {
    const { nama, email, role, password } = req.body;

    if (!nama || !email || !role || !password) {
      return res.status(400).json(errorResponse({ message: 'Nama, email, role, dan password wajib diisi.' }));
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json(
        errorResponse({ message: `Role tidak valid. Role yang diperbolehkan: ${VALID_ROLES.join(', ')}.` }),
      );
    }

    if (!validPassword(password)) {
      return res.status(400).json(
        errorResponse({
          message: 'Kata sandi minimal 8 karakter serta wajib memiliki huruf besar, huruf kecil, angka, dan simbol (@ # $ ! _ -).',
        }),
      );
    }

    const username = getUsernameFromEmail(normalizedEmail);

    // 1. Buat akun auth (auth.users)
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true, // dibuat langsung oleh superadmin, tidak perlu verifikasi email
    });

    if (createError || !newAuthUser?.user) {
      return res.status(400).json(errorResponse({ message: createError?.message || 'Gagal membuat akun autentikasi.' }));
    }

    const newUserId = newAuthUser.user.id;

    // 2. Simpan profil (public.user)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user')
      .insert({ id: newUserId, nama, username, role })
      .select('id, nama, username, role')
      .single();

    if (profileError) {
      // rollback akun auth kalau insert profil gagal, biar tidak jadi akun "yatim"
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return res.status(500).json(errorResponse({ message: profileError.message || 'Gagal menyimpan profil pengguna.' }));
    }

    return res.status(201).json(
      successResponse({
        message: 'Akun berhasil dibuat.',
        data: { id: profile.id, nama: profile.nama, email: normalizedEmail, role: profile.role },
      }),
    );
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal membuat akun.' }));
  }
};

// controllers/AccountController.js (update deleteAccount)

export const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json(errorResponse({ message: 'ID akun wajib disertakan.' }));
    }

    // Cegah superadmin menghapus akunnya sendiri lewat endpoint ini
    if (req.currentUser?.id === id) {
      return res.status(400).json(errorResponse({ message: 'Tidak bisa menghapus akun sendiri.' }));
    }

    // 1. Cek dulu apakah profil ada
    const { data: profile, error: findError } = await supabaseAdmin
      .from('user')
      .select('id, nama, username, role')
      .eq('id', id)
      .single();

    if (findError || !profile) {
      return res.status(404).json(errorResponse({ message: 'Akun tidak ditemukan.' }));
    }

    // Cegah penghapusan akun superadmin lain lewat endpoint ini
    if (profile.role === 'superadmin') {
      return res.status(403).json(errorResponse({ message: 'Akun superadmin tidak bisa dihapus lewat endpoint ini.' }));
    }

    // 2. Cek status online — logout_time NULL artinya user sedang aktif login
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('session_login')
      .select('logout_time')
      .eq('username', profile.username)
      .maybeSingle();

    if (sessionError) {
      return res.status(500).json(errorResponse({ message: sessionError.message || 'Gagal memeriksa status sesi.' }));
    }

    if (session && session.logout_time === null) {
      return res.status(409).json(errorResponse({ message: 'Akun sedang online, tidak dapat dihapus.' }));
    }

    // 3. Hapus dari auth.users
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (deleteAuthError) {
      return res.status(500).json(errorResponse({ message: deleteAuthError.message || 'Gagal menghapus akun autentikasi.' }));
    }

    // 4. Jaga-jaga kalau FK-nya tidak cascade — hapus manual juga
    await supabaseAdmin.from('user').delete().eq('id', id);

    // 5. Bersihkan juga baris session_login-nya biar tidak jadi sampah data
    await supabaseAdmin.from('session_login').delete().eq('username', profile.username);

    return res.json(
      successResponse({ message: `Akun "${profile.nama}" berhasil dihapus.` }),
    );
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message || 'Gagal menghapus akun.' }));
  }
};