-- Fase 19: mesin tema & widget + pengumuman prioritas (popup poster).
-- * Draf tampilan disimpan TERPISAH dari konfigurasi terbit agar tidak pernah terbaca publik
--   (pengaturan_situs boleh dibaca anon; tampilan_draf hanya pengelola konten).
-- * Riwayat terbit bersifat append-only untuk pemulihan konfigurasi sebelumnya.
-- * Terbit dilakukan atomik oleh terbitkan_tampilan() dengan pemeriksaan izin di database.
-- * Isi konfigurasi divalidasi ulang di aplikasi (src/lib/tampilan/konfigurasi.ts); database membatasi bentuk & ukuran.
-- Tidak mengubah tabel operasional lain.

-- ---------------------------------------------------------------------
-- 1. Draf tampilan (satu baris, hanya pengelola konten)
-- ---------------------------------------------------------------------
create table if not exists public.tampilan_draf (
  id           smallint primary key default 1 check (id = 1),
  konfigurasi  jsonb not null default '{}'::jsonb
               check (jsonb_typeof(konfigurasi) = 'object' and pg_column_size(konfigurasi) < 24576),
  diubah_oleh  uuid default auth.uid(),
  diubah_pada  timestamptz not null default now()
);

create or replace function public.jaga_tampilan_draf()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.diubah_oleh := auth.uid();
  new.diubah_pada := now();
  return new;
end $$;
drop trigger if exists jaga_tampilan_draf on public.tampilan_draf;
create trigger jaga_tampilan_draf before insert or update on public.tampilan_draf for each row execute function public.jaga_tampilan_draf();

alter table public.tampilan_draf enable row level security;
revoke all on public.tampilan_draf from anon, public;
revoke delete, truncate on public.tampilan_draf from authenticated;
grant select, insert, update on public.tampilan_draf to authenticated;
drop policy if exists "pengelola baca draf tampilan" on public.tampilan_draf;
create policy "pengelola baca draf tampilan" on public.tampilan_draf for select to authenticated
  using ((select public.punya_izin('konten.kelola')));
drop policy if exists "pengelola buat draf tampilan" on public.tampilan_draf;
create policy "pengelola buat draf tampilan" on public.tampilan_draf for insert to authenticated
  with check ((select public.punya_izin('konten.kelola')));
drop policy if exists "pengelola ubah draf tampilan" on public.tampilan_draf;
create policy "pengelola ubah draf tampilan" on public.tampilan_draf for update to authenticated
  using ((select public.punya_izin('konten.kelola'))) with check ((select public.punya_izin('konten.kelola')));

-- ---------------------------------------------------------------------
-- 2. Riwayat terbit (append-only, dibaca pengelola untuk pemulihan)
-- ---------------------------------------------------------------------
create table if not exists public.riwayat_tampilan (
  id           bigint generated always as identity primary key,
  konfigurasi  jsonb not null check (jsonb_typeof(konfigurasi) = 'object'),
  catatan      text not null default '' check (char_length(catatan) <= 200),
  oleh         uuid default auth.uid(),
  waktu        timestamptz not null default now()
);
create index if not exists riwayat_tampilan_waktu on public.riwayat_tampilan (waktu desc);

alter table public.riwayat_tampilan enable row level security;
revoke all on public.riwayat_tampilan from anon, public;
revoke insert, update, delete, truncate on public.riwayat_tampilan from authenticated;
grant select on public.riwayat_tampilan to authenticated;
drop policy if exists "pengelola baca riwayat tampilan" on public.riwayat_tampilan;
create policy "pengelola baca riwayat tampilan" on public.riwayat_tampilan for select to authenticated
  using ((select public.punya_izin('konten.kelola')));

-- ---------------------------------------------------------------------
-- 3. Terbitkan draf → konfigurasi publik (atomik, tercatat di riwayat)
-- ---------------------------------------------------------------------
create or replace function public.terbitkan_tampilan(p_catatan text default '')
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  d jsonb;
  v bigint;
begin
  if not public.punya_izin('konten.kelola') then
    raise exception 'Anda tidak berhak menerbitkan tampilan' using errcode = '42501';
  end if;
  select konfigurasi into d from public.tampilan_draf where id = 1;
  if d is null or d = '{}'::jsonb then
    raise exception 'Belum ada draf tampilan' using errcode = 'P0002';
  end if;
  insert into public.riwayat_tampilan (konfigurasi, catatan) values (d, left(coalesce(p_catatan, ''), 200)) returning id into v;
  update public.pengaturan_situs set tema = jsonb_set(coalesce(tema, '{}'::jsonb), '{tampilan}', d, true) where id = 1;
  return v;
end $$;
revoke all on function public.terbitkan_tampilan(text) from public, anon;
grant execute on function public.terbitkan_tampilan(text) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Pengumuman prioritas (popup poster) — kolom tambahan, data lama tidak berubah
-- ---------------------------------------------------------------------
alter table public.pengumuman add column if not exists prioritas boolean not null default false;
alter table public.pengumuman add column if not exists poster_url text not null default '';
alter table public.pengumuman add column if not exists poster_alt text not null default '';
alter table public.pengumuman add column if not exists tautan_url text not null default '';
alter table public.pengumuman add column if not exists tautan_label text not null default '';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pengumuman_poster_valid') then
    alter table public.pengumuman add constraint pengumuman_poster_valid check (
      (poster_url = '' or poster_url ~ '^(https://|http://(localhost|127\.0\.0\.1)[:/])')
      -- poster wajib punya teks alternatif yang berarti
      and (poster_url = '' or char_length(trim(poster_alt)) >= 5)
      and char_length(poster_alt) <= 300);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pengumuman_tautan_valid') then
    alter table public.pengumuman add constraint pengumuman_tautan_valid check (
      (tautan_url = '' or tautan_url ~ '^(https://[^\s<>"]+|/[^/\s][^\s<>"]*)$')
      and char_length(tautan_url) <= 300 and char_length(tautan_label) <= 40);
  end if;
end $$;
create index if not exists pengumuman_prioritas on public.pengumuman (tanggal desc) where prioritas and aktif and deleted_at is null;
