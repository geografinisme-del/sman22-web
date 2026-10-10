-- =====================================================================
--  Fase 6a — CMS lanjutan (Modul 02)
--  Alur draf → diajukan → disetujui/ditolak → terbit, jadwal tayang,
--  riwayat revisi berita, hero slide, tautan layanan, footer & SEO.
--  Jalankan SETELAH 20261015000000_jadwal.sql. Idempotent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Izin menerbitkan (persetujuan)
-- ---------------------------------------------------------------------
insert into public.izin (kode, keterangan) values
  ('konten.terbitkan', 'Menyetujui & menerbitkan berita, mengatur kewajiban persetujuan')
on conflict (kode) do update set keterangan = excluded.keterangan;
insert into public.peran_izin (peran, izin) values
  ('super_admin', 'konten.terbitkan'), ('kepala_sekolah', 'konten.terbitkan')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 2. Pengaturan situs (satu baris): hero, layanan, footer, SEO, alur persetujuan
-- ---------------------------------------------------------------------
create table if not exists public.pengaturan_situs (
  id                 smallint primary key default 1 check (id = 1),
  hero_label         text not null default 'Sejak 1989 · Kota Bandung' check (char_length(hero_label) <= 80),
  hero_judul_awal    text not null default 'Tumbuh berkarakter,' check (char_length(hero_judul_awal) <= 60),
  hero_judul_miring  text not null default 'bersinar' check (char_length(hero_judul_miring) <= 40),
  hero_judul_akhir   text not null default 'bersama.' check (char_length(hero_judul_akhir) <= 60),
  hero_teks          text not null default 'Ruang belajar yang hangat untuk menumbuhkan iman, ilmu, dan kepedulian generasi muda Bandung.' check (char_length(hero_teks) <= 300),
  tombol1_label      text not null default 'Kenali sekolah kami' check (char_length(tombol1_label) <= 40),
  tombol1_url        text not null default '/profil' check (char_length(tombol1_url) <= 300),
  tombol2_label      text not null default 'Informasi SPMB' check (char_length(tombol2_label) <= 40),
  tombol2_url        text not null default '/spmb' check (char_length(tombol2_url) <= 300),
  hero_detik         smallint not null default 7 check (hero_detik between 6 and 8),
  layanan            jsonb not null default '[]'::jsonb check (jsonb_typeof(layanan) = 'array'),
  sosial_media       jsonb not null default '[]'::jsonb check (jsonb_typeof(sosial_media) = 'array'),
  footer_teks        text not null default '' check (char_length(footer_teks) <= 400),
  seo_judul          text not null default '' check (char_length(seo_judul) <= 70),
  seo_deskripsi      text not null default '' check (char_length(seo_deskripsi) <= 170),
  seo_gambar_url     text not null default '' check (char_length(seo_gambar_url) <= 500),
  persetujuan_wajib  boolean not null default true,
  updated_at         timestamptz not null default now(),
  updated_by         uuid default auth.uid()
);
insert into public.pengaturan_situs (id, layanan, sosial_media) values (1,
  '[{"nama":"Portal Siswa & Orang Tua","keterangan":"Kehadiran, jadwal, izin online","url":"/masuk"},
    {"nama":"Informasi SPMB","keterangan":"Penerimaan murid baru","url":"/spmb"},
    {"nama":"E-Learning","keterangan":"Kelas digital","url":""},
    {"nama":"Pengaduan","keterangan":"Saran & pengaduan masyarakat","url":"/kontak"}]',
  '[{"nama":"Instagram","akun":"@sman22bdg","url":"https://www.instagram.com/sman22bdg"},
    {"nama":"X / Twitter","akun":"@sman22bandung","url":"https://x.com/sman22bandung"}]')
on conflict (id) do nothing;

create or replace function public.jaga_pengaturan_situs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.persetujuan_wajib is distinct from old.persetujuan_wajib and auth.uid() is not null
     and not public.punya_izin('konten.terbitkan') then
    raise exception 'Hanya kepala sekolah/super admin yang dapat mengubah kewajiban persetujuan' using errcode = '42501';
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
drop trigger if exists jaga_pengaturan_situs on public.pengaturan_situs;
create trigger jaga_pengaturan_situs before update on public.pengaturan_situs for each row execute function public.jaga_pengaturan_situs();

