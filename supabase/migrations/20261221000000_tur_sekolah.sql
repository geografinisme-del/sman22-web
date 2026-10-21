-- "Langit cerah" Tahap B: tur sekolah (CMS) + angka beranda.
--   * tabel BARU tur_sekolah + bucket Storage BARU "tur-sekolah"
--   * profil_sekolah: 2 kolom BARU (add column if not exists, bawaan teks kosong) — data lama tidak berubah
-- Tidak ada DROP TABLE, TRUNCATE, atau ALTER yang menghapus/mengubah data lama.

-- ---------------------------------------------------------------------
-- 1. Titik tur sekolah
-- ---------------------------------------------------------------------
create table if not exists public.tur_sekolah (
  id             uuid primary key default gen_random_uuid(),
  urutan         smallint not null default 0,
  aktif          boolean not null default true,
  label          text not null check (char_length(label) between 2 and 40),
  judul          text not null check (char_length(judul) between 2 and 80),
  deskripsi      text not null default '' check (char_length(deskripsi) <= 160),
  tombol_teks    text not null default '' check (char_length(tombol_teks) <= 40),
  tombol_url     text not null default '' check (tombol_url = '' or tombol_url ~ '^(https://|/[^/])'),
  media_tipe     text not null default 'foto' check (media_tipe in ('foto', 'video')),
  media_url      text not null default '' check (media_url = '' or media_url ~ '^(https://|/|http://(localhost|127\.0\.0\.1)[:/])'),
  poster_url     text not null default '' check (poster_url = '' or poster_url ~ '^(https://|/|http://(localhost|127\.0\.0\.1)[:/])'),
  fokus_x        smallint not null default 50 check (fokus_x between 0 and 100),
  fokus_y        smallint not null default 50 check (fokus_y between 0 and 100),
  alt_text       text not null default '' check (char_length(alt_text) <= 200),
  is_placeholder boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- video wajib punya poster; foto yang diisi wajib punya teks alternatif
  constraint tur_video_berposter check (media_tipe <> 'video' or (media_url <> '' and poster_url <> '')),
  constraint tur_foto_beralt check (media_tipe <> 'foto' or media_url = '' or char_length(alt_text) >= 5)
);
create index if not exists tur_sekolah_urutan on public.tur_sekolah (urutan) where aktif;

alter table public.tur_sekolah enable row level security;
revoke all on public.tur_sekolah from anon;
grant select on public.tur_sekolah to anon;
grant select, insert, update on public.tur_sekolah to authenticated;
revoke delete, truncate on public.tur_sekolah from authenticated;

drop policy if exists "publik baca titik tur aktif" on public.tur_sekolah;
create policy "publik baca titik tur aktif" on public.tur_sekolah for select to anon, authenticated using (aktif);
drop policy if exists "pengelola baca semua titik tur" on public.tur_sekolah;
create policy "pengelola baca semua titik tur" on public.tur_sekolah for select to authenticated
  using ((select public.punya_izin('konten.kelola')));
drop policy if exists "pengelola tulis titik tur" on public.tur_sekolah;
create policy "pengelola tulis titik tur" on public.tur_sekolah for insert to authenticated
  with check ((select public.punya_izin('konten.kelola')));
drop policy if exists "pengelola ubah titik tur" on public.tur_sekolah;
create policy "pengelola ubah titik tur" on public.tur_sekolah for update to authenticated
  using ((select public.punya_izin('konten.kelola'))) with check ((select public.punya_izin('konten.kelola')));

-- batas maksimal 8 titik aktif dijaga juga di database (minimal 3 dijaga aplikasi saat menonaktifkan)
create or replace function public.tur_cek_maks_aktif() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.aktif and (select count(*) from public.tur_sekolah where aktif and id <> new.id) >= 8 then
    raise exception 'Maksimal 8 titik tur aktif.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists tur_maks_aktif on public.tur_sekolah;
create trigger tur_maks_aktif before insert or update of aktif on public.tur_sekolah
  for each row execute function public.tur_cek_maks_aktif();

