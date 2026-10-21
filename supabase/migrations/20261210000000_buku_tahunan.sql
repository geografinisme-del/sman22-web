-- Fase 20: "buku tahunan yang hidup" — data CMS untuk beranda & Portal Digital 22.
--   * prestasi        : prestasi siswa publik (peringkat, lomba, siswa, tingkat, tanggal, foto opsional)
--   * spmb_info       : status & jadwal SPMB (blok SPMB tampil hanya bila aktif)
--   * portal_bidang   : penanggung jawab & foto per bidang Portal Digital 22
--   * profil_sekolah  : angka alumni diterima PTN
--   * is_placeholder  : penanda media sementara (ilustrasi) pada tabel berfoto
-- Tidak mengubah tabel operasional lain. Publik hanya membaca baris yang terbit/aktif.

-- ---------------------------------------------------------------------
-- 1. Prestasi (publik)
-- ---------------------------------------------------------------------
create table if not exists public.prestasi (
  id             uuid primary key default gen_random_uuid(),
  peringkat      text not null check (char_length(peringkat) between 1 and 40),
  nama_lomba     text not null check (char_length(nama_lomba) between 3 and 200),
  nama_siswa     text not null default '' check (char_length(nama_siswa) <= 200),
  tingkat        text not null check (tingkat in ('Sekolah', 'Kota', 'Provinsi', 'Nasional', 'Internasional')),
  tanggal        date not null default current_date,
  foto_url       text not null default '' check (foto_url = '' or foto_url ~ '^(https://|/|http://(localhost|127\.0\.0\.1)[:/])'),
  is_placeholder boolean not null default false,
  terbit         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index if not exists prestasi_tanggal on public.prestasi (tanggal desc) where deleted_at is null and terbit;

alter table public.prestasi enable row level security;
revoke all on public.prestasi from anon;
grant select on public.prestasi to anon;
grant select, insert, update on public.prestasi to authenticated;
revoke delete, truncate on public.prestasi from authenticated;
drop policy if exists "publik baca prestasi" on public.prestasi;
create policy "publik baca prestasi" on public.prestasi for select to anon, authenticated
  using (deleted_at is null and terbit);
drop policy if exists "pengelola baca semua prestasi" on public.prestasi;
create policy "pengelola baca semua prestasi" on public.prestasi for select to authenticated
  using ((select public.punya_izin('konten.kelola')));
drop policy if exists "pengelola tulis prestasi" on public.prestasi;
create policy "pengelola tulis prestasi" on public.prestasi for insert to authenticated
  with check ((select public.punya_izin('konten.kelola')));
drop policy if exists "pengelola ubah prestasi" on public.prestasi;
create policy "pengelola ubah prestasi" on public.prestasi for update to authenticated
  using ((select public.punya_izin('konten.kelola'))) with check ((select public.punya_izin('konten.kelola')));

-- ---------------------------------------------------------------------
-- 2. SPMB (satu baris)
-- ---------------------------------------------------------------------
create table if not exists public.spmb_info (
  id            smallint primary key default 1 check (id = 1),
  aktif         boolean not null default false,
  tahun         text not null default '' check (char_length(tahun) <= 20),
  judul         text not null default '' check (char_length(judul) <= 160),
  ringkasan     text not null default '' check (char_length(ringkasan) <= 400),
  -- [{ "langkah": "Pendaftaran tahap 1", "tanggal": "2027-06-02" | "" }], maks. 6 langkah
  jadwal        jsonb not null default '[]'::jsonb check (jsonb_typeof(jadwal) = 'array' and jsonb_array_length(jadwal) <= 6),
  tautan_jalur  text not null default '' check (tautan_jalur = '' or tautan_jalur ~ '^(https://|/[^/])'),
  tautan_tanya  text not null default '' check (tautan_tanya = '' or tautan_tanya ~ '^(https://|/[^/])'),
  updated_at    timestamptz not null default now()
);
insert into public.spmb_info (id) values (1) on conflict do nothing;
alter table public.spmb_info enable row level security;
revoke all on public.spmb_info from anon;
grant select on public.spmb_info to anon;
grant select, update on public.spmb_info to authenticated;
drop policy if exists "publik baca spmb" on public.spmb_info;
create policy "publik baca spmb" on public.spmb_info for select to anon, authenticated using (true);
drop policy if exists "pengelola ubah spmb" on public.spmb_info;
create policy "pengelola ubah spmb" on public.spmb_info for update to authenticated
  using ((select public.punya_izin('konten.kelola'))) with check ((select public.punya_izin('konten.kelola')));

-- ---------------------------------------------------------------------
-- 3. Penanggung jawab bidang Portal Digital 22
-- ---------------------------------------------------------------------
create table if not exists public.portal_bidang (
  kunci             text primary key check (kunci ~ '^[a-z_]{2,20}$'),
  penanggung_jawab  text not null default '' check (char_length(penanggung_jawab) <= 120),
  foto_url          text not null default '' check (foto_url = '' or foto_url ~ '^(https://|/|http://(localhost|127\.0\.0\.1)[:/])'),
  is_placeholder    boolean not null default false,
  updated_at        timestamptz not null default now()
);
alter table public.portal_bidang enable row level security;
revoke all on public.portal_bidang from anon;
grant select on public.portal_bidang to anon;
grant select, insert, update on public.portal_bidang to authenticated;
drop policy if exists "publik baca portal bidang" on public.portal_bidang;
create policy "publik baca portal bidang" on public.portal_bidang for select to anon, authenticated using (true);
drop policy if exists "pengelola tulis portal bidang" on public.portal_bidang;
create policy "pengelola tulis portal bidang" on public.portal_bidang for insert to authenticated
  with check ((select public.punya_izin('konten.kelola')));
drop policy if exists "pengelola ubah portal bidang" on public.portal_bidang;
create policy "pengelola ubah portal bidang" on public.portal_bidang for update to authenticated
  using ((select public.punya_izin('konten.kelola'))) with check ((select public.punya_izin('konten.kelola')));

-- ---------------------------------------------------------------------
-- 4. Angka alumni diterima PTN (profil, tampil hanya bila diisi)
-- ---------------------------------------------------------------------
alter table public.profil_sekolah add column if not exists alumni_ptn text not null default '' check (char_length(alumni_ptn) <= 20);
alter table public.profil_sekolah add column if not exists alumni_ptn_tahun text not null default '' check (char_length(alumni_ptn_tahun) <= 20);
alter table public.profil_sekolah add column if not exists alumni_ptn_keterangan text not null default '' check (char_length(alumni_ptn_keterangan) <= 300);

-- ---------------------------------------------------------------------
-- 5. Penanda media sementara. Bawaan FALSE: foto yang sudah ada & unggahan admin adalah foto asli;
--    hanya data contoh/ilustrasi yang ditandai TRUE (lihat MEDIA_PLAN.md).
-- ---------------------------------------------------------------------
alter table public.berita add column if not exists is_placeholder boolean not null default false;
alter table public.galeri add column if not exists is_placeholder boolean not null default false;
alter table public.hero_slide add column if not exists is_placeholder boolean not null default false;
