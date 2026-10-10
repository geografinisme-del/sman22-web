-- =====================================================================
-- Fase 11 — Modul 18 Perpustakaan & Modul 19 Humas & Pengaduan
--   A. Perpustakaan: katalog, eksemplar, sirkulasi (pinjam/kembali/perpanjang/denda),
--      kunjungan, katalog publik (OPAC), pengingat jatuh tempo
--   B. Humas: pengaduan publik bertiket (+ kanal rahasia, SLA per kategori, penilaian), kemitraan/MoU, buku tamu
--   C. Perpustakaan lanjutan: reservasi, pojok baca, jurnal baca, tantangan literasi, ulasan, duta literasi
--   D. Humas lanjutan: riwayat tanggapan, kegiatan & evaluasi mitra, kontak media, survei, dasbor agregat
-- Idempoten: aman dijalankan ulang.
-- =====================================================================

insert into public.peran (kode, nama, keterangan, urutan) values
  ('pustakawan', 'Pustakawan', 'Mengelola katalog & sirkulasi perpustakaan', 6),
  ('literasi', 'Koordinator Literasi', 'Membina pojok baca, jurnal baca & tantangan literasi', 6)
on conflict (kode) do nothing;
insert into public.izin (kode, keterangan) values
  ('perpus.kelola', 'Mengelola katalog & sirkulasi perpustakaan'),
  ('perpus.lihat', 'Melihat laporan perpustakaan'),
  ('pengaduan.kelola', 'Menangani pengaduan & aspirasi masyarakat'),
  ('pengaduan.rahasia', 'Menangani pengaduan rahasia (perundungan, kekerasan)'),
  ('humas.kelola', 'Mengelola kemitraan/MoU sekolah'),
  ('tamu.catat', 'Mencatat buku tamu sekolah'),
  ('literasi.kelola', 'Membina literasi: pojok baca, jurnal baca, tantangan, ulasan')
on conflict (kode) do update set keterangan = excluded.keterangan;
insert into public.peran_izin (peran, izin) values
  ('super_admin', 'perpus.kelola'), ('pustakawan', 'perpus.kelola'), ('pustakawan', 'perpus.lihat'), ('super_admin', 'perpus.lihat'),
  ('kepala_sekolah', 'perpus.lihat'), ('kurikulum', 'perpus.lihat'),
  ('super_admin', 'pengaduan.kelola'), ('humas', 'pengaduan.kelola'), ('kepala_sekolah', 'pengaduan.kelola'),
  ('super_admin', 'pengaduan.rahasia'), ('kepala_sekolah', 'pengaduan.rahasia'), ('bk', 'pengaduan.rahasia'), ('kesiswaan', 'pengaduan.rahasia'),
  ('super_admin', 'humas.kelola'), ('humas', 'humas.kelola'), ('kepala_sekolah', 'humas.kelola'),
  ('super_admin', 'literasi.kelola'), ('pustakawan', 'literasi.kelola'), ('literasi', 'literasi.kelola'), ('literasi', 'perpus.lihat'),
  ('super_admin', 'tamu.catat'), ('humas', 'tamu.catat'), ('piket', 'tamu.catat'), ('operator', 'tamu.catat')
on conflict do nothing;

-- =====================================================================
-- A. Perpustakaan
-- =====================================================================
create table if not exists public.pengaturan_perpus (
  id              smallint primary key default 1 check (id = 1),
  lama_pinjam     smallint not null default 7 check (lama_pinjam between 1 and 60),
  maks_pinjam     smallint not null default 3 check (maks_pinjam between 1 and 20),
  maks_perpanjang smallint not null default 1 check (maks_perpanjang between 0 and 5),
  denda_per_hari  numeric(10, 2) not null default 0 check (denda_per_hari >= 0)
);
insert into public.pengaturan_perpus (id) values (1) on conflict do nothing;