-- ---------------------------------------------------------------------
-- 3. Hero slide
-- ---------------------------------------------------------------------
create table if not exists public.hero_slide (
  id             uuid primary key default gen_random_uuid(),
  gambar_url     text not null check (char_length(gambar_url) between 1 and 500),
  gambar_hp_url  text not null default '' check (char_length(gambar_hp_url) <= 500),
  alt            text not null check (char_length(alt) between 3 and 200),
  fokus_x        smallint not null default 50 check (fokus_x between 0 and 100),
  fokus_y        smallint not null default 50 check (fokus_y between 0 and 100),
  skala          smallint not null default 100 check (skala between 100 and 150),
  tautan         text not null default '' check (char_length(tautan) <= 300),
  urutan         smallint not null default 0,
  aktif          boolean not null default true,
  tayang_mulai   timestamptz,
  tayang_selesai timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  check (tayang_selesai is null or tayang_mulai is null or tayang_selesai > tayang_mulai)
);

-- ---------------------------------------------------------------------
-- 4. Berita: status persetujuan, jadwal tayang, revisi
-- ---------------------------------------------------------------------
alter table public.berita drop constraint if exists berita_status_check;
alter table public.berita add constraint berita_status_check check (status in ('draft', 'diajukan', 'terbit', 'ditolak'));
alter table public.berita add column if not exists tayang_mulai timestamptz;
alter table public.berita add column if not exists catatan_review text not null default '' check (char_length(catatan_review) <= 500);
alter table public.berita add column if not exists diajukan_oleh uuid;
alter table public.berita add column if not exists diajukan_pada timestamptz;
alter table public.berita add column if not exists disetujui_oleh uuid;
alter table public.berita add column if not exists disetujui_pada timestamptz;

create or replace function public.jaga_status_berita()
returns trigger language plpgsql security definer set search_path = '' as $$
declare wajib boolean; boleh boolean;
begin
  if auth.uid() is null then return new; end if; -- skrip server/migrasi
  wajib := coalesce((select persetujuan_wajib from public.pengaturan_situs where id = 1), true);
  boleh := public.punya_izin('konten.terbitkan');
  if new.status in ('terbit', 'ditolak') and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    if new.status = 'ditolak' and not boleh then
      raise exception 'Hanya penyetuju yang dapat menolak berita' using errcode = '42501';
    end if;
    if new.status = 'terbit' and wajib and not boleh then
      raise exception 'Berita perlu disetujui kepala sekolah sebelum terbit. Pilih "Ajukan untuk disetujui".' using errcode = '42501';
    end if;
    if new.status = 'terbit' then new.disetujui_oleh := auth.uid(); new.disetujui_pada := now(); end if;
  end if;
  if new.status = 'diajukan' and (tg_op = 'INSERT' or old.status is distinct from 'diajukan') then
    new.diajukan_oleh := auth.uid(); new.diajukan_pada := now(); new.catatan_review := '';
  end if;
  return new;
end $$;
drop trigger if exists jaga_status_berita on public.berita;
create trigger jaga_status_berita before insert or update on public.berita for each row execute function public.jaga_status_berita();

create table if not exists public.berita_revisi (
  id          bigint generated always as identity primary key,
  berita_id   uuid not null references public.berita (id),
  data        jsonb not null,
  status      text not null,
  dibuat_oleh uuid,
  dibuat_pada timestamptz not null default now()
);
create index if not exists berita_revisi_idx on public.berita_revisi (berita_id, dibuat_pada desc);

