-- =====================================================================
--  Fase 7a — Kesiswaan: prestasi, pelanggaran berpoin, pembinaan, rujukan BK (Modul 11)
--  Prinsip: pembinaan lebih dulu, tidak ada peringkat pelanggaran publik,
--  aturan poin berversi (poin disalin saat dicatat sehingga riwayat tidak berubah).
--  Jalankan SETELAH 20261019000000_absensi_lanjutan.sql. Idempotent.
-- =====================================================================

insert into public.izin (kode, keterangan) values
  ('kesiswaan.lihat',  'Melihat catatan prestasi, pelanggaran & pembinaan seluruh siswa'),
  ('kesiswaan.kelola', 'Memverifikasi prestasi/pelanggaran dan mengatur aturan poin'),
  ('bk.rujukan',       'Menerima & menangani rujukan ke Bimbingan Konseling')
on conflict (kode) do update set keterangan = excluded.keterangan;
insert into public.peran_izin (peran, izin) values
  ('super_admin', 'kesiswaan.lihat'), ('super_admin', 'kesiswaan.kelola'), ('super_admin', 'bk.rujukan'),
  ('kesiswaan', 'kesiswaan.lihat'), ('kesiswaan', 'kesiswaan.kelola'),
  ('kepala_sekolah', 'kesiswaan.lihat'), ('wakasek', 'kesiswaan.lihat'),
  ('bk', 'kesiswaan.lihat'), ('bk', 'bk.rujukan')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 1. Aturan (dapat diubah sekolah)
-- ---------------------------------------------------------------------
create table if not exists public.pengaturan_kesiswaan (
  id                     smallint primary key default 1 check (id = 1),
  prestasi_kurangi_poin  boolean not null default false,
  updated_at             timestamptz not null default now()
);
insert into public.pengaturan_kesiswaan (id) values (1) on conflict do nothing;

create table if not exists public.jenis_pelanggaran (
  id           uuid primary key default gen_random_uuid(),
  kode         text not null default '' check (char_length(kode) <= 10),
  nama         text not null check (char_length(nama) between 3 and 150),
  kategori     text not null check (kategori in ('ringan', 'sedang', 'berat')),
  poin         smallint not null check (poin between 1 and 300),
  aktif        boolean not null default true,
  versi        smallint not null default 1,
  menggantikan uuid references public.jenis_pelanggaran (id),
  created_at   timestamptz not null default now()
);
create unique index if not exists jenis_pelanggaran_aktif on public.jenis_pelanggaran (lower(nama)) where aktif;
-- contoh awal — WAJIB disesuaikan dengan tata tertib sekolah
insert into public.jenis_pelanggaran (kode, nama, kategori, poin)
select v.kode, v.nama, v.kategori, v.poin from (values
  ('R1', 'Atribut seragam tidak lengkap', 'ringan', 5),
  ('R2', 'Rambut tidak sesuai ketentuan', 'ringan', 5),
  ('R3', 'Membuang sampah sembarangan', 'ringan', 5),
  ('R4', 'Menggunakan HP saat pembelajaran tanpa izin guru', 'ringan', 10),
  ('S1', 'Meninggalkan kelas/pelajaran tanpa izin', 'sedang', 15),
  ('S2', 'Tidak mengikuti upacara/kegiatan wajib tanpa keterangan', 'sedang', 15),
  ('S3', 'Berkata kasar atau tidak sopan kepada warga sekolah', 'sedang', 20),
  ('S4', 'Merusak fasilitas sekolah', 'sedang', 25),
  ('B1', 'Merokok/vape di lingkungan sekolah', 'berat', 50),
  ('B2', 'Perundungan (bullying)', 'berat', 75),
  ('B3', 'Berkelahi', 'berat', 75),
  ('B4', 'Membawa/menggunakan narkoba atau minuman keras', 'berat', 150)
) v(kode, nama, kategori, poin)
where not exists (select 1 from public.jenis_pelanggaran);