create table if not exists public.buku (
  id             uuid primary key default gen_random_uuid(),
  judul          text not null check (char_length(judul) between 1 and 250),
  pengarang      text not null default '' check (char_length(pengarang) <= 250),
  penerbit       text not null default '' check (char_length(penerbit) <= 150),
  tahun          smallint check (tahun between 1800 and 2100),
  isbn           text not null default '' check (isbn ~ '^[0-9Xx-]{0,20}$'),
  kategori       text not null default '' check (char_length(kategori) <= 60),
  nomor_panggil  text not null default '' check (char_length(nomor_panggil) <= 40),
  rak            text not null default '' check (char_length(rak) <= 40),
  sinopsis       text not null default '' check (char_length(sinopsis) <= 3000),
  sampul_url     text not null default '' check (sampul_url = '' or sampul_url ~ '^https://'),
  tautan_digital text not null default '' check (tautan_digital = '' or tautan_digital ~ '^https://'),
  tampil_publik  boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
-- lisensi & akses sumber digital; rekomendasi pustakawan
alter table public.buku add column if not exists lisensi text not null default '' check (char_length(lisensi) <= 120);
alter table public.buku add column if not exists akses_digital text not null default 'warga' check (akses_digital in ('publik', 'warga'));
alter table public.buku add column if not exists rekomendasi boolean not null default false;
create index if not exists buku_cari on public.buku using gin (to_tsvector('simple', judul || ' ' || pengarang || ' ' || penerbit || ' ' || kategori)) where deleted_at is null;

create sequence if not exists public.nomor_eksemplar;
create table if not exists public.eksemplar (
  id            uuid primary key default gen_random_uuid(),
  buku_id       uuid not null references public.buku (id),
  kode          text not null unique,
  status        text not null default 'tersedia' check (status in ('tersedia', 'dipinjam', 'rusak', 'hilang', 'dihapus')),
  sumber        text not null default '' check (char_length(sumber) <= 60),
  tanggal_masuk date not null default current_date,
  catatan       text not null default '' check (char_length(catatan) <= 300),
  created_at    timestamptz not null default now()
);
create index if not exists eksemplar_buku on public.eksemplar (buku_id);
create or replace function public.jaga_eksemplar() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and coalesce(new.kode, '') = '' then
    new.kode := 'PUS' || lpad(nextval('public.nomor_eksemplar')::text, 6, '0');
  end if;
  if tg_op = 'UPDATE' then
    new.kode := old.kode;
    -- status dipinjam hanya lewat sirkulasi
    if (new.status = 'dipinjam') <> (old.status = 'dipinjam') and current_setting('app.sirkulasi', true) is distinct from '1' then
      raise exception 'Status dipinjam diatur lewat menu sirkulasi' using errcode = '22023';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists jaga_eksemplar on public.eksemplar;
create trigger jaga_eksemplar before insert or update on public.eksemplar for each row execute function public.jaga_eksemplar();

create table if not exists public.pinjaman_buku (
  id           uuid primary key default gen_random_uuid(),
  eksemplar_id uuid not null references public.eksemplar (id),
  siswa_id     uuid references public.siswa (id),
  pegawai_id   uuid references public.pegawai (id),
  pinjam_pada  date not null default ((now() at time zone 'Asia/Jakarta')::date),
  jatuh_tempo  date not null,
  kembali_pada date,
  perpanjang   smallint not null default 0,
  denda        numeric(10, 2) not null default 0,
  denda_lunas  boolean not null default true,
  petugas_id   uuid default auth.uid(),
  catatan      text not null default '' check (char_length(catatan) <= 300),
  created_at   timestamptz not null default now(),
  constraint pinjam_peminjam check ((siswa_id is null) <> (pegawai_id is null))
);
create index if not exists pinjaman_aktif on public.pinjaman_buku (jatuh_tempo) where kembali_pada is null;
create unique index if not exists pinjaman_eksemplar_aktif on public.pinjaman_buku (eksemplar_id) where kembali_pada is null;

create table if not exists public.kunjungan_perpus (
  id         bigint generated always as identity primary key,
  siswa_id   uuid references public.siswa (id),
  pegawai_id uuid references public.pegawai (id),
  nama_tamu  text not null default '' check (char_length(nama_tamu) <= 120),
  keperluan  text not null default 'membaca' check (keperluan in ('membaca', 'meminjam', 'mengerjakan_tugas', 'lainnya')),
  waktu      timestamptz not null default now(),
  petugas_id uuid default auth.uid()
);

-- cari anggota: NISN siswa (10 digit) atau NIP/nama pegawai
create or replace function public._anggota_perpus(p_kunci text, out siswa_id uuid, out pegawai_id uuid, out nama text)
language plpgsql stable security definer set search_path = '' as $$
begin
  select s.id, s.nama into siswa_id, nama from public.siswa s where s.nisn = trim(p_kunci) and s.deleted_at is null limit 1;
  if siswa_id is null then
    select g.id, g.nama into pegawai_id, nama from public.pegawai g
     where g.deleted_at is null and (g.nip = trim(p_kunci) or g.nuptk = trim(p_kunci) or g.id::text = trim(p_kunci)) limit 1;
  end if;
end $$;
revoke all on function public._anggota_perpus(text) from public, anon, authenticated;

create or replace function public.pinjam_buku(p_kode text, p_anggota text)
returns table (judul text, peminjam text, jatuh_tempo date) language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare e public.eksemplar; a record; c public.pengaturan_perpus; n int; tempo date; j text; rs record;
begin
  if not public.punya_izin('perpus.kelola') then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  select * into e from public.eksemplar where kode = upper(trim(p_kode));
  if e.id is null then raise exception 'Kode eksemplar % tidak ditemukan', p_kode using errcode = '22023'; end if;
  if e.status <> 'tersedia' then raise exception 'Buku tidak tersedia (status: %)', e.status using errcode = '22023'; end if;
  select * into a from public._anggota_perpus(p_anggota);
  if a.siswa_id is null and a.pegawai_id is null then raise exception 'Anggota tidak ditemukan (isi NISN siswa atau NIP guru)' using errcode = '22023'; end if;
  -- eksemplar yang sedang disimpan untuk pemesan lain tidak boleh dipinjamkan
  select r.batas_ambil, r.siswa_id, r.pegawai_id into rs from public.reservasi_buku r where r.eksemplar_id = e.id and r.status = 'siap';
  if rs.batas_ambil is not null and not (rs.siswa_id is not distinct from a.siswa_id and rs.pegawai_id is not distinct from a.pegawai_id) then
    raise exception 'Eksemplar ini disimpan untuk pemesan lain sampai %. Pakai eksemplar lain.', to_char(rs.batas_ambil, 'DD-MM-YYYY') using errcode = '22023';
  end if;
  select * into c from public.pengaturan_perpus where id = 1;
  select count(*) into n from public.pinjaman_buku p where p.kembali_pada is null
    and (p.siswa_id = a.siswa_id or p.pegawai_id = a.pegawai_id);
  if n >= c.maks_pinjam then raise exception '% sudah meminjam % buku (maksimal %)', a.nama, n, c.maks_pinjam using errcode = '22023'; end if;
  if exists (select 1 from public.pinjaman_buku p where p.kembali_pada is null and (p.siswa_id = a.siswa_id or p.pegawai_id = a.pegawai_id)
               and p.jatuh_tempo < (now() at time zone 'Asia/Jakarta')::date) then
    raise exception '% masih punya pinjaman terlambat. Kembalikan dulu.', a.nama using errcode = '22023';
  end if;
  tempo := (now() at time zone 'Asia/Jakarta')::date + c.lama_pinjam;
  insert into public.pinjaman_buku (eksemplar_id, siswa_id, pegawai_id, jatuh_tempo) values (e.id, a.siswa_id, a.pegawai_id, tempo);
  perform set_config('app.sirkulasi', '1', true);
  update public.eksemplar set status = 'dipinjam' where id = e.id;
  perform set_config('app.sirkulasi', '0', true);
  -- pesanan anggota ini untuk judul yang sama dianggap sudah diambil; eksemplar yang ditahan dilepas ke antrean berikutnya
  update public.reservasi_buku r set status = 'diambil' where r.buku_id = e.buku_id and r.status in ('menunggu', 'siap')
     and r.siswa_id is not distinct from a.siswa_id and r.pegawai_id is not distinct from a.pegawai_id;
  perform public._proses_reservasi(e.buku_id);
  select b.judul into j from public.buku b where b.id = e.buku_id;
  return query select j, a.nama, tempo;
end $$;

create or replace function public.kembalikan_buku(p_kode text, p_kondisi text default 'tersedia', p_lunas boolean default true)
returns table (judul text, peminjam text, terlambat int, denda numeric) language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare e public.eksemplar; p public.pinjaman_buku; c public.pengaturan_perpus; hari date := (now() at time zone 'Asia/Jakarta')::date; tl int; d numeric;
begin
  if not public.punya_izin('perpus.kelola') then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  if p_kondisi not in ('tersedia', 'rusak', 'hilang') then raise exception 'Kondisi tidak dikenal' using errcode = '22023'; end if;
  select * into e from public.eksemplar where kode = upper(trim(p_kode));
  select * into p from public.pinjaman_buku where eksemplar_id = e.id and kembali_pada is null;
  if p.id is null then raise exception 'Eksemplar % tidak sedang dipinjam', p_kode using errcode = '22023'; end if;
  select * into c from public.pengaturan_perpus where id = 1;
  tl := greatest(hari - p.jatuh_tempo, 0);
  d := tl * c.denda_per_hari;
  update public.pinjaman_buku set kembali_pada = hari, denda = d, denda_lunas = (d = 0 or p_lunas) where id = p.id;
  perform set_config('app.sirkulasi', '1', true);
  update public.eksemplar set status = p_kondisi where id = e.id;
  perform set_config('app.sirkulasi', '0', true);
  return query select (select b.judul from public.buku b where b.id = e.buku_id),
    coalesce((select s.nama from public.siswa s where s.id = p.siswa_id), (select g.nama from public.pegawai g where g.id = p.pegawai_id)), tl, d;
end $$;

-- perpanjang: petugas, atau peminjam sendiri (siswa/ortu/guru) sebelum jatuh tempo
create or replace function public.perpanjang_buku(p_id uuid)
returns date language plpgsql security definer set search_path = '' as $$
declare p public.pinjaman_buku; c public.pengaturan_perpus; hari date := (now() at time zone 'Asia/Jakarta')::date; baru date;
begin
  select * into p from public.pinjaman_buku where id = p_id for update;
  if p.id is null or p.kembali_pada is not null then raise exception 'Pinjaman tidak aktif' using errcode = '22023'; end if;
  if not (public.punya_izin('perpus.kelola') or (p.siswa_id is not null and public.diri_atau_anak(p.siswa_id))
          or (p.pegawai_id is not null and p.pegawai_id = public.pegawai_saya())) then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  select * into c from public.pengaturan_perpus where id = 1;
  if p.perpanjang >= c.maks_perpanjang then raise exception 'Batas perpanjangan (% kali) tercapai', c.maks_perpanjang using errcode = '22023'; end if;
  if p.jatuh_tempo < hari and not public.punya_izin('perpus.kelola') then raise exception 'Sudah terlambat; perpanjang di perpustakaan' using errcode = '22023'; end if;
  baru := greatest(p.jatuh_tempo, hari) + c.lama_pinjam;
  update public.pinjaman_buku set jatuh_tempo = baru, perpanjang = perpanjang + 1 where id = p_id;
  return baru;
end $$;

create or replace function public.catat_kunjungan_perpus(p_kunci text, p_keperluan text default 'membaca')
returns text language plpgsql security definer set search_path = '' as $$
declare a record;
begin
  if not public.punya_izin('perpus.kelola') then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  select * into a from public._anggota_perpus(p_kunci);
  insert into public.kunjungan_perpus (siswa_id, pegawai_id, nama_tamu, keperluan)
  values (a.siswa_id, a.pegawai_id, case when a.nama is null then left(trim(p_kunci), 120) else '' end,
          case when p_keperluan in ('membaca', 'meminjam', 'mengerjakan_tugas', 'lainnya') then p_keperluan else 'lainnya' end);
  return coalesce(a.nama, trim(p_kunci));
end $$;
revoke all on function public.catat_kunjungan_perpus(text, text) from public, anon;
grant execute on function public.catat_kunjungan_perpus(text, text) to authenticated;

-- daftar pinjaman untuk petugas (nama & kelas peminjam tanpa membuka data induk)
create or replace function public.daftar_pinjaman(p_aktif boolean default true, p_batas int default 300)
returns table (id uuid, kode text, judul text, peminjam text, kelas text, pinjam_pada date, jatuh_tempo date, kembali_pada date,
               perpanjang smallint, denda numeric, denda_lunas boolean, terlambat int)
language sql stable security definer set search_path = '' as $$
  select p.id, e.kode, b.judul, coalesce(s.nama, g.nama, '—'),
         coalesce((select k.nama from public.anggota_kelas ak join public.kelas k on k.id = ak.kelas_id
                    join public.tahun_ajaran t on t.id = ak.tahun_ajaran_id and t.aktif where ak.siswa_id = s.id limit 1), case when g.id is not null then 'Guru/Staf' end, ''),
         p.pinjam_pada, p.jatuh_tempo, p.kembali_pada, p.perpanjang, p.denda, p.denda_lunas,
         greatest(coalesce(p.kembali_pada, (now() at time zone 'Asia/Jakarta')::date) - p.jatuh_tempo, 0)
  from public.pinjaman_buku p join public.eksemplar e on e.id = p.eksemplar_id join public.buku b on b.id = e.buku_id
  left join public.siswa s on s.id = p.siswa_id left join public.pegawai g on g.id = p.pegawai_id
  where (public.punya_izin('perpus.kelola') or public.punya_izin('perpus.lihat'))
    and (case when p_aktif then p.kembali_pada is null else not p.denda_lunas or p.kembali_pada >= current_date - 30 end)
  order by p.jatuh_tempo, b.judul limit least(greatest(p_batas, 1), 1000);
$$;
revoke all on function public.daftar_pinjaman(boolean, int) from public, anon;
grant execute on function public.daftar_pinjaman(boolean, int) to authenticated;

-- pengingat (penjadwal harian): H-1 jatuh tempo & terlambat (sekali per hari per pinjaman)
create or replace function public.pengingat_perpus()
returns int language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0; hari date := (now() at time zone 'Asia/Jakarta')::date; u uuid;
begin
  for r in select p.id, p.jatuh_tempo, p.siswa_id, p.pegawai_id, b.judul from public.pinjaman_buku p
            join public.eksemplar e on e.id = p.eksemplar_id join public.buku b on b.id = e.buku_id
           where p.kembali_pada is null and p.jatuh_tempo <= hari + 1 loop
    u := coalesce((select user_id from public.siswa where id = r.siswa_id), (select user_id from public.pegawai where id = r.pegawai_id));
    if u is null or exists (select 1 from public.notifikasi x where x.user_id = u and x.tautan like '%perpus%'
                             and x.isi like '%' || r.judul || '%' and x.created_at >= hari) then continue; end if;
    perform public.kirim_notif(u, 'perpus',
      case when r.jatuh_tempo < hari then 'Buku perpustakaan terlambat' when r.jatuh_tempo = hari then 'Buku harus dikembalikan hari ini' else 'Besok batas kembali buku' end,
      r.judul || ' — jatuh tempo ' || to_char(r.jatuh_tempo, 'DD-MM-YYYY'),
      case when r.siswa_id is not null then '/portal/perpus' else '/admin/perpus' end, 'biasa', false);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.pengingat_perpus() from public, anon, authenticated;
grant execute on function public.pengingat_perpus() to service_role;

create or replace function public.statistik_perpus(p_dari date, p_sampai date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.punya_izin('perpus.kelola') or public.punya_izin('perpus.lihat')) then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  return jsonb_build_object(
    'judul', (select count(*) from public.buku where deleted_at is null),
    'eksemplar', (select count(*) from public.eksemplar where status in ('tersedia', 'dipinjam')),
    'dipinjam', (select count(*) from public.pinjaman_buku where kembali_pada is null),
    'terlambat', (select count(*) from public.pinjaman_buku where kembali_pada is null and jatuh_tempo < (now() at time zone 'Asia/Jakarta')::date),
    'pinjam_periode', (select count(*) from public.pinjaman_buku where pinjam_pada between p_dari and p_sampai),
    'kunjungan_periode', (select count(*) from public.kunjungan_perpus where (waktu at time zone 'Asia/Jakarta')::date between p_dari and p_sampai),
    'denda_belum_lunas', (select coalesce(sum(denda), 0) from public.pinjaman_buku where not denda_lunas),
    'populer', coalesce((select jsonb_agg(x) from (select b.judul, count(*) n from public.pinjaman_buku p join public.eksemplar e on e.id = p.eksemplar_id
                     join public.buku b on b.id = e.buku_id where p.pinjam_pada between p_dari and p_sampai group by b.judul order by n desc limit 10) x), '[]'),
    'per_kelas', coalesce((select jsonb_agg(x) from (select k.nama kelas, count(*) n from public.pinjaman_buku p
                     join public.anggota_kelas ak on ak.siswa_id = p.siswa_id join public.kelas k on k.id = ak.kelas_id
                     join public.tahun_ajaran t on t.id = ak.tahun_ajaran_id and t.aktif
                     where p.pinjam_pada between p_dari and p_sampai group by k.nama order by n desc limit 15) x), '[]')
  );
end $$;

revoke all on function public.pinjam_buku(text, text), public.kembalikan_buku(text, text, boolean), public.perpanjang_buku(uuid), public.statistik_perpus(date, date) from public, anon;
grant execute on function public.pinjam_buku(text, text), public.kembalikan_buku(text, text, boolean), public.perpanjang_buku(uuid), public.statistik_perpus(date, date) to authenticated;

-- =====================================================================
-- B. Humas & pengaduan
-- =====================================================================
create table if not exists public.pengaduan (
  id               uuid primary key default gen_random_uuid(),
  tiket            text not null unique,
  kode_hash        text not null,
  kategori         text not null check (kategori in ('layanan', 'akademik', 'fasilitas', 'keuangan', 'perundungan', 'kekerasan', 'saran', 'informasi', 'lainnya')),
  judul            text not null check (char_length(judul) between 5 and 150),
  isi              text not null check (char_length(isi) between 20 and 5000),
  nama             text not null default '' check (char_length(nama) <= 120),
  kontak           text not null default '' check (char_length(kontak) <= 120),
  anonim           boolean not null default false,
  pelapor_id       uuid,
  ip_hash          text not null default '',
  rahasia          boolean not null default false,
  status           text not null default 'baru' check (status in ('baru', 'diproses', 'selesai', 'ditolak')),
  pic_id           uuid references public.pegawai (id),
  tanggapan_publik text not null default '' check (char_length(tanggapan_publik) <= 3000),
  catatan_internal text not null default '' check (char_length(catatan_internal) <= 3000),
  tenggat          date not null default ((now() at time zone 'Asia/Jakarta')::date + 7),
  selesai_pada     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists pengaduan_status on public.pengaduan (status, created_at);
alter table public.pengaduan drop constraint if exists pengaduan_kategori_check;
alter table public.pengaduan add constraint pengaduan_kategori_check
  check (kategori in ('layanan', 'akademik', 'fasilitas', 'keuangan', 'perundungan', 'kekerasan', 'saran', 'informasi', 'lainnya'));
-- penilaian layanan oleh pelapor (1–5) setelah ditutup
alter table public.pengaduan add column if not exists rating smallint check (rating between 1 and 5);
alter table public.pengaduan add column if not exists komentar_rating text not null default '' check (char_length(komentar_rating) <= 500);

-- SLA per kategori (hari kalender), dapat diatur humas
create table if not exists public.sla_pengaduan (
  kategori text primary key,
  hari     smallint not null check (hari between 1 and 60)
);
insert into public.sla_pengaduan values ('layanan', 7), ('akademik', 7), ('fasilitas', 14), ('keuangan', 7), ('perundungan', 3),
  ('kekerasan', 1), ('saran', 14), ('informasi', 10), ('lainnya', 7) on conflict do nothing;
create or replace function public.tenggat_pengaduan() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.tenggat := (now() at time zone 'Asia/Jakarta')::date + coalesce((select hari from public.sla_pengaduan where kategori = new.kategori), 7);
  return new;
end $$;
drop trigger if exists tenggat_pengaduan on public.pengaduan;
create trigger tenggat_pengaduan before insert on public.pengaduan for each row execute function public.tenggat_pengaduan();

create or replace function public.boleh_pengaduan(p_rahasia boolean, p_pic uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case when p_rahasia then public.punya_izin('pengaduan.rahasia')
              else public.punya_izin('pengaduan.kelola') or public.punya_izin('pengaduan.rahasia') end
      or (p_pic is not null and p_pic = public.pegawai_saya());
$$;
grant execute on function public.boleh_pengaduan(boolean, uuid) to authenticated;

-- kirim pengaduan (publik/anon atau pengguna login). Kode akses hanya ditampilkan sekali.
create or replace function public.kirim_pengaduan(p_kategori text, p_judul text, p_isi text, p_nama text, p_kontak text, p_anonim boolean, p_ip_hash text)
returns table (tiket text, kode text) language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare t text; k text; rah boolean := p_kategori in ('perundungan', 'kekerasan'); u uuid; nid uuid; abjad text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if coalesce(p_ip_hash, '') <> '' and (select count(*) from public.pengaduan where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Terlalu banyak pengaduan dari perangkat ini. Coba lagi nanti.' using errcode = '22023';
  end if;
  if (select count(*) from public.pengaduan where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Layanan pengaduan sedang ramai. Coba lagi beberapa saat lagi.' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_isi, ''))) < 20 then raise exception 'Uraikan pengaduan minimal 20 karakter' using errcode = '22023'; end if;
  loop
    t := 'ADU-' || to_char(now() at time zone 'Asia/Jakarta', 'YYMM') || '-' || upper(substr(md5(random()::text), 1, 5));
    exit when not exists (select 1 from public.pengaduan where tiket = t);
  end loop;
  k := '';
  for i in 1..10 loop k := k || substr(abjad, 1 + floor(random() * length(abjad))::int, 1); end loop;
  insert into public.pengaduan (tiket, kode_hash, kategori, judul, isi, nama, kontak, anonim, pelapor_id, ip_hash, rahasia)
  values (t, encode(extensions.digest(convert_to(k, 'UTF8'), 'sha256'), 'hex'), p_kategori, trim(p_judul), trim(p_isi),
          case when p_anonim then '' else left(trim(coalesce(p_nama, '')), 120) end,
          case when p_anonim then '' else left(trim(coalesce(p_kontak, '')), 120) end,
          coalesce(p_anonim, false), auth.uid(), left(coalesce(p_ip_hash, ''), 64), rah)
  returning id into nid;
  for u in select public.pengguna_berizin(case when rah then 'pengaduan.rahasia' else 'pengaduan.kelola' end) loop
    perform public.kirim_notif(u, 'humas', case when rah then 'Pengaduan RAHASIA baru' else 'Pengaduan baru' end,
      t || ' · ' || case when rah then p_kategori else left(trim(p_judul), 100) end, '/admin/pengaduan/' || nid,
      case when rah then 'penting' else 'biasa' end);
  end loop;
  return query select t, k;
end $$;

drop function if exists public.cek_pengaduan(text, text);
create or replace function public.cek_pengaduan(p_tiket text, p_kode text)
returns table (tiket text, kategori text, judul text, status text, tanggapan_publik text, dibuat timestamptz, diperbarui timestamptz, rating smallint)
language sql stable security definer set search_path = '' as $$
  select p.tiket, p.kategori, p.judul, p.status, p.tanggapan_publik, p.created_at, p.updated_at, p.rating from public.pengaduan p
  where p.tiket = upper(trim(p_tiket)) and p.kode_hash = encode(extensions.digest(convert_to(upper(trim(p_kode)), 'UTF8'), 'sha256'), 'hex');
$$;

-- pengaduan milik pengguna login (portal/staf)
drop function if exists public.pengaduan_saya();
create or replace function public.pengaduan_saya()
returns table (id uuid, tiket text, kategori text, judul text, status text, tanggapan_publik text, dibuat timestamptz, diperbarui timestamptz, rating smallint)
language sql stable security definer set search_path = '' as $$
  select p.id, p.tiket, p.kategori, p.judul, p.status, p.tanggapan_publik, p.created_at, p.updated_at, p.rating
  from public.pengaduan p where p.pelapor_id = auth.uid() order by p.created_at desc;
$$;
revoke all on function public.kirim_pengaduan(text, text, text, text, text, boolean, text), public.cek_pengaduan(text, text), public.pengaduan_saya() from public;
grant execute on function public.kirim_pengaduan(text, text, text, text, text, boolean, text), public.cek_pengaduan(text, text) to anon, authenticated;
grant execute on function public.pengaduan_saya() to authenticated;

create or replace function public.jaga_pengaduan() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- identitas & isi pelapor tidak bisa diubah petugas
  new.tiket := old.tiket; new.kode_hash := old.kode_hash; new.isi := old.isi; new.judul := old.judul; new.nama := old.nama;
  new.kontak := old.kontak; new.anonim := old.anonim; new.pelapor_id := old.pelapor_id; new.ip_hash := old.ip_hash; new.created_at := old.created_at;
  if current_setting('app.rating', true) is distinct from '1' then new.rating := old.rating; new.komentar_rating := old.komentar_rating; end if;
  if new.kategori in ('perundungan', 'kekerasan') then new.rahasia := true; end if;
  if old.rahasia and not new.rahasia and not public.punya_izin('pengaduan.rahasia') then new.rahasia := true; end if;
  new.updated_at := now();
  if new.status in ('selesai', 'ditolak') and old.status not in ('selesai', 'ditolak') then
    new.selesai_pada := now();
    if char_length(trim(new.tanggapan_publik)) < 5 then raise exception 'Tulis tanggapan untuk pelapor sebelum menutup pengaduan' using errcode = '22023'; end if;
  end if;
  return new;
end $$;
drop trigger if exists jaga_pengaduan on public.pengaduan;
create trigger jaga_pengaduan before update on public.pengaduan for each row execute function public.jaga_pengaduan();

create or replace function public.notif_pengaduan() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.pic_id is distinct from old.pic_id and new.pic_id is not null then
    perform public.kirim_notif((select user_id from public.pegawai where id = new.pic_id), 'humas', 'Anda ditugaskan menindaklanjuti pengaduan',
      new.tiket || ' · tenggat ' || to_char(new.tenggat, 'DD-MM-YYYY'), '/admin/pengaduan/' || new.id, 'penting');
  end if;
  if new.status <> old.status and new.pelapor_id is not null then
    perform public.kirim_notif(new.pelapor_id, 'humas', 'Pengaduan ' || new.tiket || ': ' || new.status,
      left(coalesce(nullif(new.tanggapan_publik, ''), 'Status pengaduan Anda diperbarui.'), 200), '/pengaduan/cek?tiket=' || new.tiket);
  end if;
  return null;
end $$;
drop trigger if exists notif_pengaduan on public.pengaduan;
create trigger notif_pengaduan after update on public.pengaduan for each row execute function public.notif_pengaduan();

create table if not exists public.kemitraan (
  id              uuid primary key default gen_random_uuid(),
  mitra           text not null check (char_length(mitra) between 2 and 150),
  jenis           text not null default 'pendidikan' check (jenis in ('pendidikan', 'industri', 'pemerintah', 'komunitas', 'alumni', 'lainnya')),
  ruang_lingkup   text not null default '' check (char_length(ruang_lingkup) <= 1000),
  nomor_dokumen   text not null default '' check (char_length(nomor_dokumen) <= 100),
  mulai           date,
  berakhir        date,
  pic_id          uuid references public.pegawai (id),
  kontak_mitra    text not null default '' check (char_length(kontak_mitra) <= 150),
  tautan_dokumen  text not null default '' check (tautan_dokumen = '' or tautan_dokumen ~ '^https://'),
  tampil_publik   boolean not null default false,
  catatan         text not null default '' check (char_length(catatan) <= 1000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  constraint mitra_rentang check (berakhir is null or mulai is null or berakhir >= mulai)
);

create table if not exists public.buku_tamu (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null check (char_length(nama) between 2 and 120),
  instansi    text not null default '' check (char_length(instansi) <= 150),
  telepon     text not null default '' check (char_length(telepon) <= 30),
  keperluan   text not null check (char_length(keperluan) between 3 and 300),
  bertemu_id  uuid references public.pegawai (id),
  jumlah      smallint not null default 1 check (jumlah between 1 and 100),
  masuk       timestamptz not null default now(),
  keluar      timestamptz,
  petugas_id  uuid default auth.uid()
);
create or replace function public.notif_tamu() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.bertemu_id is not null then
    perform public.kirim_notif((select user_id from public.pegawai where id = new.bertemu_id), 'humas', 'Tamu menunggu: ' || new.nama,
      coalesce(nullif(new.instansi, '') || ' · ', '') || new.keperluan, '/admin/buku-tamu', 'penting');
  end if;
  return null;
end $$;
drop trigger if exists notif_tamu on public.buku_tamu;
create trigger notif_tamu after insert on public.buku_tamu for each row execute function public.notif_tamu();

-- pengingat MoU berakhir ≤ 30 hari (penjadwal harian; sekali per MoU per bulan)
create or replace function public.pengingat_kemitraan()
returns int language plpgsql security definer set search_path = '' as $$
declare r record; u uuid; n int := 0;
begin
  for r in select * from public.kemitraan where deleted_at is null and berakhir between current_date and current_date + 30 loop
    for u in select public.pengguna_berizin('humas.kelola') loop
      if exists (select 1 from public.notifikasi where user_id = u and judul = 'MoU segera berakhir: ' || r.mitra and created_at > now() - interval '30 days') then continue; end if;
      perform public.kirim_notif(u, 'humas', 'MoU segera berakhir: ' || r.mitra, 'Berakhir ' || to_char(r.berakhir, 'DD-MM-YYYY'), '/admin/kemitraan', 'biasa', false);
      n := n + 1;
    end loop;
  end loop;
  return n;
end $$;
revoke all on function public.pengingat_kemitraan() from public, anon, authenticated;
grant execute on function public.pengingat_kemitraan() to service_role;

-- daftar mitra untuk website (hanya yang ditandai tampil & masih berlaku)
create or replace function public.mitra_publik()
returns table (mitra text, jenis text) language sql stable security definer set search_path = '' as $$
  select mitra, jenis from public.kemitraan where deleted_at is null and tampil_publik and (berakhir is null or berakhir >= current_date) order by mitra;
$$;
grant execute on function public.mitra_publik() to anon, authenticated;

-- daftar nama guru/staf untuk pilihan PIC, tamu, penanggung jawab (nama saja, tanpa data pribadi)
create or replace function public.daftar_staf()
returns table (id uuid, nama text) language sql stable security definer set search_path = '' as $$
  select g.id, g.nama from public.pegawai g where g.deleted_at is null and public.staf_aktif() order by g.nama;
$$;
revoke all on function public.daftar_staf() from public, anon;
grant execute on function public.daftar_staf() to authenticated;

-- =====================================================================
-- C. Perpustakaan lanjutan: reservasi, pojok baca, jurnal baca, tantangan literasi, ulasan, duta literasi
-- =====================================================================
create table if not exists public.pojok_baca (
  id                  uuid primary key default gen_random_uuid(),
  nama                text not null check (char_length(nama) between 2 and 100),
  lokasi              text not null default '' check (char_length(lokasi) <= 150),
  kelas_id            uuid references public.kelas (id),
  penanggung_jawab_id uuid references public.pegawai (id),
  deskripsi           text not null default '' check (char_length(deskripsi) <= 1000),
  aktif               boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);
alter table public.eksemplar add column if not exists pojok_id uuid references public.pojok_baca (id);
create table if not exists public.kegiatan_pojok (
  id                 uuid primary key default gen_random_uuid(),
  pojok_id           uuid not null references public.pojok_baca (id),
  tanggal            date not null default ((now() at time zone 'Asia/Jakarta')::date),
  kegiatan           text not null check (char_length(kegiatan) between 3 and 300),
  peserta            smallint not null default 0 check (peserta between 0 and 2000),
  tautan_dokumentasi text not null default '' check (tautan_dokumentasi = '' or tautan_dokumentasi ~ '^https://'),
  dicatat_oleh       uuid default auth.uid(),
  created_at         timestamptz not null default now()
);
create index if not exists kegiatan_pojok_idx on public.kegiatan_pojok (pojok_id, tanggal desc);
create or replace function public.pj_pojok(p_pojok uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select public.punya_izin('perpus.kelola') or public.punya_izin('literasi.kelola')
      or exists (select 1 from public.pojok_baca where id = p_pojok and penanggung_jawab_id = public.pegawai_saya());
$$;
grant execute on function public.pj_pojok(uuid) to authenticated;

-- reservasi (pesan buku): antre per judul; eksemplar yang kembali ditahan 3 hari untuk pemesan terdepan
create table if not exists public.reservasi_buku (
  id           uuid primary key default gen_random_uuid(),
  buku_id      uuid not null references public.buku (id),
  siswa_id     uuid references public.siswa (id),
  pegawai_id   uuid references public.pegawai (id),
  status       text not null default 'menunggu' check (status in ('menunggu', 'siap', 'diambil', 'batal', 'kedaluwarsa')),
  eksemplar_id uuid references public.eksemplar (id),
  siap_pada    timestamptz,
  batas_ambil  date,
  created_at   timestamptz not null default now(),
  constraint reservasi_pemesan check ((siswa_id is null) <> (pegawai_id is null))
);
create unique index if not exists reservasi_unik on public.reservasi_buku (buku_id, coalesce(siswa_id, pegawai_id)) where status in ('menunggu', 'siap');
create unique index if not exists reservasi_tahan on public.reservasi_buku (eksemplar_id) where status = 'siap';

create or replace function public._proses_reservasi(p_buku uuid) returns void language plpgsql security definer set search_path = '' as $$
declare r public.reservasi_buku; e uuid; u uuid; j text; batas date := (now() at time zone 'Asia/Jakarta')::date + 3;
begin
  loop
    select * into r from public.reservasi_buku x where x.buku_id = p_buku and x.status = 'menunggu' order by x.created_at limit 1 for update skip locked;
    exit when r.id is null;
    select x.id into e from public.eksemplar x where x.buku_id = p_buku and x.status = 'tersedia'
       and not exists (select 1 from public.reservasi_buku y where y.eksemplar_id = x.id and y.status = 'siap') order by x.kode limit 1;
    exit when e is null;
    update public.reservasi_buku set status = 'siap', eksemplar_id = e, siap_pada = now(), batas_ambil = batas where id = r.id;
    u := coalesce((select user_id from public.siswa where id = r.siswa_id), (select user_id from public.pegawai where id = r.pegawai_id));
    select judul into j from public.buku where id = p_buku;
    if u is not null then
      perform public.kirim_notif(u, 'perpus', 'Buku pesanan siap diambil', j || ' — ambil di perpustakaan paling lambat ' || to_char(batas, 'DD-MM-YYYY'),
        case when r.siswa_id is not null then '/portal/perpus' else '/admin/perpus' end, 'penting');
    end if;
  end loop;
end $$;
revoke all on function public._proses_reservasi(uuid) from public, anon, authenticated;

create or replace function public.reservasi_eksemplar() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'tersedia' and (tg_op = 'INSERT' or old.status <> 'tersedia') then perform public._proses_reservasi(new.buku_id); end if;
  if tg_op = 'UPDATE' and old.status = 'tersedia' and new.status in ('rusak', 'hilang', 'dihapus') then
    update public.reservasi_buku set status = 'menunggu', eksemplar_id = null, siap_pada = null, batas_ambil = null where eksemplar_id = new.id and status = 'siap';
    perform public._proses_reservasi(new.buku_id);
  end if;
  return null;
end $$;
drop trigger if exists reservasi_eksemplar on public.eksemplar;
create trigger reservasi_eksemplar after insert or update of status on public.eksemplar for each row execute function public.reservasi_eksemplar();

create or replace function public.pesan_buku(p_buku uuid) returns text language plpgsql security definer set search_path = '' as $$
declare sid uuid := public.siswa_login(); pid uuid; nid uuid; st text;
begin
  if sid is null then pid := public.pegawai_saya(); end if;
  if sid is null and pid is null then raise exception 'Pemesanan buku hanya untuk siswa dan guru/staf (masuk dengan akun Anda)' using errcode = '42501'; end if;
  if not exists (select 1 from public.buku where id = p_buku and deleted_at is null) then raise exception 'Buku tidak ditemukan' using errcode = '22023'; end if;
  if not exists (select 1 from public.eksemplar where buku_id = p_buku and status in ('tersedia', 'dipinjam')) then
    raise exception 'Buku ini tidak memiliki eksemplar yang bisa dipinjam' using errcode = '22023';
  end if;
  if exists (select 1 from public.reservasi_buku where buku_id = p_buku and status in ('menunggu', 'siap') and (siswa_id = sid or pegawai_id = pid)) then
    raise exception 'Anda sudah memesan buku ini' using errcode = '22023';
  end if;
  if (select count(*) from public.reservasi_buku where status in ('menunggu', 'siap') and (siswa_id = sid or pegawai_id = pid)) >= 2 then
    raise exception 'Maksimal 2 pesanan aktif' using errcode = '22023';
  end if;
  if exists (select 1 from public.pinjaman_buku p join public.eksemplar e on e.id = p.eksemplar_id
              where e.buku_id = p_buku and p.kembali_pada is null and (p.siswa_id = sid or p.pegawai_id = pid)) then
    raise exception 'Anda sedang meminjam buku ini' using errcode = '22023';
  end if;
  insert into public.reservasi_buku (buku_id, siswa_id, pegawai_id) values (p_buku, sid, pid) returning id into nid;
  perform public._proses_reservasi(p_buku);
  select status into st from public.reservasi_buku where id = nid;
  return st;
end $$;

create or replace function public.batal_pesan(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare r public.reservasi_buku;
begin
  select * into r from public.reservasi_buku where id = p_id for update;
  if r.id is null or r.status not in ('menunggu', 'siap') then raise exception 'Pesanan tidak aktif' using errcode = '22023'; end if;
  if not (public.punya_izin('perpus.kelola') or (r.siswa_id is not null and public.diri_atau_anak(r.siswa_id))
          or (r.pegawai_id is not null and r.pegawai_id = public.pegawai_saya())) then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  update public.reservasi_buku set status = 'batal' where id = p_id;
  perform public._proses_reservasi(r.buku_id);
end $$;

-- penjadwal harian: pesanan siap yang tidak diambil → kedaluwarsa, eksemplar diteruskan ke antrean berikutnya
create or replace function public.rapikan_reservasi() returns int language plpgsql security definer set search_path = '' as $$
declare b uuid; n int := 0;
begin
  for b in update public.reservasi_buku set status = 'kedaluwarsa'
            where status = 'siap' and batas_ambil < (now() at time zone 'Asia/Jakarta')::date returning buku_id loop
    perform public._proses_reservasi(b); n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.rapikan_reservasi() from public, anon, authenticated;
grant execute on function public.rapikan_reservasi() to service_role;

create or replace function public.daftar_reservasi()
returns table (id uuid, judul text, pemesan text, kelas text, status text, kode text, batas_ambil date, dibuat timestamptz, antrean int)
language sql stable security definer set search_path = '' as $$
  select r.id, b.judul, coalesce(s.nama, g.nama, '—'),
         coalesce((select k.nama from public.anggota_kelas ak join public.kelas k on k.id = ak.kelas_id
                    join public.tahun_ajaran t on t.id = ak.tahun_ajaran_id and t.aktif where ak.siswa_id = s.id limit 1), case when g.id is not null then 'Guru/Staf' end, ''),
         r.status, e.kode, r.batas_ambil, r.created_at,
         (select count(*)::int from public.reservasi_buku x where x.buku_id = r.buku_id and x.status = 'menunggu' and x.created_at <= r.created_at)
  from public.reservasi_buku r join public.buku b on b.id = r.buku_id left join public.eksemplar e on e.id = r.eksemplar_id
  left join public.siswa s on s.id = r.siswa_id left join public.pegawai g on g.id = r.pegawai_id
  where (public.punya_izin('perpus.kelola') or public.punya_izin('perpus.lihat')) and r.status in ('menunggu', 'siap')
  order by r.status desc, r.created_at;
$$;

-- jurnal baca siswa (diperiksa pembina literasi)
create table if not exists public.jurnal_baca (
  id               uuid primary key default gen_random_uuid(),
  siswa_id         uuid not null references public.siswa (id),
  buku_id          uuid references public.buku (id),
  judul            text not null check (char_length(judul) between 1 and 250),
  pengarang        text not null default '' check (char_length(pengarang) <= 250),
  tanggal          date not null default ((now() at time zone 'Asia/Jakarta')::date),
  halaman          smallint not null default 0 check (halaman between 0 and 2000),
  menit            smallint not null default 0 check (menit between 0 and 600),
  ringkasan        text not null check (char_length(ringkasan) between 30 and 3000),
  status           text not null default 'diajukan' check (status in ('diajukan', 'disetujui', 'revisi')),
  catatan_pembina  text not null default '' check (char_length(catatan_pembina) <= 500),
  diperiksa_oleh   uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint jurnal_isi check (halaman > 0 or menit > 0)
);
create index if not exists jurnal_baca_siswa on public.jurnal_baca (siswa_id, tanggal desc);
create index if not exists jurnal_baca_status on public.jurnal_baca (status) where status = 'diajukan';
create or replace function public.jaga_jurnal() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.siswa_id is distinct from public.siswa_login() then raise exception 'Jurnal baca diisi oleh siswa sendiri' using errcode = '42501'; end if;
    new.status := 'diajukan'; new.catatan_pembina := ''; new.diperiksa_oleh := null;
    if new.tanggal > (now() at time zone 'Asia/Jakarta')::date then raise exception 'Tanggal tidak boleh di masa depan' using errcode = '22023'; end if;
    return new;
  end if;
  new.siswa_id := old.siswa_id; new.created_at := old.created_at; new.updated_at := now();
  if public.punya_izin('perpus.kelola') or public.punya_izin('literasi.kelola') then
    -- pembina hanya memeriksa, tidak mengubah isi
    new.buku_id := old.buku_id; new.judul := old.judul; new.pengarang := old.pengarang; new.tanggal := old.tanggal;
    new.halaman := old.halaman; new.menit := old.menit; new.ringkasan := old.ringkasan; new.diperiksa_oleh := auth.uid();
  else
    if old.status = 'disetujui' then raise exception 'Jurnal yang sudah disetujui tidak dapat diubah' using errcode = '22023'; end if;
    new.status := 'diajukan'; new.catatan_pembina := old.catatan_pembina; new.diperiksa_oleh := old.diperiksa_oleh;
  end if;
  return new;
end $$;
drop trigger if exists jaga_jurnal on public.jurnal_baca;
create trigger jaga_jurnal before insert or update on public.jurnal_baca for each row execute function public.jaga_jurnal();
create or replace function public.notif_jurnal() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status <> old.status and new.status in ('disetujui', 'revisi') then
    perform public.kirim_notif((select user_id from public.siswa where id = new.siswa_id), 'perpus',
      case when new.status = 'disetujui' then 'Jurnal baca disetujui' else 'Jurnal baca perlu diperbaiki' end,
      new.judul || coalesce(' — ' || nullif(new.catatan_pembina, ''), ''), '/portal/perpus#jurnal', 'biasa', false);
  end if;
  return null;
end $$;
drop trigger if exists notif_jurnal on public.jurnal_baca;
create trigger notif_jurnal after update on public.jurnal_baca for each row execute function public.notif_jurnal();

-- tantangan literasi (dihitung dari jurnal baca yang disetujui)
create table if not exists public.tantangan_literasi (
  id           uuid primary key default gen_random_uuid(),
  judul        text not null check (char_length(judul) between 3 and 150),
  deskripsi    text not null default '' check (char_length(deskripsi) <= 2000),
  mulai        date not null,
  selesai      date not null,
  target_buku  smallint not null default 0 check (target_buku between 0 and 100),
  target_menit int not null default 0 check (target_menit between 0 and 100000),
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint tantangan_rentang check (selesai >= mulai),
  constraint tantangan_target check (target_buku > 0 or target_menit > 0)
);
create or replace function public.progres_literasi(p_tantangan uuid)
returns table (siswa_id uuid, nama text, kelas text, buku int, menit int, tuntas boolean)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare t public.tantangan_literasi;
begin
  if not (public.punya_izin('perpus.kelola') or public.punya_izin('literasi.kelola') or public.punya_izin('perpus.lihat')) then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  select * into t from public.tantangan_literasi where id = p_tantangan;
  return query
    select s.id, s.nama, coalesce(k.nama, ''), count(distinct lower(j.judul))::int, coalesce(sum(j.menit), 0)::int,
           (t.target_buku = 0 or count(distinct lower(j.judul)) >= t.target_buku) and (t.target_menit = 0 or coalesce(sum(j.menit), 0) >= t.target_menit)
    from public.jurnal_baca j join public.siswa s on s.id = j.siswa_id
    left join public.anggota_kelas ak on ak.siswa_id = s.id and ak.tahun_ajaran_id = (select id from public.tahun_ajaran where aktif limit 1)
    left join public.kelas k on k.id = ak.kelas_id
    where j.status = 'disetujui' and j.tanggal between t.mulai and t.selesai
    group by s.id, s.nama, k.nama order by 6 desc, 4 desc, 5 desc, s.nama;
end $$;
-- progres tantangan untuk siswa sendiri / anak (portal)
create or replace function public.tantangan_saya()
returns table (id uuid, judul text, deskripsi text, mulai date, selesai date, target_buku smallint, target_menit int, siswa_id uuid, nama text, buku int, menit int)
language sql stable security definer set search_path = '' as $$
  select t.id, t.judul, t.deskripsi, t.mulai, t.selesai, t.target_buku, t.target_menit, s.id, s.nama,
         (select count(distinct lower(j.judul))::int from public.jurnal_baca j where j.siswa_id = s.id and j.status = 'disetujui' and j.tanggal between t.mulai and t.selesai),
         (select coalesce(sum(j.menit), 0)::int from public.jurnal_baca j where j.siswa_id = s.id and j.status = 'disetujui' and j.tanggal between t.mulai and t.selesai)
  from public.tantangan_literasi t cross join public.siswa s
  where t.deleted_at is null and t.selesai >= (now() at time zone 'Asia/Jakarta')::date - 14 and s.deleted_at is null and public.diri_atau_anak(s.id)
  order by t.selesai, s.nama;
$$;

-- ulasan & rating buku (tampil setelah dimoderasi; di website tanpa nama)
create table if not exists public.ulasan_buku (
  id         uuid primary key default gen_random_uuid(),
  buku_id    uuid not null references public.buku (id),
  siswa_id   uuid references public.siswa (id),
  pegawai_id uuid references public.pegawai (id),
  rating     smallint not null check (rating between 1 and 5),
  isi        text not null check (char_length(isi) between 10 and 1000),
  status     text not null default 'menunggu' check (status in ('menunggu', 'tampil', 'ditolak')),
  created_at timestamptz not null default now(),
  constraint ulasan_penulis check ((siswa_id is null) <> (pegawai_id is null))
);
create unique index if not exists ulasan_unik on public.ulasan_buku (buku_id, coalesce(siswa_id, pegawai_id));
create index if not exists ulasan_menunggu on public.ulasan_buku (created_at) where status = 'menunggu';
create or replace function public.ulas_buku(p_buku uuid, p_rating int, p_isi text) returns void language plpgsql security definer set search_path = '' as $$
declare sid uuid := public.siswa_login(); pid uuid;
begin
  if sid is null then pid := public.pegawai_saya(); end if;
  if sid is null and pid is null then raise exception 'Ulasan hanya untuk siswa dan guru/staf' using errcode = '42501'; end if;
  if not exists (select 1 from public.buku where id = p_buku and deleted_at is null) then raise exception 'Buku tidak ditemukan' using errcode = '22023'; end if;
  if p_rating not between 1 and 5 or char_length(trim(coalesce(p_isi, ''))) not between 10 and 1000 then
    raise exception 'Beri bintang 1–5 dan ulasan 10–1000 karakter' using errcode = '22023';
  end if;
  insert into public.ulasan_buku (buku_id, siswa_id, pegawai_id, rating, isi) values (p_buku, sid, pid, p_rating, trim(p_isi))
  on conflict (buku_id, coalesce(siswa_id, pegawai_id)) do update set rating = excluded.rating, isi = excluded.isi, status = 'menunggu', created_at = now();
end $$;
create or replace function public.ulasan_publik(p_buku uuid)
returns table (rating smallint, isi text, penulis text, dibuat timestamptz)
language sql stable security definer set search_path = '' as $$
  select u.rating, u.isi, case when u.siswa_id is not null then 'Siswa' else 'Guru/Staf' end, u.created_at
  from public.ulasan_buku u where u.buku_id = p_buku and u.status = 'tampil' order by u.created_at desc limit 20;
$$;
create or replace function public.daftar_ulasan(p_status text default 'menunggu')
returns table (id uuid, buku_id uuid, judul text, penulis text, kelas text, rating smallint, isi text, status text, dibuat timestamptz)
language sql stable security definer set search_path = '' as $$
  select u.id, u.buku_id, b.judul, coalesce(s.nama, g.nama, '—'),
         coalesce((select k.nama from public.anggota_kelas ak join public.kelas k on k.id = ak.kelas_id
                    join public.tahun_ajaran t on t.id = ak.tahun_ajaran_id and t.aktif where ak.siswa_id = s.id limit 1), case when g.id is not null then 'Guru/Staf' end, ''),
         u.rating, u.isi, u.status, u.created_at
  from public.ulasan_buku u join public.buku b on b.id = u.buku_id left join public.siswa s on s.id = u.siswa_id left join public.pegawai g on g.id = u.pegawai_id
  where (public.punya_izin('perpus.kelola') or public.punya_izin('literasi.kelola')) and u.status = p_status
  order by u.created_at desc limit 200;
$$;
-- jurnal untuk pembina (nama & kelas tanpa membuka data induk)
create or replace function public.daftar_jurnal(p_status text default 'diajukan', p_batas int default 200)
returns table (id uuid, siswa text, kelas text, judul text, pengarang text, tanggal date, halaman smallint, menit smallint, ringkasan text, status text, catatan_pembina text)
language sql stable security definer set search_path = '' as $$
  select j.id, s.nama, coalesce((select k.nama from public.anggota_kelas ak join public.kelas k on k.id = ak.kelas_id
                    join public.tahun_ajaran t on t.id = ak.tahun_ajaran_id and t.aktif where ak.siswa_id = s.id limit 1), ''),
         j.judul, j.pengarang, j.tanggal, j.halaman, j.menit, j.ringkasan, j.status, j.catatan_pembina
  from public.jurnal_baca j join public.siswa s on s.id = j.siswa_id
  where (public.punya_izin('perpus.kelola') or public.punya_izin('literasi.kelola')) and (p_status = 'semua' or j.status = p_status)
  order by j.created_at desc limit least(greatest(p_batas, 1), 500);
$$;

create table if not exists public.duta_literasi (
  id              uuid primary key default gen_random_uuid(),
  siswa_id        uuid not null references public.siswa (id),
  tahun_ajaran_id uuid not null references public.tahun_ajaran (id),
  peran           text not null default 'Duta Literasi' check (char_length(peran) between 2 and 60),
  created_at      timestamptz not null default now(),
  unique (siswa_id, tahun_ajaran_id)
);
create or replace function public.tetapkan_duta(p_nisn text, p_peran text default 'Duta Literasi') returns text language plpgsql security definer set search_path = '' as $$
declare s record; ta uuid := (select id from public.tahun_ajaran where aktif limit 1);
begin
  if not (public.punya_izin('perpus.kelola') or public.punya_izin('literasi.kelola')) then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  select id, nama into s from public.siswa where nisn = trim(p_nisn) and deleted_at is null;
  if s.id is null then raise exception 'Siswa dengan NISN % tidak ditemukan', p_nisn using errcode = '22023'; end if;
  insert into public.duta_literasi (siswa_id, tahun_ajaran_id, peran) values (s.id, ta, coalesce(nullif(trim(p_peran), ''), 'Duta Literasi'))
  on conflict (siswa_id, tahun_ajaran_id) do update set peran = excluded.peran;
  return s.nama;
end $$;
create or replace function public.daftar_duta()
returns table (id uuid, nama text, kelas text, peran text)
language sql stable security definer set search_path = '' as $$
  select d.id, s.nama, coalesce((select k.nama from public.anggota_kelas ak join public.kelas k on k.id = ak.kelas_id where ak.siswa_id = s.id and ak.tahun_ajaran_id = d.tahun_ajaran_id limit 1), ''), d.peran
  from public.duta_literasi d join public.siswa s on s.id = d.siswa_id join public.tahun_ajaran t on t.id = d.tahun_ajaran_id and t.aktif
  where public.staf_aktif() or public.diri_atau_anak(d.siswa_id) order by s.nama;
$$;

-- katalog publik (OPAC): tanpa data peminjam; tautan digital berlisensi terbatas hanya untuk warga sekolah yang masuk
drop function if exists public.katalog_publik(text, int, int);
create or replace function public.katalog_publik(p_cari text default '', p_batas int default 30, p_lewati int default 0)
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
    and (coalesce(trim(p_cari), '') = '' or b.judul ilike '%' || trim(p_cari) || '%' or b.pengarang ilike '%' || trim(p_cari) || '%'
         or b.isbn = trim(p_cari) or b.kategori ilike '%' || trim(p_cari) || '%' or (trim(p_cari) = 'rekomendasi' and b.rekomendasi))
  order by b.rekomendasi desc, b.judul limit least(greatest(p_batas, 1), 60) offset greatest(p_lewati, 0);
$$;

-- detail satu buku untuk halaman publik
create or replace function public.buku_publik(p_id uuid)
returns table (id uuid, judul text, pengarang text, penerbit text, tahun smallint, isbn text, kategori text, nomor_panggil text, rak text, sinopsis text,
               sampul_url text, tautan_digital text, lisensi text, akses_digital text, rekomendasi boolean, tersedia int, total int, rating numeric, jumlah_ulasan int,
               lokasi text[])
language sql stable security definer set search_path = '' as $$
  select b.id, b.judul, b.pengarang, b.penerbit, b.tahun, b.isbn, b.kategori, b.nomor_panggil, b.rak, b.sinopsis, b.sampul_url,
         case when b.akses_digital = 'publik' or public.warga_aktif() then b.tautan_digital else '' end, b.lisensi, b.akses_digital, b.rekomendasi,
         (select count(*)::int from public.eksemplar e where e.buku_id = b.id and e.status = 'tersedia'
            and not exists (select 1 from public.reservasi_buku r where r.eksemplar_id = e.id and r.status = 'siap')),
         (select count(*)::int from public.eksemplar e where e.buku_id = b.id and e.status in ('tersedia', 'dipinjam')),
         (select round(avg(u.rating), 1) from public.ulasan_buku u where u.buku_id = b.id and u.status = 'tampil'),
         (select count(*)::int from public.ulasan_buku u where u.buku_id = b.id and u.status = 'tampil'),
         array(select distinct coalesce(pj.nama, 'Perpustakaan') from public.eksemplar e left join public.pojok_baca pj on pj.id = e.pojok_id
                where e.buku_id = b.id and e.status in ('tersedia', 'dipinjam') order by 1)
  from public.buku b where b.id = p_id and b.deleted_at is null and b.tampil_publik;
$$;
revoke all on function public.buku_publik(uuid) from public;
grant execute on function public.buku_publik(uuid) to anon, authenticated;

revoke all on function public.pesan_buku(uuid), public.batal_pesan(uuid), public.daftar_reservasi(), public.progres_literasi(uuid), public.tantangan_saya(),
  public.ulas_buku(uuid, int, text), public.daftar_ulasan(text), public.daftar_jurnal(text, int), public.tetapkan_duta(text, text), public.daftar_duta() from public, anon;
grant execute on function public.pesan_buku(uuid), public.batal_pesan(uuid), public.daftar_reservasi(), public.progres_literasi(uuid), public.tantangan_saya(),
  public.ulas_buku(uuid, int, text), public.daftar_ulasan(text), public.daftar_jurnal(text, int), public.tetapkan_duta(text, text), public.daftar_duta() to authenticated;
revoke all on function public.katalog_publik(text, int, int), public.ulasan_publik(uuid) from public;
grant execute on function public.katalog_publik(text, int, int), public.ulasan_publik(uuid) to anon, authenticated;

-- =====================================================================
-- D. Humas lanjutan: riwayat tanggapan, penilaian layanan, kegiatan kemitraan, kontak media, survei, dasbor agregat
-- =====================================================================
create table if not exists public.riwayat_pengaduan (
  id           bigint generated always as identity primary key,
  pengaduan_id uuid not null references public.pengaduan (id),
  status       text not null,
  tanggapan    text not null default '',
  internal     text not null default '',
  pic_id       uuid,
  oleh         uuid default auth.uid(),
  waktu        timestamptz not null default now()
);
create index if not exists riwayat_pengaduan_idx on public.riwayat_pengaduan (pengaduan_id, waktu);
create or replace function public.catat_riwayat_pengaduan() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status or new.tanggapan_publik is distinct from old.tanggapan_publik
     or new.catatan_internal is distinct from old.catatan_internal or new.pic_id is distinct from old.pic_id then
    insert into public.riwayat_pengaduan (pengaduan_id, status, tanggapan, internal, pic_id)
    values (new.id, new.status,
            case when new.tanggapan_publik is distinct from old.tanggapan_publik then new.tanggapan_publik else '' end,
            case when new.catatan_internal is distinct from old.catatan_internal then new.catatan_internal else '' end,
            case when new.pic_id is distinct from old.pic_id then new.pic_id end);
  end if;
  return null;
end $$;
drop trigger if exists riwayat_pengaduan on public.pengaduan;
create trigger riwayat_pengaduan after update on public.pengaduan for each row execute function public.catat_riwayat_pengaduan();

-- penilaian layanan oleh pelapor: lewat tiket + kode (anonim) atau akun pelapor
create or replace function public.nilai_pengaduan(p_tiket text, p_kode text, p_rating int, p_komentar text default '')
returns boolean language plpgsql security definer set search_path = '' as $$
declare pid uuid;
begin
  if p_rating not between 1 and 5 then raise exception 'Pilih 1–5 bintang' using errcode = '22023'; end if;
  select id into pid from public.pengaduan
   where status in ('selesai', 'ditolak') and rating is null
     and ((p_tiket is not null and tiket = upper(trim(p_tiket))
           and kode_hash = encode(extensions.digest(convert_to(upper(trim(coalesce(p_kode, ''))), 'UTF8'), 'sha256'), 'hex'))
          );
  if pid is null then return false; end if;
  perform set_config('app.rating', '1', true);
  update public.pengaduan set rating = p_rating, komentar_rating = left(trim(coalesce(p_komentar, '')), 500) where id = pid;
  perform set_config('app.rating', '0', true);
  return true;
end $$;
create or replace function public.nilai_pengaduan_saya(p_id uuid, p_rating int, p_komentar text default '')
returns boolean language plpgsql security definer set search_path = '' as $$
declare pid uuid;
begin
  if p_rating not between 1 and 5 then raise exception 'Pilih 1–5 bintang' using errcode = '22023'; end if;
  select id into pid from public.pengaduan where id = p_id and pelapor_id = auth.uid() and status in ('selesai', 'ditolak') and rating is null;
  if pid is null then return false; end if;
  perform set_config('app.rating', '1', true);
  update public.pengaduan set rating = p_rating, komentar_rating = left(trim(coalesce(p_komentar, '')), 500) where id = pid;
  perform set_config('app.rating', '0', true);
  return true;
end $$;
revoke all on function public.nilai_pengaduan(text, text, int, text), public.nilai_pengaduan_saya(uuid, int, text) from public;
grant execute on function public.nilai_pengaduan(text, text, int, text) to anon, authenticated;
grant execute on function public.nilai_pengaduan_saya(uuid, int, text) to authenticated;

create table if not exists public.kegiatan_mitra (
  id                 uuid primary key default gen_random_uuid(),
  kemitraan_id       uuid not null references public.kemitraan (id),
  tanggal            date not null,
  kegiatan           text not null check (char_length(kegiatan) between 3 and 300),
  hasil              text not null default '' check (char_length(hasil) <= 2000),
  nilai              smallint check (nilai between 1 and 5),
  tautan_dokumentasi text not null default '' check (tautan_dokumentasi = '' or tautan_dokumentasi ~ '^https://'),
  dicatat_oleh       uuid default auth.uid(),
  created_at         timestamptz not null default now()
);
create index if not exists kegiatan_mitra_idx on public.kegiatan_mitra (kemitraan_id, tanggal desc);
alter table public.kemitraan add column if not exists evaluasi text not null default '' check (char_length(evaluasi) <= 2000);

create table if not exists public.kontak_media (
  id         uuid primary key default gen_random_uuid(),
  nama       text not null check (char_length(nama) between 2 and 120),
  media      text not null default '' check (char_length(media) <= 120),
  jenis      text not null default 'online' check (jenis in ('cetak', 'online', 'televisi', 'radio', 'humas_pemerintah', 'lainnya')),
  telepon    text not null default '' check (char_length(telepon) <= 30),
  email      text not null default '' check (char_length(email) <= 150),
  catatan    text not null default '' check (char_length(catatan) <= 500),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- survei kepuasan / aspirasi
create table if not exists public.survei (
  id          uuid primary key default gen_random_uuid(),
  judul       text not null check (char_length(judul) between 3 and 150),
  deskripsi   text not null default '' check (char_length(deskripsi) <= 2000),
  sasaran     text not null default 'publik' check (sasaran in ('publik', 'warga', 'siswa', 'ortu', 'pegawai')),
  pertanyaan  jsonb not null default '[]' check (jsonb_typeof(pertanyaan) = 'array' and jsonb_array_length(pertanyaan) <= 40),
  mulai       date not null default ((now() at time zone 'Asia/Jakarta')::date),
  selesai     date not null,
  terbit      boolean not null default false,
  dibuat_oleh uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint survei_rentang check (selesai >= mulai)
);
create table if not exists public.jawaban_survei (
  id        uuid primary key default gen_random_uuid(),
  survei_id uuid not null references public.survei (id),
  user_id   uuid,
  ip_hash   text not null default '',
  peran     text not null default 'publik',
  jawaban   jsonb not null,
  created_at timestamptz not null default now()
);
create unique index if not exists jawaban_survei_unik on public.jawaban_survei (survei_id, user_id) where user_id is not null;
create index if not exists jawaban_survei_idx on public.jawaban_survei (survei_id, created_at);
-- survei yang terkunci setelah ada jawaban: pertanyaan tidak boleh diubah
create or replace function public.jaga_survei() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.pertanyaan is distinct from old.pertanyaan and exists (select 1 from public.jawaban_survei where survei_id = old.id) then
    raise exception 'Pertanyaan tidak dapat diubah setelah ada jawaban' using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists jaga_survei on public.survei;
create trigger jaga_survei before update on public.survei for each row execute function public.jaga_survei();

create or replace function public._peran_survei() returns text language sql stable security definer set search_path = '' as $$
  select case when auth.uid() is null then 'publik'
              when public.siswa_login() is not null then 'siswa'
              when public.punya_peran('orang_tua') then 'ortu'
              when public.staf_aktif() then 'pegawai'
              else 'publik' end;
$$;
create or replace function public.survei_aktif()
returns table (id uuid, judul text, deskripsi text, sasaran text, selesai date, sudah boolean)
language sql stable security definer set search_path = '' as $$
  select s.id, s.judul, s.deskripsi, s.sasaran, s.selesai,
         auth.uid() is not null and exists (select 1 from public.jawaban_survei j where j.survei_id = s.id and j.user_id = auth.uid())
  from public.survei s
  where s.deleted_at is null and s.terbit and (now() at time zone 'Asia/Jakarta')::date between s.mulai and s.selesai
    and (s.sasaran = 'publik' or (s.sasaran = 'warga' and auth.uid() is not null) or s.sasaran = public._peran_survei())
  order by s.selesai;
$$;
create or replace function public.ambil_survei(p_id uuid)
returns table (id uuid, judul text, deskripsi text, sasaran text, pertanyaan jsonb, selesai date, sudah boolean)
language sql stable security definer set search_path = '' as $$
  select s.id, s.judul, s.deskripsi, s.sasaran, s.pertanyaan, s.selesai,
         auth.uid() is not null and exists (select 1 from public.jawaban_survei j where j.survei_id = s.id and j.user_id = auth.uid())
  from public.survei s
  where s.id = p_id and s.deleted_at is null and s.terbit and (now() at time zone 'Asia/Jakarta')::date between s.mulai and s.selesai;
$$;
create or replace function public.isi_survei(p_id uuid, p_jawaban jsonb, p_ip_hash text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare s public.survei; q jsonb; v jsonb; bersih jsonb := '{}'; peran text := public._peran_survei();
begin
  select * into s from public.survei where id = p_id and deleted_at is null and terbit
     and (now() at time zone 'Asia/Jakarta')::date between mulai and selesai;
  if s.id is null then raise exception 'Survei tidak ditemukan atau sudah ditutup' using errcode = '22023'; end if;
  if s.sasaran <> 'publik' and auth.uid() is null then raise exception 'Masuk dulu untuk mengisi survei ini' using errcode = '42501'; end if;
  if s.sasaran not in ('publik', 'warga') and s.sasaran <> peran then raise exception 'Survei ini bukan untuk Anda' using errcode = '42501'; end if;
  if auth.uid() is not null and exists (select 1 from public.jawaban_survei where survei_id = p_id and user_id = auth.uid()) then
    raise exception 'Anda sudah mengisi survei ini. Terima kasih!' using errcode = '22023';
  end if;
  if auth.uid() is null and coalesce(p_ip_hash, '') <> ''
     and (select count(*) from public.jawaban_survei where survei_id = p_id and ip_hash = p_ip_hash and created_at > now() - interval '1 day') >= 3 then
    raise exception 'Terlalu banyak jawaban dari perangkat ini' using errcode = '22023';
  end if;
  if (select count(*) from public.jawaban_survei where survei_id = p_id and created_at > now() - interval '1 hour') >= 500 then
    raise exception 'Survei sedang ramai, coba lagi nanti' using errcode = '22023';
  end if;
  if jsonb_typeof(p_jawaban) <> 'object' then raise exception 'Format jawaban tidak valid' using errcode = '22023'; end if;
  for q in select * from jsonb_array_elements(s.pertanyaan) loop
    v := p_jawaban -> (q ->> 'id');
    if v is null or v = 'null'::jsonb or v = '""'::jsonb then
      if coalesce((q ->> 'wajib')::boolean, true) then raise exception 'Jawab pertanyaan: %', q ->> 'teks' using errcode = '22023'; end if;
      continue;
    end if;
    if q ->> 'jenis' = 'skala' then
      if jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric not in (1, 2, 3, 4, 5) then raise exception 'Nilai skala tidak valid' using errcode = '22023'; end if;
    elsif q ->> 'jenis' = 'pilihan' then
      if jsonb_typeof(v) <> 'string' or not ((q -> 'pilihan') ? (v #>> '{}')) then raise exception 'Pilihan tidak valid' using errcode = '22023'; end if;
    else
      if jsonb_typeof(v) <> 'string' then raise exception 'Jawaban tidak valid' using errcode = '22023'; end if;
      v := to_jsonb(left(trim(v #>> '{}'), 1000));
    end if;
    bersih := bersih || jsonb_build_object(q ->> 'id', v);
  end loop;
  insert into public.jawaban_survei (survei_id, user_id, ip_hash, peran, jawaban)
  values (p_id, auth.uid(), left(coalesce(p_ip_hash, ''), 64), peran, bersih);
end $$;
-- hasil agregat (tanpa identitas responden)
create or replace function public.hasil_survei(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s public.survei; q jsonb; hasil jsonb := '[]'; per_peran jsonb;
begin
  if not public.punya_izin('humas.kelola') then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  select * into s from public.survei where id = p_id;
  for q in select * from jsonb_array_elements(s.pertanyaan) loop
    hasil := hasil || jsonb_build_array(q || jsonb_build_object(
      'n', (select count(*) from public.jawaban_survei j where j.survei_id = p_id and j.jawaban ? (q ->> 'id')),
      'rata', case when q ->> 'jenis' = 'skala' then (select round(avg((j.jawaban ->> (q ->> 'id'))::numeric), 2) from public.jawaban_survei j where j.survei_id = p_id and j.jawaban ? (q ->> 'id')) end,
      'sebaran', case when q ->> 'jenis' in ('skala', 'pilihan') then
          (select coalesce(jsonb_object_agg(x.v, x.n), '{}') from (select j.jawaban ->> (q ->> 'id') v, count(*) n from public.jawaban_survei j
             where j.survei_id = p_id and j.jawaban ? (q ->> 'id') group by 1) x) end,
      'jawaban_teks', case when q ->> 'jenis' = 'teks' then
          (select coalesce(jsonb_agg(x.t), '[]') from (select j.jawaban ->> (q ->> 'id') t from public.jawaban_survei j
             where j.survei_id = p_id and coalesce(j.jawaban ->> (q ->> 'id'), '') <> '' order by j.created_at desc limit 100) x) end));
  end loop;
  select coalesce(jsonb_object_agg(peran, n), '{}') into per_peran from (select peran, count(*) n from public.jawaban_survei where survei_id = p_id group by peran) x;
  return jsonb_build_object('responden', (select count(*) from public.jawaban_survei where survei_id = p_id), 'per_peran', per_peran, 'pertanyaan', hasil);
end $$;
revoke all on function public._peran_survei(), public.survei_aktif(), public.ambil_survei(uuid), public.isi_survei(uuid, jsonb, text), public.hasil_survei(uuid) from public;
grant execute on function public.survei_aktif(), public.ambil_survei(uuid), public.isi_survei(uuid, jsonb, text) to anon, authenticated;
grant execute on function public.hasil_survei(uuid) to authenticated;

-- dasbor humas: hanya angka agregat (pengaduan rahasia dihitung tanpa isi)
create or replace function public.statistik_humas(p_dari date, p_sampai date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare hari date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if not (public.punya_izin('humas.kelola') or public.punya_izin('pengaduan.kelola') or public.punya_izin('pengaduan.rahasia')) then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'masuk', (select count(*) from public.pengaduan where (created_at at time zone 'Asia/Jakarta')::date between p_dari and p_sampai),
    'rahasia', (select count(*) from public.pengaduan where rahasia and (created_at at time zone 'Asia/Jakarta')::date between p_dari and p_sampai),
    'aktif', (select count(*) from public.pengaduan where status in ('baru', 'diproses')),
    'lewat_tenggat', (select count(*) from public.pengaduan where status in ('baru', 'diproses') and tenggat < hari),
    'per_status', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from public.pengaduan
                    where (created_at at time zone 'Asia/Jakarta')::date between p_dari and p_sampai group by status) x),
    'per_kategori', (select coalesce(jsonb_object_agg(kategori, n), '{}') from (select kategori, count(*) n from public.pengaduan
                    where (created_at at time zone 'Asia/Jakarta')::date between p_dari and p_sampai group by kategori) x),
    'tepat_waktu', (select round(100.0 * count(*) filter (where (selesai_pada at time zone 'Asia/Jakarta')::date <= tenggat) / nullif(count(*), 0))
                    from public.pengaduan where selesai_pada is not null and (selesai_pada at time zone 'Asia/Jakarta')::date between p_dari and p_sampai),
    'rata_hari', (select round(avg(extract(epoch from selesai_pada - created_at) / 86400)::numeric, 1)
                    from public.pengaduan where selesai_pada is not null and (selesai_pada at time zone 'Asia/Jakarta')::date between p_dari and p_sampai),
    'rating', (select round(avg(rating), 2) from public.pengaduan where rating is not null and (selesai_pada at time zone 'Asia/Jakarta')::date between p_dari and p_sampai),
    'jumlah_rating', (select count(*) from public.pengaduan where rating is not null and (selesai_pada at time zone 'Asia/Jakarta')::date between p_dari and p_sampai),
    'mitra_aktif', (select count(*) from public.kemitraan where deleted_at is null and (berakhir is null or berakhir >= hari)),
    'mitra_segera', (select count(*) from public.kemitraan where deleted_at is null and berakhir between hari and hari + 30),
    'kegiatan_mitra', (select count(*) from public.kegiatan_mitra where tanggal between p_dari and p_sampai),
    'tamu', (select coalesce(sum(jumlah), 0) from public.buku_tamu where (masuk at time zone 'Asia/Jakarta')::date between p_dari and p_sampai),
    'survei_aktif', (select count(*) from public.survei where deleted_at is null and terbit and hari between mulai and selesai),
    'responden', (select count(*) from public.jawaban_survei where (created_at at time zone 'Asia/Jakarta')::date between p_dari and p_sampai)
  );
end $$;
revoke all on function public.statistik_humas(date, date) from public, anon;
grant execute on function public.statistik_humas(date, date) to authenticated;

-- =====================================================================
-- RLS
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['pengaturan_perpus', 'buku', 'eksemplar', 'pinjaman_buku', 'kunjungan_perpus', 'pengaduan', 'kemitraan', 'buku_tamu'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke truncate on public.%I from authenticated', t);
    if t not in ('kunjungan_perpus') then
      execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
      execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.catat_audit()', t);
    end if;
  end loop;
end $$;

drop policy if exists "baca pengaturan perpus" on public.pengaturan_perpus;
create policy "baca pengaturan perpus" on public.pengaturan_perpus for select to authenticated using (true);
drop policy if exists "ubah pengaturan perpus" on public.pengaturan_perpus;
create policy "ubah pengaturan perpus" on public.pengaturan_perpus for update to authenticated
  using ((select public.punya_izin('perpus.kelola'))) with check ((select public.punya_izin('perpus.kelola')));
revoke insert, delete on public.pengaturan_perpus from authenticated;

drop policy if exists "baca buku" on public.buku;
create policy "baca buku" on public.buku for select to authenticated using (deleted_at is null or (select public.punya_izin('perpus.kelola')));
drop policy if exists "kelola buku" on public.buku;
create policy "kelola buku" on public.buku for all to authenticated
  using ((select public.punya_izin('perpus.kelola'))) with check ((select public.punya_izin('perpus.kelola')));
revoke delete on public.buku from authenticated;
drop policy if exists "baca eksemplar" on public.eksemplar;
create policy "baca eksemplar" on public.eksemplar for select to authenticated using (true);
drop policy if exists "kelola eksemplar" on public.eksemplar;
create policy "kelola eksemplar" on public.eksemplar for all to authenticated
  using ((select public.punya_izin('perpus.kelola'))) with check ((select public.punya_izin('perpus.kelola')));
revoke delete on public.eksemplar from authenticated;

drop policy if exists "baca pinjaman buku" on public.pinjaman_buku;
create policy "baca pinjaman buku" on public.pinjaman_buku for select to authenticated
  using ((select public.punya_izin('perpus.kelola')) or (select public.punya_izin('perpus.lihat'))
         or (siswa_id is not null and public.diri_atau_anak(siswa_id)) or (pegawai_id is not null and pegawai_id = (select public.pegawai_saya())));
drop policy if exists "lunasi denda" on public.pinjaman_buku;
create policy "lunasi denda" on public.pinjaman_buku for update to authenticated
  using ((select public.punya_izin('perpus.kelola'))) with check ((select public.punya_izin('perpus.kelola')));
revoke insert, delete on public.pinjaman_buku from authenticated;

drop policy if exists "kelola kunjungan" on public.kunjungan_perpus;
create policy "kelola kunjungan" on public.kunjungan_perpus for all to authenticated
  using ((select public.punya_izin('perpus.kelola')) or (select public.punya_izin('perpus.lihat')))
  with check ((select public.punya_izin('perpus.kelola')));

drop policy if exists "baca pengaduan" on public.pengaduan;
create policy "baca pengaduan" on public.pengaduan for select to authenticated using (public.boleh_pengaduan(rahasia, pic_id));
drop policy if exists "proses pengaduan" on public.pengaduan;
create policy "proses pengaduan" on public.pengaduan for update to authenticated
  using (public.boleh_pengaduan(rahasia, pic_id)) with check (public.boleh_pengaduan(rahasia, pic_id) or public.punya_izin('pengaduan.kelola'));
revoke insert, delete on public.pengaduan from authenticated;

drop policy if exists "baca kemitraan" on public.kemitraan;
create policy "baca kemitraan" on public.kemitraan for select to authenticated using ((select public.staf_aktif()));
drop policy if exists "kelola kemitraan" on public.kemitraan;
create policy "kelola kemitraan" on public.kemitraan for all to authenticated
  using ((select public.punya_izin('humas.kelola'))) with check ((select public.punya_izin('humas.kelola')));
revoke delete on public.kemitraan from authenticated;

drop policy if exists "baca buku tamu" on public.buku_tamu;
create policy "baca buku tamu" on public.buku_tamu for select to authenticated
  using ((select public.punya_izin('tamu.catat')) or (select public.punya_izin('humas.kelola')) or bertemu_id = (select public.pegawai_saya()));
drop policy if exists "catat buku tamu" on public.buku_tamu;
create policy "catat buku tamu" on public.buku_tamu for insert to authenticated with check ((select public.punya_izin('tamu.catat')));
drop policy if exists "ubah buku tamu" on public.buku_tamu;
create policy "ubah buku tamu" on public.buku_tamu for update to authenticated
  using ((select public.punya_izin('tamu.catat')) or bertemu_id = (select public.pegawai_saya()))
  with check ((select public.punya_izin('tamu.catat')) or bertemu_id = (select public.pegawai_saya()));
revoke delete on public.buku_tamu from authenticated;

-- RLS tabel lanjutan (C & D)
do $$
declare t text;
begin
  foreach t in array array['pojok_baca', 'kegiatan_pojok', 'reservasi_buku', 'jurnal_baca', 'tantangan_literasi', 'ulasan_buku', 'duta_literasi',
                           'sla_pengaduan', 'riwayat_pengaduan', 'kegiatan_mitra', 'kontak_media', 'survei', 'jawaban_survei'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke truncate on public.%I from authenticated', t);
    if t not in ('riwayat_pengaduan', 'jawaban_survei') then
      execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
      execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.catat_audit()', t);
    end if;
  end loop;
end $$;

drop policy if exists "baca pojok" on public.pojok_baca;
create policy "baca pojok" on public.pojok_baca for select to authenticated using (deleted_at is null and (select public.warga_aktif()));
drop policy if exists "kelola pojok" on public.pojok_baca;
create policy "kelola pojok" on public.pojok_baca for all to authenticated
  using ((select public.punya_izin('perpus.kelola')) or (select public.punya_izin('literasi.kelola')))
  with check ((select public.punya_izin('perpus.kelola')) or (select public.punya_izin('literasi.kelola')));
revoke delete on public.pojok_baca from authenticated;
drop policy if exists "baca kegiatan pojok" on public.kegiatan_pojok;
create policy "baca kegiatan pojok" on public.kegiatan_pojok for select to authenticated using ((select public.warga_aktif()));
drop policy if exists "catat kegiatan pojok" on public.kegiatan_pojok;
create policy "catat kegiatan pojok" on public.kegiatan_pojok for insert to authenticated with check (public.pj_pojok(pojok_id));
drop policy if exists "hapus kegiatan pojok" on public.kegiatan_pojok;
create policy "hapus kegiatan pojok" on public.kegiatan_pojok for delete to authenticated using (public.pj_pojok(pojok_id));

drop policy if exists "baca reservasi" on public.reservasi_buku;
create policy "baca reservasi" on public.reservasi_buku for select to authenticated
  using ((select public.punya_izin('perpus.kelola')) or (select public.punya_izin('perpus.lihat'))
         or (siswa_id is not null and public.diri_atau_anak(siswa_id)) or (pegawai_id is not null and pegawai_id = (select public.pegawai_saya())));
revoke insert, update, delete on public.reservasi_buku from authenticated;

drop policy if exists "baca jurnal" on public.jurnal_baca;
create policy "baca jurnal" on public.jurnal_baca for select to authenticated
  using (public.diri_atau_anak(siswa_id) or (select public.punya_izin('perpus.kelola')) or (select public.punya_izin('literasi.kelola')));
drop policy if exists "tulis jurnal" on public.jurnal_baca;
create policy "tulis jurnal" on public.jurnal_baca for insert to authenticated with check (siswa_id = (select public.siswa_login()));
drop policy if exists "ubah jurnal" on public.jurnal_baca;
create policy "ubah jurnal" on public.jurnal_baca for update to authenticated
  using (siswa_id = (select public.siswa_login()) or (select public.punya_izin('perpus.kelola')) or (select public.punya_izin('literasi.kelola')))
  with check (siswa_id = (select public.siswa_login()) or (select public.punya_izin('perpus.kelola')) or (select public.punya_izin('literasi.kelola')));
drop policy if exists "hapus jurnal" on public.jurnal_baca;
create policy "hapus jurnal" on public.jurnal_baca for delete to authenticated using (siswa_id = (select public.siswa_login()) and status <> 'disetujui');

drop policy if exists "baca tantangan" on public.tantangan_literasi;
create policy "baca tantangan" on public.tantangan_literasi for select to authenticated using (deleted_at is null and (select public.warga_aktif()));
drop policy if exists "kelola tantangan" on public.tantangan_literasi;
create policy "kelola tantangan" on public.tantangan_literasi for all to authenticated
  using ((select public.punya_izin('perpus.kelola')) or (select public.punya_izin('literasi.kelola')))
  with check ((select public.punya_izin('perpus.kelola')) or (select public.punya_izin('literasi.kelola')));
revoke delete on public.tantangan_literasi from authenticated;

drop policy if exists "baca ulasan" on public.ulasan_buku;
create policy "baca ulasan" on public.ulasan_buku for select to authenticated
  using (status = 'tampil' or (siswa_id is not null and public.diri_atau_anak(siswa_id)) or (pegawai_id is not null and pegawai_id = (select public.pegawai_saya()))
         or (select public.punya_izin('perpus.kelola')) or (select public.punya_izin('literasi.kelola')));
drop policy if exists "moderasi ulasan" on public.ulasan_buku;
create policy "moderasi ulasan" on public.ulasan_buku for update to authenticated
  using ((select public.punya_izin('perpus.kelola')) or (select public.punya_izin('literasi.kelola')))
  with check ((select public.punya_izin('perpus.kelola')) or (select public.punya_izin('literasi.kelola')));
revoke insert, delete on public.ulasan_buku from authenticated;
revoke update on public.ulasan_buku from authenticated;
grant update (status) on public.ulasan_buku to authenticated;

drop policy if exists "baca duta" on public.duta_literasi;
create policy "baca duta" on public.duta_literasi for select to authenticated using ((select public.staf_aktif()) or public.diri_atau_anak(siswa_id));
drop policy if exists "hapus duta" on public.duta_literasi;
create policy "hapus duta" on public.duta_literasi for delete to authenticated using ((select public.punya_izin('perpus.kelola')) or (select public.punya_izin('literasi.kelola')));
revoke insert, update on public.duta_literasi from authenticated;

drop policy if exists "baca sla" on public.sla_pengaduan;
create policy "baca sla" on public.sla_pengaduan for select to authenticated using ((select public.staf_aktif()));
drop policy if exists "ubah sla" on public.sla_pengaduan;
create policy "ubah sla" on public.sla_pengaduan for update to authenticated
  using ((select public.punya_izin('humas.kelola'))) with check ((select public.punya_izin('humas.kelola')));
revoke insert, delete on public.sla_pengaduan from authenticated;

drop policy if exists "baca riwayat pengaduan" on public.riwayat_pengaduan;
create policy "baca riwayat pengaduan" on public.riwayat_pengaduan for select to authenticated
  using (exists (select 1 from public.pengaduan p where p.id = pengaduan_id and public.boleh_pengaduan(p.rahasia, p.pic_id)));
revoke insert, update, delete on public.riwayat_pengaduan from authenticated;

drop policy if exists "baca kegiatan mitra" on public.kegiatan_mitra;
create policy "baca kegiatan mitra" on public.kegiatan_mitra for select to authenticated using ((select public.staf_aktif()));
drop policy if exists "kelola kegiatan mitra" on public.kegiatan_mitra;
create policy "kelola kegiatan mitra" on public.kegiatan_mitra for all to authenticated
  using ((select public.punya_izin('humas.kelola')) or exists (select 1 from public.kemitraan m where m.id = kemitraan_id and m.pic_id = (select public.pegawai_saya())))
  with check ((select public.punya_izin('humas.kelola')) or exists (select 1 from public.kemitraan m where m.id = kemitraan_id and m.pic_id = (select public.pegawai_saya())));

drop policy if exists "kelola kontak media" on public.kontak_media;
create policy "kelola kontak media" on public.kontak_media for all to authenticated
  using ((select public.punya_izin('humas.kelola'))) with check ((select public.punya_izin('humas.kelola')));
revoke delete on public.kontak_media from authenticated;

drop policy if exists "kelola survei" on public.survei;
create policy "kelola survei" on public.survei for all to authenticated
  using ((select public.punya_izin('humas.kelola'))) with check ((select public.punya_izin('humas.kelola')));
revoke delete on public.survei from authenticated;
-- jawaban survei hanya dibaca agregat lewat hasil_survei()
revoke all on public.jawaban_survei from authenticated;


notify pgrst, 'reload schema';