create or replace function public.simpan_revisi_berita()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (old.judul, old.ringkasan, old.isi, old.gambar_url, old.kategori, old.tanggal, old.slug)
     is distinct from (new.judul, new.ringkasan, new.isi, new.gambar_url, new.kategori, new.tanggal, new.slug) then
    insert into public.berita_revisi (berita_id, data, status, dibuat_oleh)
    values (old.id, jsonb_build_object('judul', old.judul, 'ringkasan', old.ringkasan, 'isi', old.isi, 'gambar_url', old.gambar_url,
                                       'kategori', old.kategori, 'tanggal', old.tanggal, 'slug', old.slug),
            old.status, auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists simpan_revisi_berita on public.berita;
create trigger simpan_revisi_berita after update on public.berita for each row execute function public.simpan_revisi_berita();

-- Persetujuan oleh kepala sekolah / super admin
create or replace function public.putuskan_berita(p_id uuid, p_setuju boolean, p_catatan text default '')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.punya_izin('konten.terbitkan') then raise exception 'Tidak berhak' using errcode = '42501'; end if;
  update public.berita
     set status = case when p_setuju then 'terbit' else 'ditolak' end,
         catatan_review = left(coalesce(p_catatan, ''), 500)
   where id = p_id and deleted_at is null and status = 'diajukan';
  if not found then raise exception 'Berita tidak sedang menunggu persetujuan' using errcode = '23514'; end if;
end $$;
revoke all on function public.putuskan_berita(uuid, boolean, text) from public, anon;
grant execute on function public.putuskan_berita(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Pengumuman: periode tayang
-- ---------------------------------------------------------------------
alter table public.pengumuman add column if not exists tayang_mulai timestamptz;
alter table public.pengumuman add column if not exists tayang_selesai timestamptz;

-- ---------------------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------------------
drop policy if exists "publik baca berita terbit" on public.berita;
create policy "publik baca berita terbit" on public.berita for select to anon, authenticated
  using (deleted_at is null and status = 'terbit' and (tayang_mulai is null or tayang_mulai <= now()));
drop policy if exists "penyetuju baca berita" on public.berita;
create policy "penyetuju baca berita" on public.berita for select to authenticated
  using ((select public.punya_izin('konten.terbitkan')));

drop policy if exists "publik baca pengumuman" on public.pengumuman;
create policy "publik baca pengumuman" on public.pengumuman for select to anon, authenticated
  using (deleted_at is null and aktif and (tayang_mulai is null or tayang_mulai <= now())
         and (tayang_selesai is null or tayang_selesai > now()));

alter table public.berita_revisi enable row level security;
revoke all on public.berita_revisi from anon;
revoke insert, update, delete, truncate on public.berita_revisi from authenticated;
drop policy if exists "baca revisi berita" on public.berita_revisi;
create policy "baca revisi berita" on public.berita_revisi for select to authenticated
  using (public.is_editor() or (select public.punya_izin('konten.terbitkan')));

alter table public.pengaturan_situs enable row level security;
revoke all on public.pengaturan_situs from anon;
grant select on public.pengaturan_situs to anon;
revoke insert, delete, truncate on public.pengaturan_situs from authenticated;
drop policy if exists "publik baca pengaturan situs" on public.pengaturan_situs;
create policy "publik baca pengaturan situs" on public.pengaturan_situs for select to anon, authenticated using (true);
drop policy if exists "editor ubah pengaturan situs" on public.pengaturan_situs;
create policy "editor ubah pengaturan situs" on public.pengaturan_situs for update to authenticated
  using (public.is_editor() or (select public.punya_izin('konten.terbitkan')))
  with check (public.is_editor() or (select public.punya_izin('konten.terbitkan')));

alter table public.hero_slide enable row level security;
revoke all on public.hero_slide from anon;
grant select on public.hero_slide to anon;
revoke delete, truncate on public.hero_slide from authenticated;
drop policy if exists "publik baca hero" on public.hero_slide;
create policy "publik baca hero" on public.hero_slide for select to anon, authenticated
  using (deleted_at is null and aktif and (tayang_mulai is null or tayang_mulai <= now())
         and (tayang_selesai is null or tayang_selesai > now()));
drop policy if exists "editor baca hero" on public.hero_slide;
create policy "editor baca hero" on public.hero_slide for select to authenticated using (public.is_editor());
drop policy if exists "editor tambah hero" on public.hero_slide;
create policy "editor tambah hero" on public.hero_slide for insert to authenticated with check (public.is_editor());
drop policy if exists "editor ubah hero" on public.hero_slide;
create policy "editor ubah hero" on public.hero_slide for update to authenticated using (public.is_editor()) with check (public.is_editor());

do $$
declare t text;
begin
  foreach t in array array['pengaturan_situs', 'hero_slide', 'berita_revisi'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    if t <> 'berita_revisi' then
      execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.catat_audit()', t);
    end if;
  end loop;
end $$;
drop trigger if exists updated_at_hero_slide on public.hero_slide;
create trigger updated_at_hero_slide before update on public.hero_slide for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
