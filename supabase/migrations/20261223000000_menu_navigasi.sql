-- Navigasi "Langit cerah" (mega menu desktop + menu HP): isi teks & kartu sorotan yang bisa diedit admin.
-- Tiga tabel BARU; tidak mengubah/menghapus tabel lama. Label & tujuan tautan menu TETAP di kode
-- (src/content/menu-langit.ts); tabel ini hanya menimpa teks bawaan bila diisi. Tanpa isi awal.
--   menu_grup        → kalimat pengantar & teks tombol ajakan HP per menu (profil, pembelajaran, kehidupan, kabar, layanan)
--   menu_keterangan  → keterangan satu baris per tautan (kunci: menu + href)
--   menu_sorotan     → kartu foto sorotan di panel desktop (maks. 3 aktif per menu ditampilkan, urut)
-- Publik hanya membaca (sorotan: yang aktif); menulis hanya pengelola konten (izin konten.kelola). Hapus permanen ditolak.

create table if not exists public.menu_grup (
  kunci       text primary key check (kunci in ('profil', 'pembelajaran', 'kehidupan', 'kabar', 'layanan')),
  pengantar   text not null default '' check (char_length(pengantar) <= 200),
  ajakan      text not null default '' check (char_length(ajakan) <= 60),
  updated_at  timestamptz not null default now()
);

create table if not exists public.menu_keterangan (
  grup        text not null check (grup in ('profil', 'pembelajaran', 'kehidupan', 'kabar', 'layanan')),
  href        text not null check (href ~ '^(/[^/]|https://)' and char_length(href) <= 300),
  keterangan  text not null default '' check (char_length(keterangan) <= 120),
  updated_at  timestamptz not null default now(),
  primary key (grup, href)
);

create table if not exists public.menu_sorotan (
  id             uuid primary key default gen_random_uuid(),
  grup           text not null check (grup in ('profil', 'pembelajaran', 'kehidupan')),
  urutan         smallint not null default 0,
  aktif          boolean not null default true,
  judul          text not null check (char_length(judul) between 2 and 60),
  keterangan     text not null default '' check (char_length(keterangan) <= 120),
  tautan         text not null check (tautan ~ '^(/[^/]|https://)' and char_length(tautan) <= 300),
  foto_url       text not null default '' check (foto_url = '' or foto_url ~ '^(https://|/[^/]|http://(localhost|127\.0\.0\.1)[:/])'),
  is_placeholder boolean not null default false,
  fokus_x        smallint not null default 50 check (fokus_x between 0 and 100),
  fokus_y        smallint not null default 50 check (fokus_y between 0 and 100),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists menu_sorotan_urutan on public.menu_sorotan (grup, urutan) where aktif;

do $$
declare t text;
begin
  foreach t in array array['menu_grup', 'menu_keterangan', 'menu_sorotan'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
    execute format('revoke delete, truncate on public.%I from authenticated', t);
    execute format('drop policy if exists "pengelola baca semua" on public.%I', t);
    execute format('create policy "pengelola baca semua" on public.%I for select to authenticated using ((select public.punya_izin(''konten.kelola'')))', t);
    execute format('drop policy if exists "pengelola tulis" on public.%I', t);
    execute format('create policy "pengelola tulis" on public.%I for insert to authenticated with check ((select public.punya_izin(''konten.kelola'')))', t);
    execute format('drop policy if exists "pengelola ubah" on public.%I', t);
    execute format('create policy "pengelola ubah" on public.%I for update to authenticated using ((select public.punya_izin(''konten.kelola''))) with check ((select public.punya_izin(''konten.kelola'')))', t);
  end loop;
end $$;

drop policy if exists "publik baca menu grup" on public.menu_grup;
create policy "publik baca menu grup" on public.menu_grup for select to anon, authenticated using (true);
drop policy if exists "publik baca keterangan menu" on public.menu_keterangan;
create policy "publik baca keterangan menu" on public.menu_keterangan for select to anon, authenticated using (true);
drop policy if exists "publik baca sorotan aktif" on public.menu_sorotan;
create policy "publik baca sorotan aktif" on public.menu_sorotan for select to anon, authenticated using (aktif);
