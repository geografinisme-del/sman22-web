-- =====================================================================
-- Fase 13 — Modul 20 Alumni & Tracer Study, Modul 22 Mutu, Akreditasi & Manajemen Bukti
--   A. Alumni: registrasi + verifikasi identitas + persetujuan privasi, profil dengan consent per kolom, direktori opt-in,
--      tracer study (mesin survei, per angkatan), acara, mentoring (difasilitasi sekolah), peluang studi/kerja, kontribusi, cerita
--   B. Mutu: kerangka (berversi per periode) → standar → indikator, target/capaian/evaluasi diri + persetujuan,
--      bukti (tautan/berkas/modul sumber; versi, hash SHA-256, log akses), temuan, rencana perbaikan, analisis kesenjangan
-- Idempoten: aman dijalankan ulang.
-- =====================================================================

insert into public.peran (kode, nama, keterangan, urutan) values
  ('alumni', 'Alumni', 'Alumni terverifikasi (area alumni)', 20),
  ('admin_alumni', 'Admin Alumni', 'Mengelola data & layanan alumni', 7),
  ('tim_mutu', 'Tim Penjaminan Mutu', 'Mengelola standar, indikator, bukti & evaluasi diri', 7),
  ('auditor', 'Auditor Internal', 'Meninjau evaluasi diri & mencatat temuan', 7)
on conflict (kode) do nothing;
insert into public.izin (kode, keterangan) values
  ('alumni.kelola', 'Mengelola data, verifikasi & layanan alumni'),
  ('alumni.lihat', 'Melihat statistik alumni & tracer study'),
  ('mutu.kelola', 'Mengelola penjaminan mutu & akreditasi'),
  ('mutu.audit', 'Meninjau evaluasi diri & mencatat temuan'),
  ('mutu.lihat', 'Melihat dasbor mutu')
on conflict (kode) do update set keterangan = excluded.keterangan;
insert into public.peran_izin (peran, izin) values
  ('admin_alumni', 'alumni.kelola'), ('humas', 'alumni.kelola'), ('super_admin', 'alumni.kelola'),
  ('bk', 'alumni.lihat'), ('kepala_sekolah', 'alumni.lihat'), ('admin_alumni', 'alumni.lihat'), ('humas', 'alumni.lihat'), ('super_admin', 'alumni.lihat'),
  ('tim_mutu', 'mutu.kelola'), ('kepala_sekolah', 'mutu.kelola'), ('super_admin', 'mutu.kelola'),
  ('auditor', 'mutu.audit'), ('auditor', 'mutu.lihat'), ('tim_mutu', 'mutu.lihat'), ('kepala_sekolah', 'mutu.lihat'), ('wakasek', 'mutu.lihat'),
  ('kurikulum', 'mutu.lihat'), ('super_admin', 'mutu.lihat')
on conflict do nothing;

-- alumni bukan "staf" maupun "warga sekolah" aktif
create or replace function public.staf_aktif()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pengguna p join public.pengguna_peran pp on pp.user_id = p.user_id
                  where p.user_id = auth.uid() and p.aktif and pp.peran not in ('siswa', 'orang_tua', 'alumni'));
$$;
create or replace function public.warga_aktif()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pengguna p join public.pengguna_peran pp on pp.user_id = p.user_id
                  where p.user_id = auth.uid() and p.aktif and pp.peran <> 'alumni');
$$;

-- =====================================================================
-- A. Alumni
-- =====================================================================
create table if not exists public.angkatan_alumni (
  tahun       smallint primary key check (tahun between 1980 and 2100),
  nama        text not null default '' check (char_length(nama) <= 80),
  koordinator text not null default '' check (char_length(koordinator) <= 120),
  catatan     text not null default '' check (char_length(catatan) <= 500)
);

create table if not exists public.profil_alumni (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique,
  siswa_id         uuid unique references public.siswa (id),
  nama             text not null check (char_length(nama) between 2 and 120),
  tahun_lulus      smallint not null check (tahun_lulus between 1980 and 2100),
  jurusan          text not null default '' check (char_length(jurusan) <= 40),
  email            text not null default '' check (char_length(email) <= 150),
  telepon          text not null default '' check (char_length(telepon) <= 30),
  kota             text not null default '' check (char_length(kota) <= 80),
  status_kegiatan  text not null default 'belum_diisi' check (status_kegiatan in ('belum_diisi', 'kuliah', 'bekerja', 'wirausaha', 'kuliah_bekerja', 'mencari_kerja', 'lainnya')),
  institusi        text not null default '' check (char_length(institusi) <= 150),
  bidang           text not null default '' check (char_length(bidang) <= 120),
  jabatan          text not null default '' check (char_length(jabatan) <= 120),
  tautan_profesional text not null default '' check (tautan_profesional = '' or tautan_profesional ~ '^https://'),
  bio              text not null default '' check (char_length(bio) <= 1000),
  tampil_direktori boolean not null default false,
  field_direktori  text[] not null default '{}' check (field_direktori <@ array['kota', 'status_kegiatan', 'institusi', 'bidang', 'jabatan', 'tautan_profesional', 'bio', 'email', 'telepon', 'jurusan']),
  setuju_privasi_pada timestamptz,
  versi_privasi    text not null default '',
  terverifikasi    boolean not null default false,
  diverifikasi_oleh uuid,
  diperbarui_tracer timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index if not exists profil_alumni_tahun on public.profil_alumni (tahun_lulus);

create table if not exists public.pendaftaran_alumni (
  id             uuid primary key default gen_random_uuid(),
  nama           text not null check (char_length(nama) between 2 and 120),
  tahun_lulus    smallint not null check (tahun_lulus between 1980 and 2100),
  nisn           text not null default '' check (nisn = '' or nisn ~ '^[0-9]{10}$'),
  tanggal_lahir  date,
  jurusan        text not null default '' check (char_length(jurusan) <= 40),
  kelas_terakhir text not null default '' check (char_length(kelas_terakhir) <= 20),
  email          text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 150),
  telepon        text not null default '' check (char_length(telepon) <= 30),
  setuju_privasi boolean not null check (setuju_privasi),
  versi_privasi  text not null default '',
  ip_hash        text not null default '',
  status         text not null default 'menunggu' check (status in ('menunggu', 'disetujui', 'ditolak')),
  catatan        text not null default '' check (char_length(catatan) <= 300),
  profil_id      uuid references public.profil_alumni (id),
  diputuskan_oleh uuid,
  created_at     timestamptz not null default now()
);
create index if not exists pendaftaran_alumni_status on public.pendaftaran_alumni (status, created_at);

