-- =====================================================================
--  Fase 2 — Akun, Peran & Hak Akses (Modul 03) + Data Induk (Modul 04)
--  Jalankan SETELAH 20261005000000_cms_website.sql.
--  Aman dijalankan ulang (idempotent) dan tidak menghapus data.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Peran, izin, dan matriks peran–izin
-- ---------------------------------------------------------------------
create table if not exists public.peran (
  kode        text primary key check (kode ~ '^[a-z_]+$'),
  nama        text not null,
  keterangan  text not null default '',
  urutan      integer not null default 0
);

create table if not exists public.izin (
  kode        text primary key check (kode ~ '^[a-z_]+\.[a-z_]+$'),
  keterangan  text not null
);

create table if not exists public.peran_izin (
  peran  text not null references public.peran (kode) on delete cascade,
  izin   text not null references public.izin (kode) on delete cascade,
  primary key (peran, izin)
);

insert into public.peran (kode, nama, keterangan, urutan) values
  ('super_admin',    'Super Admin',     'Akses penuh, termasuk mengelola pengguna', 1),
  ('kepala_sekolah', 'Kepala Sekolah',  'Melihat seluruh data dan log aktivitas', 2),
  ('wakasek',        'Wakil Kepala Sekolah', 'Melihat seluruh data induk', 3),
  ('operator',       'Operator / TU',   'Mengelola data induk siswa, pegawai, dan kelas', 4),
  ('humas',          'Humas / Admin Konten', 'Mengelola isi website', 5),
  ('bk',             'Guru BK',         'Melihat data siswa', 6),
  ('wali_kelas',     'Wali Kelas',      'Melihat siswa di kelas perwaliannya', 7),
  ('guru',           'Guru',            'Akses dasar guru', 8),
  ('siswa',          'Siswa',           'Melihat data dirinya sendiri', 9),
  ('orang_tua',      'Orang Tua / Wali','Melihat data anaknya', 10)
on conflict (kode) do update set nama = excluded.nama, keterangan = excluded.keterangan, urutan = excluded.urutan;

insert into public.izin (kode, keterangan) values
  ('konten.kelola',     'Mengelola profil, berita, agenda, pengumuman, galeri website'),
  ('data_induk.baca',   'Melihat seluruh data siswa, pegawai, dan kelas'),
  ('data_induk.kelola', 'Menambah, mengubah, mengimpor data induk'),
  ('pengguna.kelola',   'Membuat akun dan mengatur peran pengguna'),
  ('audit.baca',        'Melihat log aktivitas')
on conflict (kode) do update set keterangan = excluded.keterangan;

insert into public.peran_izin (peran, izin) values
  ('super_admin', 'konten.kelola'), ('super_admin', 'data_induk.baca'), ('super_admin', 'data_induk.kelola'),
  ('super_admin', 'pengguna.kelola'), ('super_admin', 'audit.baca'),
  ('kepala_sekolah', 'data_induk.baca'), ('kepala_sekolah', 'audit.baca'),
  ('wakasek', 'data_induk.baca'),
  ('operator', 'data_induk.baca'), ('operator', 'data_induk.kelola'),
  ('humas', 'konten.kelola'),
  ('bk', 'data_induk.baca')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 2. Pengguna & peran pengguna
-- ---------------------------------------------------------------------
create table if not exists public.pengguna (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  nama        text not null default '',
  email       text not null default '',
  aktif       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.pengguna_peran (
  user_id         uuid not null references public.pengguna (user_id) on delete cascade,
  peran           text not null references public.peran (kode),
  diberikan_oleh  uuid,
  created_at      timestamptz not null default now(),
  primary key (user_id, peran)
);

create or replace function public.punya_izin(kode text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.pengguna p
    join public.pengguna_peran pp on pp.user_id = p.user_id
    join public.peran_izin pi on pi.peran = pp.peran
    where p.user_id = auth.uid() and p.aktif and pi.izin = punya_izin.kode
  );
$$;

create or replace function public.punya_peran(kode text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.pengguna p
    join public.pengguna_peran pp on pp.user_id = p.user_id
    where p.user_id = auth.uid() and p.aktif and pp.peran = punya_peran.kode
  );
$$;

-- Ringkasan akses pengguna yang sedang login (dipakai aplikasi untuk menu)
create or replace function public.akses_saya()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'nama',  coalesce((select p.nama from public.pengguna p where p.user_id = auth.uid()), ''),
    'aktif', coalesce((select p.aktif from public.pengguna p where p.user_id = auth.uid()), false),
    'peran', coalesce((select jsonb_agg(pp.peran order by r.urutan) from public.pengguna_peran pp
                        join public.peran r on r.kode = pp.peran where pp.user_id = auth.uid()), '[]'::jsonb),
    'izin',  coalesce((select jsonb_agg(distinct pi.izin) from public.pengguna_peran pp
                        join public.peran_izin pi on pi.peran = pp.peran
                        join public.pengguna p on p.user_id = pp.user_id
                        where pp.user_id = auth.uid() and p.aktif), '[]'::jsonb)
  );
