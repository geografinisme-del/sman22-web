-- "Langit cerah" Tahap A: kartu putar beranda (CMS). Satu tabel BARU; tidak mengubah/menghapus tabel lama.
-- Publik hanya membaca kartu aktif; menulis hanya pengelola konten (izin konten.kelola). Hapus permanen ditolak.

create table if not exists public.kartu_beranda (
  id             uuid primary key default gen_random_uuid(),
  urutan         smallint not null default 0,
  aktif          boolean not null default true,
  label          text not null check (char_length(label) between 2 and 40),
  judul          text not null check (char_length(judul) between 2 and 60),
  deskripsi      text not null default '' check (char_length(deskripsi) <= 140),
  foto_url       text not null default '' check (foto_url = '' or foto_url ~ '^(https://|/|http://(localhost|127\.0\.0\.1)[:/])'),
  -- foto contoh/stok = true → label "Ilustrasi sementara"; unggahan admin = foto asli
  is_placeholder boolean not null default false,
  url            text not null check (url ~ '^(https://|/[^/])'),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists kartu_beranda_urutan on public.kartu_beranda (urutan) where aktif;

alter table public.kartu_beranda enable row level security;
revoke all on public.kartu_beranda from anon;
grant select on public.kartu_beranda to anon;
grant select, insert, update on public.kartu_beranda to authenticated;
revoke delete, truncate on public.kartu_beranda from authenticated;

drop policy if exists "publik baca kartu aktif" on public.kartu_beranda;
create policy "publik baca kartu aktif" on public.kartu_beranda for select to anon, authenticated using (aktif);
drop policy if exists "pengelola baca semua kartu" on public.kartu_beranda;
create policy "pengelola baca semua kartu" on public.kartu_beranda for select to authenticated
  using ((select public.punya_izin('konten.kelola')));
drop policy if exists "pengelola tulis kartu" on public.kartu_beranda;
create policy "pengelola tulis kartu" on public.kartu_beranda for insert to authenticated
  with check ((select public.punya_izin('konten.kelola')));
drop policy if exists "pengelola ubah kartu" on public.kartu_beranda;
create policy "pengelola ubah kartu" on public.kartu_beranda for update to authenticated
  using ((select public.punya_izin('konten.kelola'))) with check ((select public.punya_izin('konten.kelola')));

-- isi awal 12 kartu (hanya bila tabel masih kosong). Foto /images/* = foto asli sekolah;
-- /media/placeholder/* = foto stok Unsplash (CREDITS.md) → is_placeholder = true.
insert into public.kartu_beranda (urutan, label, judul, deskripsi, foto_url, is_placeholder, url)
select * from (values
  (1,  'Profil',          'Mengenal SMAN 22',        'Identitas, visi-misi, dan sejarah sekolah.',              '/images/gedung.jpg',                 false, '/profil'),
  (2,  'Pembelajaran',    'Program dan karakter',    '7KAIH, Gerbang Pancawaluya, dan kokurikuler tematik.',    '/images/apel-lapangan.jpg',          false, '/program'),
  (3,  'Pembelajaran',    'E-Learning',              'Kelas digital, materi, dan tugas daring.',                '/media/placeholder/galeri-3.webp',   true,  '/pembelajaran/e-learning'),
  (4,  'Kehidupan Siswa', 'Ekskul dan OSIS',         'Wadah minat, bakat, dan kepemimpinan siswa.',             '/images/keluarga-besar.jpg',         false, '/ekskul'),
  (5,  'Kehidupan Siswa', 'Prestasi',                'Kabar capaian siswa dari berbagai lomba.',                '/media/placeholder/berita-1.webp',   true,  '/prestasi'),
  (6,  'Kehidupan Siswa', 'Galeri kegiatan',         'Dokumentasi kegiatan siswa dan sekolah.',                 '/images/kegiatan-aula.jpg',          false, '/galeri'),
  (7,  'Kabar & Agenda',  'Berita dan pengumuman',   'Kabar terbaru dan informasi resmi sekolah.',              '/images/upacara-pagi.jpg',           false, '/berita'),
  (8,  'Kabar & Agenda',  'Agenda sekolah',          'Kegiatan dan tanggal penting sekolah.',                   '/images/kajian-masjid.jpg',          false, '/agenda'),
  (9,  'SPMB',            'Penerimaan murid baru',   'Jalur, persyaratan, dan jadwal resmi.',                   '/media/placeholder/berita-2.webp',   true,  '/spmb'),
  (10, 'Layanan',         'Portal Digital 22',       'Pintu masuk guru, siswa, orang tua, dan manajemen.',      '/media/placeholder/galeri-1.webp',   true,  '/portal-digital'),
  (11, 'Layanan',         'E-Library',               'Cari buku dan cek ketersediaannya.',                      '/media/placeholder/berita-4.webp',   true,  '/perpustakaan'),
  (12, 'Layanan',         'Pengaduan dan aspirasi',  'Sampaikan saran atau laporan, pantau dengan nomor tiket.', '/media/placeholder/galeri-5.webp',   true,  '/pengaduan')
) as v(urutan, label, judul, deskripsi, foto_url, is_placeholder, url)
where not exists (select 1 from public.kartu_beranda);
