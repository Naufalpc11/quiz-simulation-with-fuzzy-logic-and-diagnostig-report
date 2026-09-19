// FILE INI HANYA UNTUK MENAMBAHKAN USER USER DAN ADMIN SECARA OTOMATIS. JANGAN DI RUN UNTUK MENCEGAH DUPLIKASI DATA!!!
// seed-users.js
import 'dotenv/config';
import { supabaseAdmin } from './config/db.js';

// ── KONFIGURASI ──
const START_NIM = 11231001;
const END_NIM = 11231090;
const DEFAULT_PASSWORD = '!tk2026!'; // Pastikan memenuhi syarat validPassword
const DEFAULT_ROLE = 'Mahasiswa';

async function seedBulkUsers() {
  console.log(`🚀 Mulai generate user dari NIM ${START_NIM} sampai ${END_NIM}...\n`);

  let successCount = 0;
  let failCount = 0;

  for (let nim = START_NIM; nim <= END_NIM; nim++) {
    const email = `${nim}@contoh.id`;
    const username = `${nim}`;
    const nama = `Mahasiswa ${nim}`;

    try {
      // 1. Buat user di auth.users Supabase
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: DEFAULT_PASSWORD,
        email_confirm: true, // Otomatis terverifikasi tanpa perlu cek email
        user_metadata: {
          email_verified: true,
        },
      });

      if (authError) {
        console.error(`❌ [${nim}] Gagal buat akun auth:`, authError.message);
        failCount++;
        continue;
      }

      // 2. Masukkan profil ke tabel public.user
      const { error: profileError } = await supabaseAdmin.from('user').insert({
        id: authData.user.id, // ID sama dengan ID di auth.users
        nama: nama,
        username: username,
        role: DEFAULT_ROLE,
      });

      if (profileError) {
        console.error(`⚠️ [${nim}] Akun auth jadi, tapi gagal insert profil:`, profileError.message);
      } else {
        console.log(`✅ [${nim}] Berhasil dibuat: ${email}`);
        successCount++;
      }
    } catch (err) {
      console.error(`💥 [${nim}] Error tidak terduga:`, err.message);
      failCount++;
    }
  }

  console.log('\n───────────────────────────────────');
  console.log(`🎉 Selesai!`);
  console.log(`Berhasil : ${successCount} user`);
  console.log(`Gagal    : ${failCount} user`);
  console.log(`Password : ${DEFAULT_PASSWORD}`);
  console.log('───────────────────────────────────');
}

seedBulkUsers();