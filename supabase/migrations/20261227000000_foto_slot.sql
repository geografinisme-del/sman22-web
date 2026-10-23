-- Foto sementara berkualitas (Unsplash) + arsip foto asli. Satu tabel BARU; tidak mengubah/menghapus objek lama.
--   foto_slot = satu baris per lokasi foto yang diganti foto stok:
--     * slot di tabel CMS (tabel + baris_id terisi): kartu_beranda, tur_sekolah, galeri, menu_sorotan, portal_login —
--       foto aktif tetap disimpan di tabel CMS itu; baris ini menyimpan foto asli + kredit + tombol "Kembalikan foto asli".
--     * slot di kode (tabel kosong): foto aktif dibaca dari baris ini (mis. "profil.sejarah"); tanpa baris → foto bawaan kode.
--   url_asli   = foto asli yang diarsipkan (berkas di /images/*, tidak dihapus) → "Lihat foto asli" & "Kembalikan foto asli".
--   asli_sementara = foto yang diganti itu sendiri foto stok lama (bukan foto sekolah).
-- Publik membaca (kredit foto, tautan foto asli); menulis hanya pengelola konten (izin konten.kelola). Tanpa hapus.

create table if not exists public.foto_slot (
  lokasi            text primary key check (lokasi ~ '^[a-z0-9_.:-]{3,120}$'),
  nama              text not null check (char_length(nama) between 3 and 120),
  jenis             text not null default 'dekorasi' check (jenis in ('dekorasi', 'kegiatan')),
  tabel             text check (tabel is null or tabel in ('kartu_beranda', 'tur_sekolah', 'galeri', 'menu_sorotan', 'portal_login')),
  baris_id          text check (baris_id is null or char_length(baris_id) <= 64),
  url_aktif         text not null check (url_aktif ~ '^(https://|/[^/]|http://(localhost|127\.0\.0\.1)[:/])'),
  is_placeholder    boolean not null default true,
  alt_text          text not null default '' check (char_length(alt_text) <= 200),
  fokus_x           smallint not null default 50 check (fokus_x between 0 and 100),
  fokus_y           smallint not null default 50 check (fokus_y between 0 and 100),
  url_asli          text check (url_asli is null or url_asli ~ '^(https://|/[^/]|http://(localhost|127\.0\.0\.1)[:/])'),
  asli_sementara    boolean not null default false,
  asli_catatan      text not null default '' check (char_length(asli_catatan) <= 300),
  fotografer        text not null default '' check (char_length(fotografer) <= 120),
  sumber            text not null default '' check (char_length(sumber) <= 60),
  tautan_sumber     text not null default '' check (tautan_sumber = '' or (tautan_sumber ~ '^https://' and char_length(tautan_sumber) <= 300)),
  lisensi           text not null default '' check (char_length(lisensi) <= 120),
  diunduh_pada      date,
  dikembalikan_pada timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint foto_slot_tabel_baris check ((tabel is null) = (baris_id is null))
);
create index if not exists foto_slot_tabel on public.foto_slot (tabel, baris_id) where tabel is not null;

alter table public.foto_slot enable row level security;
revoke all on public.foto_slot from anon;
grant select on public.foto_slot to anon;
grant select, insert, update on public.foto_slot to authenticated;
revoke delete, truncate on public.foto_slot from authenticated;

drop policy if exists "publik baca foto slot" on public.foto_slot;
create policy "publik baca foto slot" on public.foto_slot for select to anon, authenticated using (true);
drop policy if exists "pengelola tulis foto slot" on public.foto_slot;
create policy "pengelola tulis foto slot" on public.foto_slot for insert to authenticated
  with check ((select public.punya_izin('konten.kelola')));
drop policy if exists "pengelola ubah foto slot" on public.foto_slot;
create policy "pengelola ubah foto slot" on public.foto_slot for update to authenticated
  using ((select public.punya_izin('konten.kelola'))) with check ((select public.punya_izin('konten.kelola')));
