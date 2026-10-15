# Uji alur nyata (lokal saja)

Skrip ini menguji alur sungguhan lewat Chrome headless (Chrome DevTools Protocol) terhadap server dev
yang tersambung ke **Supabase lokal terisolasi**. Jangan pernah mengarahkannya ke produksi — skrip menolak
alamat selain `localhost`.

1. Salin `supabase/` ke folder kerja sementara, ubah `project_id` & port (mis. 56321/56322) agar tidak
   bertabrakan dengan stack lain, aktifkan `[auth.mfa.totp] enroll_enabled/verify_enabled = true`, lalu
   `supabase start --workdir <folder>` (semua migrasi diterapkan dari nol).
2. Buat akun uji: `SB_LOKAL_SERVICE=<service_role lokal> node seed-lokal.mjs akun-uji.local.json`
   (kata sandi acak hanya tersimpan di berkas itu; berkas diabaikan git).
3. Isi data uji bertanda `[UJI]`: `docker exec -i supabase_db_<project_id> psql -U postgres < seed-lokal.sql`.
4. Jalankan dev server dengan `NEXT_PUBLIC_SUPABASE_URL` & kunci anon lokal (port 3001).
5. `node uji-alur.mjs <chrome.exe> <keluar> http://localhost:3001 akun-uji.local.json`
   - ruang kerja (satu/beberapa/tanpa penugasan), URL terlarang, draf → pratinjau → terapkan → pulihkan,
     widget dilepas tanpa menghapus data, modal prioritas, panel rutin, pemandu, MFA TOTP.
   - Sebelum mengulang: hapus `riwayat_tampilan`, `tampilan_draf`, kunci `tampilan` di `pengaturan_situs.tema`,
     dan faktor MFA akun admin uji.
6. `uji-ponsel.mjs` (keyboard ponsel, reduced motion, rekaman gulir) & `uji-konsol.mjs` (galat konsol).
