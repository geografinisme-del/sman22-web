-- =====================================================================
--  CMS Website SMAN 22 Bandung (Modul 02 – tahap awal)
--  Jalankan SEKALI di Supabase: Dashboard → SQL Editor → New query →
--  tempel seluruh isi file ini → Run.
--  Aman dijalankan ulang (idempotent): tidak menghapus data yang ada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Admin website
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  nama        text not null default '',
  peran       text not null default 'editor' check (peran in ('super_admin', 'editor')),
  aktif       boolean not null default true,
  created_at  timestamptz not null default now()
);

create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a
    where a.user_id = auth.uid() and a.aktif
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a
    where a.user_id = auth.uid() and a.aktif and a.peran = 'super_admin'
  );
$$;

revoke all on function public.is_editor() from public;
revoke all on function public.is_super_admin() from public;
grant execute on function public.is_editor() to anon, authenticated;
grant execute on function public.is_super_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Tabel konten
-- ---------------------------------------------------------------------
create table if not exists public.profil_sekolah (
  id                  smallint primary key default 1 check (id = 1),
  slogan              text not null default '',
  pernyataan          text not null default '',
  alamat              text not null default '',
  telepon             text not null default '',
  email               text not null default '',
  jam_layanan         text not null default '',
  npsn                text not null default '',
  akreditasi          text not null default '',
  kepala_sekolah      text not null default '',
  foto_kepala_sekolah text not null default '',
  sambutan_kutipan    text not null default '',
  sambutan_isi        text not null default '',
  visi                text not null default '',
  misi                text not null default '',
  sejarah             text not null default '',
  jumlah_siswa        text not null default '',
  jumlah_guru         text not null default '',
  jumlah_ekskul       text not null default '',
  updated_at          timestamptz not null default now(),
  updated_by          uuid references auth.users (id) on delete set null
);

