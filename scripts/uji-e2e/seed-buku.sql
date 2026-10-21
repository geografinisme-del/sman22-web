-- Data contoh tema "Buku Tahunan" untuk database UJI lokal (setelah seed-lokal.sql & migrasi 20261210).
-- JANGAN dijalankan di produksi: skrip menolak berjalan bila data uji [UJI] dari seed-lokal.sql tidak ada.
-- Semua baris yang memakai foto stok (public/media/placeholder, lihat CREDITS.md) WAJIB is_placeholder = true
-- sehingga situs menampilkan label "Ilustrasi sementara" dan Ringkasan admin menghitungnya.
\set ON_ERROR_STOP on
begin;

do $$ begin
  if not exists (select 1 from public.berita where judul like '[UJI]%') then
    raise exception 'Bukan database uji (data [UJI] dari seed-lokal.sql tidak ditemukan). Dibatalkan.';
  end if;
end $$;

-- angka & alumni (contoh)
update public.profil_sekolah set jumlah_siswa = '1200+', jumlah_guru = '72', jumlah_ekskul = '24',
  alumni_ptn = '180+', alumni_ptn_tahun = '2026', alumni_ptn_keterangan = '[UJI] Rekap BK angkatan 2026.' where id = 1;

-- berita dengan foto stok
insert into public.berita (slug, judul, ringkasan, kategori, status, tanggal, gambar_url, is_placeholder) values
  ('uji-diskusi-kelompok', '[UJI] Diskusi kelompok di taman sekolah', '[UJI] Contoh berita dengan ilustrasi sementara.', 'Kegiatan', 'terbit', current_date - 1, '/media/placeholder/berita-1.webp', true),
  ('uji-ruang-kelas', '[UJI] Ruang kelas baru siap dipakai', '[UJI] Contoh berita dengan ilustrasi sementara.', 'Sarana', 'terbit', current_date - 3, '/media/placeholder/berita-2.webp', true),
  ('uji-upacara', '[UJI] Upacara peringatan hari besar nasional', '[UJI] Contoh berita dengan ilustrasi sementara.', 'Kegiatan', 'terbit', current_date - 4, '/media/placeholder/berita-3.webp', true),
  ('uji-perpustakaan', '[UJI] Koleksi baru perpustakaan', '[UJI] Contoh berita dengan ilustrasi sementara.', 'Literasi', 'terbit', current_date - 6, '/media/placeholder/berita-4.webp', true)
on conflict (slug) do update set gambar_url = excluded.gambar_url, is_placeholder = true;

-- galeri dengan foto stok (keterangan unik)
delete from public.galeri where judul like '[UJI] Ilustrasi%';
insert into public.galeri (judul, gambar_url, urutan, is_placeholder) values
  ('[UJI] Ilustrasi — kegiatan di lapangan', '/media/placeholder/galeri-1.webp', 1, true),
  ('[UJI] Ilustrasi — rak buku perpustakaan', '/media/placeholder/galeri-2.webp', 2, true),
  ('[UJI] Ilustrasi — ruang kelas', '/media/placeholder/galeri-3.webp', 3, true),
  ('[UJI] Ilustrasi — lapangan basket', '/media/placeholder/galeri-4.webp', 4, true),
  ('[UJI] Ilustrasi — mencatat pelajaran', '/media/placeholder/galeri-5.webp', 5, true);

-- slide hero dengan foto stok
delete from public.hero_slide where gambar_url like '/media/placeholder/%';
insert into public.hero_slide (gambar_url, alt, urutan, is_placeholder) values
  ('/media/placeholder/hero-1.webp', 'Ilustrasi upacara bendera di lapangan sekolah', 0, true);

-- prestasi (teks saja) & SPMB aktif
delete from public.prestasi where nama_lomba like '[UJI]%';
insert into public.prestasi (peringkat, nama_lomba, nama_siswa, tingkat, tanggal) values
  ('Juara 1', '[UJI] Olimpiade Sains Kota — Fisika', 'Siswa Uji A', 'Kota', '2026-09-12'),
  ('Medali Perak', '[UJI] Kompetisi Debat Bahasa Inggris', 'Tim Debat Uji', 'Provinsi', '2026-08-20'),
  ('Juara 2', '[UJI] Festival Paduan Suara', 'Paduan Suara Uji', 'Nasional', '2026-07-30'),
  ('Finalis', '[UJI] Lomba Karya Tulis Ilmiah', 'Siswa Uji B', 'Nasional', '2026-06-14'),
  ('Juara 3', '[UJI] Turnamen Bola Basket Pelajar', 'Tim Basket Uji', 'Kota', '2026-05-02');
update public.spmb_info set aktif = true, tahun = '2027/2028', judul = '[UJI] Penerimaan murid baru 2027/2028',
  ringkasan = '[UJI] Ringkasan contoh untuk pengujian tampilan.', tautan_tanya = '/kontak',
  jadwal = '[{"langkah":"Sosialisasi","tanggal":"2027-05-10"},{"langkah":"Pendaftaran tahap 1","tanggal":"2027-06-02"},{"langkah":"Pengumuman tahap 1","tanggal":"2027-06-16"},{"langkah":"Daftar ulang","tanggal":"2027-06-25"}]'
where id = 1;

commit;
