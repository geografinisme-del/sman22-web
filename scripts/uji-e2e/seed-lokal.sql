-- Data uji untuk stack Supabase LOKAL terisolasi saja (sman22-web-uji). Semua konten ditandai [UJI].
\set ON_ERROR_STOP on
insert into public.pengguna (user_id, nama, email)
select id, initcap(split_part(email, '@', 1)) || ' (uji)', email from auth.users where email like '%@sman22.test'
on conflict (user_id) do update set aktif = true, nama = excluded.nama;
delete from public.pengguna_peran where user_id in (select id from auth.users where email like '%@sman22.test');
insert into public.pengguna_peran (user_id, peran)
select u.id, x.peran from auth.users u join (values ('admin@sman22.test', 'super_admin'), ('humas@sman22.test', 'humas'), ('pustakawan@sman22.test', 'pustakawan'), ('guru@sman22.test', 'guru')) x(email, peran) on x.email = u.email;

update public.profil_sekolah set kepala_sekolah = 'Kepala Sekolah [UJI]', pernyataan = '[UJI] Teks pernyataan profil untuk pengujian lokal.' where id = 1;

delete from public.pengumuman where judul like '[UJI]%';
insert into public.pengumuman (judul, isi, tanggal, penting, aktif, prioritas, poster_url, poster_alt, tautan_url, tautan_label) values
  ('[UJI] Jadwal daftar ulang peserta didik baru', '[UJI] Daftar ulang dilaksanakan 20–22 Oktober 2026 pukul 08.00–14.00 WIB di aula. Bawa berkas asli dan fotokopi.', current_date, true, true, true,
   'http://localhost:3001/images/upacara-pagi.jpg', '[UJI] Poster contoh: foto upacara pagi sebagai pengganti poster daftar ulang', '/spmb', 'Lihat informasi SPMB'),
  ('[UJI] Pengumuman rutin pertama', '[UJI] Kegiatan pembelajaran berjalan seperti biasa.', current_date - 1, false, true, false, '', '', '', ''),
  ('[UJI] Pengumuman nonaktif (tidak boleh tampil)', '', current_date, true, false, true, '', '', '', '');

delete from public.berita where slug like 'uji-%';
insert into public.berita (slug, judul, ringkasan, kategori, status, tanggal, gambar_url) values
  ('uji-kegiatan-literasi', '[UJI] Pekan literasi sekolah', '[UJI] Ringkasan berita kegiatan untuk pengujian lokal.', 'Kegiatan', 'terbit', current_date - 2, ''),
  ('uji-prestasi', '[UJI] Siswa meraih juara lomba', '[UJI] Ringkasan berita prestasi.', 'Prestasi', 'terbit', current_date - 5, ''),
  ('uji-draf', '[UJI] Berita DRAF (tidak boleh tampil)', '', 'Kegiatan', 'draft', current_date, '');

delete from public.eksemplar where kode like 'UJI-%';
delete from public.buku where judul like '[UJI]%';
insert into public.buku (id, judul, pengarang, kategori, tampil_publik, rekomendasi, akses_digital, tautan_digital) values
  ('00000000-0000-0000-0000-0000000f0b01', '[UJI] Dasar-Dasar Fisika', 'Penulis Uji', 'Sains', true, true, 'publik', ''),
  ('00000000-0000-0000-0000-0000000f0b02', '[UJI] Sejarah Bandung', 'Penulis Uji', 'Sejarah', true, false, 'warga', 'https://contoh.test/buku-digital'),
  ('00000000-0000-0000-0000-0000000f0b03', '[UJI] Kumpulan Cerpen', 'Penulis Uji', 'Fiksi', true, true, 'publik', ''),
  ('00000000-0000-0000-0000-0000000f0b04', '[UJI] Buku tersembunyi', 'Penulis Uji', 'Sains', false, false, 'publik', '');
insert into public.eksemplar (buku_id, kode, status) values
  ('00000000-0000-0000-0000-0000000f0b01', 'UJI-001', 'tersedia'), ('00000000-0000-0000-0000-0000000f0b01', 'UJI-002', 'dipinjam'),
  ('00000000-0000-0000-0000-0000000f0b02', 'UJI-003', 'dipinjam'), ('00000000-0000-0000-0000-0000000f0b03', 'UJI-004', 'tersedia');
select 'seed lokal selesai' as status;
