import { supabase, supabaseAdmin } from '../config/db.js';
import { successResponse, errorResponse } from '../models/apiResponse.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const validPassword = (password) => {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[@#$!_\-]/.test(password);
  return minLength && hasUpper && hasLower && hasDigit && hasSpecial;
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(
        errorResponse({ message: 'Email dan kata sandi wajib diisi.' }),
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Supabase yang mencocokkan password dengan hash di auth.users
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.session || !data.user) {
      return res.status(401).json(
        errorResponse({
          message: 'Email atau password salah. Pastikan email sudah diverifikasi.',
        }),
      );
    }

    // Ambil data tambahan dari public.user (yang tidak ada di auth.users)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user')
      .select('nama, username, role')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      console.error('Gagal mengambil profil pengguna:', {
        authUserId: data.user.id,
        authEmail: data.user.email,
        supabaseUrl: process.env.SUPABASE_URL,
        error: profileError
          ? {
              message: profileError.message,
              code: profileError.code,
              details: profileError.details,
              hint: profileError.hint,
            }
          : null,
        profileFound: Boolean(profile),
      });

      return res.status(404).json(
        errorResponse({ message: 'Profil pengguna tidak ditemukan. Hubungi admin.' }),
      );
    }

    // ── CEK STATUS LOGOUT SEBELUMNYA ──
    // Jika data session ada dan logout_time masih NULL, tolak login
    const { data: currentSession } = await supabaseAdmin
      .from('session_login')
      .select('logout_time')
      .eq('username', profile.username)
      .maybeSingle();

    if (currentSession && currentSession.logout_time === null) {
      // Cabut sesi Supabase yang baru dibuat agar tidak menggantung
      await supabaseAdmin.auth.admin.signOut(data.user.id);

      return res.status(403).json(
        errorResponse({
          message: 'Akun sedang aktif atau belum logout dari sesi sebelumnya. Silakan logout terlebih dahulu.',
        }),
      );
    }

    // ── Catat waktu login dan kosongkan logout_time (aktif) ──
    const sessionPayload = {
      email: data.user.email,
      last_login: new Date().toISOString(),
      logout_time: null, // NULL menandakan user sedang aktif login
    };

    const { error: sessionError } = await supabaseAdmin
      .from('session_login')
      .upsert(
        sessionPayload,
        { onConflict: 'email' },
      );

    if (sessionError) {
      console.error('Gagal mencatat session_login:', {
        message: sessionError.message,
        code: sessionError.code,
        details: sessionError.details,
        hint: sessionError.hint,
        table: 'public.session_login',
        conflictTarget: 'email',
        payload: sessionPayload,
        generatedUsername: profile.username,
        diagnosis:
          'Pastikan public.session_login memiliki UNIQUE atau PRIMARY KEY pada kolom email.',
      });
    }

    return res.json(
      successResponse({
        message: 'Login berhasil.',
        data: {
          token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          user: {
            id_user: data.user.id,
            email: data.user.email,
            nama: profile.nama,
            username: profile.username,
            nickname: profile.username,
            role: profile.role,
          },
        },
      }),
    );
  } catch (error) {
    return res.status(500).json(
      errorResponse({ message: error.message || 'Login gagal.' }),
    );
  }
};

