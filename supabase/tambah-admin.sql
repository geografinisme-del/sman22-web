-- =====================================================================
--  Menjadikan sebuah akun sebagai SUPER ADMIN pertama.
--  (Admin berikutnya cukup dibuat dari menu Pengaturan → Pengguna & Peran.)
--
--  1) Buat akunnya dulu: Supabase → Authentication → Users → Add user
--     (isi email + password, centang "Auto Confirm User").
--  2) Ganti email & nama di bawah, lalu jalankan di SQL Editor.
--  Perlu migrasi 20261008000000_akun_data_induk.sql sudah dijalankan.
-- =====================================================================
insert into public.pengguna (user_id, nama, email)
select id, 'Nama Admin', email
from auth.users
where email = 'GANTI-DENGAN-EMAIL@contoh.com'
on conflict (user_id) do update set aktif = true, nama = excluded.nama;

insert into public.pengguna_peran (user_id, peran)
select id, 'super_admin'
from auth.users
where email = 'GANTI-DENGAN-EMAIL@contoh.com'
on conflict do nothing;