create table if not exists public.aturan_poin_prestasi (
  tingkat   text not null check (tingkat in ('sekolah', 'kota', 'provinsi', 'nasional', 'internasional')),
  peringkat text not null check (peringkat in ('juara1', 'juara2', 'juara3', 'harapan', 'finalis', 'peserta')),
  poin      smallint not null check (poin between 0 and 500),
  primary key (tingkat, peringkat)
);
insert into public.aturan_poin_prestasi (tingkat, peringkat, poin)
select t.t, p.p, (t.dasar * p.kali)::smallint
from (values ('sekolah', 5), ('kota', 15), ('provinsi', 30), ('nasional', 60), ('internasional', 100)) t(t, dasar)
cross join (values ('juara1', 1.0), ('juara2', 0.8), ('juara3', 0.6), ('harapan', 0.4), ('finalis', 0.3), ('peserta', 0.2)) p(p, kali)
on conflict do nothing;

create table if not exists public.aturan_tindakan_poin (
  ambang   smallint primary key check (ambang > 0),
  tindakan text not null check (char_length(tindakan) between 3 and 100)
);
insert into public.aturan_tindakan_poin (ambang, tindakan) values
  (25, 'Pembinaan oleh wali kelas'), (50, 'Pemanggilan orang tua'), (75, 'Surat Peringatan 1'),
  (100, 'Surat Peringatan 2 + rujukan BK'), (150, 'Surat Peringatan 3 / sidang dewan guru')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 2. Catatan siswa
-- ---------------------------------------------------------------------
create table if not exists public.pelanggaran_siswa (
  id                 uuid primary key default gen_random_uuid(),
  siswa_id           uuid not null references public.siswa (id),
  tahun_ajaran_id    uuid references public.tahun_ajaran (id),
  jenis_id           uuid not null references public.jenis_pelanggaran (id),
  nama_pelanggaran   text not null default '',
  kategori           text not null default 'ringan',
  poin               smallint not null default 0,
  tanggal            date not null,
  tempat             text not null default '' check (char_length(tempat) <= 120),
  kronologi          text not null check (char_length(kronologi) between 10 and 2000),
  saksi              text not null default '' check (char_length(saksi) <= 300),
  bukti_path         text not null default '' check (char_length(bukti_path) <= 300),
  status             text not null default 'dilaporkan' check (status in ('dilaporkan', 'terverifikasi', 'ditolak', 'dibatalkan')),
  dilaporkan_oleh    uuid not null default auth.uid(),
  dilaporkan_pada    timestamptz not null default now(),
  diverifikasi_oleh  uuid,
  diverifikasi_pada  timestamptz,
  catatan_verifikasi text not null default '' check (char_length(catatan_verifikasi) <= 500)
);
create index if not exists pelanggaran_siswa_idx on public.pelanggaran_siswa (siswa_id, tahun_ajaran_id);
create index if not exists pelanggaran_menunggu_idx on public.pelanggaran_siswa (dilaporkan_pada) where status = 'dilaporkan';

create table if not exists public.prestasi_siswa (
  id                 uuid primary key default gen_random_uuid(),
  siswa_id           uuid not null references public.siswa (id),
  tahun_ajaran_id    uuid references public.tahun_ajaran (id),
  nama_kegiatan      text not null check (char_length(nama_kegiatan) between 3 and 200),
  bidang             text not null check (bidang in ('akademik', 'olahraga', 'seni', 'keagamaan', 'kepemimpinan', 'lainnya')),
  tingkat            text not null check (tingkat in ('sekolah', 'kota', 'provinsi', 'nasional', 'internasional')),
  peringkat          text not null check (peringkat in ('juara1', 'juara2', 'juara3', 'harapan', 'finalis', 'peserta')),
  peserta            text not null default 'individu' check (peserta in ('individu', 'tim')),
  penyelenggara      text not null default '' check (char_length(penyelenggara) <= 150),
  pembina            text not null default '' check (char_length(pembina) <= 150),
  tanggal            date not null,
  bukti_path         text not null default '' check (char_length(bukti_path) <= 300),
  poin               smallint not null default 0,
  status             text not null default 'diajukan' check (status in ('diajukan', 'terverifikasi', 'ditolak')),
  diajukan_oleh      uuid not null default auth.uid(),
  diajukan_pada      timestamptz not null default now(),
  diverifikasi_oleh  uuid,
  diverifikasi_pada  timestamptz,
  catatan_verifikasi text not null default '' check (char_length(catatan_verifikasi) <= 500)
);
create index if not exists prestasi_siswa_idx on public.prestasi_siswa (siswa_id, tahun_ajaran_id);