create table if not exists public.berita (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  judul       text not null check (char_length(judul) between 3 and 200),
  ringkasan   text not null default '' check (char_length(ringkasan) <= 400),
  isi         text not null default '',
  kategori    text not null default 'Kegiatan' check (char_length(kategori) <= 40),
  gambar_url  text not null default '',
  tanggal     date not null default current_date,
  status      text not null default 'draft' check (status in ('draft', 'terbit')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  deleted_at  timestamptz
);
create index if not exists berita_publik_idx on public.berita (tanggal desc) where deleted_at is null and status = 'terbit';

create table if not exists public.agenda (
  id          uuid primary key default gen_random_uuid(),
  judul       text not null check (char_length(judul) between 3 and 200),
  tanggal     date not null,
  waktu       text not null default '' check (char_length(waktu) <= 60),
  tempat      text not null default '' check (char_length(tempat) <= 120),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index if not exists agenda_tanggal_idx on public.agenda (tanggal) where deleted_at is null;

create table if not exists public.pengumuman (
  id          uuid primary key default gen_random_uuid(),
  judul       text not null check (char_length(judul) between 3 and 200),
  isi         text not null default '' check (char_length(isi) <= 2000),
  tanggal     date not null default current_date,
  penting     boolean not null default false,
  aktif       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table if not exists public.galeri (
  id          uuid primary key default gen_random_uuid(),
  judul       text not null check (char_length(judul) between 2 and 200),
  gambar_url  text not null check (char_length(gambar_url) > 0),
  urutan      integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- ---------------------------------------------------------------------
-- 3. Audit log (siapa mengubah apa, kapan)
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  waktu       timestamptz not null default now(),
  user_id     uuid,
  tabel       text not null,
  aksi        text not null,
  record_id   text,
  data_lama   jsonb,
  data_baru   jsonb
);
create index if not exists audit_log_waktu_idx on public.audit_log (waktu desc);

create or replace function public.catat_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (user_id, tabel, aksi, record_id, data_lama, data_baru)
  values (
    auth.uid(),
    tg_table_name,
    tg_op,
    coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id', ''),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profil_sekolah', 'berita', 'agenda', 'pengumuman', 'galeri', 'admins'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.catat_audit()', t);
  end loop;
  foreach t in array array['profil_sekolah', 'berita', 'agenda', 'pengumuman', 'galeri'] loop
    execute format('drop trigger if exists updated_at_%1$s on public.%1$I', t);
    execute format('create trigger updated_at_%1$s before update on public.%1$I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 4. Row Level Security
--    Publik hanya bisa MEMBACA konten yang sudah terbit.
--    Hanya admin aktif yang bisa menambah/mengubah. Tidak ada hapus
--    permanen dari aplikasi (soft delete lewat kolom deleted_at).
-- ---------------------------------------------------------------------
alter table public.admins          enable row level security;
alter table public.profil_sekolah  enable row level security;
alter table public.berita          enable row level security;
alter table public.agenda          enable row level security;
alter table public.pengumuman      enable row level security;
alter table public.galeri          enable row level security;
alter table public.audit_log       enable row level security;

-- Pengunjung (anon) tidak boleh menulis apa pun
revoke insert, update, delete, truncate on
  public.admins, public.profil_sekolah, public.berita, public.agenda,
  public.pengumuman, public.galeri, public.audit_log
from anon;
revoke delete, truncate on
  public.profil_sekolah, public.berita, public.agenda, public.pengumuman, public.galeri, public.audit_log
from authenticated;
revoke insert, update on public.audit_log from authenticated;
revoke all on public.admins, public.audit_log from anon;

-- admins
drop policy if exists "admin lihat diri sendiri" on public.admins;
create policy "admin lihat diri sendiri" on public.admins
  for select to authenticated using (user_id = auth.uid() or public.is_super_admin());
drop policy if exists "super admin kelola admin" on public.admins;
create policy "super admin kelola admin" on public.admins
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- profil_sekolah
drop policy if exists "publik baca profil" on public.profil_sekolah;
create policy "publik baca profil" on public.profil_sekolah
  for select to anon, authenticated using (true);
drop policy if exists "editor ubah profil" on public.profil_sekolah;
create policy "editor ubah profil" on public.profil_sekolah
  for update to authenticated using (public.is_editor()) with check (public.is_editor());

-- berita
drop policy if exists "publik baca berita terbit" on public.berita;
create policy "publik baca berita terbit" on public.berita
  for select to anon, authenticated using (deleted_at is null and status = 'terbit');
drop policy if exists "editor baca semua berita" on public.berita;
create policy "editor baca semua berita" on public.berita
  for select to authenticated using (public.is_editor());
drop policy if exists "editor tambah berita" on public.berita;
create policy "editor tambah berita" on public.berita
  for insert to authenticated with check (public.is_editor());
drop policy if exists "editor ubah berita" on public.berita;
create policy "editor ubah berita" on public.berita
  for update to authenticated using (public.is_editor()) with check (public.is_editor());

-- agenda, pengumuman, galeri (pola sama)
do $$
declare t text; syarat text;
begin
  foreach t in array array['agenda', 'pengumuman', 'galeri'] loop
    syarat := case when t = 'pengumuman' then 'deleted_at is null and aktif' else 'deleted_at is null' end;
    execute format('drop policy if exists "publik baca %1$s" on public.%1$I', t);
    execute format('create policy "publik baca %1$s" on public.%1$I for select to anon, authenticated using (%2$s)', t, syarat);
    execute format('drop policy if exists "editor baca %1$s" on public.%1$I', t);
    execute format('create policy "editor baca %1$s" on public.%1$I for select to authenticated using (public.is_editor())', t);
    execute format('drop policy if exists "editor tambah %1$s" on public.%1$I', t);
    execute format('create policy "editor tambah %1$s" on public.%1$I for insert to authenticated with check (public.is_editor())', t);
    execute format('drop policy if exists "editor ubah %1$s" on public.%1$I', t);
    execute format('create policy "editor ubah %1$s" on public.%1$I for update to authenticated using (public.is_editor()) with check (public.is_editor())', t);
  end loop;
end $$;

-- audit_log: hanya super admin yang bisa membaca
drop policy if exists "super admin baca audit" on public.audit_log;
create policy "super admin baca audit" on public.audit_log
  for select to authenticated using (public.is_super_admin());

-- ---------------------------------------------------------------------
-- 5. Penyimpanan foto (Storage bucket "media")
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "editor unggah media" on storage.objects;
create policy "editor unggah media" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and public.is_editor());
drop policy if exists "editor ubah media" on storage.objects;
create policy "editor ubah media" on storage.objects
  for update to authenticated using (bucket_id = 'media' and public.is_editor());
drop policy if exists "editor lihat media" on storage.objects;
create policy "editor lihat media" on storage.objects
  for select to authenticated using (bucket_id = 'media' and public.is_editor());

-- ---------------------------------------------------------------------
-- 6. Data awal (data asli yang sudah diketahui; sisanya diisi lewat admin)
-- ---------------------------------------------------------------------
insert into public.profil_sekolah (id, kepala_sekolah, foto_kepala_sekolah, jam_layanan, pernyataan)
values (
  1,
  'Evi Vironita, S.Pd.',
  '/images/kepala-sekolah.jpg',
  'Senin–Jumat, 07.00–15.00 WIB',
  'Sejak 1989, SMA Negeri 22 Bandung menjadi rumah belajar bagi ribuan siswa — tempat karakter ditempa, prestasi dirayakan, dan persahabatan tumbuh.'
)
on conflict (id) do nothing;

insert into public.galeri (judul, gambar_url, urutan)
select v.judul, v.gambar_url, v.urutan
from (values
  ('Gedung utama SMA Negeri 22 Bandung', '/images/gedung.jpg', 1),
  ('Kajian bersama di masjid sekolah', '/images/kajian-masjid.jpg', 2),
  ('Kegiatan siswa di aula', '/images/kegiatan-aula.jpg', 3),
  ('Apel pagi di lapangan', '/images/apel-lapangan.jpg', 4),
  ('Keluarga besar SMA Negeri 22 Bandung', '/images/keluarga-besar.jpg', 5),
  ('Upacara bendera', '/images/upacara-pagi.jpg', 6)
) as v (judul, gambar_url, urutan)
where not exists (select 1 from public.galeri);

-- minta API (PostgREST) memuat ulang struktur tabel
notify pgrst, 'reload schema';
