`Cara kerja Autentikasi`
Untuk mengetes login:
1. supabase - authentication - users
2. Add user - masukkan email aktif dan password bebas
3. Buka SQL Editor, isi dengan:
INSERT INTO public.user (
    id,
    nama,
    nim,
    username,
    role
)
SELECT
    id,
    'nama (disarankan testing)',
    'NIM_KAMU (disarankan testing)',
    LEFT(SPLIT_PART(email, '@', 1), 20),
    'mahasiswa (disarankan)'
FROM auth.users
WHERE email = 'email_di_authentication@contoh.id';

4. Silahkan uji di postman

Untuk reset password:
1. Jalankan endpoint '/forgot-password' di postman
2. Cek email
3. Ikuti langkah-langkahnya
4. Cek login dengan password yang telah diganti

TEST