create table if not exists public.pembinaan_siswa (
  id               uuid primary key default gen_random_uuid(),
  siswa_id         uuid not null references public.siswa (id),
  tahun_ajaran_id  uuid references public.tahun_ajaran (id),
  pelanggaran_id   uuid references public.pelanggaran_siswa (id),
  jenis            text not null check (jenis in ('bimbingan_wali', 'pemanggilan_ortu', 'kunjungan_rumah', 'perjanjian', 'tugas_sosial', 'skorsing', 'lainnya')),
  tanggal          date not null,
  uraian           text not null check (char_length(uraian) between 5 and 2000),
  tindak_lanjut    text not null default '' check (char_length(tindak_lanjut) <= 1000),
  status           text not null default 'direncanakan' check (status in ('direncanakan', 'selesai')),
  dicatat_oleh     uuid not null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists pembinaan_siswa_idx on public.pembinaan_siswa (siswa_id);

-- Rujukan ke BK: perujuk hanya melihat statusnya, catatan BK hanya untuk BK
create table if not exists public.rujukan_bk (
  id             uuid primary key default gen_random_uuid(),
  siswa_id       uuid not null references public.siswa (id),
  alasan         text not null check (char_length(alasan) between 10 and 500),
  dirujuk_oleh   uuid not null default auth.uid(),
  dirujuk_pada   timestamptz not null default now(),
  status         text not null default 'baru' check (status in ('baru', 'ditangani', 'selesai')),
  ditangani_oleh uuid,
  catatan_bk     text not null default '' check (char_length(catatan_bk) <= 2000),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Fungsi bantu & penjaga
-- ---------------------------------------------------------------------
create or replace function public.boleh_bina(sid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.punya_izin('kesiswaan.kelola') or public.punya_izin('bk.rujukan') or public.wali_dari_siswa(sid);
$$;
create or replace function public.boleh_lihat_kesiswaan(sid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.punya_izin('kesiswaan.lihat') or public.wali_dari_siswa(sid);
$$;
revoke all on function public.boleh_bina(uuid), public.boleh_lihat_kesiswaan(uuid) from public, anon;
grant execute on function public.boleh_bina(uuid), public.boleh_lihat_kesiswaan(uuid) to authenticated;

-- Pencarian siswa untuk guru yang mencatat (nama & kelas saja)
create or replace function public.cari_siswa(q text)
returns table (id uuid, nama text, kelas text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.pegawai_saya() is null and not public.punya_izin('kesiswaan.lihat') then
    raise exception 'Tidak berhak' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(q, ''))) < 3 then return; end if;
  return query
  select s.id, s.nama, k.nama
    from public.siswa s
    left join public.anggota_kelas ak on ak.siswa_id = s.id and ak.tahun_ajaran_id = (select t.id from public.tahun_ajaran t where t.aktif)
    left join public.kelas k on k.id = ak.kelas_id
   where s.deleted_at is null and s.status = 'aktif'
     and (s.nama ilike '%' || replace(replace(trim(q), '%', ''), '_', '') || '%' or s.nisn = trim(q))
   order by s.nama limit 10;
end $$;
revoke all on function public.cari_siswa(text) from public, anon;
grant execute on function public.cari_siswa(text) to authenticated;

create or replace function public.jaga_pelanggaran()
returns trigger language plpgsql security definer set search_path = '' as $$
declare j public.jenis_pelanggaran;
begin
  if public.pegawai_saya() is null and not public.punya_izin('kesiswaan.kelola') then
    raise exception 'Hanya guru/pegawai yang dapat melaporkan pelanggaran' using errcode = '42501';
  end if;
  select * into j from public.jenis_pelanggaran where id = new.jenis_id and aktif;
  if j.id is null then raise exception 'Jenis pelanggaran tidak aktif' using errcode = '22023'; end if;
  if new.tanggal > public.hari_ini() or new.tanggal < public.hari_ini() - 30 then
    raise exception 'Tanggal kejadian maksimal 30 hari ke belakang' using errcode = '22023';
  end if;
  if new.bukti_path <> '' and split_part(new.bukti_path, '/', 1) <> auth.uid()::text then
    raise exception 'Berkas bukti tidak sah' using errcode = '22023';
  end if;
  new.nama_pelanggaran := j.nama; new.kategori := j.kategori; new.poin := j.poin;   -- salinan: riwayat tidak berubah
  new.tahun_ajaran_id := (select id from public.tahun_ajaran where aktif);
  new.dilaporkan_oleh := auth.uid(); new.dilaporkan_pada := now();
  new.status := 'dilaporkan'; new.diverifikasi_oleh := null; new.diverifikasi_pada := null; new.catatan_verifikasi := '';
  return new;
end $$;
drop trigger if exists jaga_pelanggaran on public.pelanggaran_siswa;
create trigger jaga_pelanggaran before insert on public.pelanggaran_siswa for each row execute function public.jaga_pelanggaran();

create or replace function public.jaga_prestasi()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.pegawai_saya() is null and not public.punya_izin('kesiswaan.kelola')
     and not exists (select 1 from public.siswa where id = new.siswa_id and user_id = auth.uid()) then
    raise exception 'Tidak berhak mengajukan prestasi untuk siswa ini' using errcode = '42501';
  end if;
  if new.tanggal > public.hari_ini() then raise exception 'Tanggal prestasi belum terjadi' using errcode = '22023'; end if;
  if new.bukti_path <> '' and split_part(new.bukti_path, '/', 1) <> auth.uid()::text then
    raise exception 'Berkas bukti tidak sah' using errcode = '22023';
  end if;
  new.poin := coalesce((select poin from public.aturan_poin_prestasi where tingkat = new.tingkat and peringkat = new.peringkat), 0);
  new.tahun_ajaran_id := (select id from public.tahun_ajaran where aktif);
  new.diajukan_oleh := auth.uid(); new.diajukan_pada := now();
  new.status := 'diajukan'; new.diverifikasi_oleh := null; new.diverifikasi_pada := null; new.catatan_verifikasi := '';
  return new;
end $$;
drop trigger if exists jaga_prestasi on public.prestasi_siswa;
create trigger jaga_prestasi before insert on public.prestasi_siswa for each row execute function public.jaga_prestasi();

create or replace function public.jaga_pembinaan()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.dicatat_oleh := auth.uid();
    new.tahun_ajaran_id := (select id from public.tahun_ajaran where aktif);
  else
    new.dicatat_oleh := old.dicatat_oleh; new.siswa_id := old.siswa_id; new.tahun_ajaran_id := old.tahun_ajaran_id;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists jaga_pembinaan on public.pembinaan_siswa;
create trigger jaga_pembinaan before insert or update on public.pembinaan_siswa for each row execute function public.jaga_pembinaan();

create or replace function public.jaga_rujukan()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.dirujuk_oleh := auth.uid(); new.dirujuk_pada := now(); new.status := 'baru'; new.catatan_bk := ''; new.ditangani_oleh := null;
  else
    new.siswa_id := old.siswa_id; new.alasan := old.alasan; new.dirujuk_oleh := old.dirujuk_oleh; new.dirujuk_pada := old.dirujuk_pada;
    new.ditangani_oleh := auth.uid();
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists jaga_rujukan on public.rujukan_bk;
create trigger jaga_rujukan before insert or update on public.rujukan_bk for each row execute function public.jaga_rujukan();

-- Verifikasi oleh kesiswaan
create or replace function public.verifikasi_pelanggaran(p_id uuid, p_sah boolean, p_catatan text default '')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.punya_izin('kesiswaan.kelola') then raise exception 'Tidak berhak' using errcode = '42501'; end if;
  update public.pelanggaran_siswa
     set status = case when p_sah then 'terverifikasi' else 'ditolak' end,
         diverifikasi_oleh = auth.uid(), diverifikasi_pada = now(), catatan_verifikasi = left(coalesce(p_catatan, ''), 500)
   where id = p_id and status = 'dilaporkan';
  if not found then raise exception 'Laporan tidak menunggu verifikasi' using errcode = '23514'; end if;
end $$;
create or replace function public.batalkan_pelanggaran(p_id uuid, p_catatan text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.punya_izin('kesiswaan.kelola') then raise exception 'Tidak berhak' using errcode = '42501'; end if;
  if char_length(coalesce(p_catatan, '')) < 5 then raise exception 'Tulis alasan pembatalan' using errcode = '22023'; end if;
  update public.pelanggaran_siswa set status = 'dibatalkan', catatan_verifikasi = left(p_catatan, 500),
         diverifikasi_oleh = auth.uid(), diverifikasi_pada = now()
   where id = p_id and status = 'terverifikasi';
  if not found then raise exception 'Hanya catatan terverifikasi yang dapat dibatalkan' using errcode = '23514'; end if;
end $$;
create or replace function public.verifikasi_prestasi(p_id uuid, p_sah boolean, p_catatan text default '')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.punya_izin('kesiswaan.kelola') then raise exception 'Tidak berhak' using errcode = '42501'; end if;
  update public.prestasi_siswa
     set status = case when p_sah then 'terverifikasi' else 'ditolak' end,
         diverifikasi_oleh = auth.uid(), diverifikasi_pada = now(), catatan_verifikasi = left(coalesce(p_catatan, ''), 500)
   where id = p_id and status = 'diajukan';
  if not found then raise exception 'Prestasi tidak menunggu verifikasi' using errcode = '23514'; end if;
end $$;
-- Ubah poin = buat versi baru; catatan lama tetap memakai poin lamanya
create or replace function public.ubah_jenis_pelanggaran(p_id uuid, p_nama text, p_kategori text, p_poin smallint, p_aktif boolean default true)
returns uuid language plpgsql security definer set search_path = '' as $$
declare lama public.jenis_pelanggaran; baru uuid;
begin
  if not public.punya_izin('kesiswaan.kelola') then raise exception 'Tidak berhak' using errcode = '42501'; end if;
  select * into lama from public.jenis_pelanggaran where id = p_id and aktif;
  if lama.id is null then raise exception 'Jenis pelanggaran tidak ditemukan' using errcode = 'P0002'; end if;
  update public.jenis_pelanggaran set aktif = false where id = p_id;
  if not p_aktif then return null; end if;
  insert into public.jenis_pelanggaran (kode, nama, kategori, poin, versi, menggantikan)
  values (lama.kode, p_nama, p_kategori, p_poin, lama.versi + 1, lama.id) returning id into baru;
  return baru;
end $$;
revoke all on function public.verifikasi_pelanggaran(uuid, boolean, text), public.batalkan_pelanggaran(uuid, text),
  public.verifikasi_prestasi(uuid, boolean, text), public.ubah_jenis_pelanggaran(uuid, text, text, smallint, boolean) from public, anon;
grant execute on function public.verifikasi_pelanggaran(uuid, boolean, text), public.batalkan_pelanggaran(uuid, text),
  public.verifikasi_prestasi(uuid, boolean, text), public.ubah_jenis_pelanggaran(uuid, text, text, smallint, boolean) to authenticated;

-- Rekap poin tahun ajaran aktif untuk siswa yang terlihat oleh pemanggil
create or replace function public.rekap_poin()
returns table (siswa_id uuid, nama text, kelas text, kelas_id uuid, poin_pelanggaran int, poin_prestasi int, poin_bersih int,
               jumlah_pelanggaran int, jumlah_prestasi int, tindakan text, ambang int)
language sql stable security invoker set search_path = '' as $$
  with ta as (select id from public.tahun_ajaran where aktif),
  pel as (select p.siswa_id, sum(p.poin)::int n, count(*)::int c from public.pelanggaran_siswa p, ta
          where p.tahun_ajaran_id = ta.id and p.status = 'terverifikasi' group by 1),
  pre as (select p.siswa_id, sum(p.poin)::int n, count(*)::int c from public.prestasi_siswa p, ta
          where p.tahun_ajaran_id = ta.id and p.status = 'terverifikasi' group by 1),
  gab as (
    select coalesce(pel.siswa_id, pre.siswa_id) siswa_id, coalesce(pel.n, 0) pn, coalesce(pre.n, 0) rn, coalesce(pel.c, 0) pc, coalesce(pre.c, 0) rc
    from pel full join pre on pre.siswa_id = pel.siswa_id),
  bersih as (
    select g.*, greatest(0, g.pn - case when (select prestasi_kurangi_poin from public.pengaturan_kesiswaan where id = 1) then g.rn else 0 end) b
    from gab g)
  select s.id, s.nama, k.nama, k.id, b.pn, b.rn, b.b, b.pc, b.rc,
         (select a.tindakan from public.aturan_tindakan_poin a where a.ambang <= b.b order by a.ambang desc limit 1),
         (select a.ambang from public.aturan_tindakan_poin a where a.ambang <= b.b order by a.ambang desc limit 1)::int
  from bersih b
  join public.siswa s on s.id = b.siswa_id and s.deleted_at is null
  left join public.anggota_kelas ak on ak.siswa_id = s.id and ak.tahun_ajaran_id = (select id from ta)
  left join public.kelas k on k.id = ak.kelas_id
  order by b.b desc, s.nama;
$$;
grant execute on function public.rekap_poin() to authenticated;

-- Rapor perkembangan untuk portal (siswa sendiri / orang tua) — tanpa nama saksi & pelapor
create or replace function public.rekap_karakter(p_siswa uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare ta uuid := (select id from public.tahun_ajaran where aktif); kurangi boolean;
begin
  if not public.bisa_lihat_siswa(p_siswa) then raise exception 'Tidak berhak' using errcode = '42501'; end if;
  select prestasi_kurangi_poin into kurangi from public.pengaturan_kesiswaan where id = 1;
  return jsonb_build_object(
    'prestasi', coalesce((select jsonb_agg(jsonb_build_object('tanggal', tanggal, 'nama', nama_kegiatan, 'bidang', bidang, 'tingkat', tingkat,
                 'peringkat', peringkat, 'poin', poin, 'status', status) order by tanggal desc)
               from public.prestasi_siswa where siswa_id = p_siswa and tahun_ajaran_id = ta and status <> 'ditolak'), '[]'::jsonb),
    'pelanggaran', coalesce((select jsonb_agg(jsonb_build_object('tanggal', tanggal, 'nama', nama_pelanggaran, 'kategori', kategori, 'poin', poin)
                 order by tanggal desc)
               from public.pelanggaran_siswa where siswa_id = p_siswa and tahun_ajaran_id = ta and status = 'terverifikasi'), '[]'::jsonb),
    'pembinaan', coalesce((select jsonb_agg(jsonb_build_object('tanggal', tanggal, 'jenis', jenis, 'status', status) order by tanggal desc)
               from public.pembinaan_siswa where siswa_id = p_siswa and tahun_ajaran_id = ta), '[]'::jsonb),
    'kurangi', coalesce(kurangi, false));
end $$;
revoke all on function public.rekap_karakter(uuid) from public, anon;
grant execute on function public.rekap_karakter(uuid) to authenticated;

-- Perujuk melihat status rujukannya (tanpa catatan BK)
create or replace function public.status_rujukan_saya()
returns table (id uuid, siswa text, dirujuk_pada timestamptz, status text)
language sql stable security definer set search_path = '' as $$
  select r.id, s.nama, r.dirujuk_pada, r.status from public.rujukan_bk r join public.siswa s on s.id = r.siswa_id
  where r.dirujuk_oleh = auth.uid() order by r.dirujuk_pada desc limit 50;
$$;
revoke all on function public.status_rujukan_saya() from public, anon;
grant execute on function public.status_rujukan_saya() to authenticated;

-- ---------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['pengaturan_kesiswaan', 'jenis_pelanggaran', 'aturan_poin_prestasi', 'aturan_tindakan_poin',
                           'pelanggaran_siswa', 'prestasi_siswa', 'pembinaan_siswa', 'rujukan_bk'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke truncate on public.%I from authenticated', t);
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.catat_audit()', t);
  end loop;
  foreach t in array array['pengaturan_kesiswaan', 'jenis_pelanggaran', 'aturan_poin_prestasi', 'aturan_tindakan_poin'] loop
    execute format('drop policy if exists "baca %1$s" on public.%1$I', t);
    execute format('create policy "baca %1$s" on public.%1$I for select to authenticated using (true)', t);
  end loop;
  foreach t in array array['pengaturan_kesiswaan', 'aturan_poin_prestasi', 'aturan_tindakan_poin'] loop
    execute format('drop policy if exists "kelola %1$s" on public.%1$I', t);
    execute format('create policy "kelola %1$s" on public.%1$I for all to authenticated using ((select public.punya_izin(''kesiswaan.kelola''))) with check ((select public.punya_izin(''kesiswaan.kelola'')))', t);
  end loop;
end $$;
-- katalog pelanggaran: tambah langsung; ubah/nonaktifkan lewat fungsi berversi
revoke update, delete on public.jenis_pelanggaran from authenticated;
drop policy if exists "tambah jenis pelanggaran" on public.jenis_pelanggaran;
create policy "tambah jenis pelanggaran" on public.jenis_pelanggaran for insert to authenticated
  with check ((select public.punya_izin('kesiswaan.kelola')) and versi = 1 and menggantikan is null);

-- pelanggaran & prestasi: perubahan status hanya lewat fungsi verifikasi; tidak ada hapus
revoke update, delete on public.pelanggaran_siswa, public.prestasi_siswa from authenticated;
revoke delete on public.pembinaan_siswa, public.rujukan_bk from authenticated;

drop policy if exists "baca pelanggaran" on public.pelanggaran_siswa;
create policy "baca pelanggaran" on public.pelanggaran_siswa for select to authenticated
  using (public.boleh_lihat_kesiswaan(siswa_id) or dilaporkan_oleh = auth.uid());
drop policy if exists "lapor pelanggaran" on public.pelanggaran_siswa;
create policy "lapor pelanggaran" on public.pelanggaran_siswa for insert to authenticated with check (true);  -- dijaga trigger

drop policy if exists "baca prestasi" on public.prestasi_siswa;
create policy "baca prestasi" on public.prestasi_siswa for select to authenticated
  using (public.boleh_lihat_kesiswaan(siswa_id) or diajukan_oleh = auth.uid()
         or exists (select 1 from public.siswa s where s.id = siswa_id and s.user_id = auth.uid())
         or public.ortu_dari_siswa(siswa_id));
drop policy if exists "ajukan prestasi" on public.prestasi_siswa;
create policy "ajukan prestasi" on public.prestasi_siswa for insert to authenticated with check (true);  -- dijaga trigger

drop policy if exists "baca pembinaan" on public.pembinaan_siswa;
create policy "baca pembinaan" on public.pembinaan_siswa for select to authenticated
  using (public.boleh_lihat_kesiswaan(siswa_id) or public.boleh_bina(siswa_id));
drop policy if exists "catat pembinaan" on public.pembinaan_siswa;
create policy "catat pembinaan" on public.pembinaan_siswa for insert to authenticated with check (public.boleh_bina(siswa_id));
drop policy if exists "ubah pembinaan" on public.pembinaan_siswa;
create policy "ubah pembinaan" on public.pembinaan_siswa for update to authenticated
  using (public.boleh_bina(siswa_id)) with check (public.boleh_bina(siswa_id));

drop policy if exists "bk baca rujukan" on public.rujukan_bk;
create policy "bk baca rujukan" on public.rujukan_bk for select to authenticated using ((select public.punya_izin('bk.rujukan')));
drop policy if exists "rujuk ke bk" on public.rujukan_bk;
create policy "rujuk ke bk" on public.rujukan_bk for insert to authenticated with check (public.boleh_bina(siswa_id));
drop policy if exists "bk tangani rujukan" on public.rujukan_bk;
create policy "bk tangani rujukan" on public.rujukan_bk for update to authenticated
  using ((select public.punya_izin('bk.rujukan'))) with check ((select public.punya_izin('bk.rujukan')));

notify pgrst, 'reload schema';
