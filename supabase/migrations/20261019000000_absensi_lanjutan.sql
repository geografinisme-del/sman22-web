-- =====================================================================
--  Fase 6b — Absensi lanjutan (Modul 09 & 10)
--  Absensi per jam pelajaran + jurnal mengajar, QR berputar (opsional),
--  bukti pada pengajuan koreksi, kelompok jam kerja pegawai,
--  pengajuan izin/sakit/dinas/cuti pegawai, presensi lokasi & swafoto (opsional, default mati).
--  Jalankan SETELAH 20261018000000_cms_lanjutan.sql. Idempotent.
-- =====================================================================

insert into public.izin (kode, keterangan) values
  ('izin_pegawai.setujui', 'Menyetujui izin/sakit/dinas/cuti guru & pegawai')
on conflict (kode) do update set keterangan = excluded.keterangan;
insert into public.peran_izin (peran, izin) values
  ('super_admin', 'izin_pegawai.setujui'), ('kepala_sekolah', 'izin_pegawai.setujui')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 1. Penyimpanan berkas privat: bukti (koreksi, izin) & swafoto presensi
--    Nama berkas selalu diawali <user_id>/ ; dibaca lewat tautan bertanda tangan dari server.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('bukti', 'bukti', false, 4194304, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('presensi', 'presensi', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "unggah berkas privat sendiri" on storage.objects;
create policy "unggah berkas privat sendiri" on storage.objects for insert to authenticated
  with check (bucket_id in ('bukti', 'presensi') and split_part(name, '/', 1) = auth.uid()::text);
drop policy if exists "lihat berkas privat sendiri" on storage.objects;
create policy "lihat berkas privat sendiri" on storage.objects for select to authenticated
  using (bucket_id in ('bukti', 'presensi') and split_part(name, '/', 1) = auth.uid()::text);

alter table public.pengajuan_koreksi add column if not exists bukti_path text not null default '' check (char_length(bukti_path) <= 300);
alter table public.izin_ortu add column if not exists bukti_path text not null default '' check (char_length(bukti_path) <= 300);

-- ---------------------------------------------------------------------
-- 2. Absensi per jam pelajaran (hanya yang tidak hadir di JP itu) + jurnal mengajar
-- ---------------------------------------------------------------------
create table if not exists public.absensi_jp (
  id           uuid primary key default gen_random_uuid(),
  jadwal_id    uuid not null references public.jadwal (id) on delete cascade,
  tanggal      date not null,
  siswa_id     uuid not null references public.siswa (id),
  status       text not null check (status in ('S', 'I', 'A', 'T', 'D')),  -- D = dispensasi (tugas sekolah)
  keterangan   text not null default '' check (char_length(keterangan) <= 200),
  dicatat_oleh uuid default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (jadwal_id, tanggal, siswa_id)
);
create index if not exists absensi_jp_tanggal_idx on public.absensi_jp (tanggal);

create table if not exists public.jurnal_jp (
  jadwal_id    uuid not null references public.jadwal (id) on delete cascade,
  tanggal      date not null,
  pegawai_id   uuid references public.pegawai (id),
  materi       text not null default '' check (char_length(materi) <= 1000),
  catatan      text not null default '' check (char_length(catatan) <= 500),
  jumlah_siswa int not null default 0,
  jumlah_hadir int not null default 0,
  dicatat_oleh uuid default auth.uid(),
  dicatat_pada timestamptz not null default now(),
  primary key (jadwal_id, tanggal)
);
create index if not exists jurnal_jp_tanggal_idx on public.jurnal_jp (tanggal);

-- Guru yang mengajar pada slot jadwal & tanggal itu (memperhitungkan guru pengganti)
create or replace function public.pengajar_jp(p_jadwal uuid, p_tgl date)
returns uuid language sql stable security definer set search_path = '' as $$
  select case
    when x.jenis = 'pengganti' then x.pegawai_pengganti_id
    when x.jenis in ('ditiadakan', 'tugas') then null
    else j.pegawai_id end
  from public.jadwal j
  left join public.perubahan_jadwal x on x.jadwal_id = j.id and x.tanggal = p_tgl
  where j.id = p_jadwal;
$$;

-- Boleh mengisi absensi JP: guru pengajar (hari itu s.d. 2 hari sesudahnya) atau absensi.kelola
create or replace function public.bisa_absen_jp(p_jadwal uuid, p_tgl date)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jadwal j join public.tahun_ajaran t on t.id = j.tahun_ajaran_id and t.aktif
     where j.id = p_jadwal and extract(isodow from p_tgl)::smallint = j.hari)
  and p_tgl <= public.hari_ini()
  and not exists (select 1 from public.hari_libur where tanggal = p_tgl)
  and (public.punya_izin('absensi.kelola')
       or (p_tgl >= public.hari_ini() - 2 and public.pengajar_jp(p_jadwal, p_tgl) = public.pegawai_saya()));
$$;

create or replace function public.bisa_lihat_jp(p_jadwal uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.punya_izin('absensi.lihat') or public.punya_izin('jadwal.kelola')
    or exists (select 1 from public.jadwal j join public.kelas k on k.id = j.kelas_id
               where j.id = p_jadwal and (j.pegawai_id = public.pegawai_saya() or k.wali_kelas_id = public.pegawai_saya()))
    or exists (select 1 from public.perubahan_jadwal x where x.jadwal_id = p_jadwal and x.pegawai_pengganti_id = public.pegawai_saya());
$$;
revoke all on function public.pengajar_jp(uuid, date), public.bisa_absen_jp(uuid, date), public.bisa_lihat_jp(uuid) from public, anon;
grant execute on function public.pengajar_jp(uuid, date), public.bisa_absen_jp(uuid, date), public.bisa_lihat_jp(uuid) to authenticated;

-- Simpan absensi satu JP (semua atau tidak sama sekali)
create or replace function public.simpan_absensi_jp(p_jadwal uuid, p_tgl date, p_isi jsonb, p_materi text default '', p_catatan text default '')
returns integer language plpgsql security definer set search_path = '' as $$
declare j public.jadwal; n_siswa int; n int;
begin
  if not public.bisa_absen_jp(p_jadwal, p_tgl) then
    raise exception 'Anda bukan pengajar jam ini, atau batas waktu pengisian (2 hari) sudah lewat' using errcode = '42501';
  end if;
  select * into j from public.jadwal where id = p_jadwal;
  create temp table if not exists _ajp (siswa_id uuid, status text, keterangan text) on commit drop;
  truncate _ajp;
  insert into _ajp select x.siswa_id, x.status, left(coalesce(x.keterangan, ''), 200)
    from jsonb_to_recordset(coalesce(p_isi, '[]'::jsonb)) as x(siswa_id uuid, status text, keterangan text);
  if exists (select 1 from _ajp where status not in ('S', 'I', 'A', 'T', 'D')) then
    raise exception 'Status tidak valid' using errcode = '22023';
  end if;
  if exists (select 1 from _ajp a where not exists (select 1 from public.anggota_kelas ak where ak.kelas_id = j.kelas_id and ak.siswa_id = a.siswa_id)) then
    raise exception 'Ada siswa yang bukan anggota kelas ini' using errcode = '22023';
  end if;
  delete from public.absensi_jp x where x.jadwal_id = p_jadwal and x.tanggal = p_tgl and not exists (select 1 from _ajp a where a.siswa_id = x.siswa_id);
  insert into public.absensi_jp (jadwal_id, tanggal, siswa_id, status, keterangan)
  select p_jadwal, p_tgl, siswa_id, status, keterangan from _ajp
  on conflict (jadwal_id, tanggal, siswa_id) do update
    set status = excluded.status, keterangan = excluded.keterangan, dicatat_oleh = auth.uid(), updated_at = now();
  select count(*) into n_siswa from public.anggota_kelas ak join public.siswa s on s.id = ak.siswa_id
   where ak.kelas_id = j.kelas_id and s.deleted_at is null and s.status = 'aktif';
  select count(*) into n from _ajp where status in ('S', 'I', 'A');
  insert into public.jurnal_jp (jadwal_id, tanggal, pegawai_id, materi, catatan, jumlah_siswa, jumlah_hadir)
  values (p_jadwal, p_tgl, coalesce(public.pengajar_jp(p_jadwal, p_tgl), public.pegawai_saya()), left(coalesce(p_materi, ''), 1000),
          left(coalesce(p_catatan, ''), 500), n_siswa, n_siswa - n)
  on conflict (jadwal_id, tanggal) do update
    set materi = excluded.materi, catatan = excluded.catatan, jumlah_siswa = excluded.jumlah_siswa,
        jumlah_hadir = excluded.jumlah_hadir, dicatat_oleh = auth.uid(), dicatat_pada = now();
  return n_siswa - n;
end $$;
revoke all on function public.simpan_absensi_jp(uuid, date, jsonb, text, text) from public, anon;
grant execute on function public.simpan_absensi_jp(uuid, date, jsonb, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. QR berputar (opsional). Kode berganti tiap 30 detik; berlaku maks. 60 detik.
--    QR bukan bukti tunggal: guru tetap memeriksa & menyimpan absensi.
-- ---------------------------------------------------------------------
create table if not exists public.kunci_qr (
  id    smallint primary key default 1 check (id = 1),
  kunci bytea not null default extensions.gen_random_bytes(32)
);
insert into public.kunci_qr (id) values (1) on conflict do nothing;
alter table public.kunci_qr enable row level security;
revoke all on public.kunci_qr from public, anon, authenticated;

create table if not exists public.scan_qr (
  jadwal_id uuid not null references public.jadwal (id) on delete cascade,
  tanggal   date not null,
  siswa_id  uuid not null references public.siswa (id),
  waktu     timestamptz not null default now(),
  primary key (jadwal_id, tanggal, siswa_id)
);

create or replace function public._tanda_qr(p_jadwal uuid, p_tgl date, p_slot bigint)
returns text language sql stable security definer set search_path = '' as $$
  select substr(encode(extensions.hmac(convert_to(p_jadwal::text || '.' || p_tgl::text || '.' || p_slot::text, 'UTF8'),
                                       (select kunci from public.kunci_qr where id = 1), 'sha256'), 'hex'), 1, 20);
$$;
revoke all on function public._tanda_qr(uuid, date, bigint) from public, anon, authenticated;

create or replace function public.token_qr(p_jadwal uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare slot bigint := floor(extract(epoch from now()) / 30)::bigint;
begin
  if not public.bisa_absen_jp(p_jadwal, public.hari_ini()) then
    raise exception 'Hanya pengajar jam ini yang dapat menampilkan QR' using errcode = '42501';
  end if;
  return p_jadwal::text || '.' || slot::text || '.' || public._tanda_qr(p_jadwal, public.hari_ini(), slot);
end $$;
revoke all on function public.token_qr(uuid) from public, anon;
grant execute on function public.token_qr(uuid) to authenticated;

create or replace function public.scan_qr(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  bagian text[] := string_to_array(coalesce(p_token, ''), '.');
  jid uuid; slot bigint; sekarang bigint := floor(extract(epoch from now()) / 30)::bigint;
  sid uuid; j public.jadwal; baru boolean;
begin
  if array_length(bagian, 1) <> 3 or bagian[1] !~ '^[0-9a-f-]{36}$' or bagian[2] !~ '^\d{1,12}$' then
    raise exception 'Kode QR tidak dikenali' using errcode = '22023';
  end if;
  jid := bagian[1]::uuid; slot := bagian[2]::bigint;
  if slot not in (sekarang, sekarang - 1) then
    raise exception 'Kode QR sudah kedaluwarsa. Pindai ulang QR di depan kelas.' using errcode = '22023';
  end if;
  if bagian[3] <> public._tanda_qr(jid, public.hari_ini(), slot) then
    raise exception 'Kode QR tidak sah' using errcode = '22023';
  end if;
  select id into sid from public.siswa where user_id = auth.uid() and deleted_at is null;
  if sid is null then raise exception 'Hanya akun siswa yang dapat memindai QR kehadiran' using errcode = '42501'; end if;
  select * into j from public.jadwal where id = jid;
  if not exists (select 1 from public.anggota_kelas where kelas_id = j.kelas_id and siswa_id = sid) then
    raise exception 'QR ini untuk kelas lain' using errcode = '42501';
  end if;
  insert into public.scan_qr (jadwal_id, tanggal, siswa_id) values (jid, public.hari_ini(), sid)
  on conflict do nothing;
  baru := found;
  return jsonb_build_object('baru', baru,
    'kelas', (select nama from public.kelas where id = j.kelas_id),
    'mapel', (select m.nama from public.penugasan_mengajar p join public.mapel m on m.id = p.mapel_id where p.id = j.penugasan_id),
    'jp', j.jp_ke, 'waktu', to_char(now() at time zone 'Asia/Jakarta', 'HH24:MI'));
end $$;
revoke all on function public.scan_qr(text) from public, anon;
grant execute on function public.scan_qr(text) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Kelompok jam kerja pegawai + pengaturan lokasi/swafoto
-- ---------------------------------------------------------------------
create table if not exists public.kelompok_kerja (
  id              uuid primary key default gen_random_uuid(),
  nama            text not null check (char_length(nama) between 2 and 60),
  jam_masuk       time not null default '07:15',
  toleransi_menit smallint not null default 0 check (toleransi_menit between 0 and 120),
  jam_pulang      time not null default '15:00',
  hari_kerja      smallint[] not null default '{1,2,3,4,5}' check (hari_kerja <@ '{1,2,3,4,5,6,7}'),
  wajib_lokasi    boolean not null default false,
  wajib_swafoto   boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  check (jam_pulang > jam_masuk)
);
create unique index if not exists kelompok_kerja_nama on public.kelompok_kerja (lower(nama)) where deleted_at is null;
insert into public.kelompok_kerja (nama, jam_masuk, jam_pulang)
select v.nama, v.masuk::time, v.pulang::time from (values ('Guru', '07:15', '15:00'), ('Tendik', '07:00', '15:30')) v(nama, masuk, pulang)
where not exists (select 1 from public.kelompok_kerja k where lower(k.nama) = lower(v.nama));

alter table public.pegawai add column if not exists kelompok_kerja_id uuid references public.kelompok_kerja (id);

alter table public.pengaturan_absensi add column if not exists lokasi_lat double precision check (lokasi_lat between -90 and 90);
alter table public.pengaturan_absensi add column if not exists lokasi_lng double precision check (lokasi_lng between -180 and 180);
alter table public.pengaturan_absensi add column if not exists lokasi_radius integer not null default 150 check (lokasi_radius between 30 and 2000);
alter table public.pengaturan_absensi add column if not exists retensi_swafoto_hari smallint not null default 30 check (retensi_swafoto_hari between 1 and 365);

alter table public.absensi_pegawai add column if not exists jarak_masuk integer;
alter table public.absensi_pegawai add column if not exists jarak_pulang integer;
alter table public.absensi_pegawai add column if not exists foto_masuk text not null default '';
alter table public.absensi_pegawai add column if not exists foto_pulang text not null default '';

-- jarak (meter) dua titik koordinat (haversine)
create or replace function public.jarak_meter(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns integer language sql immutable set search_path = '' as $$
  select round(2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2))))::int;
$$;

drop function if exists public.presensi_saya(text);
create or replace function public.presensi_saya(jenis text, p_lat double precision default null, p_lng double precision default null,
                                                p_akurasi double precision default null, p_foto text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  pid uuid := public.pegawai_saya();
  tgl date := public.hari_ini();
  jam time := (now() at time zone 'Asia/Jakarta')::time(0);
  atur public.pengaturan_absensi;
  kk public.kelompok_kerja;
  r public.absensi_pegawai;
  jarak int; batas_masuk time; pulang_mulai time; hari smallint[];
begin
  if pid is null then raise exception 'Akun Anda belum ditautkan ke data guru/pegawai' using errcode = '42501'; end if;
  select * into atur from public.pengaturan_absensi where id = 1;
  select k.* into kk from public.kelompok_kerja k join public.pegawai g on g.kelompok_kerja_id = k.id where g.id = pid and k.deleted_at is null;
  hari := coalesce(kk.hari_kerja, atur.hari_sekolah);
  batas_masuk := coalesce(kk.jam_masuk + make_interval(mins => kk.toleransi_menit), atur.jam_masuk_batas);
  pulang_mulai := coalesce(kk.jam_pulang, atur.jam_pulang_mulai);
  if extract(isodow from tgl)::smallint <> all (hari) or exists (select 1 from public.hari_libur where tanggal = tgl) then
    raise exception 'Hari ini bukan hari kerja Anda' using errcode = '22023';
  end if;

  if coalesce(kk.wajib_lokasi, false) then
    if atur.lokasi_lat is null then raise exception 'Titik lokasi sekolah belum diatur operator' using errcode = '22023'; end if;
    if p_lat is null or p_lng is null then raise exception 'Izinkan akses lokasi di browser untuk presensi' using errcode = '22023'; end if;
    if coalesce(p_akurasi, 9999) > 200 then raise exception 'Sinyal lokasi kurang akurat (±% m). Coba di tempat terbuka.', round(coalesce(p_akurasi, 9999)) using errcode = '22023'; end if;
    jarak := public.jarak_meter(p_lat, p_lng, atur.lokasi_lat, atur.lokasi_lng);
    if jarak > atur.lokasi_radius then
      raise exception 'Anda berada ±% m dari sekolah (batas % m)', jarak, atur.lokasi_radius using errcode = '22023';
    end if;
  end if;
  if coalesce(kk.wajib_swafoto, false) then
    if p_foto is null or split_part(p_foto, '/', 1) <> auth.uid()::text
       or not exists (select 1 from storage.objects o where o.bucket_id = 'presensi' and o.name = p_foto) then
      raise exception 'Ambil swafoto terlebih dahulu' using errcode = '22023';
    end if;
  end if;

  select * into r from public.absensi_pegawai where pegawai_id = pid and tanggal = tgl;
  if jenis = 'masuk' then
    if r.jam_masuk is not null then raise exception 'Anda sudah presensi masuk pukul %', to_char(r.jam_masuk, 'HH24:MI') using errcode = '23505'; end if;
    if r.id is not null and r.status in ('S', 'I', 'DL', 'C') then raise exception 'Hari ini Anda tercatat izin/sakit/dinas/cuti' using errcode = '22023'; end if;
    insert into public.absensi_pegawai (pegawai_id, tanggal, status, jam_masuk, jarak_masuk, foto_masuk)
    values (pid, tgl, case when jam > batas_masuk then 'T' else 'H' end, jam, jarak, coalesce(p_foto, ''))
    on conflict (pegawai_id, tanggal) do update
      set jam_masuk = excluded.jam_masuk, status = excluded.status, jarak_masuk = excluded.jarak_masuk, foto_masuk = excluded.foto_masuk;
  elsif jenis = 'pulang' then
    if r.jam_masuk is null then raise exception 'Belum ada presensi masuk hari ini' using errcode = '22023'; end if;
    if r.jam_pulang is not null then raise exception 'Anda sudah presensi pulang pukul %', to_char(r.jam_pulang, 'HH24:MI') using errcode = '23505'; end if;
    if jam < pulang_mulai then raise exception 'Presensi pulang dibuka pukul %', to_char(pulang_mulai, 'HH24:MI') using errcode = '22023'; end if;
    update public.absensi_pegawai set jam_pulang = jam, jarak_pulang = jarak, foto_pulang = coalesce(p_foto, '') where id = r.id;
  else
    raise exception 'Jenis presensi tidak dikenal' using errcode = '22023';
  end if;
  return jsonb_build_object('tanggal', tgl, 'jam', to_char(jam, 'HH24:MI'), 'jenis', jenis, 'jarak', jarak);
end $$;
revoke all on function public.presensi_saya(text, double precision, double precision, double precision, text) from public, anon;
grant execute on function public.presensi_saya(text, double precision, double precision, double precision, text) to authenticated;

-- Aturan presensi untuk pegawai yang login (ditampilkan di halaman Presensi Saya)
create or replace function public.aturan_presensi_saya()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'kelompok', k.nama,
    'jam_masuk', to_char(coalesce(k.jam_masuk + make_interval(mins => k.toleransi_menit), a.jam_masuk_batas), 'HH24:MI'),
    'jam_pulang', to_char(coalesce(k.jam_pulang, a.jam_pulang_mulai), 'HH24:MI'),
    'wajib_lokasi', coalesce(k.wajib_lokasi, false), 'wajib_swafoto', coalesce(k.wajib_swafoto, false),
    'radius', a.lokasi_radius, 'retensi', a.retensi_swafoto_hari)
  from public.pengaturan_absensi a
  left join public.pegawai g on g.id = public.pegawai_saya()
  left join public.kelompok_kerja k on k.id = g.kelompok_kerja_id and k.deleted_at is null
  where a.id = 1;
$$;
revoke all on function public.aturan_presensi_saya() from public, anon;
grant execute on function public.aturan_presensi_saya() to authenticated;

-- ---------------------------------------------------------------------
-- 5. Pengajuan izin/sakit/dinas luar/cuti oleh pegawai sendiri
-- ---------------------------------------------------------------------
create table if not exists public.pengajuan_izin_pegawai (
  id              uuid primary key default gen_random_uuid(),
  pegawai_id      uuid not null references public.pegawai (id),
  jenis           text not null check (jenis in ('S', 'I', 'DL', 'C')),
  tanggal_mulai   date not null,
  tanggal_selesai date not null,
  alasan          text not null check (char_length(alasan) between 5 and 500),
  bukti_path      text not null default '' check (char_length(bukti_path) <= 300),
  status          text not null default 'menunggu' check (status in ('menunggu', 'disetujui', 'ditolak', 'dibatalkan')),
  diajukan_oleh   uuid not null default auth.uid(),
  diajukan_pada   timestamptz not null default now(),
  diputus_oleh    uuid,
  diputus_pada    timestamptz,
  catatan         text not null default '' check (char_length(catatan) <= 300),
  check (tanggal_selesai >= tanggal_mulai and tanggal_selesai - tanggal_mulai <= 30)
);
create index if not exists izin_pegawai_menunggu_idx on public.pengajuan_izin_pegawai (diajukan_pada) where status = 'menunggu';

create or replace function public.jaga_izin_pegawai()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.pegawai_id := public.pegawai_saya();
  if new.pegawai_id is null then raise exception 'Akun Anda belum ditautkan ke data guru/pegawai' using errcode = '42501'; end if;
  new.diajukan_oleh := auth.uid(); new.status := 'menunggu'; new.diputus_oleh := null; new.diputus_pada := null;
  if new.tanggal_mulai < public.hari_ini() - 7 then
    raise exception 'Pengajuan paling lambat 7 hari setelah tanggalnya' using errcode = '22023';
  end if;
  if new.bukti_path <> '' and split_part(new.bukti_path, '/', 1) <> auth.uid()::text then
    raise exception 'Berkas bukti tidak sah' using errcode = '22023';
  end if;
  return new;
end $$;
drop trigger if exists jaga_izin_pegawai on public.pengajuan_izin_pegawai;
create trigger jaga_izin_pegawai before insert on public.pengajuan_izin_pegawai for each row execute function public.jaga_izin_pegawai();

create or replace function public.putuskan_izin_pegawai(p_id uuid, p_setuju boolean, p_catatan text default '')
returns integer language plpgsql security definer set search_path = '' as $$
declare z public.pengajuan_izin_pegawai; d date; n int := 0; hari smallint[];
begin
  if not public.punya_izin('izin_pegawai.setujui') then raise exception 'Tidak berhak' using errcode = '42501'; end if;
  select * into z from public.pengajuan_izin_pegawai where id = p_id for update;
  if z.id is null then raise exception 'Pengajuan tidak ditemukan' using errcode = 'P0002'; end if;
  if z.status <> 'menunggu' then raise exception 'Pengajuan sudah diproses' using errcode = '23514'; end if;
  if z.pegawai_id = public.pegawai_saya() then raise exception 'Tidak boleh menyetujui pengajuan sendiri' using errcode = '42501'; end if;
  update public.pengajuan_izin_pegawai
     set status = case when p_setuju then 'disetujui' else 'ditolak' end,
         diputus_oleh = auth.uid(), diputus_pada = now(), catatan = left(coalesce(p_catatan, ''), 300)
   where id = p_id;
  if p_setuju then
    select coalesce(k.hari_kerja, (select hari_sekolah from public.pengaturan_absensi where id = 1)) into hari
      from public.pegawai g left join public.kelompok_kerja k on k.id = g.kelompok_kerja_id where g.id = z.pegawai_id;
    for d in select g::date from generate_series(z.tanggal_mulai, z.tanggal_selesai, interval '1 day') g loop
      continue when extract(isodow from d)::smallint <> all (hari);
      continue when exists (select 1 from public.hari_libur where tanggal = d);
      insert into public.absensi_pegawai (pegawai_id, tanggal, status, keterangan)
      values (z.pegawai_id, d, z.jenis, left('Pengajuan disetujui: ' || z.alasan, 300))
      on conflict (pegawai_id, tanggal) do update set status = excluded.status, keterangan = excluded.keterangan
        where public.absensi_pegawai.jam_masuk is null;  -- tidak menimpa hari yang sudah presensi
      n := n + 1;
    end loop;
  end if;
  return n;
end $$;
revoke all on function public.putuskan_izin_pegawai(uuid, boolean, text) from public, anon;
grant execute on function public.putuskan_izin_pegawai(uuid, boolean, text) to authenticated;

create or replace function public.batalkan_izin_pegawai(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.pengajuan_izin_pegawai set status = 'dibatalkan', diputus_pada = now()
   where id = p_id and status = 'menunggu' and pegawai_id = public.pegawai_saya();
  if not found then raise exception 'Pengajuan tidak dapat dibatalkan' using errcode = '23514'; end if;
end $$;
revoke all on function public.batalkan_izin_pegawai(uuid) from public, anon;
grant execute on function public.batalkan_izin_pegawai(uuid) to authenticated;

-- Daftar siswa satu JP untuk guru pengajar (guru mapel tidak otomatis boleh membaca data siswa lain)
create or replace function public.siswa_jp(p_jadwal uuid, p_tgl date)
returns table (siswa_id uuid, nisn text, nama text, status_harian text, status_jp text, keterangan text, scan_pada timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.bisa_absen_jp(p_jadwal, p_tgl) or public.bisa_lihat_jp(p_jadwal)) then
    raise exception 'Tidak berhak' using errcode = '42501';
  end if;
  return query
  select s.id, s.nisn, s.nama, h.status, a.status, coalesce(a.keterangan, ''), q.waktu
    from public.jadwal j
    join public.anggota_kelas ak on ak.kelas_id = j.kelas_id
    join public.siswa s on s.id = ak.siswa_id and s.deleted_at is null and s.status = 'aktif'
    left join public.absensi_siswa h on h.siswa_id = s.id and h.tanggal = p_tgl
    left join public.absensi_jp a on a.siswa_id = s.id and a.jadwal_id = j.id and a.tanggal = p_tgl
    left join public.scan_qr q on q.siswa_id = s.id and q.jadwal_id = j.id and q.tanggal = p_tgl
   where j.id = p_jadwal
   order by s.nama;
end $$;
revoke all on function public.siswa_jp(uuid, date) from public, anon;
grant execute on function public.siswa_jp(uuid, date) to authenticated;

-- ---------------------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------------------
alter table public.absensi_jp enable row level security;
alter table public.jurnal_jp enable row level security;
alter table public.scan_qr enable row level security;
alter table public.kelompok_kerja enable row level security;
alter table public.pengajuan_izin_pegawai enable row level security;
revoke all on public.absensi_jp, public.jurnal_jp, public.scan_qr, public.kelompok_kerja, public.pengajuan_izin_pegawai from anon;
-- absensi JP, jurnal, scan hanya ditulis lewat fungsi
revoke insert, update, delete, truncate on public.absensi_jp, public.jurnal_jp, public.scan_qr from authenticated;
revoke delete, truncate on public.pengajuan_izin_pegawai from authenticated;

drop policy if exists "baca absensi jp" on public.absensi_jp;
create policy "baca absensi jp" on public.absensi_jp for select to authenticated
  using (public.bisa_lihat_jp(jadwal_id) or public.bisa_lihat_siswa(siswa_id));
drop policy if exists "baca jurnal jp" on public.jurnal_jp;
create policy "baca jurnal jp" on public.jurnal_jp for select to authenticated using (public.bisa_lihat_jp(jadwal_id));
drop policy if exists "baca scan qr" on public.scan_qr;
create policy "baca scan qr" on public.scan_qr for select to authenticated
  using (public.bisa_lihat_jp(jadwal_id) or exists (select 1 from public.siswa s where s.id = siswa_id and s.user_id = auth.uid()));

drop policy if exists "baca kelompok kerja" on public.kelompok_kerja;
create policy "baca kelompok kerja" on public.kelompok_kerja for select to authenticated using (true);
drop policy if exists "kelola kelompok kerja" on public.kelompok_kerja;
create policy "kelola kelompok kerja" on public.kelompok_kerja for all to authenticated
  using ((select public.punya_izin('absensi_pegawai.kelola'))) with check ((select public.punya_izin('absensi_pegawai.kelola')));

drop policy if exists "baca izin pegawai" on public.pengajuan_izin_pegawai;
create policy "baca izin pegawai" on public.pengajuan_izin_pegawai for select to authenticated
  using (pegawai_id = public.pegawai_saya() or (select public.punya_izin('izin_pegawai.setujui'))
         or (select public.punya_izin('absensi_pegawai.lihat')));
drop policy if exists "ajukan izin pegawai" on public.pengajuan_izin_pegawai;
create policy "ajukan izin pegawai" on public.pengajuan_izin_pegawai for insert to authenticated
  with check (public.pegawai_saya() is not null);

-- pengajuan koreksi: bukti harus milik pengaju
create or replace function public.jaga_bukti_koreksi()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.bukti_path <> '' and split_part(new.bukti_path, '/', 1) <> auth.uid()::text then
    raise exception 'Berkas bukti tidak sah' using errcode = '22023';
  end if;
  return new;
end $$;
drop trigger if exists jaga_bukti_koreksi on public.pengajuan_koreksi;
create trigger jaga_bukti_koreksi before insert on public.pengajuan_koreksi for each row execute function public.jaga_bukti_koreksi();
drop trigger if exists jaga_bukti_izin_ortu on public.izin_ortu;
create trigger jaga_bukti_izin_ortu before insert on public.izin_ortu for each row execute function public.jaga_bukti_koreksi();

do $$
declare t text;
begin
  foreach t in array array['absensi_jp', 'jurnal_jp', 'kelompok_kerja', 'pengajuan_izin_pegawai'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.catat_audit()', t);
  end loop;
end $$;
drop trigger if exists updated_at_kelompok_kerja on public.kelompok_kerja;
create trigger updated_at_kelompok_kerja before update on public.kelompok_kerja for each row execute function public.set_updated_at();

-- catat juga saat berkas privat dibuka
create or replace function public.catat_aktivitas(nama_tabel text, aksi text, keterangan jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return; end if;
  if aksi not in ('EKSPOR', 'LOGIN', 'CETAK', 'LIHAT') then
    raise exception 'Aksi tidak dikenal' using errcode = '22023';
  end if;
  insert into public.audit_log (user_id, tabel, aksi, record_id, data_baru)
  values (auth.uid(), left(nama_tabel, 60), aksi, '', keterangan);
end $$;

notify pgrst, 'reload schema';