export const logout = async (req, res) => {
  try {
    const { email, username } = req.body;

    if (!email && !username) {
      return res.status(400).json(
        errorResponse({ message: 'Email atau username wajib disertakan untuk logout.' }),
      );
    }

    // Update logout_time menjadi timestamp sekarang
    let query = supabaseAdmin
      .from('session_login')
      .update({ logout_time: new Date().toISOString() });

    if (username) {
      query = query.eq('username', username);
    } else {
      query = query.eq('email', email.trim().toLowerCase());
    }

    const { error } = await query;

    if (error) {
      return res.status(500).json(errorResponse({ message: error.message }));
    }

    return res.json(
      successResponse({ message: 'Logout berhasil. Sesi telah diakhiri.' }),
    );
  } catch (error) {
    return res.status(500).json(
      errorResponse({ message: error.message || 'Logout gagal.' }),
    );
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json(
        errorResponse({ message: 'Email wajib diisi.' }),
      );
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${process.env.BACKEND_URL}/api/auth/reset-password-page`,
    });

    if (error) {
      let remainingMinutes = null;
      let unlockTimeStr = null;

      // Jika terkena limit email, hitung sisa menitnya
      if (error.code === 'over_email_send_rate_limit') {
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        const targetUser = usersData?.users?.find((u) => u.email === normalizedEmail);

        if (targetUser?.recovery_sent_at) {
          const lastSentMs = new Date(targetUser.recovery_sent_at).getTime();
          const ONE_HOUR = 60 * 60 * 1000;
          const unlockTimeMs = lastSentMs + ONE_HOUR;
          const diffMs = unlockTimeMs - Date.now();

          if (diffMs > 0) {
            remainingMinutes = Math.ceil(diffMs / (60 * 1000));
            unlockTimeStr = new Date(unlockTimeMs).toLocaleTimeString('id-ID');
          }
        }
      }

      console.error('\n🔴 [DEBUG SUPABASE RATE LIMIT]:', {
        status: error.status,
        code: error.code,
        message: error.message,
        sisa_waktu: remainingMinutes ? `${remainingMinutes} menit lagi` : 'Maks 60 menit',
        estimasi_bisa_kirim_jam: unlockTimeStr || 'Menunggu 1 jam dari email terakhir',
      });

      return res.status(429).json({
        success: false,
        code: error.code,
        message: `Terkena batas limit email Supabase. Silakan tunggu sekitar ${remainingMinutes || 60} menit lagi (jam ${unlockTimeStr || '1 jam kedepan'}).`,
        debug: {
          sisa_menit: remainingMinutes,
          bisa_kirim_lagi_jam: unlockTimeStr,
        },
      });
    }

    return res.json(
      successResponse({
        message: 'Jika email terdaftar, tautan reset password telah dikirim.',
      }),
    );
  } catch (error) {
    return res.status(500).json(
      errorResponse({ message: error.message || 'Gagal mengirim email reset password.' }),
    );
  }
};
// Route GET ini yang dibuka waktu user klik link di email
export const resetPasswordPage = (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.sendFile(path.join(__dirname, '../templates/reset-password.html'));
};

export const resetPassword = async (req, res) => {
  try {
    const { access_token, password } = req.body;

    if (!access_token || !password) {
      return res.status(400).json(
        errorResponse({ message: 'Token dan password baru wajib diisi.' }),
      );
    }

    if (!validPassword(password)) {
      return res.status(400).json(
        errorResponse({
          message: 'Kata sandi minimal 8 karakter serta wajib memiliki huruf besar, huruf kecil, angka, dan simbol (@ # $ ! _ -).',
        }),
      );
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(access_token);

    if (userError || !userData?.user) {
      return res.status(401).json(
        errorResponse({ message: 'Tautan reset password tidak valid atau sudah kedaluwarsa.' }),
      );
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userData.user.id,
      { password },
    );

    if (updateError) {
      return res.status(400).json(errorResponse({ message: updateError.message }));
    }

    // Cabut sesi lama supaya reset password benar-benar "mengusir" sesi yang mungkin dibajak
    await supabaseAdmin.auth.admin.signOut(userData.user.id, 'global');

    // Pastikan status session_login di-set logout agar user bisa langsung login kembali
    await supabaseAdmin
      .from('session_login')
      .update({ logout_time: new Date().toISOString() })
      .eq('email', userData.user.email);

    return res.json(
      successResponse({ message: 'Password berhasil diubah. Silakan login dengan password baru.' }),
    );
  } catch (error) {
    return res.status(500).json(
      errorResponse({ message: error.message || 'Gagal mengubah password.' }),
    );
  }
};