$$;

-- Fungsi lama tetap ada, kini berbasis izin (CMS Fase 1 tetap berjalan)
create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.punya_izin('konten.kelola');
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.punya_peran('super_admin');
$$;

revoke all on function public.punya_izin(text), public.punya_peran(text), public.akses_saya() from public;
grant execute on function public.punya_izin(text), public.punya_peran(text), public.akses_saya() to anon, authenticated;

-- Pindahkan admin Fase 1 ke sistem peran baru (tabel admins tidak dihapus)
insert into public.pengguna (user_id, nama, email, aktif)
select a.user_id, a.nama, coalesce(u.email, ''), a.aktif
from public.admins a join auth.users u on u.id = a.user_id
on conflict (user_id) do nothing;

insert into public.pengguna_peran (user_id, peran)
select a.user_id, case when a.peran = 'super_admin' then 'super_admin' else 'humas' end
from public.admins a
where exists (select 1 from public.pengguna p where p.user_id = a.user_id)
on conflict do nothing;

comment on table public.admins is 'USANG sejak Fase 2 — gunakan pengguna & pengguna_peran.';

-- Cegah eskalasi hak: hanya super admin yang boleh memberi/mencabut peran super_admin,
-- dan super admin terakhir tidak boleh dicabut.
create or replace function public.jaga_peran()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.peran = 'super_admin' and not public.punya_peran('super_admin')
     and auth.uid() is not null then
    raise exception 'Hanya super admin yang dapat memberi peran super admin' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' and old.peran = 'super_admin' then
    if auth.uid() is not null and not public.punya_peran('super_admin') then
      raise exception 'Hanya super admin yang dapat mencabut peran super admin' using errcode = '42501';
    end if;
    if (select count(*) from public.pengguna_peran pp join public.pengguna p on p.user_id = pp.user_id
        where pp.peran = 'super_admin' and p.aktif and pp.user_id <> old.user_id) = 0 then
      raise exception 'Minimal harus ada satu super admin aktif' using errcode = '23514';
    end if;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists jaga_peran on public.pengguna_peran;
create trigger jaga_peran before insert or delete on public.pengguna_peran
  for each row execute function public.jaga_peran();

create or replace function public.jaga_pengguna()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.aktif and not new.aktif and exists (select 1 from public.pengguna_peran where user_id = old.user_id and peran = 'super_admin') then
    if not public.punya_peran('super_admin') and auth.uid() is not null then
      raise exception 'Hanya super admin yang dapat menonaktifkan super admin' using errcode = '42501';
    end if;
    if (select count(*) from public.pengguna_peran pp join public.pengguna p on p.user_id = pp.user_id
        where pp.peran = 'super_admin' and p.aktif and p.user_id <> old.user_id) = 0 then
      raise exception 'Minimal harus ada satu super admin aktif' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists jaga_pengguna on public.pengguna;
create trigger jaga_pengguna before update on public.pengguna
  for each row execute function public.jaga_pengguna();

-- Mencari akun Supabase berdasarkan email (untuk menautkan akun yang dibuat di dashboard)
create or replace function public.cari_akun(email_dicari text)
returns uuid language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.punya_izin('pengguna.kelola') then
    raise exception 'Tidak berhak' using errcode = '42501';
  end if;
  return (select id from auth.users where lower(email) = lower(trim(email_dicari)) limit 1);