create table if not exists public.acara_alumni (
  id           uuid primary key default gen_random_uuid(),
  judul        text not null check (char_length(judul) between 3 and 150),
  deskripsi    text not null default '' check (char_length(deskripsi) <= 2000),
  mulai        timestamptz not null,
  tempat       text not null default '' check (char_length(tempat) <= 150),
  untuk_angkatan smallint[] not null default '{}',
  kuota        smallint not null default 0 check (kuota between 0 and 5000),
  publik       boolean not null default false,
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create table if not exists public.rsvp_acara_alumni (
  acara_id  uuid not null references public.acara_alumni (id),
  profil_id uuid not null references public.profil_alumni (id),
  hadir     boolean not null default true,
  waktu     timestamptz not null default now(),
  primary key (acara_id, profil_id)
);

create table if not exists public.peluang (
  id            uuid primary key default gen_random_uuid(),
  judul         text not null check (char_length(judul) between 3 and 150),
  jenis         text not null default 'beasiswa' check (jenis in ('beasiswa', 'kuliah', 'lowongan', 'magang', 'lomba', 'pelatihan', 'lainnya')),
  penyedia      text not null default '' check (char_length(penyedia) <= 150),
  deskripsi     text not null default '' check (char_length(deskripsi) <= 2000),
  tautan        text not null default '' check (tautan = '' or tautan ~ '^https://'),
  tenggat       date,
  sasaran       text not null default 'keduanya' check (sasaran in ('siswa', 'alumni', 'keduanya')),
  status        text not null default 'menunggu' check (status in ('menunggu', 'tayang', 'ditolak', 'arsip')),
  diajukan_oleh uuid default auth.uid(),
  created_at    timestamptz not null default now()
);
create index if not exists peluang_tayang on public.peluang (status, tenggat);

create table if not exists public.mentor_alumni (
  id         uuid primary key default gen_random_uuid(),
  profil_id  uuid not null unique references public.profil_alumni (id),
  bidang     text not null check (char_length(bidang) between 3 and 150),
  deskripsi  text not null default '' check (char_length(deskripsi) <= 1000),
  kuota      smallint not null default 3 check (kuota between 1 and 50),
  aktif      boolean not null default true,
  status     text not null default 'menunggu' check (status in ('menunggu', 'disetujui', 'ditolak')),
  created_at timestamptz not null default now()
);
create table if not exists public.mentoring (
  id         uuid primary key default gen_random_uuid(),
  mentor_id  uuid not null references public.mentor_alumni (id),
  siswa_id   uuid not null references public.siswa (id),
  topik      text not null check (char_length(topik) between 5 and 500),
  status     text not null default 'diajukan' check (status in ('diajukan', 'disetujui', 'ditolak', 'selesai')),
  catatan_sekolah text not null default '' check (char_length(catatan_sekolah) <= 500),
  diputuskan_oleh uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kontribusi_alumni (
  id           uuid primary key default gen_random_uuid(),
  profil_id    uuid references public.profil_alumni (id),
  nama_tampil  text not null default '' check (char_length(nama_tampil) <= 120),
  jenis        text not null default 'narasumber' check (jenis in ('donasi', 'beasiswa', 'narasumber', 'mentoring', 'barang', 'lainnya')),
  deskripsi    text not null check (char_length(deskripsi) between 5 and 1000),
  nilai        numeric(14, 2) check (nilai >= 0),
  tanggal      date not null default ((now() at time zone 'Asia/Jakarta')::date),
  status       text not null default 'diajukan' check (status in ('diajukan', 'diterima', 'selesai', 'ditolak')),
  tampil_publik boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.cerita_alumni (
  id         uuid primary key default gen_random_uuid(),
  profil_id  uuid not null references public.profil_alumni (id),
  judul      text not null check (char_length(judul) between 5 and 150),
  isi        text not null check (char_length(isi) between 50 and 5000),
  foto_url   text not null default '' check (foto_url = '' or foto_url ~ '^https://'),
  izin_publik boolean not null check (izin_publik),
  status     text not null default 'menunggu' check (status in ('menunggu', 'tayang', 'ditolak')),
  catatan    text not null default '' check (char_length(catatan) <= 300),
  created_at timestamptz not null default now()
);

-- helper ---------------------------------------------------------------
create or replace function public.alumni_saya() returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.profil_alumni where user_id = auth.uid() and deleted_at is null and terverifikasi limit 1;
$$;
grant execute on function public.alumni_saya() to authenticated;

create or replace function public.jaga_profil_alumni() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.punya_izin('alumni.kelola') then
    -- alumni hanya mengubah data dirinya; identitas & verifikasi dikunci
    new.user_id := old.user_id; new.siswa_id := old.siswa_id; new.nama := old.nama; new.tahun_lulus := old.tahun_lulus;
    new.terverifikasi := old.terverifikasi; new.diverifikasi_oleh := old.diverifikasi_oleh; new.deleted_at := old.deleted_at;
    if new.status_kegiatan is distinct from old.status_kegiatan or new.institusi is distinct from old.institusi then new.diperbarui_tracer := now(); end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists jaga_profil_alumni on public.profil_alumni;
create trigger jaga_profil_alumni before update on public.profil_alumni for each row execute function public.jaga_profil_alumni();

-- registrasi publik (tanpa login): disaring jebakan bot di aplikasi + batas per perangkat & per email
create or replace function public.daftar_alumni(p_nama text, p_tahun int, p_nisn text, p_tgl_lahir date, p_jurusan text, p_kelas text,
  p_email text, p_telepon text, p_setuju boolean, p_versi text, p_ip_hash text)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  if not coalesce(p_setuju, false) then raise exception 'Setujui kebijakan privasi untuk mendaftar' using errcode = '22023'; end if;
  if coalesce(p_ip_hash, '') <> '' and (select count(*) from public.pendaftaran_alumni where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Terlalu banyak pendaftaran dari perangkat ini. Coba lagi nanti.' using errcode = '22023';
  end if;
  if exists (select 1 from public.pendaftaran_alumni where lower(email) = lower(trim(p_email)) and status = 'menunggu') then
    raise exception 'Email ini sudah mendaftar dan sedang diverifikasi.' using errcode = '22023';
  end if;
  if exists (select 1 from public.profil_alumni where lower(email) = lower(trim(p_email)) and user_id is not null) then
    raise exception 'Email ini sudah terdaftar. Gunakan menu lupa kata sandi.' using errcode = '22023';
  end if;
  insert into public.pendaftaran_alumni (nama, tahun_lulus, nisn, tanggal_lahir, jurusan, kelas_terakhir, email, telepon, setuju_privasi, versi_privasi, ip_hash)
  values (trim(p_nama), p_tahun, coalesce(trim(p_nisn), ''), p_tgl_lahir, left(trim(coalesce(p_jurusan, '')), 40), left(trim(coalesce(p_kelas, '')), 20),
          lower(trim(p_email)), left(trim(coalesce(p_telepon, '')), 30), true, left(coalesce(p_versi, ''), 20), left(coalesce(p_ip_hash, ''), 64));
  for u in select public.pengguna_berizin('alumni.kelola') loop
    perform public.kirim_notif(u, 'alumni', 'Pendaftaran alumni baru', 'Angkatan ' || p_tahun || ' — perlu verifikasi.', '/admin/alumni/pendaftaran', 'biasa', false);
  end loop;
end $$;

-- saran pencocokan dengan data induk (NISN + tanggal lahir = kuat)
create or replace function public.cocok_pendaftaran_alumni(p_id uuid)
returns table (siswa_id uuid, nama text, nisn text, tanggal_lahir date, status text, tingkat text, profil_id uuid, sudah_berakun boolean)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare r public.pendaftaran_alumni;
begin
  if not public.punya_izin('alumni.kelola') then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  select * into r from public.pendaftaran_alumni where id = p_id;
  return query
    select s.id, s.nama, s.nisn, s.tanggal_lahir, s.status,
           case when r.nisn <> '' and s.nisn = r.nisn and s.tanggal_lahir = r.tanggal_lahir then 'kuat'
                when r.nisn <> '' and s.nisn = r.nisn then 'nisn'
                else 'nama' end,
           pa.id, pa.user_id is not null
    from public.siswa s left join public.profil_alumni pa on pa.siswa_id = s.id
    where s.deleted_at is null and ((r.nisn <> '' and s.nisn = r.nisn) or (lower(s.nama) = lower(r.nama)))
    limit 10;
end $$;

-- dipanggil server setelah akun dibuat dengan kunci layanan
create or replace function public.setujui_pendaftaran_alumni(p_id uuid, p_user uuid, p_siswa uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare r public.pendaftaran_alumni; pid uuid;
begin
  if not public.punya_izin('alumni.kelola') then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  select * into r from public.pendaftaran_alumni where id = p_id for update;
  if r.id is null or r.status <> 'menunggu' then raise exception 'Pendaftaran tidak menunggu verifikasi' using errcode = '22023'; end if;
  insert into public.pengguna (user_id, nama, email) values (p_user, r.nama, r.email) on conflict (user_id) do update set aktif = true;
  insert into public.pengguna_peran (user_id, peran) values (p_user, 'alumni') on conflict do nothing;
  select id into pid from public.profil_alumni where p_siswa is not null and siswa_id = p_siswa;
  if pid is not null then
    update public.profil_alumni set user_id = p_user, email = r.email, telepon = coalesce(nullif(r.telepon, ''), telepon), terverifikasi = true,
      diverifikasi_oleh = auth.uid(), setuju_privasi_pada = r.created_at, versi_privasi = r.versi_privasi where id = pid;
  else
    insert into public.profil_alumni (user_id, siswa_id, nama, tahun_lulus, jurusan, email, telepon, terverifikasi, diverifikasi_oleh, setuju_privasi_pada, versi_privasi)
    values (p_user, p_siswa, r.nama, r.tahun_lulus, r.jurusan, r.email, r.telepon, true, auth.uid(), r.created_at, r.versi_privasi) returning id into pid;
  end if;
  update public.pendaftaran_alumni set status = 'disetujui', profil_id = pid, diputuskan_oleh = auth.uid() where id = p_id;
  return pid;
end $$;

-- profil dari data lulusan (tanpa akun) — dasar tracer study & pencocokan
create or replace function public.impor_lulusan(p_tahun int) returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.punya_izin('alumni.kelola') then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  insert into public.profil_alumni (siswa_id, nama, tahun_lulus, terverifikasi, diverifikasi_oleh)
  select s.id, s.nama, p_tahun, true, auth.uid() from public.siswa s
  where s.status = 'lulus' and s.deleted_at is null and not exists (select 1 from public.profil_alumni pa where pa.siswa_id = s.id);
  get diagnostics n = row_count;
  insert into public.angkatan_alumni (tahun, nama) values (p_tahun, 'Angkatan ' || p_tahun) on conflict do nothing;
  return n;
end $$;

-- direktori: hanya alumni yang memilih tampil, hanya kolom yang diizinkan pemiliknya
create or replace function public.direktori_alumni(p_cari text default '', p_tahun int default null)
returns table (id uuid, nama text, tahun_lulus smallint, jurusan text, kota text, status_kegiatan text, institusi text, bidang text, jabatan text,
               tautan_profesional text, bio text, email text, telepon text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.nama, p.tahun_lulus,
    case when 'jurusan' = any (p.field_direktori) then p.jurusan end,
    case when 'kota' = any (p.field_direktori) then p.kota end,
    case when 'status_kegiatan' = any (p.field_direktori) then p.status_kegiatan end,
    case when 'institusi' = any (p.field_direktori) then p.institusi end,
    case when 'bidang' = any (p.field_direktori) then p.bidang end,
    case when 'jabatan' = any (p.field_direktori) then p.jabatan end,
    case when 'tautan_profesional' = any (p.field_direktori) then p.tautan_profesional end,
    case when 'bio' = any (p.field_direktori) then p.bio end,
    case when 'email' = any (p.field_direktori) then p.email end,
    case when 'telepon' = any (p.field_direktori) then p.telepon end
  from public.profil_alumni p
  where p.deleted_at is null and p.terverifikasi and p.tampil_direktori and p.user_id is not null
    and (public.alumni_saya() is not null or public.punya_izin('alumni.kelola') or public.punya_izin('alumni.lihat'))
    and (coalesce(trim(p_cari), '') = '' or p.nama ilike '%' || trim(p_cari) || '%'
         or ('institusi' = any (p.field_direktori) and p.institusi ilike '%' || trim(p_cari) || '%')
         or ('bidang' = any (p.field_direktori) and p.bidang ilike '%' || trim(p_cari) || '%'))
    and (p_tahun is null or p.tahun_lulus = p_tahun)
  order by p.tahun_lulus desc, p.nama limit 300;
$$;

-- statistik agregat (sel < 3 disamarkan) — tanpa data pribadi
create or replace function public.statistik_alumni()
returns table (tahun_lulus smallint, total int, berakun int, mengisi int, kuliah int, bekerja int, wirausaha int, kuliah_bekerja int, mencari_kerja int, lainnya int)
language sql stable security definer set search_path = '' as $$
  select x.tahun_lulus, x.total, x.berakun, x.mengisi,
    case when x.kuliah between 1 and 2 then null else x.kuliah end, case when x.bekerja between 1 and 2 then null else x.bekerja end,
    case when x.wirausaha between 1 and 2 then null else x.wirausaha end, case when x.kb between 1 and 2 then null else x.kb end,
    case when x.mk between 1 and 2 then null else x.mk end, case when x.ln between 1 and 2 then null else x.ln end
  from (select p.tahun_lulus, count(*)::int total, count(*) filter (where p.user_id is not null)::int berakun,
          count(*) filter (where p.status_kegiatan <> 'belum_diisi')::int mengisi,
          count(*) filter (where p.status_kegiatan = 'kuliah')::int kuliah, count(*) filter (where p.status_kegiatan = 'bekerja')::int bekerja,
          count(*) filter (where p.status_kegiatan = 'wirausaha')::int wirausaha, count(*) filter (where p.status_kegiatan = 'kuliah_bekerja')::int kb,
          count(*) filter (where p.status_kegiatan = 'mencari_kerja')::int mk, count(*) filter (where p.status_kegiatan = 'lainnya')::int ln
        from public.profil_alumni p where p.deleted_at is null group by p.tahun_lulus) x
  where public.punya_izin('alumni.kelola') or public.punya_izin('alumni.lihat')
  order by x.tahun_lulus desc;
$$;
-- ringkasan publik untuk website (hanya total & persentase, minimal 10 responden)
create or replace function public.ringkasan_alumni_publik()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when count(*) filter (where status_kegiatan <> 'belum_diisi') < 10 then jsonb_build_object('cukup', false, 'alumni', count(*) filter (where user_id is not null))
    else jsonb_build_object('cukup', true, 'alumni', count(*) filter (where user_id is not null),
      'responden', count(*) filter (where status_kegiatan <> 'belum_diisi'),
      'persen_kuliah', round(100.0 * count(*) filter (where status_kegiatan in ('kuliah', 'kuliah_bekerja')) / nullif(count(*) filter (where status_kegiatan <> 'belum_diisi'), 0)),
      'persen_bekerja', round(100.0 * count(*) filter (where status_kegiatan in ('bekerja', 'wirausaha', 'kuliah_bekerja')) / nullif(count(*) filter (where status_kegiatan <> 'belum_diisi'), 0))) end
  from public.profil_alumni where deleted_at is null and terverifikasi;
$$;

create or replace function public.rsvp_acara_alumni_set(p_acara uuid, p_hadir boolean) returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := public.alumni_saya(); a public.acara_alumni; n int;
begin
  if me is null then raise exception 'Khusus alumni terverifikasi' using errcode = '42501'; end if;
  select * into a from public.acara_alumni where id = p_acara and deleted_at is null and mulai > now();
  if a.id is null then raise exception 'Acara tidak tersedia' using errcode = '22023'; end if;
  if p_hadir and a.kuota > 0 then
    select count(*) into n from public.rsvp_acara_alumni where acara_id = p_acara and hadir and profil_id <> me;
    if n >= a.kuota then raise exception 'Kuota acara penuh' using errcode = '22023'; end if;
  end if;
  insert into public.rsvp_acara_alumni (acara_id, profil_id, hadir) values (p_acara, me, p_hadir)
  on conflict (acara_id, profil_id) do update set hadir = excluded.hadir, waktu = now();
end $$;

-- mentoring: siswa melihat mentor yang disetujui sekolah; pengajuan difasilitasi admin alumni/BK
create or replace function public.mentor_tersedia()
returns table (id uuid, nama text, tahun_lulus smallint, bidang text, deskripsi text, sisa int)
language sql stable security definer set search_path = '' as $$
  select m.id, p.nama, p.tahun_lulus, m.bidang, m.deskripsi,
         m.kuota - (select count(*)::int from public.mentoring x where x.mentor_id = m.id and x.status in ('diajukan', 'disetujui'))
  from public.mentor_alumni m join public.profil_alumni p on p.id = m.profil_id
  where m.aktif and m.status = 'disetujui' and p.deleted_at is null and (public.warga_aktif() or public.alumni_saya() is not null)
  order by m.bidang;
$$;
create or replace function public.ajukan_mentoring(p_mentor uuid, p_topik text) returns void language plpgsql security definer set search_path = '' as $$
declare sid uuid := public.siswa_login(); u uuid;
begin
  if sid is null then raise exception 'Khusus siswa' using errcode = '42501'; end if;
  if (select sisa from public.mentor_tersedia() where id = p_mentor) is distinct from null and (select sisa from public.mentor_tersedia() where id = p_mentor) <= 0 then
    raise exception 'Kuota mentor ini sudah penuh' using errcode = '22023';
  end if;
  if not exists (select 1 from public.mentor_alumni where id = p_mentor and aktif and status = 'disetujui') then raise exception 'Mentor tidak tersedia' using errcode = '22023'; end if;
  if exists (select 1 from public.mentoring where mentor_id = p_mentor and siswa_id = sid and status in ('diajukan', 'disetujui')) then
    raise exception 'Anda sudah mengajukan ke mentor ini' using errcode = '22023';
  end if;
  insert into public.mentoring (mentor_id, siswa_id, topik) values (p_mentor, sid, trim(p_topik));
  for u in select public.pengguna_berizin('alumni.kelola') loop
    perform public.kirim_notif(u, 'alumni', 'Permintaan mentoring alumni', 'Perlu persetujuan sekolah.', '/admin/alumni/mentoring', 'biasa', false);
  end loop;
end $$;
create or replace function public.notif_mentoring() returns trigger language plpgsql security definer set search_path = '' as $$
declare um uuid; us uuid;
begin
  if new.status <> old.status then
    select p.user_id into um from public.mentor_alumni m join public.profil_alumni p on p.id = m.profil_id where m.id = new.mentor_id;
    us := (select user_id from public.siswa where id = new.siswa_id);
    if new.status = 'disetujui' then
      if um is not null then perform public.kirim_notif(um, 'alumni', 'Ada siswa yang Anda mentori', 'Lihat di area alumni → Mentoring.', '/alumni/akun/mentoring', 'biasa', false); end if;
      if us is not null then perform public.kirim_notif(us, 'alumni', 'Mentoring disetujui sekolah', coalesce(nullif(new.catatan_sekolah, ''), 'Sekolah akan mengatur pertemuan.'), '/portal/alumni', 'biasa', false); end if;
    elsif new.status = 'ditolak' and us is not null then
      perform public.kirim_notif(us, 'alumni', 'Mentoring belum dapat difasilitasi', coalesce(nullif(new.catatan_sekolah, ''), '—'), '/portal/alumni', 'biasa', false);
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists notif_mentoring on public.mentoring;
create trigger notif_mentoring before update on public.mentoring for each row execute function public.notif_mentoring();
-- mentor hanya melihat siswa yang sudah disetujui sekolah (nama & kelas)
create or replace function public.mentoring_saya()
returns table (id uuid, siswa text, kelas text, topik text, status text, catatan_sekolah text, dibuat timestamptz)
language sql stable security definer set search_path = '' as $$
  select x.id, s.nama, coalesce((select k.nama from public.anggota_kelas ak join public.kelas k on k.id = ak.kelas_id join public.tahun_ajaran t on t.id = ak.tahun_ajaran_id and t.aktif where ak.siswa_id = s.id limit 1), ''),
         x.topik, x.status, x.catatan_sekolah, x.created_at
  from public.mentoring x join public.mentor_alumni m on m.id = x.mentor_id join public.siswa s on s.id = x.siswa_id
  where m.profil_id = public.alumni_saya() and x.status in ('disetujui', 'selesai') order by x.created_at desc;
$$;
create or replace function public.daftar_mentoring()
returns table (id uuid, mentor text, bidang text, siswa text, kelas text, topik text, status text, catatan_sekolah text, dibuat timestamptz)
language sql stable security definer set search_path = '' as $$
  select x.id, p.nama, m.bidang, s.nama, coalesce((select k.nama from public.anggota_kelas ak join public.kelas k on k.id = ak.kelas_id join public.tahun_ajaran t on t.id = ak.tahun_ajaran_id and t.aktif where ak.siswa_id = s.id limit 1), ''),
         x.topik, x.status, x.catatan_sekolah, x.created_at
  from public.mentoring x join public.mentor_alumni m on m.id = x.mentor_id join public.profil_alumni p on p.id = m.profil_id join public.siswa s on s.id = x.siswa_id
  where public.punya_izin('alumni.kelola') or public.punya_izin('bk.rujukan')
  order by case x.status when 'diajukan' then 1 else 2 end, x.created_at desc limit 300;
$$;

create or replace function public.cerita_alumni_publik(p_batas int default 12)
returns table (id uuid, judul text, isi text, foto_url text, nama text, tahun_lulus smallint, institusi text, dibuat timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, c.judul, c.isi, c.foto_url, p.nama, p.tahun_lulus, case when 'institusi' = any (p.field_direktori) then p.institusi else '' end, c.created_at
  from public.cerita_alumni c join public.profil_alumni p on p.id = c.profil_id
  where c.status = 'tayang' and c.izin_publik and p.deleted_at is null order by c.created_at desc limit least(greatest(p_batas, 1), 50);
$$;
create or replace function public.acara_alumni_publik()
returns table (id uuid, judul text, deskripsi text, mulai timestamptz, tempat text)
language sql stable security definer set search_path = '' as $$
  select id, judul, left(deskripsi, 300), mulai, tempat from public.acara_alumni where publik and deleted_at is null and mulai > now() order by mulai limit 10;
$$;
create or replace function public.kontribusi_publik()
returns table (nama text, jenis text, deskripsi text, tanggal date)
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(k.nama_tampil, ''), 'Alumni'), k.jenis, left(k.deskripsi, 200), k.tanggal from public.kontribusi_alumni k
  where k.tampil_publik and k.status in ('diterima', 'selesai') order by k.tanggal desc limit 20;
$$;

revoke all on function public.daftar_alumni(text, int, text, date, text, text, text, text, boolean, text, text), public.ringkasan_alumni_publik(),
  public.cerita_alumni_publik(int), public.acara_alumni_publik(), public.kontribusi_publik() from public;
grant execute on function public.daftar_alumni(text, int, text, date, text, text, text, text, boolean, text, text), public.ringkasan_alumni_publik(),
  public.cerita_alumni_publik(int), public.acara_alumni_publik(), public.kontribusi_publik() to anon, authenticated;
revoke all on function public.cocok_pendaftaran_alumni(uuid), public.setujui_pendaftaran_alumni(uuid, uuid, uuid), public.impor_lulusan(int),
  public.direktori_alumni(text, int), public.statistik_alumni(), public.rsvp_acara_alumni_set(uuid, boolean), public.mentor_tersedia(),
  public.ajukan_mentoring(uuid, text), public.mentoring_saya(), public.daftar_mentoring() from public, anon;
grant execute on function public.cocok_pendaftaran_alumni(uuid), public.setujui_pendaftaran_alumni(uuid, uuid, uuid), public.impor_lulusan(int),
  public.direktori_alumni(text, int), public.statistik_alumni(), public.rsvp_acara_alumni_set(uuid, boolean), public.mentor_tersedia(),
  public.ajukan_mentoring(uuid, text), public.mentoring_saya(), public.daftar_mentoring() to authenticated;

-- ---- Tracer study memakai mesin survei (sasaran "alumni", bisa dibatasi per angkatan) ----
alter table public.survei drop constraint if exists survei_sasaran_check;
alter table public.survei add constraint survei_sasaran_check check (sasaran in ('publik', 'warga', 'siswa', 'ortu', 'pegawai', 'alumni'));
alter table public.survei add column if not exists angkatan smallint[] not null default '{}';
alter table public.jawaban_survei add column if not exists angkatan smallint;

create or replace function public._peran_survei() returns text language sql stable security definer set search_path = '' as $$
  select case when auth.uid() is null then 'publik'
              when public.siswa_login() is not null then 'siswa'
              when public.punya_peran('orang_tua') then 'ortu'
              when public.alumni_saya() is not null then 'alumni'
              when public.staf_aktif() then 'pegawai'
              else 'publik' end;
$$;
create or replace function public._angkatan_saya() returns smallint language sql stable security definer set search_path = '' as $$
  select tahun_lulus from public.profil_alumni where id = public.alumni_saya();
$$;
create or replace function public.survei_aktif()
returns table (id uuid, judul text, deskripsi text, sasaran text, selesai date, sudah boolean)
language sql stable security definer set search_path = '' as $$
  select s.id, s.judul, s.deskripsi, s.sasaran, s.selesai,
         auth.uid() is not null and exists (select 1 from public.jawaban_survei j where j.survei_id = s.id and j.user_id = auth.uid())
  from public.survei s
  where s.deleted_at is null and s.terbit and (now() at time zone 'Asia/Jakarta')::date between s.mulai and s.selesai
    and (s.sasaran = 'publik' or (s.sasaran = 'warga' and public.warga_aktif()) or s.sasaran = public._peran_survei())
    and (s.sasaran <> 'alumni' or cardinality(s.angkatan) = 0 or public._angkatan_saya() = any (s.angkatan))
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
  if s.sasaran = 'warga' and not public.warga_aktif() then raise exception 'Survei ini untuk warga sekolah' using errcode = '42501'; end if;
  if s.sasaran not in ('publik', 'warga') and s.sasaran <> peran then raise exception 'Survei ini bukan untuk Anda' using errcode = '42501'; end if;
  if s.sasaran = 'alumni' and cardinality(s.angkatan) > 0 and not (public._angkatan_saya() = any (s.angkatan)) then
    raise exception 'Survei ini untuk angkatan %', array_to_string(s.angkatan, ', ') using errcode = '42501';
  end if;
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
  insert into public.jawaban_survei (survei_id, user_id, ip_hash, peran, jawaban, angkatan)
  values (p_id, auth.uid(), left(coalesce(p_ip_hash, ''), 64), peran, bersih, case when peran = 'alumni' then public._angkatan_saya() end);
  if peran = 'alumni' then update public.profil_alumni set diperbarui_tracer = now() where id = public.alumni_saya(); end if;
end $$;
-- hasil: pengelola survei (humas) atau pengelola alumni untuk tracer study; per angkatan disamarkan bila < 3
create or replace function public.hasil_survei(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s public.survei; q jsonb; hasil jsonb := '[]'; per_peran jsonb; per_angkatan jsonb;
begin
  select * into s from public.survei where id = p_id;
  if not (public.punya_izin('humas.kelola') or (s.sasaran = 'alumni' and (public.punya_izin('alumni.kelola') or public.punya_izin('alumni.lihat')))) then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
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
  select coalesce(jsonb_object_agg(angkatan::text, case when n < 3 then null else n end), '{}') into per_angkatan
    from (select angkatan, count(*) n from public.jawaban_survei where survei_id = p_id and angkatan is not null group by angkatan) x;
  return jsonb_build_object('responden', (select count(*) from public.jawaban_survei where survei_id = p_id), 'per_peran', per_peran,
    'per_angkatan', per_angkatan, 'pertanyaan', hasil);
end $$;
grant execute on function public._angkatan_saya() to authenticated;
-- pengelola alumni boleh membuat survei tracer (sasaran alumni)
drop policy if exists "kelola survei tracer" on public.survei;
create policy "kelola survei tracer" on public.survei for all to authenticated
  using (sasaran = 'alumni' and (select public.punya_izin('alumni.kelola'))) with check (sasaran = 'alumni' and (select public.punya_izin('alumni.kelola')));

-- =====================================================================
-- B. Mutu, akreditasi & manajemen bukti
-- =====================================================================
create table if not exists public.kerangka_mutu (
  id              uuid primary key default gen_random_uuid(),
  kode            text not null check (char_length(kode) between 2 and 40),
  nama            text not null check (char_length(nama) between 3 and 200),
  versi           text not null default '1' check (char_length(versi) between 1 and 20),
  sumber_regulasi text not null default '' check (char_length(sumber_regulasi) <= 300),
  periode_mulai   date,
  periode_selesai date,
  status          text not null default 'draf' check (status in ('draf', 'aktif', 'arsip')),
  turunan_dari    uuid references public.kerangka_mutu (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (kode, versi)
);
alter table public.kerangka_mutu add column if not exists periode_aktif text not null default '' check (periode_aktif = '' or periode_aktif ~ '^[0-9]{4}(/[0-9]{4})?$');
create table if not exists public.standar_mutu (
  id             uuid primary key default gen_random_uuid(),
  kerangka_id    uuid not null references public.kerangka_mutu (id),
  kode           text not null check (char_length(kode) between 1 and 20),
  nama           text not null check (char_length(nama) between 3 and 200),
  deskripsi      text not null default '' check (char_length(deskripsi) <= 2000),
  koordinator_id uuid references public.pegawai (id),
  urutan         smallint not null default 0,
  unique (kerangka_id, kode)
);
create table if not exists public.indikator_mutu (
  id          uuid primary key default gen_random_uuid(),
  standar_id  uuid not null references public.standar_mutu (id),
  kode        text not null check (char_length(kode) between 1 and 30),
  nama        text not null check (char_length(nama) between 3 and 500),
  deskripsi   text not null default '' check (char_length(deskripsi) <= 3000),
  jenis       text not null default 'kualitatif' check (jenis in ('kualitatif', 'kuantitatif')),
  satuan      text not null default '' check (char_length(satuan) <= 30),
  cara_ukur   text not null default '' check (char_length(cara_ukur) <= 1000),
  sumber_data text not null default '' check (char_length(sumber_data) <= 200),
  bobot       numeric(6, 2) not null default 1 check (bobot >= 0),
  pemilik_id  uuid references public.pegawai (id),
  urutan      smallint not null default 0,
  unique (standar_id, kode)
);
create table if not exists public.evaluasi_indikator (
  id             uuid primary key default gen_random_uuid(),
  indikator_id   uuid not null references public.indikator_mutu (id),
  periode        text not null check (periode ~ '^[0-9]{4}(/[0-9]{4})?$'),
  target         text not null default '' check (char_length(target) <= 300),
  capaian        text not null default '' check (char_length(capaian) <= 300),
  nilai_target   numeric,
  nilai_capaian  numeric,
  skor           smallint check (skor between 1 and 4),
  status         text not null default 'belum' check (status in ('belum', 'proses', 'tercapai', 'tidak_tercapai')),
  evaluasi_diri  text not null default '' check (char_length(evaluasi_diri) <= 5000),
  catatan        text not null default '' check (char_length(catatan) <= 1000),
  persetujuan    text not null default 'draf' check (persetujuan in ('draf', 'diajukan', 'disetujui', 'revisi')),
  disetujui_oleh uuid,
  disetujui_pada timestamptz,
  diperbarui_oleh uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (indikator_id, periode)
);
create table if not exists public.reviu_mutu (
  id            bigint generated always as identity primary key,
  evaluasi_id   uuid not null references public.evaluasi_indikator (id),
  keputusan     text not null check (keputusan in ('diajukan', 'disetujui', 'revisi')),
  catatan       text not null default '' check (char_length(catatan) <= 1000),
  oleh          uuid default auth.uid(),
  waktu         timestamptz not null default now()
);

create table if not exists public.bukti_mutu (
  id             uuid primary key default gen_random_uuid(),
  judul          text not null check (char_length(judul) between 3 and 200),
  deskripsi      text not null default '' check (char_length(deskripsi) <= 1000),
  jenis          text not null check (jenis in ('berkas', 'tautan', 'modul')),
  berkas_path    text not null default '' check (char_length(berkas_path) <= 300),
  nama_berkas    text not null default '' check (char_length(nama_berkas) <= 200),
  ukuran         int,
  hash_sha256    text not null default '' check (hash_sha256 = '' or hash_sha256 ~ '^[0-9a-f]{64}$'),
  tautan         text not null default '' check (tautan = '' or tautan ~ '^https://'),
  sumber_modul   text not null default '' check (sumber_modul = '' or sumber_modul ~ '^[a-z_]{2,40}$'),
  sumber_ref     text not null default '' check (char_length(sumber_ref) <= 100),
  tanggal_dokumen date,
  versi          smallint not null default 1,
  versi_dari     uuid references public.bukti_mutu (id),
  digantikan     boolean not null default false,
  diunggah_oleh  uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  constraint bukti_isi check ((jenis = 'berkas' and berkas_path <> '' and hash_sha256 <> '') or (jenis = 'tautan' and tautan <> '') or (jenis = 'modul' and sumber_modul <> '' and sumber_ref <> ''))
);
create table if not exists public.tautan_bukti_mutu (
  bukti_id     uuid not null references public.bukti_mutu (id),
  indikator_id uuid not null references public.indikator_mutu (id),
  periode      text not null check (periode ~ '^[0-9]{4}(/[0-9]{4})?$'),
  catatan      text not null default '' check (char_length(catatan) <= 300),
  ditautkan_oleh uuid default auth.uid(),
  created_at   timestamptz not null default now(),
  primary key (bukti_id, indikator_id, periode)
);
create index if not exists tautan_bukti_indikator on public.tautan_bukti_mutu (indikator_id, periode);
create table if not exists public.akses_bukti_mutu (
  id       bigint generated always as identity primary key,
  bukti_id uuid not null references public.bukti_mutu (id),
  user_id  uuid default auth.uid(),
  aksi     text not null default 'buka' check (aksi in ('buka', 'unduh_paket')),
  integritas_ok boolean,
  waktu    timestamptz not null default now()
);

create table if not exists public.temuan_mutu (
  id           uuid primary key default gen_random_uuid(),
  kerangka_id  uuid not null references public.kerangka_mutu (id),
  indikator_id uuid references public.indikator_mutu (id),
  periode      text not null check (periode ~ '^[0-9]{4}(/[0-9]{4})?$'),
  jenis        text not null default 'minor' check (jenis in ('mayor', 'minor', 'observasi', 'peluang_perbaikan')),
  sumber       text not null default 'audit_internal' check (sumber in ('audit_internal', 'evaluasi_diri', 'visitasi', 'lainnya')),
  uraian       text not null check (char_length(uraian) between 5 and 2000),
  pj_id        uuid references public.pegawai (id),
  tenggat      date,
  status       text not null default 'terbuka' check (status in ('terbuka', 'tindak_lanjut', 'verifikasi', 'ditutup')),
  dicatat_oleh uuid default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create table if not exists public.rencana_perbaikan (
  id           uuid primary key default gen_random_uuid(),
  temuan_id    uuid references public.temuan_mutu (id),
  indikator_id uuid references public.indikator_mutu (id),
  kegiatan     text not null check (char_length(kegiatan) between 5 and 500),
  pj_id        uuid references public.pegawai (id),
  tenggat      date,
  status       text not null default 'rencana' check (status in ('rencana', 'berjalan', 'selesai', 'batal')),
  hasil        text not null default '' check (char_length(hasil) <= 2000),
  bukti_id     uuid references public.bukti_mutu (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint rencana_acuan check (temuan_id is not null or indikator_id is not null)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('mutu', 'mutu', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "unggah berkas privat sendiri" on storage.objects;
create policy "unggah berkas privat sendiri" on storage.objects for insert to authenticated
  with check (bucket_id in ('bukti', 'presensi', 'perangkat', 'tugas', 'sarpras', 'mutu') and split_part(name, '/', 1) = auth.uid()::text);
drop policy if exists "lihat berkas privat sendiri" on storage.objects;
create policy "lihat berkas privat sendiri" on storage.objects for select to authenticated
  using (bucket_id in ('bukti', 'presensi', 'perangkat', 'tugas', 'sarpras', 'mutu') and split_part(name, '/', 1) = auth.uid()::text);

-- hak -------------------------------------------------------------------
create or replace function public.tim_mutu() returns boolean language sql stable security definer set search_path = '' as $$
  select public.punya_izin('mutu.kelola') or public.punya_izin('mutu.audit') or public.punya_izin('mutu.lihat');
$$;
create or replace function public.pemilik_indikator(p_ind uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.indikator_mutu i join public.standar_mutu s on s.id = i.standar_id
                 where i.id = p_ind and public.pegawai_saya() is not null and (i.pemilik_id = public.pegawai_saya() or s.koordinator_id = public.pegawai_saya()));
$$;
create or replace function public.pemilik_mutu() returns boolean language sql stable security definer set search_path = '' as $$
  select public.pegawai_saya() is not null and (exists (select 1 from public.indikator_mutu where pemilik_id = public.pegawai_saya())
      or exists (select 1 from public.standar_mutu where koordinator_id = public.pegawai_saya()));
$$;
grant execute on function public.tim_mutu(), public.pemilik_indikator(uuid), public.pemilik_mutu() to authenticated;

-- penjaga: pemilik hanya mengubah isian evaluasi saat draf/revisi; persetujuan lewat fungsi
create or replace function public.jaga_evaluasi_indikator() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('app.reviu_mutu', true) is distinct from '1' then
    if tg_op = 'UPDATE' then
      new.persetujuan := old.persetujuan; new.disetujui_oleh := old.disetujui_oleh; new.disetujui_pada := old.disetujui_pada;
      new.indikator_id := old.indikator_id; new.periode := old.periode;
      if old.persetujuan in ('diajukan', 'disetujui') and not public.punya_izin('mutu.kelola') then
        raise exception 'Evaluasi sedang ditinjau/sudah disetujui; minta tim mutu membuka kembali' using errcode = '22023';
      end if;
      if old.persetujuan = 'disetujui' then new.persetujuan := 'draf'; new.disetujui_oleh := null; new.disetujui_pada := null; end if;
    else
      new.persetujuan := 'draf'; new.disetujui_oleh := null; new.disetujui_pada := null;
    end if;
  end if;
  new.diperbarui_oleh := auth.uid(); new.updated_at := now();
  return new;
end $$;
drop trigger if exists jaga_evaluasi_indikator on public.evaluasi_indikator;
create trigger jaga_evaluasi_indikator before insert or update on public.evaluasi_indikator for each row execute function public.jaga_evaluasi_indikator();

create or replace function public.jaga_bukti_mutu() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.diunggah_oleh := auth.uid();
    if new.versi_dari is not null then
      new.versi := coalesce((select versi from public.bukti_mutu where id = new.versi_dari), 0) + 1;
      perform set_config('app.versi_bukti', '1', true);
      update public.bukti_mutu set digantikan = true where id = new.versi_dari;
      perform set_config('app.versi_bukti', '0', true);
    end if;
  elsif current_setting('app.versi_bukti', true) is distinct from '1' then
    -- isi bukti tidak dapat diubah (integritas); perbarui dengan versi baru
    new := old;
  end if;
  return new;
end $$;
drop trigger if exists jaga_bukti_mutu on public.bukti_mutu;
create trigger jaga_bukti_mutu before insert or update on public.bukti_mutu for each row execute function public.jaga_bukti_mutu();

-- fungsi ----------------------------------------------------------------
create or replace function public.salin_kerangka_mutu(p_id uuid, p_versi text, p_mulai date default null, p_selesai date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare k public.kerangka_mutu; baru uuid; s record; sb uuid;
begin
  if not public.punya_izin('mutu.kelola') then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  select * into k from public.kerangka_mutu where id = p_id;
  if k.id is null then raise exception 'Kerangka tidak ditemukan' using errcode = '22023'; end if;
  insert into public.kerangka_mutu (kode, nama, versi, sumber_regulasi, periode_mulai, periode_selesai, status, turunan_dari, periode_aktif)
  values (k.kode, k.nama, trim(p_versi), k.sumber_regulasi, p_mulai, p_selesai, 'draf', k.id, k.periode_aktif) returning id into baru;
  for s in select * from public.standar_mutu where kerangka_id = p_id loop
    insert into public.standar_mutu (kerangka_id, kode, nama, deskripsi, koordinator_id, urutan) values (baru, s.kode, s.nama, s.deskripsi, s.koordinator_id, s.urutan)
    returning id into sb;
    insert into public.indikator_mutu (standar_id, kode, nama, deskripsi, jenis, satuan, cara_ukur, sumber_data, bobot, pemilik_id, urutan)
    select sb, kode, nama, deskripsi, jenis, satuan, cara_ukur, sumber_data, bobot, pemilik_id, urutan from public.indikator_mutu where standar_id = s.id;
  end loop;
  return baru;
end $$;

create or replace function public.reviu_evaluasi(p_id uuid, p_keputusan text, p_catatan text default '')
returns text language plpgsql security definer set search_path = '' as $$
declare e public.evaluasi_indikator; u uuid; nm text;
begin
  select * into e from public.evaluasi_indikator where id = p_id for update;
  if e.id is null then raise exception 'Evaluasi tidak ditemukan' using errcode = '22023'; end if;
  if p_keputusan = 'diajukan' then
    if not (public.pemilik_indikator(e.indikator_id) or public.punya_izin('mutu.kelola')) or e.persetujuan not in ('draf', 'revisi') then
      raise exception 'Tidak dapat diajukan' using errcode = '42501'; end if;
    if e.status = 'belum' or (char_length(e.capaian) < 1 and e.nilai_capaian is null) then
      raise exception 'Isi capaian & status sebelum diajukan' using errcode = '22023'; end if;
  elsif p_keputusan in ('disetujui', 'revisi') then
    if not (public.punya_izin('mutu.kelola') or public.punya_izin('mutu.audit')) or e.persetujuan <> 'diajukan' then
      raise exception 'Tidak dapat ditinjau' using errcode = '42501'; end if;
    if p_keputusan = 'revisi' and char_length(trim(coalesce(p_catatan, ''))) < 5 then raise exception 'Tulis catatan revisi' using errcode = '22023'; end if;
  else raise exception 'Keputusan tidak dikenal' using errcode = '22023'; end if;
  perform set_config('app.reviu_mutu', '1', true);
  update public.evaluasi_indikator set persetujuan = p_keputusan,
    disetujui_oleh = case when p_keputusan = 'disetujui' then auth.uid() end, disetujui_pada = case when p_keputusan = 'disetujui' then now() end where id = p_id;
  perform set_config('app.reviu_mutu', '0', true);
  insert into public.reviu_mutu (evaluasi_id, keputusan, catatan) values (p_id, p_keputusan, left(coalesce(p_catatan, ''), 1000));
  select i.kode || ' ' || left(i.nama, 80), g.user_id into nm, u from public.indikator_mutu i left join public.pegawai g on g.id = i.pemilik_id where i.id = e.indikator_id;
  if p_keputusan = 'diajukan' then
    for u in select public.pengguna_berizin('mutu.kelola') loop
      perform public.kirim_notif(u, 'mutu', 'Evaluasi indikator diajukan', nm, '/admin/mutu/indikator/' || e.indikator_id || '?periode=' || e.periode, 'biasa', false);
    end loop;
  elsif u is not null then
    perform public.kirim_notif(u, 'mutu', case when p_keputusan = 'disetujui' then 'Evaluasi indikator disetujui' else 'Evaluasi indikator perlu revisi' end,
      nm || coalesce(' — ' || nullif(p_catatan, ''), ''), '/admin/mutu/indikator/' || e.indikator_id || '?periode=' || e.periode, 'biasa', false);
  end if;
  return p_keputusan;
end $$;

-- analisis kesenjangan per indikator (bukan klaim kepatuhan — penanda kelengkapan untuk ditinjau manusia)
create or replace function public.analisis_mutu(p_kerangka uuid, p_periode text)
returns table (standar_id uuid, standar_kode text, standar text, indikator_id uuid, kode text, nama text, pemilik text, target text, capaian text,
               skor smallint, status text, persetujuan text, jumlah_bukti int, temuan_terbuka int, rencana_aktif int, celah text[])
language sql stable security definer set search_path = '' as $$
  select s.id, s.kode, s.nama, i.id, i.kode, i.nama, coalesce(g.nama, '—'), coalesce(e.target, ''), coalesce(e.capaian, ''), e.skor,
         coalesce(e.status, 'belum'), coalesce(e.persetujuan, 'draf'),
         (select count(*)::int from public.tautan_bukti_mutu t join public.bukti_mutu b on b.id = t.bukti_id and not b.digantikan where t.indikator_id = i.id and t.periode = p_periode),
         (select count(*)::int from public.temuan_mutu t where t.indikator_id = i.id and t.periode = p_periode and t.status <> 'ditutup'),
         (select count(*)::int from public.rencana_perbaikan r where r.indikator_id = i.id and r.status in ('rencana', 'berjalan')),
         array_remove(array[
           case when i.pemilik_id is null then 'tanpa_pemilik' end,
           case when e.id is null or coalesce(e.target, '') = '' then 'target_kosong' end,
           case when e.id is null or e.status = 'belum' then 'belum_dievaluasi' end,
           case when not exists (select 1 from public.tautan_bukti_mutu t join public.bukti_mutu b on b.id = t.bukti_id and not b.digantikan where t.indikator_id = i.id and t.periode = p_periode) then 'tanpa_bukti' end,
           case when e.status = 'tidak_tercapai' and not exists (select 1 from public.rencana_perbaikan r where r.indikator_id = i.id and r.status <> 'batal') then 'tanpa_rencana_perbaikan' end,
           case when coalesce(e.persetujuan, 'draf') <> 'disetujui' then 'belum_disetujui' end], null)
  from public.indikator_mutu i join public.standar_mutu s on s.id = i.standar_id
  left join public.evaluasi_indikator e on e.indikator_id = i.id and e.periode = p_periode
  left join public.pegawai g on g.id = i.pemilik_id
  where s.kerangka_id = p_kerangka and (public.tim_mutu() or public.pemilik_indikator(i.id))
  order by s.urutan, s.kode, i.urutan, i.kode;
$$;

-- membuka bukti dicatat (untuk riwayat akses)
create or replace function public.catat_akses_bukti(p_id uuid, p_ok boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.akses_bukti_mutu (bukti_id, aksi, integritas_ok) values (p_id, 'buka', p_ok);
end $$;

-- penjadwal: indikator periode aktif tanpa bukti (mingguan per pemilik), rencana & temuan jatuh tempo
create or replace function public.pengingat_mutu() returns int language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0; hari date := (now() at time zone 'Asia/Jakarta')::date; per text;
begin
  for r in select g.user_id, k.id kerangka, count(*) jml from public.kerangka_mutu k join public.standar_mutu s on s.kerangka_id = k.id
            join public.indikator_mutu i on i.standar_id = s.id join public.pegawai g on g.id = i.pemilik_id
           where k.status = 'aktif' and k.periode_aktif <> '' and g.user_id is not null
             and not exists (select 1 from public.tautan_bukti_mutu t where t.indikator_id = i.id and t.periode = k.periode_aktif)
           group by g.user_id, k.id loop
    if not exists (select 1 from public.notifikasi where user_id = r.user_id and judul = 'Bukti mutu belum lengkap' and created_at > now() - interval '7 days') then
      perform public.kirim_notif(r.user_id, 'mutu', 'Bukti mutu belum lengkap', r.jml || ' indikator Anda belum memiliki bukti.', '/admin/mutu', 'biasa', false);
      n := n + 1;
    end if;
  end loop;
  for r in select g.user_id, x.kegiatan from public.rencana_perbaikan x join public.pegawai g on g.id = x.pj_id
           where x.status in ('rencana', 'berjalan') and x.tenggat between hari and hari + 3 and g.user_id is not null loop
    if not exists (select 1 from public.notifikasi where user_id = r.user_id and judul = 'Rencana perbaikan mendekati tenggat' and isi = left(r.kegiatan, 150) and created_at > now() - interval '3 days') then
      perform public.kirim_notif(r.user_id, 'mutu', 'Rencana perbaikan mendekati tenggat', left(r.kegiatan, 150), '/admin/mutu/temuan', 'biasa', false);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.pengingat_mutu() from public, anon, authenticated;
grant execute on function public.pengingat_mutu() to service_role;
revoke all on function public.salin_kerangka_mutu(uuid, text, date, date), public.reviu_evaluasi(uuid, text, text), public.analisis_mutu(uuid, text),
  public.catat_akses_bukti(uuid, boolean) from public, anon;
grant execute on function public.salin_kerangka_mutu(uuid, text, date, date), public.reviu_evaluasi(uuid, text, text), public.analisis_mutu(uuid, text),
  public.catat_akses_bukti(uuid, boolean) to authenticated;

-- =====================================================================
-- RLS
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['angkatan_alumni', 'profil_alumni', 'pendaftaran_alumni', 'acara_alumni', 'rsvp_acara_alumni', 'peluang', 'mentor_alumni',
                           'mentoring', 'kontribusi_alumni', 'cerita_alumni', 'kerangka_mutu', 'standar_mutu', 'indikator_mutu', 'evaluasi_indikator',
                           'reviu_mutu', 'bukti_mutu', 'tautan_bukti_mutu', 'akses_bukti_mutu', 'temuan_mutu', 'rencana_perbaikan'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke truncate on public.%I from authenticated', t);
    if t not in ('rsvp_acara_alumni', 'reviu_mutu', 'akses_bukti_mutu') then
      execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
      execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.catat_audit()', t);
    end if;
  end loop;
end $$;

-- ---- Alumni ----
drop policy if exists "baca angkatan" on public.angkatan_alumni;
create policy "baca angkatan" on public.angkatan_alumni for select to authenticated using (true);
drop policy if exists "kelola angkatan" on public.angkatan_alumni;
create policy "kelola angkatan" on public.angkatan_alumni for all to authenticated
  using ((select public.punya_izin('alumni.kelola'))) with check ((select public.punya_izin('alumni.kelola')));

drop policy if exists "baca profil alumni" on public.profil_alumni;
create policy "baca profil alumni" on public.profil_alumni for select to authenticated
  using (user_id = auth.uid() or (select public.punya_izin('alumni.kelola')));
drop policy if exists "ubah profil alumni" on public.profil_alumni;
create policy "ubah profil alumni" on public.profil_alumni for update to authenticated
  using (user_id = auth.uid() or (select public.punya_izin('alumni.kelola'))) with check (user_id = auth.uid() or (select public.punya_izin('alumni.kelola')));
drop policy if exists "tambah profil alumni" on public.profil_alumni;
create policy "tambah profil alumni" on public.profil_alumni for insert to authenticated with check ((select public.punya_izin('alumni.kelola')));
revoke delete on public.profil_alumni from authenticated;

drop policy if exists "kelola pendaftaran alumni" on public.pendaftaran_alumni;
create policy "kelola pendaftaran alumni" on public.pendaftaran_alumni for select to authenticated using ((select public.punya_izin('alumni.kelola')));
drop policy if exists "tolak pendaftaran alumni" on public.pendaftaran_alumni;
create policy "tolak pendaftaran alumni" on public.pendaftaran_alumni for update to authenticated
  using ((select public.punya_izin('alumni.kelola'))) with check ((select public.punya_izin('alumni.kelola')));
revoke insert, delete on public.pendaftaran_alumni from authenticated;

drop policy if exists "baca acara alumni" on public.acara_alumni;
create policy "baca acara alumni" on public.acara_alumni for select to authenticated
  using (deleted_at is null and ((select public.alumni_saya()) is not null or (select public.punya_izin('alumni.kelola'))));
drop policy if exists "kelola acara alumni" on public.acara_alumni;
create policy "kelola acara alumni" on public.acara_alumni for all to authenticated
  using ((select public.punya_izin('alumni.kelola'))) with check ((select public.punya_izin('alumni.kelola')));
revoke delete on public.acara_alumni from authenticated;
drop policy if exists "baca rsvp" on public.rsvp_acara_alumni;
create policy "baca rsvp" on public.rsvp_acara_alumni for select to authenticated
  using (profil_id = (select public.alumni_saya()) or (select public.punya_izin('alumni.kelola')));
revoke insert, update, delete on public.rsvp_acara_alumni from authenticated;

drop policy if exists "baca peluang" on public.peluang;
create policy "baca peluang" on public.peluang for select to authenticated
  using ((status = 'tayang' and (tenggat is null or tenggat >= current_date - 7)
          and ((sasaran in ('siswa', 'keduanya') and (select public.warga_aktif())) or (sasaran in ('alumni', 'keduanya') and (select public.alumni_saya()) is not null)))
         or diajukan_oleh = auth.uid() or (select public.punya_izin('alumni.kelola')));
drop policy if exists "ajukan peluang" on public.peluang;
create policy "ajukan peluang" on public.peluang for insert to authenticated
  with check (((select public.punya_izin('alumni.kelola'))) or ((select public.alumni_saya()) is not null and status = 'menunggu' and diajukan_oleh = auth.uid()));
drop policy if exists "kelola peluang" on public.peluang;
create policy "kelola peluang" on public.peluang for update to authenticated
  using ((select public.punya_izin('alumni.kelola'))) with check ((select public.punya_izin('alumni.kelola')));
revoke delete on public.peluang from authenticated;

drop policy if exists "baca mentor" on public.mentor_alumni;
create policy "baca mentor" on public.mentor_alumni for select to authenticated
  using (profil_id = (select public.alumni_saya()) or (select public.punya_izin('alumni.kelola')));
drop policy if exists "tawarkan mentor" on public.mentor_alumni;
create policy "tawarkan mentor" on public.mentor_alumni for insert to authenticated
  with check (profil_id = (select public.alumni_saya()) and status = 'menunggu');
drop policy if exists "ubah mentor" on public.mentor_alumni;
create policy "ubah mentor" on public.mentor_alumni for update to authenticated
  using (profil_id = (select public.alumni_saya()) or (select public.punya_izin('alumni.kelola')))
  with check (profil_id = (select public.alumni_saya()) or (select public.punya_izin('alumni.kelola')));
drop policy if exists "baca mentoring" on public.mentoring;
create policy "baca mentoring" on public.mentoring for select to authenticated
  using (public.diri_atau_anak(siswa_id) or (select public.punya_izin('alumni.kelola')) or (select public.punya_izin('bk.rujukan')));
drop policy if exists "putuskan mentoring" on public.mentoring;
create policy "putuskan mentoring" on public.mentoring for update to authenticated
  using ((select public.punya_izin('alumni.kelola')) or (select public.punya_izin('bk.rujukan')))
  with check ((select public.punya_izin('alumni.kelola')) or (select public.punya_izin('bk.rujukan')));
revoke insert, delete on public.mentoring from authenticated;

drop policy if exists "baca kontribusi" on public.kontribusi_alumni;
create policy "baca kontribusi" on public.kontribusi_alumni for select to authenticated
  using (profil_id = (select public.alumni_saya()) or (select public.punya_izin('alumni.kelola')) or (select public.punya_izin('alumni.lihat')));
drop policy if exists "tawarkan kontribusi" on public.kontribusi_alumni;
create policy "tawarkan kontribusi" on public.kontribusi_alumni for insert to authenticated
  with check ((select public.punya_izin('alumni.kelola')) or (profil_id = (select public.alumni_saya()) and status = 'diajukan'));
drop policy if exists "kelola kontribusi" on public.kontribusi_alumni;
create policy "kelola kontribusi" on public.kontribusi_alumni for update to authenticated
  using ((select public.punya_izin('alumni.kelola'))) with check ((select public.punya_izin('alumni.kelola')));
revoke delete on public.kontribusi_alumni from authenticated;

drop policy if exists "baca cerita" on public.cerita_alumni;
create policy "baca cerita" on public.cerita_alumni for select to authenticated
  using (profil_id = (select public.alumni_saya()) or (select public.punya_izin('alumni.kelola')));
drop policy if exists "tulis cerita" on public.cerita_alumni;
create policy "tulis cerita" on public.cerita_alumni for insert to authenticated with check (profil_id = (select public.alumni_saya()) and status = 'menunggu');
drop policy if exists "moderasi cerita" on public.cerita_alumni;
create policy "moderasi cerita" on public.cerita_alumni for update to authenticated
  using ((select public.punya_izin('alumni.kelola'))) with check ((select public.punya_izin('alumni.kelola')));
revoke delete on public.cerita_alumni from authenticated;

-- ---- Mutu ----
drop policy if exists "baca kerangka" on public.kerangka_mutu;
create policy "baca kerangka" on public.kerangka_mutu for select to authenticated using ((select public.tim_mutu()) or (select public.pemilik_mutu()));
drop policy if exists "kelola kerangka" on public.kerangka_mutu;
create policy "kelola kerangka" on public.kerangka_mutu for all to authenticated
  using ((select public.punya_izin('mutu.kelola'))) with check ((select public.punya_izin('mutu.kelola')));
revoke delete on public.kerangka_mutu from authenticated;
drop policy if exists "baca standar" on public.standar_mutu;
create policy "baca standar" on public.standar_mutu for select to authenticated using ((select public.tim_mutu()) or (select public.pemilik_mutu()));
drop policy if exists "kelola standar" on public.standar_mutu;
create policy "kelola standar" on public.standar_mutu for all to authenticated
  using ((select public.punya_izin('mutu.kelola'))) with check ((select public.punya_izin('mutu.kelola')));
drop policy if exists "baca indikator" on public.indikator_mutu;
create policy "baca indikator" on public.indikator_mutu for select to authenticated using ((select public.tim_mutu()) or (select public.pemilik_mutu()));
drop policy if exists "kelola indikator" on public.indikator_mutu;
create policy "kelola indikator" on public.indikator_mutu for all to authenticated
  using ((select public.punya_izin('mutu.kelola'))) with check ((select public.punya_izin('mutu.kelola')));

drop policy if exists "baca evaluasi" on public.evaluasi_indikator;
create policy "baca evaluasi" on public.evaluasi_indikator for select to authenticated using ((select public.tim_mutu()) or public.pemilik_indikator(indikator_id));
drop policy if exists "tulis evaluasi" on public.evaluasi_indikator;
create policy "tulis evaluasi" on public.evaluasi_indikator for insert to authenticated
  with check ((select public.punya_izin('mutu.kelola')) or public.pemilik_indikator(indikator_id));
drop policy if exists "ubah evaluasi" on public.evaluasi_indikator;
create policy "ubah evaluasi" on public.evaluasi_indikator for update to authenticated
  using ((select public.punya_izin('mutu.kelola')) or public.pemilik_indikator(indikator_id))
  with check ((select public.punya_izin('mutu.kelola')) or public.pemilik_indikator(indikator_id));
revoke delete on public.evaluasi_indikator from authenticated;
drop policy if exists "baca reviu" on public.reviu_mutu;
create policy "baca reviu" on public.reviu_mutu for select to authenticated
  using (exists (select 1 from public.evaluasi_indikator e where e.id = evaluasi_id));
revoke insert, update, delete on public.reviu_mutu from authenticated;

drop policy if exists "baca bukti mutu" on public.bukti_mutu;
create policy "baca bukti mutu" on public.bukti_mutu for select to authenticated
  using ((select public.tim_mutu()) or diunggah_oleh = auth.uid()
         or exists (select 1 from public.tautan_bukti_mutu t where t.bukti_id = id and public.pemilik_indikator(t.indikator_id)));
drop policy if exists "unggah bukti mutu" on public.bukti_mutu;
create policy "unggah bukti mutu" on public.bukti_mutu for insert to authenticated
  with check ((select public.punya_izin('mutu.kelola')) or (select public.pemilik_mutu()));
revoke update, delete on public.bukti_mutu from authenticated;
drop policy if exists "baca tautan bukti" on public.tautan_bukti_mutu;
create policy "baca tautan bukti" on public.tautan_bukti_mutu for select to authenticated using ((select public.tim_mutu()) or public.pemilik_indikator(indikator_id));
drop policy if exists "kelola tautan bukti" on public.tautan_bukti_mutu;
create policy "kelola tautan bukti" on public.tautan_bukti_mutu for all to authenticated
  using ((select public.punya_izin('mutu.kelola')) or public.pemilik_indikator(indikator_id))
  with check ((select public.punya_izin('mutu.kelola')) or public.pemilik_indikator(indikator_id));
drop policy if exists "baca akses bukti" on public.akses_bukti_mutu;
create policy "baca akses bukti" on public.akses_bukti_mutu for select to authenticated using ((select public.punya_izin('mutu.kelola')) or (select public.punya_izin('mutu.audit')));
revoke insert, update, delete on public.akses_bukti_mutu from authenticated;

drop policy if exists "baca temuan" on public.temuan_mutu;
create policy "baca temuan" on public.temuan_mutu for select to authenticated using ((select public.tim_mutu()) or pj_id = (select public.pegawai_saya()));
drop policy if exists "kelola temuan" on public.temuan_mutu;
create policy "kelola temuan" on public.temuan_mutu for all to authenticated
  using ((select public.punya_izin('mutu.kelola')) or (select public.punya_izin('mutu.audit')))
  with check ((select public.punya_izin('mutu.kelola')) or (select public.punya_izin('mutu.audit')));
revoke delete on public.temuan_mutu from authenticated;
drop policy if exists "baca rencana" on public.rencana_perbaikan;
create policy "baca rencana" on public.rencana_perbaikan for select to authenticated using ((select public.tim_mutu()) or pj_id = (select public.pegawai_saya()));
drop policy if exists "kelola rencana" on public.rencana_perbaikan;
create policy "kelola rencana" on public.rencana_perbaikan for all to authenticated
  using ((select public.punya_izin('mutu.kelola')) or (select public.punya_izin('mutu.audit')) or pj_id = (select public.pegawai_saya()))
  with check ((select public.punya_izin('mutu.kelola')) or (select public.punya_izin('mutu.audit')) or pj_id = (select public.pegawai_saya()));
revoke delete on public.rencana_perbaikan from authenticated;

notify pgrst, 'reload schema';
