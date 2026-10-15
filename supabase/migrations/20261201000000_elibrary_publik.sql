-- Fase 18: E-Library publik — daftar kategori, filter kategori yang tepat, dan aturan pinjam ringkas.
-- Hanya membaca buku yang tampil_publik & belum dihapus; tidak mengubah tabel apa pun.
-- Tautan digital tetap mengikuti hak akses koleksi (akses_digital = 'publik' atau warga sekolah aktif).

-- Kategori katalog publik beserta jumlah judul (untuk saringan di halaman E-Library)
create or replace function public.kategori_katalog_publik()
returns table (kategori text, jumlah int)
language sql stable security definer set search_path = '' as $$
  select b.kategori, count(*)::int
  from public.buku b
  where b.deleted_at is null and b.tampil_publik and b.kategori <> ''
  group by b.kategori
  order by count(*) desc, b.kategori
  limit 40;
$$;

-- Katalog publik dengan saringan kategori persis (+ pencarian teks opsional)
create or replace function public.katalog_publik_kategori(p_kategori text, p_cari text default '', p_batas int default 30, p_lewati int default 0)
returns table (id uuid, judul text, pengarang text, penerbit text, tahun smallint, kategori text, rak text, sampul_url text, tautan_digital text,
               tersedia int, total int, jumlah_hasil bigint, rekomendasi boolean, rating numeric, jumlah_ulasan int, lisensi text, akses_digital text)
language sql stable security definer set search_path = '' as $$
  select b.id, b.judul, b.pengarang, b.penerbit, b.tahun, b.kategori, b.rak, b.sampul_url,
         case when b.akses_digital = 'publik' or public.warga_aktif() then b.tautan_digital else '' end,
         (select count(*)::int from public.eksemplar e where e.buku_id = b.id and e.status = 'tersedia'
            and not exists (select 1 from public.reservasi_buku r where r.eksemplar_id = e.id and r.status = 'siap')),
         (select count(*)::int from public.eksemplar e where e.buku_id = b.id and e.status in ('tersedia', 'dipinjam')),
         count(*) over (), b.rekomendasi,
         (select round(avg(u.rating), 1) from public.ulasan_buku u where u.buku_id = b.id and u.status = 'tampil'),
         (select count(*)::int from public.ulasan_buku u where u.buku_id = b.id and u.status = 'tampil'),
         b.lisensi, b.akses_digital
  from public.buku b
  where b.deleted_at is null and b.tampil_publik
    and b.kategori = coalesce(p_kategori, '')
    and (coalesce(trim(p_cari), '') = '' or b.judul ilike '%' || trim(p_cari) || '%' or b.pengarang ilike '%' || trim(p_cari) || '%' or b.isbn = trim(p_cari))
  order by b.rekomendasi desc, b.judul
  limit least(greatest(p_batas, 1), 60) offset greatest(p_lewati, 0);
$$;

-- Aturan pinjam ringkas untuk panduan layanan publik (tanpa data anggota/pinjaman)
create or replace function public.aturan_perpus_publik()
returns table (lama_pinjam smallint, maks_pinjam smallint, maks_perpanjang smallint)
language sql stable security definer set search_path = '' as $$
  select p.lama_pinjam, p.maks_pinjam, p.maks_perpanjang from public.pengaturan_perpus p where p.id = 1;
$$;

revoke all on function public.kategori_katalog_publik(), public.katalog_publik_kategori(text, text, int, int), public.aturan_perpus_publik() from public;
grant execute on function public.kategori_katalog_publik(), public.katalog_publik_kategori(text, text, int, int), public.aturan_perpus_publik() to anon, authenticated;