end $$;
revoke all on function public.cari_akun(text) from public;
grant execute on function public.cari_akun(text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Data induk
-- ---------------------------------------------------------------------
create table if not exists public.tahun_ajaran (
  id              uuid primary key default gen_random_uuid(),
  nama            text not null unique check (nama ~ '^\d{4}/\d{4}$'),
  semester        text not null default 'ganjil' check (semester in ('ganjil', 'genap')),
  aktif           boolean not null default false,
  tanggal_mulai   date,
  tanggal_selesai date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (tanggal_selesai is null or tanggal_mulai is null or tanggal_selesai > tanggal_mulai)
);
create unique index if not exists tahun_ajaran_satu_aktif on public.tahun_ajaran ((true)) where aktif;

create table if not exists public.pegawai (
  id             uuid primary key default gen_random_uuid(),
  nama           text not null check (char_length(nama) between 2 and 150),
  nip            text unique check (nip is null or nip ~ '^\d{18}$'),
  nuptk          text unique check (nuptk is null or nuptk ~ '^\d{16}$'),
  jenis_kelamin  text check (jenis_kelamin in ('L', 'P')),
  jenis          text not null default 'guru' check (jenis in ('guru', 'tendik')),
  jabatan        text not null default '' check (char_length(jabatan) <= 100),
  telepon        text not null default '' check (char_length(telepon) <= 30),
  email          text not null default '' check (char_length(email) <= 120),
  status         text not null default 'aktif' check (status in ('aktif', 'nonaktif', 'mutasi', 'pensiun')),
  user_id        uuid unique references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index if not exists pegawai_nama_idx on public.pegawai (lower(nama)) where deleted_at is null;

create table if not exists public.kelas (
  id               uuid primary key default gen_random_uuid(),
  tahun_ajaran_id  uuid not null references public.tahun_ajaran (id),
  tingkat          text not null check (tingkat in ('X', 'XI', 'XII')),
  nama             text not null check (char_length(nama) between 1 and 30),
  program          text not null default '' check (char_length(program) <= 60),
  wali_kelas_id    uuid references public.pegawai (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  unique (tahun_ajaran_id, nama)
);

create table if not exists public.siswa (
  id                 uuid primary key default gen_random_uuid(),
  nisn               text unique check (nisn is null or nisn ~ '^\d{10}$'),
  nis                text check (nis is null or char_length(nis) <= 20),
  nama               text not null check (char_length(nama) between 2 and 150),
  jenis_kelamin      text check (jenis_kelamin in ('L', 'P')),
  tempat_lahir       text not null default '' check (char_length(tempat_lahir) <= 80),
  tanggal_lahir      date check (tanggal_lahir is null or tanggal_lahir between '1990-01-01' and current_date),
  agama              text not null default '' check (char_length(agama) <= 30),
  alamat             text not null default '' check (char_length(alamat) <= 300),
  telepon            text not null default '' check (char_length(telepon) <= 30),
  email              text not null default '' check (char_length(email) <= 120),
  tahun_masuk        integer check (tahun_masuk is null or tahun_masuk between 1989 and 2100),
  status             text not null default 'aktif' check (status in ('aktif', 'lulus', 'mutasi', 'keluar', 'nonaktif')),
  keterangan_status  text not null default '' check (char_length(keterangan_status) <= 300),
  user_id            uuid unique references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);
create index if not exists siswa_nama_idx on public.siswa (lower(nama)) where deleted_at is null;
create index if not exists siswa_status_idx on public.siswa (status) where deleted_at is null;

create table if not exists public.anggota_kelas (
  id               uuid primary key default gen_random_uuid(),
  siswa_id         uuid not null references public.siswa (id),
  kelas_id         uuid not null references public.kelas (id),
  tahun_ajaran_id  uuid not null references public.tahun_ajaran (id),
  created_at       timestamptz not null default now(),
  unique (siswa_id, tahun_ajaran_id)
);
create index if not exists anggota_kelas_kelas_idx on public.anggota_kelas (kelas_id);

-- tahun ajaran anggota selalu mengikuti kelasnya
create or replace function public.isi_tahun_ajaran_anggota()
returns trigger language plpgsql set search_path = '' as $$
begin
  select k.tahun_ajaran_id into new.tahun_ajaran_id from public.kelas k where k.id = new.kelas_id;
  return new;
end $$;
drop trigger if exists isi_tahun_ajaran_anggota on public.anggota_kelas;
create trigger isi_tahun_ajaran_anggota before insert or update of kelas_id on public.anggota_kelas
  for each row execute function public.isi_tahun_ajaran_anggota();

create table if not exists public.orang_tua (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null check (char_length(nama) between 2 and 150),
  telepon     text not null default '' check (char_length(telepon) <= 30),
  email       text not null default '' check (char_length(email) <= 120),
  pekerjaan   text not null default '' check (char_length(pekerjaan) <= 80),
  user_id     uuid unique references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.siswa_orang_tua (
  siswa_id      uuid not null references public.siswa (id),
  orang_tua_id  uuid not null references public.orang_tua (id),
  hubungan      text not null check (hubungan in ('ayah', 'ibu', 'wali')),
  primary key (siswa_id, orang_tua_id)
);

-- ---------------------------------------------------------------------
-- 4. Fungsi bantu hak akses data siswa
-- ---------------------------------------------------------------------
create or replace function public.pegawai_saya()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.pegawai where user_id = auth.uid() and deleted_at is null limit 1;
$$;

create or replace function public.bisa_lihat_siswa(sid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    public.punya_izin('data_induk.baca')
    or exists (select 1 from public.siswa s where s.id = sid and s.user_id = auth.uid())
    or exists (select 1 from public.siswa_orang_tua so join public.orang_tua o on o.id = so.orang_tua_id
               where so.siswa_id = sid and o.user_id = auth.uid())
    or exists (select 1 from public.anggota_kelas ak
               join public.kelas k on k.id = ak.kelas_id
               join public.tahun_ajaran t on t.id = k.tahun_ajaran_id
               where ak.siswa_id = sid and t.aktif and k.deleted_at is null
                 and k.wali_kelas_id is not null and k.wali_kelas_id = public.pegawai_saya());
$$;

revoke all on function public.pegawai_saya(), public.bisa_lihat_siswa(uuid) from public;
grant execute on function public.pegawai_saya(), public.bisa_lihat_siswa(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Audit & updated_at untuk tabel baru
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['pengguna', 'pengguna_peran', 'peran_izin', 'tahun_ajaran', 'pegawai', 'kelas',
                           'siswa', 'anggota_kelas', 'orang_tua', 'siswa_orang_tua'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.catat_audit()', t);
  end loop;
  foreach t in array array['pengguna', 'tahun_ajaran', 'pegawai', 'kelas', 'siswa', 'orang_tua'] loop
    execute format('drop trigger if exists updated_at_%1$s on public.%1$I', t);
    execute format('create trigger updated_at_%1$s before update on public.%1$I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['peran', 'izin', 'peran_izin', 'pengguna', 'pengguna_peran', 'tahun_ajaran', 'pegawai',
                           'kelas', 'siswa', 'anggota_kelas', 'orang_tua', 'siswa_orang_tua'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke truncate on public.%I from authenticated', t);
  end loop;
end $$;

-- tidak ada hapus permanen untuk data inti (pakai status / deleted_at)
revoke delete on public.pengguna, public.tahun_ajaran, public.pegawai, public.kelas, public.siswa, public.orang_tua
  from authenticated;

-- peran / izin / matriks: dibaca semua pengguna login, diubah super admin
drop policy if exists "baca peran" on public.peran;
create policy "baca peran" on public.peran for select to authenticated using (true);
drop policy if exists "baca izin" on public.izin;
create policy "baca izin" on public.izin for select to authenticated using (true);
drop policy if exists "baca peran_izin" on public.peran_izin;
create policy "baca peran_izin" on public.peran_izin for select to authenticated using (true);
drop policy if exists "super admin atur peran_izin" on public.peran_izin;
create policy "super admin atur peran_izin" on public.peran_izin for all to authenticated
  using ((select public.punya_peran('super_admin'))) with check ((select public.punya_peran('super_admin')));

-- pengguna
drop policy if exists "pengguna lihat" on public.pengguna;
create policy "pengguna lihat" on public.pengguna for select to authenticated
  using (user_id = auth.uid() or (select public.punya_izin('pengguna.kelola')) or (select public.punya_izin('audit.baca')));
drop policy if exists "pengguna tambah" on public.pengguna;
create policy "pengguna tambah" on public.pengguna for insert to authenticated with check ((select public.punya_izin('pengguna.kelola')));
drop policy if exists "pengguna ubah" on public.pengguna;
create policy "pengguna ubah" on public.pengguna for update to authenticated
  using ((select public.punya_izin('pengguna.kelola'))) with check ((select public.punya_izin('pengguna.kelola')));

-- pengguna_peran
drop policy if exists "peran pengguna lihat" on public.pengguna_peran;
create policy "peran pengguna lihat" on public.pengguna_peran for select to authenticated
  using (user_id = auth.uid() or (select public.punya_izin('pengguna.kelola')));
drop policy if exists "peran pengguna tambah" on public.pengguna_peran;
create policy "peran pengguna tambah" on public.pengguna_peran for insert to authenticated with check ((select public.punya_izin('pengguna.kelola')));
drop policy if exists "peran pengguna hapus" on public.pengguna_peran;
create policy "peran pengguna hapus" on public.pengguna_peran for delete to authenticated using ((select public.punya_izin('pengguna.kelola')));

-- tahun ajaran & kelas: dibaca semua pengguna login (tidak sensitif)
drop policy if exists "baca tahun ajaran" on public.tahun_ajaran;
create policy "baca tahun ajaran" on public.tahun_ajaran for select to authenticated using (true);
drop policy if exists "kelola tahun ajaran" on public.tahun_ajaran;
create policy "kelola tahun ajaran" on public.tahun_ajaran for insert to authenticated with check ((select public.punya_izin('data_induk.kelola')));
drop policy if exists "ubah tahun ajaran" on public.tahun_ajaran;
create policy "ubah tahun ajaran" on public.tahun_ajaran for update to authenticated
  using ((select public.punya_izin('data_induk.kelola'))) with check ((select public.punya_izin('data_induk.kelola')));

drop policy if exists "baca kelas" on public.kelas;
create policy "baca kelas" on public.kelas for select to authenticated using (deleted_at is null or (select public.punya_izin('data_induk.baca')));
drop policy if exists "tambah kelas" on public.kelas;
create policy "tambah kelas" on public.kelas for insert to authenticated with check ((select public.punya_izin('data_induk.kelola')));
drop policy if exists "ubah kelas" on public.kelas;
create policy "ubah kelas" on public.kelas for update to authenticated
  using ((select public.punya_izin('data_induk.kelola'))) with check ((select public.punya_izin('data_induk.kelola')));

-- pegawai: seluruhnya untuk yang berizin baca; selain itu hanya dirinya sendiri
drop policy if exists "baca pegawai" on public.pegawai;
create policy "baca pegawai" on public.pegawai for select to authenticated
  using ((select public.punya_izin('data_induk.baca')) or user_id = auth.uid());
drop policy if exists "tambah pegawai" on public.pegawai;
create policy "tambah pegawai" on public.pegawai for insert to authenticated with check ((select public.punya_izin('data_induk.kelola')));
drop policy if exists "ubah pegawai" on public.pegawai;
create policy "ubah pegawai" on public.pegawai for update to authenticated
  using ((select public.punya_izin('data_induk.kelola'))) with check ((select public.punya_izin('data_induk.kelola')));

-- siswa
drop policy if exists "baca siswa" on public.siswa;
create policy "baca siswa" on public.siswa for select to authenticated
  using ((select public.punya_izin('data_induk.baca')) or public.bisa_lihat_siswa(id));
drop policy if exists "tambah siswa" on public.siswa;
create policy "tambah siswa" on public.siswa for insert to authenticated with check ((select public.punya_izin('data_induk.kelola')));
drop policy if exists "ubah siswa" on public.siswa;
create policy "ubah siswa" on public.siswa for update to authenticated
  using ((select public.punya_izin('data_induk.kelola'))) with check ((select public.punya_izin('data_induk.kelola')));

-- anggota kelas
drop policy if exists "baca anggota" on public.anggota_kelas;
create policy "baca anggota" on public.anggota_kelas for select to authenticated
  using ((select public.punya_izin('data_induk.baca')) or public.bisa_lihat_siswa(siswa_id));
drop policy if exists "kelola anggota" on public.anggota_kelas;
create policy "kelola anggota" on public.anggota_kelas for all to authenticated
  using ((select public.punya_izin('data_induk.kelola'))) with check ((select public.punya_izin('data_induk.kelola')));

-- orang tua
drop policy if exists "baca orang tua" on public.orang_tua;
create policy "baca orang tua" on public.orang_tua for select to authenticated
  using ((select public.punya_izin('data_induk.baca')) or user_id = auth.uid()
         or exists (select 1 from public.siswa_orang_tua so where so.orang_tua_id = id and public.bisa_lihat_siswa(so.siswa_id)));
drop policy if exists "tambah orang tua" on public.orang_tua;
create policy "tambah orang tua" on public.orang_tua for insert to authenticated with check ((select public.punya_izin('data_induk.kelola')));
drop policy if exists "ubah orang tua" on public.orang_tua;
create policy "ubah orang tua" on public.orang_tua for update to authenticated
  using ((select public.punya_izin('data_induk.kelola'))) with check ((select public.punya_izin('data_induk.kelola')));

drop policy if exists "baca relasi ortu" on public.siswa_orang_tua;
create policy "baca relasi ortu" on public.siswa_orang_tua for select to authenticated using (public.bisa_lihat_siswa(siswa_id));
drop policy if exists "kelola relasi ortu" on public.siswa_orang_tua;
create policy "kelola relasi ortu" on public.siswa_orang_tua for all to authenticated
  using ((select public.punya_izin('data_induk.kelola'))) with check ((select public.punya_izin('data_induk.kelola')));

-- audit log: kini berdasarkan izin audit.baca
drop policy if exists "super admin baca audit" on public.audit_log;
drop policy if exists "baca audit" on public.audit_log;
create policy "baca audit" on public.audit_log for select to authenticated using ((select public.punya_izin('audit.baca')));

-- ---------------------------------------------------------------------
-- 7. Impor massal (semua-atau-tidak-sama-sekali; tunduk pada RLS)
-- ---------------------------------------------------------------------
create or replace function public.kunci_kelas(nama text)
returns text language sql immutable as $$
  select regexp_replace(upper(coalesce(nama, '')), '[^A-Z0-9]', '', 'g');
$$;

-- "x 2", "X.2", "10-2" → "X-2"
create or replace function public.nama_kelas_baku(nama text)
returns text language sql immutable set search_path = '' as $$
  with t as (
    select upper(trim(nama)) as n,
           case when upper(trim(nama)) ~ '^(XII|12)' then 'XII'
                when upper(trim(nama)) ~ '^(XI|11)' then 'XI'
                when upper(trim(nama)) ~ '^(X|10)' then 'X' end as tk
  )
  select case when tk is null then n
         else tk || coalesce(nullif('-' || regexp_replace(regexp_replace(n, '^(XII|XI|X|12|11|10)', ''), '^[^A-Z0-9]+', ''), '-'), '')
         end
  from t;
$$;

create or replace function public.impor_siswa(data jsonb, perbarui boolean default false, buat_kelas boolean default true)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  r jsonb; i int := 0;
  ta uuid; sid uuid; kid uuid; oid uuid;
  v_nisn text; v_nama text; v_kelas text; v_tingkat text; v_tgl date;
  baru int := 0; diperbarui int := 0; dilewati int := 0; kelas_baru int := 0; ortu_baru int := 0;
begin
  if not public.punya_izin('data_induk.kelola') then
    raise exception 'Anda tidak berhak mengimpor data siswa' using errcode = '42501';
  end if;
  select id into ta from public.tahun_ajaran where aktif;

  for r in select * from jsonb_array_elements(data) loop
    i := i + 1;
    v_nisn := nullif(trim(r ->> 'nisn'), '');
    v_nama := trim(r ->> 'nama');
    v_tgl  := nullif(r ->> 'tanggal_lahir', '')::date;
    if v_nama is null or v_nama = '' then
      raise exception 'Baris %: nama wajib diisi', i using errcode = '23514';
    end if;

    sid := null;
    if v_nisn is not null then
      select id into sid from public.siswa where nisn = v_nisn;
    elsif v_tgl is not null then
      select id into sid from public.siswa where lower(nama) = lower(v_nama) and tanggal_lahir = v_tgl and nisn is null limit 1;
    end if;

    if sid is not null and not perbarui then
      dilewati := dilewati + 1;
      continue;
    end if;

    begin
      if sid is null then
        insert into public.siswa (nisn, nis, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, agama, alamat, telepon, tahun_masuk)
        values (v_nisn, nullif(trim(r ->> 'nis'), ''), v_nama, nullif(r ->> 'jenis_kelamin', ''),
                coalesce(trim(r ->> 'tempat_lahir'), ''), v_tgl, coalesce(trim(r ->> 'agama'), ''),
                coalesce(trim(r ->> 'alamat'), ''), coalesce(trim(r ->> 'telepon'), ''),
                nullif(r ->> 'tahun_masuk', '')::int)
        returning id into sid;
        baru := baru + 1;
      else
        -- isian kosong di file TIDAK menimpa data yang sudah ada
        update public.siswa set
          nis           = coalesce(nullif(trim(r ->> 'nis'), ''), nis),
          nama          = v_nama,
          jenis_kelamin = coalesce(nullif(r ->> 'jenis_kelamin', ''), jenis_kelamin),
          tempat_lahir  = coalesce(nullif(trim(r ->> 'tempat_lahir'), ''), tempat_lahir),
          tanggal_lahir = coalesce(v_tgl, tanggal_lahir),
          agama         = coalesce(nullif(trim(r ->> 'agama'), ''), agama),
          alamat        = coalesce(nullif(trim(r ->> 'alamat'), ''), alamat),
          telepon       = coalesce(nullif(trim(r ->> 'telepon'), ''), telepon),
          tahun_masuk   = coalesce(nullif(r ->> 'tahun_masuk', '')::int, tahun_masuk)
        where id = sid;
        diperbarui := diperbarui + 1;
      end if;
    exception when others then
      raise exception 'Baris % (%): %', i, v_nama, sqlerrm using errcode = sqlstate;
    end;

    -- kelas pada tahun ajaran aktif
    v_kelas := nullif(trim(r ->> 'kelas'), '');
    if v_kelas is not null then
      if ta is null then
        raise exception 'Belum ada tahun ajaran aktif. Buat dan aktifkan tahun ajaran sebelum mengimpor kelas.' using errcode = '23514';
      end if;
      select id into kid from public.kelas
        where tahun_ajaran_id = ta and deleted_at is null
          and public.kunci_kelas(public.nama_kelas_baku(nama)) = public.kunci_kelas(public.nama_kelas_baku(v_kelas)) limit 1;
      if kid is null then
        if not buat_kelas then
          raise exception 'Baris %: kelas "%" tidak ditemukan', i, v_kelas using errcode = '23514';
        end if;
        v_tingkat := case
          when upper(v_kelas) ~ '^XII' then 'XII'
          when upper(v_kelas) ~ '^XI' then 'XI'
          when upper(v_kelas) ~ '^X' then 'X'
          when v_kelas ~ '^12' then 'XII' when v_kelas ~ '^11' then 'XI' when v_kelas ~ '^10' then 'X'
        end;
        if v_tingkat is null then
          raise exception 'Baris %: tingkat kelas "%" tidak dikenali (contoh benar: X-1, XI-2, XII-3)', i, v_kelas using errcode = '23514';
        end if;
        insert into public.kelas (tahun_ajaran_id, tingkat, nama) values (ta, v_tingkat, public.nama_kelas_baku(v_kelas)) returning id into kid;
        kelas_baru := kelas_baru + 1;
      end if;
      insert into public.anggota_kelas (siswa_id, kelas_id) values (sid, kid)
        on conflict (siswa_id, tahun_ajaran_id) do update set kelas_id = excluded.kelas_id;
    end if;

    -- orang tua (hanya ditambahkan bila siswa belum punya data ayah/ibu)
    if nullif(trim(r ->> 'nama_ayah'), '') is not null
       and not exists (select 1 from public.siswa_orang_tua where siswa_id = sid and hubungan = 'ayah') then
      insert into public.orang_tua (nama, telepon) values (trim(r ->> 'nama_ayah'), coalesce(trim(r ->> 'telepon_ortu'), '')) returning id into oid;
      insert into public.siswa_orang_tua (siswa_id, orang_tua_id, hubungan) values (sid, oid, 'ayah');
      ortu_baru := ortu_baru + 1;
    end if;
    if nullif(trim(r ->> 'nama_ibu'), '') is not null
       and not exists (select 1 from public.siswa_orang_tua where siswa_id = sid and hubungan = 'ibu') then
      insert into public.orang_tua (nama, telepon) values (trim(r ->> 'nama_ibu'), coalesce(trim(r ->> 'telepon_ortu'), '')) returning id into oid;
      insert into public.siswa_orang_tua (siswa_id, orang_tua_id, hubungan) values (sid, oid, 'ibu');
      ortu_baru := ortu_baru + 1;
    end if;
  end loop;

  return jsonb_build_object('baru', baru, 'diperbarui', diperbarui, 'dilewati', dilewati,
                            'kelas_baru', kelas_baru, 'orang_tua_baru', ortu_baru, 'total', i);
end $$;

create or replace function public.impor_pegawai(data jsonb, perbarui boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  r jsonb; i int := 0; pid uuid;
  v_nip text; v_nuptk text; v_nama text;
  baru int := 0; diperbarui int := 0; dilewati int := 0;
begin
  if not public.punya_izin('data_induk.kelola') then
    raise exception 'Anda tidak berhak mengimpor data pegawai' using errcode = '42501';
  end if;
  for r in select * from jsonb_array_elements(data) loop
    i := i + 1;
    v_nip := nullif(trim(r ->> 'nip'), '');
    v_nuptk := nullif(trim(r ->> 'nuptk'), '');
    v_nama := trim(r ->> 'nama');
    if v_nama is null or v_nama = '' then
      raise exception 'Baris %: nama wajib diisi', i using errcode = '23514';
    end if;
    pid := null;
    if v_nip is not null then select id into pid from public.pegawai where nip = v_nip; end if;
    if pid is null and v_nuptk is not null then select id into pid from public.pegawai where nuptk = v_nuptk; end if;
    if pid is null and v_nip is null and v_nuptk is null then
      select id into pid from public.pegawai where lower(nama) = lower(v_nama) and deleted_at is null limit 1;
    end if;
    if pid is not null and not perbarui then dilewati := dilewati + 1; continue; end if;
    begin
      if pid is null then
        insert into public.pegawai (nama, nip, nuptk, jenis_kelamin, jenis, jabatan, telepon, email)
        values (v_nama, v_nip, v_nuptk, nullif(r ->> 'jenis_kelamin', ''), coalesce(nullif(r ->> 'jenis', ''), 'guru'),
                coalesce(trim(r ->> 'jabatan'), ''), coalesce(trim(r ->> 'telepon'), ''), coalesce(trim(r ->> 'email'), ''));
        baru := baru + 1;
      else
        update public.pegawai set
          nama = v_nama,
          nip = coalesce(v_nip, nip),
          nuptk = coalesce(v_nuptk, nuptk),
          jenis_kelamin = coalesce(nullif(r ->> 'jenis_kelamin', ''), jenis_kelamin),
          jenis = coalesce(nullif(r ->> 'jenis', ''), jenis),
          jabatan = coalesce(nullif(trim(r ->> 'jabatan'), ''), jabatan),
          telepon = coalesce(nullif(trim(r ->> 'telepon'), ''), telepon),
          email = coalesce(nullif(trim(r ->> 'email'), ''), email)
        where id = pid;
        diperbarui := diperbarui + 1;
      end if;
    exception when others then
      raise exception 'Baris % (%): %', i, v_nama, sqlerrm using errcode = sqlstate;
    end;
  end loop;
  return jsonb_build_object('baru', baru, 'diperbarui', diperbarui, 'dilewati', dilewati, 'total', i);
end $$;

revoke all on function public.impor_siswa(jsonb, boolean, boolean), public.impor_pegawai(jsonb, boolean) from public, anon;
grant execute on function public.impor_siswa(jsonb, boolean, boolean), public.impor_pegawai(jsonb, boolean) to authenticated;

-- Tampilan ringkas siswa + kelas aktif (mengikuti RLS tabel asal)
create or replace view public.siswa_kelas_aktif with (security_invoker = true) as
select s.id, s.nisn, s.nis, s.nama, s.jenis_kelamin, s.status, s.tahun_masuk, s.deleted_at,
       k.id as kelas_id, k.nama as kelas, k.tingkat
from public.siswa s
left join public.anggota_kelas ak on ak.siswa_id = s.id
  and ak.tahun_ajaran_id = (select id from public.tahun_ajaran where aktif)
left join public.kelas k on k.id = ak.kelas_id;
revoke all on public.siswa_kelas_aktif from anon;
grant select on public.siswa_kelas_aktif to authenticated;

-- Mengaktifkan satu tahun ajaran (yang lain otomatis nonaktif) dalam satu transaksi
create or replace function public.aktifkan_tahun_ajaran(ta_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not public.punya_izin('data_induk.kelola') then
    raise exception 'Tidak berhak' using errcode = '42501';
  end if;
  if not exists (select 1 from public.tahun_ajaran where id = ta_id) then
    raise exception 'Tahun ajaran tidak ditemukan' using errcode = 'P0002';
  end if;
  update public.tahun_ajaran set aktif = false where aktif and id <> ta_id;
  update public.tahun_ajaran set aktif = true where id = ta_id;
end $$;
revoke all on function public.aktifkan_tahun_ajaran(uuid) from public, anon;
grant execute on function public.aktifkan_tahun_ajaran(uuid) to authenticated;

-- Ringkasan kelas + jumlah siswa aktif + nama wali kelas (mengikuti RLS)
create or replace view public.kelas_ringkasan with (security_invoker = true) as
select k.id, k.tahun_ajaran_id, k.tingkat, k.nama, k.program, k.wali_kelas_id, k.deleted_at,
       t.nama as tahun_ajaran, t.aktif as tahun_aktif,
       p.nama as wali_kelas,
       (select count(*) from public.anggota_kelas ak join public.siswa s on s.id = ak.siswa_id
         where ak.kelas_id = k.id and s.status = 'aktif' and s.deleted_at is null)::int as jumlah_siswa
from public.kelas k
join public.tahun_ajaran t on t.id = k.tahun_ajaran_id
left join public.pegawai p on p.id = k.wali_kelas_id;
revoke all on public.kelas_ringkasan from anon;
grant select on public.kelas_ringkasan to authenticated;

-- Mencatat aktivitas penting yang bukan perubahan data (mis. ekspor data siswa)
create or replace function public.catat_aktivitas(nama_tabel text, aksi text, keterangan jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return; end if;
  if aksi not in ('EKSPOR', 'LOGIN', 'CETAK') then
    raise exception 'Aksi tidak dikenal' using errcode = '22023';
  end if;
  insert into public.audit_log (user_id, tabel, aksi, record_id, data_baru)
  values (auth.uid(), left(nama_tabel, 60), aksi, '', keterangan);
end $$;
revoke all on function public.catat_aktivitas(text, text, jsonb) from public, anon;
grant execute on function public.catat_aktivitas(text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