-- ---------------------------------------------------------------------
-- 2. Storage bucket "tur-sekolah" (publik dibaca; tulis/hapus hanya pengelola konten)
--    Unggahan asli masuk ke folder masuk/; server mengompres foto ke WebP & memeriksa video, lalu
--    menyimpan hasil di foto/ atau video/ dan menghapus berkas asli.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tur-sekolah', 'tur-sekolah', true, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
on conflict (id) do nothing;

drop policy if exists "pengelola unggah tur" on storage.objects;
create policy "pengelola unggah tur" on storage.objects for insert to authenticated
  with check (bucket_id = 'tur-sekolah' and (select public.punya_izin('konten.kelola')));
drop policy if exists "pengelola ubah tur" on storage.objects;
create policy "pengelola ubah tur" on storage.objects for update to authenticated
  using (bucket_id = 'tur-sekolah' and (select public.punya_izin('konten.kelola')));
drop policy if exists "pengelola lihat tur" on storage.objects;
create policy "pengelola lihat tur" on storage.objects for select to authenticated
  using (bucket_id = 'tur-sekolah' and (select public.punya_izin('konten.kelola')));
drop policy if exists "pengelola hapus tur" on storage.objects;
create policy "pengelola hapus tur" on storage.objects for delete to authenticated
  using (bucket_id = 'tur-sekolah' and (select public.punya_izin('konten.kelola')));

-- ---------------------------------------------------------------------
-- 3. Angka beranda (bento "SMAN 22 dalam angka") — tampil hanya bila diisi
-- ---------------------------------------------------------------------
alter table public.profil_sekolah add column if not exists lulusan_pt_persen text not null default ''
  check (lulusan_pt_persen = '' or lulusan_pt_persen ~ '^[0-9]{1,3}([.,][0-9])?$');
alter table public.profil_sekolah add column if not exists kepala_sekolah_jabatan text not null default ''
  check (char_length(kepala_sekolah_jabatan) <= 80);

-- ---------------------------------------------------------------------
-- 4. Titik contoh awal (hanya bila tabel masih kosong). is_placeholder = true: konten contoh yang harus
--    ditinjau/diganti admin. Foto /images/* = foto dokumentasi sekolah yang sudah ada di situs.
-- ---------------------------------------------------------------------
insert into public.tur_sekolah (urutan, label, judul, deskripsi, tombol_teks, tombol_url, media_tipe, media_url, fokus_x, fokus_y, alt_text, is_placeholder)
select * from (values
  (1, 'Selamat datang', 'Selamat datang di SMAN 22', 'Mulai dari halaman sekolah, tempat warga sekolah berkumpul.', '', '', 'foto', '/images/keluarga-besar.jpg', 50, 55, 'Warga sekolah berkumpul di halaman SMA Negeri 22 Bandung', true),
  (2, 'Gerbang & lapangan', 'Gerbang dan lapangan', 'Lapangan tempat apel dan upacara pagi.', '', '', 'foto', '/images/apel-lapangan.jpg', 50, 45, 'Siswa mengikuti apel di lapangan sekolah', true),
  (3, 'Gedung utama', 'Gedung utama', 'Gedung utama sekolah di bagian depan kompleks.', '', '', 'foto', '/images/gedung.jpg', 50, 50, 'Gedung utama SMA Negeri 22 Bandung', true),
  (4, 'Masjid sekolah', 'Masjid sekolah', 'Tempat ibadah dan kegiatan keagamaan warga sekolah.', '', '', 'foto', '/images/kajian-masjid.jpg', 50, 45, 'Kegiatan kajian di masjid sekolah', true),
  (5, 'Aula', 'Aula', 'Ruang pertemuan untuk kegiatan bersama.', '', '', 'foto', '/images/kegiatan-aula.jpg', 50, 40, 'Kegiatan siswa di aula sekolah', true),
  (6, 'Perpustakaan', 'Perpustakaan', 'Ruang baca dan layanan E-Library sekolah.', 'Buka E-Library', '/perpustakaan', 'foto', '', 50, 50, '', true)
) as v(urutan, label, judul, deskripsi, tombol_teks, tombol_url, media_tipe, media_url, fokus_x, fokus_y, alt_text, is_placeholder)
where not exists (select 1 from public.tur_sekolah);
