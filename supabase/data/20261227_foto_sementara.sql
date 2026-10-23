-- Isi data: foto sementara Unsplash (diunduh 23 Okt 2026 lewat tautan unduh resmi) menggantikan foto buram/kecil.
-- Jalankan SETELAH migrasi 20261227000000_foto_slot.sql, dalam satu transaksi. Idempoten (aman diulang).
-- Aman terhadap perubahan admin: baris CMS hanya diubah bila MASIH memakai foto lama yang diharapkan.
-- Foto asli TIDAK dihapus: tetap di /images/*, dicatat di foto_slot.url_asli (tombol "Kembalikan foto asli").
-- Kembalikan: supabase/rollback/rollback_20261227_foto_slot.sql (hanya dengan izin pemilik).

begin;

-- 1) Daftar slot: lokasi, nama, jenis, tabel, url baru, alt, url asli, asli stok?, fotografer, id foto Unsplash
create temp table _slot (lokasi text, nama text, jenis text, tabel text, cari text, url text, alt text, asli text, asli_stok boolean, fotografer text, foto_id text) on commit drop;
insert into _slot values
  -- kartu putar beranda (cari = judul kartu)
  ('kartu-beranda.e-learning', 'Kartu putar beranda — E-Learning', 'dekorasi', 'kartu_beranda', 'E-Learning', '/media/stok/laptop-meja.webp', 'Laptop di meja belajar yang terang', '/media/placeholder/galeri-3.webp', true, 'Workperch', 'sTZPGo6Tmbs'),
  ('kartu-beranda.berita', 'Kartu putar beranda — Berita dan pengumuman', 'dekorasi', 'kartu_beranda', 'Berita dan pengumuman', '/media/stok/catatan-tempel.webp', 'Catatan tempel warna-warni di papan', '/images/upacara-pagi.jpg', false, 'Patrick Perkins', 'ETRPjvb0KM0'),
  ('kartu-beranda.agenda', 'Kartu putar beranda — Agenda sekolah', 'dekorasi', 'kartu_beranda', 'Agenda sekolah', '/media/stok/agenda-bulanan.webp', 'Agenda bulanan terbuka di meja', '/images/kajian-masjid.jpg', false, 'Eric Rothermel', 'FoKO4DpXamQ'),
  ('kartu-beranda.pengaduan', 'Kartu putar beranda — Pengaduan dan aspirasi', 'dekorasi', 'kartu_beranda', 'Pengaduan dan aspirasi', '/media/stok/tangan-menulis.webp', 'Tangan menulis di selembar kertas', '/media/placeholder/galeri-5.webp', true, 'Khoiru Abdan', 'TKk29MxSjAA'),
  -- tur sekolah (cari = judul titik)
  ('tur.lapangan', 'Tur sekolah — Gerbang dan lapangan', 'dekorasi', 'tur_sekolah', 'Gerbang dan lapangan', '/media/stok/upacara-lapangan.webp', 'Lapangan upacara dengan bendera Merah Putih, dilihat dari jauh', '/images/apel-lapangan.jpg', false, 'Mufid Majnun', 'La3MwNrgEDc'),
  ('tur.masjid', 'Tur sekolah — Masjid sekolah', 'dekorasi', 'tur_sekolah', 'Masjid sekolah', '/media/stok/masjid-putih.webp', 'Masjid putih berkubah di bawah langit biru', '/images/kajian-masjid.jpg', false, 'Yoga Sukma', 'h4xWsKltqJM'),
  ('tur.aula', 'Tur sekolah — Aula', 'dekorasi', 'tur_sekolah', 'Aula', '/media/stok/aula-kursi.webp', 'Deretan kursi aula yang kosong dan terang', '/images/kegiatan-aula.jpg', false, 'Nathan Dumlao', 'ewGMqs2tmJI'),
  ('tur.perpustakaan', 'Tur sekolah — Perpustakaan', 'dekorasi', 'tur_sekolah', 'Perpustakaan', '/media/stok/rak-perpustakaan.webp', 'Lorong rak buku perpustakaan yang terang', null, false, 'Zetong Li', 'xYyJAC0IdyI'),
  -- galeri (cari = url gambar lama) → foto kegiatan
  ('galeri.upacara', 'Galeri — Upacara bendera', 'kegiatan', 'galeri', '/images/upacara-pagi.jpg', '/media/stok/pengibaran-bendera.webp', 'Pengibaran bendera Merah Putih saat upacara', '/images/upacara-pagi.jpg', false, 'Mufid Majnun', 'yv6ThE76y_M'),
  ('galeri.apel', 'Galeri — Apel pagi di lapangan', 'kegiatan', 'galeri', '/images/apel-lapangan.jpg', '/media/stok/upacara-lapangan.webp', 'Barisan upacara di lapangan, dilihat dari jauh', '/images/apel-lapangan.jpg', false, 'Mufid Majnun', 'La3MwNrgEDc'),
  ('galeri.kajian', 'Galeri — Kajian bersama di masjid sekolah', 'kegiatan', 'galeri', '/images/kajian-masjid.jpg', '/media/stok/mihrab-masjid.webp', 'Mihrab dan karpet merah di dalam masjid', '/images/kajian-masjid.jpg', false, 'Utsman Media', 'L4SDwP3LElQ'),
  -- halaman masuk + kartu pintu (cari = peran)
  ('portal.gtk', 'Halaman masuk & kartu pintu — Guru & Tendik', 'dekorasi', 'portal_login', 'gtk', '/media/stok/aula-kursi.webp', 'Deretan kursi aula yang kosong dan terang', '/images/kegiatan-aula.jpg', false, 'Nathan Dumlao', 'ewGMqs2tmJI'),
  ('portal.siswa', 'Halaman masuk & kartu pintu — Siswa', 'dekorasi', 'portal_login', 'siswa', '/media/stok/upacara-lapangan.webp', 'Lapangan upacara dengan bendera Merah Putih, dilihat dari jauh', '/images/apel-lapangan.jpg', false, 'Mufid Majnun', 'La3MwNrgEDc'),
  ('portal.orang_tua', 'Halaman masuk & kartu pintu — Orang Tua', 'dekorasi', 'portal_login', 'orang_tua', '/media/stok/koridor-terang.webp', 'Koridor sekolah putih yang terang', '/images/gedung.jpg', false, 'Nguyen Khanh Ly', 'liiusuaISP0'),
  -- mega menu (kartu sorotan; cari = grup|judul)
  ('menu.profil.sambutan', 'Mega menu Profil — Sambutan kepala sekolah', 'dekorasi', 'menu_sorotan', 'profil|Sambutan kepala sekolah', '/media/stok/koridor-terang.webp', 'Koridor sekolah putih yang terang', '/images/gedung.jpg', false, 'Nguyen Khanh Ly', 'liiusuaISP0'),
  ('menu.profil.visi-misi', 'Mega menu Profil — Visi dan misi', 'dekorasi', 'menu_sorotan', 'profil|Visi dan misi', '/media/stok/bendera-awan.webp', 'Bendera Merah Putih berkibar di antara awan', '/images/upacara-pagi.jpg', false, 'Bisma Mahendra', 'W9EJYyCZ5HI'),
  ('menu.profil.fasilitas', 'Mega menu Profil — Fasilitas', 'dekorasi', 'menu_sorotan', 'profil|Fasilitas', '/media/stok/laboratorium.webp', 'Meja laboratorium sains yang terang', '/images/kajian-masjid.jpg', false, 'Trnava University', '_9xRHrMOjeg'),
  ('menu.pembelajaran.kurikulum', 'Mega menu Pembelajaran — Kurikulum', 'dekorasi', 'menu_sorotan', 'pembelajaran|Kurikulum', '/media/stok/ruang-kelas.webp', 'Ruang kelas kosong bermandi cahaya pagi', '/images/gedung.jpg', false, 'Jun Ren', 'RTFX0TQHXko'),
  ('menu.kehidupan.galeri', 'Mega menu Kehidupan Siswa — Galeri kegiatan', 'dekorasi', 'menu_sorotan', 'kehidupan|Galeri kegiatan', '/media/stok/pengibaran-bendera.webp', 'Pengibaran bendera Merah Putih saat upacara', '/images/upacara-pagi.jpg', false, 'Mufid Majnun', 'yv6ThE76y_M'),
  -- slot di kode (tanpa tabel CMS)
  ('profil.sejarah', 'Profil → Sejarah — foto utama', 'dekorasi', null, null, '/media/stok/kampus-langit.webp', 'Gedung kampus bata merah dan lapangan hijau di bawah langit biru', '/images/gedung.jpg', false, 'Brandon Zhang', 'T1ddURTBEtQ'),
  ('beranda.tentang', 'Beranda — Tentang kami', 'dekorasi', null, null, '/media/stok/gedung-modern.webp', 'Gedung modern di bawah langit biru', '/images/gedung.jpg', false, 'Omar Flores', 'xkoegrJfrBU'),
  ('kartu-profil.sambutan', 'Kartu Profil — Sambutan kepala sekolah', 'dekorasi', null, null, '/media/stok/koridor-terang.webp', 'Koridor sekolah putih yang terang', '/images/kepala-sekolah.jpg', false, 'Nguyen Khanh Ly', 'liiusuaISP0'),
  ('kartu-profil.sejarah', 'Kartu Profil — Sejarah', 'dekorasi', null, null, '/media/stok/gedung-modern.webp', 'Gedung modern di bawah langit biru', '/images/gedung.jpg', false, 'Omar Flores', 'xkoegrJfrBU'),
  ('kartu-profil.tata-tertib', 'Kartu Profil — Tata tertib', 'dekorasi', null, null, '/media/stok/bendera-langit.webp', 'Bendera Merah Putih di langit biru', '/images/upacara-pagi.jpg', false, 'Bisma Mahendra', 'Vo-ZnZ-xSDQ'),
  ('kartu-pembelajaran.e-learning', 'Kartu Pembelajaran — E-Learning', 'dekorasi', null, null, '/media/stok/meja-belajar.webp', 'Meja belajar putih dengan laptop, dilihat dari atas', '/media/placeholder/galeri-3.webp', true, 'Alexa Williams', 'RaYjMmmaSCA'),
  ('kartu-pembelajaran.kalender', 'Kartu Pembelajaran — Kalender akademik', 'dekorasi', null, null, '/media/stok/kalender-meja.webp', 'Kalender meja kecil di atas kain putih', '/images/upacara-pagi.jpg', false, 'Kyrie kim', 'jqxB3C0YNG0'),
  ('program.7kaih', 'Program — 7KAIH', 'dekorasi', null, null, '/media/stok/mihrab-masjid.webp', 'Mihrab dan karpet merah di dalam masjid', '/images/kajian-masjid.jpg', false, 'Utsman Media', 'L4SDwP3LElQ');

-- 2) Baris CMS baru yang belum ada di production: halaman masuk (3 peran) & kartu sorotan mega menu (9 kartu).
--    Hanya bila belum ada isinya (admin belum mengatur), agar tidak menimpa pilihan admin.
insert into public.portal_login (peran, foto_url, alt_text, caption, is_placeholder)
select s.cari, s.url, s.alt, '', true from _slot s
where s.tabel = 'portal_login' and not exists (select 1 from public.portal_login p where p.peran = s.cari and p.foto_url <> '')
on conflict (peran) do update set foto_url = excluded.foto_url, alt_text = excluded.alt_text, caption = '', is_placeholder = true, updated_at = now()
  where public.portal_login.foto_url = '';

insert into public.menu_sorotan (grup, urutan, judul, keterangan, tautan, foto_url, is_placeholder, fokus_x, fokus_y)
select v.grup, v.urutan, v.judul, v.keterangan, v.tautan, v.foto, v.sementara, 50, 50
from (values
  ('profil', 1, 'Sambutan kepala sekolah', 'Pesan dan arah kepemimpinan.', '/sambutan', '/media/stok/koridor-terang.webp', true),
  ('profil', 2, 'Visi dan misi', 'Nilai yang kami pegang.', '/profil/visi-misi', '/media/stok/bendera-awan.webp', true),
  ('profil', 3, 'Fasilitas', 'Ruang belajar, masjid, aula, lapangan.', '/profil/fasilitas', '/media/stok/laboratorium.webp', true),
  ('pembelajaran', 1, 'E-Learning', 'Kelas daring, tugas, materi.', '/pembelajaran/e-learning', '/media/placeholder/hero-1.webp', true),
  ('pembelajaran', 2, 'Kalender akademik', 'Semester, ujian, libur.', '/pembelajaran/kalender', '/images/kegiatan-aula.jpg', false),
  ('pembelajaran', 3, 'Kurikulum', 'Struktur mata pelajaran dan pilihan.', '/pembelajaran/kurikulum', '/media/stok/ruang-kelas.webp', true),
  ('kehidupan', 1, 'Prestasi', 'Capaian kota hingga nasional.', '/prestasi', '/images/apel-lapangan.jpg', false),
  ('kehidupan', 2, 'Ekskul dan OSIS', 'Pilihan kegiatan dan organisasi.', '/ekskul', '/images/keluarga-besar.jpg', false),
  ('kehidupan', 3, 'Galeri kegiatan', 'Foto dan video sekolah.', '/galeri', '/media/stok/pengibaran-bendera.webp', true)
) as v(grup, urutan, judul, keterangan, tautan, foto, sementara)
where not exists (select 1 from public.menu_sorotan m where m.grup = v.grup and m.aktif);

-- 3) Catat slot (foto asli + kredit). Baris CMS dicari dari judul/url/peran.
insert into public.foto_slot (lokasi, nama, jenis, tabel, baris_id, url_aktif, is_placeholder, alt_text, url_asli, asli_sementara, asli_catatan,
                              fotografer, sumber, tautan_sumber, lisensi, diunduh_pada)
select * from (
select s.lokasi, s.nama, s.jenis, s.tabel,
  case s.tabel
    -- hanya baris yang MASIH memakai foto lama (atau, untuk baris baru, foto yang baru diisi skrip ini)
    when 'kartu_beranda' then (select k.id::text from public.kartu_beranda k where k.judul = s.cari and k.foto_url = s.asli order by k.urutan limit 1)
    when 'tur_sekolah'   then (select t.id::text from public.tur_sekolah t where t.judul = s.cari and t.media_url = coalesce(s.asli, '') order by t.urutan limit 1)
    when 'galeri'        then (select g.id::text from public.galeri g where g.gambar_url = s.cari and g.deleted_at is null order by g.urutan limit 1)
    when 'portal_login'  then (select p.peran from public.portal_login p where p.peran = s.cari and p.foto_url = s.url)
    when 'menu_sorotan'  then (select m.id::text from public.menu_sorotan m where m.grup = split_part(s.cari, '|', 1) and m.judul = split_part(s.cari, '|', 2) and m.foto_url = s.url order by m.urutan limit 1)
  end as baris_id,
  s.url, true, s.alt, s.asli, s.asli_stok,
  case when s.asli is null then 'Sebelumnya kosong (belum ada foto)' else 'Lokasi semula: ' || s.nama || ' — berkas ' || s.asli || ' (tidak dihapus)' end,
  s.fotografer, 'Unsplash', 'https://unsplash.com/photos/' || s.foto_id, 'Unsplash License (https://unsplash.com/license)', date '2026-10-23'
from _slot s
) x
-- slot CMS yang barisnya tidak ditemukan (mis. sudah diubah/dihapus admin) → tidak dicatat
where x.tabel is null or x.baris_id is not null
on conflict (lokasi) do nothing;

-- 4) Pasang foto baru di baris CMS — hanya bila masih memakai foto lama
update public.kartu_beranda k set foto_url = f.url_aktif, is_placeholder = true, updated_at = now()
from public.foto_slot f where f.tabel = 'kartu_beranda' and f.baris_id = k.id::text and k.foto_url = f.url_asli;
update public.tur_sekolah t set media_url = f.url_aktif, media_tipe = 'foto', alt_text = f.alt_text, is_placeholder = true, updated_at = now()
from public.foto_slot f where f.tabel = 'tur_sekolah' and f.baris_id = t.id::text and coalesce(t.media_url, '') = coalesce(f.url_asli, '');
update public.galeri g set gambar_url = f.url_aktif, is_placeholder = true, updated_at = now()
from public.foto_slot f where f.tabel = 'galeri' and f.baris_id = g.id::text and g.gambar_url = f.url_asli;

-- 5) Label tur yang keliru: titik yang memakai foto ASLI sekolah bukan "Ilustrasi sementara"
update public.tur_sekolah set is_placeholder = false, updated_at = now()
where media_url in ('/images/keluarga-besar.jpg', '/images/gedung.jpg') and is_placeholder;

commit;
