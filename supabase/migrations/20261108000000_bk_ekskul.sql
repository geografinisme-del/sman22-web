-- =====================================================================
-- Fase 12 — Modul 12 Bimbingan & Konseling, Modul 13 Ekstrakurikuler/OSIS & Kegiatan
--   A. BK: permintaan layanan, kasus, asesmen & catatan sesi TERENKRIPSI (dienkripsi di server aplikasi),
--      jadwal sesi, tindak lanjut, rujukan eksternal, log akses kerahasiaan, saran untuk wali, laporan agregat, retensi
--   B. Ekskul/OSIS: organisasi (mesin sama untuk semua ekskul + identitas visual & isian tambahan), pendaftaran
--      berkuota + daftar tunggu, keanggotaan & jabatan, kegiatan & presensi, program kerja, pengajuan kegiatan
--      (proposal, risiko, sarpras, anggaran, persetujuan berjenjang, LPJ), sertifikat terverifikasi, publikasi
-- Idempoten: aman dijalankan ulang.
-- =====================================================================

insert into public.peran (kode, nama, keterangan, urutan) values
  ('keuangan', 'Bendahara / Keuangan', 'Melihat anggaran pengajuan kegiatan & LPJ', 7)
on conflict (kode) do nothing;
insert into public.izin (kode, keterangan) values
  ('bk.konseling', 'Membaca & mengelola kasus konseling (rahasia)'),
  ('bk.agregat', 'Melihat laporan agregat BK'),
  ('ekskul.kelola', 'Mengelola seluruh ekskul/OSIS & menyetujui kegiatan'),
  ('ekskul.lihat', 'Melihat laporan ekskul/OSIS'),
  ('ekskul.anggaran', 'Melihat anggaran pengajuan kegiatan & LPJ')
on conflict (kode) do update set keterangan = excluded.keterangan;
-- Catatan: super admin TIDAK diberi bk.konseling — isi konseling hanya untuk guru BK.
insert into public.peran_izin (peran, izin) values
  ('bk', 'bk.konseling'), ('bk', 'bk.agregat'), ('kepala_sekolah', 'bk.agregat'), ('wakasek', 'bk.agregat'), ('super_admin', 'bk.agregat'),
  ('kesiswaan', 'ekskul.kelola'), ('super_admin', 'ekskul.kelola'),
  ('kepala_sekolah', 'ekskul.lihat'), ('wakasek', 'ekskul.lihat'), ('kesiswaan', 'ekskul.lihat'), ('super_admin', 'ekskul.lihat'),
  ('keuangan', 'ekskul.anggaran'), ('kepala_sekolah', 'ekskul.anggaran'), ('keuangan', 'ekskul.lihat')
on conflict do nothing;

-- =====================================================================
-- A. Bimbingan & Konseling
-- =====================================================================
create table if not exists public.pengaturan_bk (
  id            smallint primary key default 1 check (id = 1),
  retensi_tahun smallint not null default 3 check (retensi_tahun between 1 and 10)
);
insert into public.pengaturan_bk (id) values (1) on conflict do nothing;

create table if not exists public.kategori_konseling (
  kode   text primary key check (kode ~ '^[a-z_]{2,30}$'),
  nama   text not null check (char_length(nama) between 2 and 60),
  urutan smallint not null default 0,
  aktif  boolean not null default true
);
insert into public.kategori_konseling (kode, nama, urutan) values
  ('pribadi', 'Pribadi', 1), ('sosial', 'Sosial / pertemanan', 2), ('belajar', 'Belajar', 3), ('karier', 'Karier & studi lanjut', 4),
  ('keluarga', 'Keluarga', 5), ('perundungan', 'Perundungan', 6), ('lainnya', 'Lainnya', 9)
on conflict (kode) do nothing;

create sequence if not exists public.nomor_kasus_bk;
create table if not exists public.kasus_bk (
  id                     uuid primary key default gen_random_uuid(),
  kode                   text not null unique,
  siswa_id               uuid not null references public.siswa (id),
  kategori               text not null references public.kategori_konseling (kode),
  prioritas              text not null default 'sedang' check (prioritas in ('rendah', 'sedang', 'tinggi', 'darurat')),
  risiko                 text not null default 'rendah' check (risiko in ('rendah', 'sedang', 'tinggi')),
  status                 text not null default 'aktif' check (status in ('aktif', 'pemantauan', 'selesai', 'dirujuk_luar')),
  konselor_id            uuid references public.pegawai (id),
  asal                   text not null default 'inisiatif_bk' check (asal in ('permintaan', 'rujukan_guru', 'pengaduan', 'inisiatif_bk')),
  rujukan_id             uuid references public.rujukan_bk (id),
  asesmen_enc            text not null default '',          -- terenkripsi oleh server aplikasi
  ringkasan_enc          text not null default '',          -- ringkasan penutupan, terenkripsi
  saran_wali             text not null default '' check (char_length(saran_wali) <= 1000), -- sengaja dibagikan BK ke wali kelas
  saran_wali_pada        timestamptz,
  dibuka                 date not null default ((now() at time zone 'Asia/Jakarta')::date),
  ditutup                date,
  retensi_sampai         date,
  isi_dimusnahkan        boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists kasus_bk_siswa on public.kasus_bk (siswa_id);
create index if not exists kasus_bk_status on public.kasus_bk (status);

create table if not exists public.permintaan_konseling (
  id                    uuid primary key default gen_random_uuid(),
  siswa_id              uuid not null references public.siswa (id),
  diajukan_oleh         uuid not null default auth.uid(),
  sumber                text not null check (sumber in ('siswa', 'ortu')),
  kategori              text not null references public.kategori_konseling (kode),
  topik                 text not null check (char_length(topik) between 3 and 150),
  pesan_enc             text not null default '',
  prioritas             text not null default 'sedang' check (prioritas in ('rendah', 'sedang', 'tinggi', 'darurat')),
  waktu_preferensi      text not null default '' check (char_length(waktu_preferensi) <= 150),
  status                text not null default 'baru' check (status in ('baru', 'diterima', 'dijadwalkan', 'selesai', 'ditolak')),
  kasus_id              uuid references public.kasus_bk (id),
  catatan_untuk_pemohon text not null default '' check (char_length(catatan_untuk_pemohon) <= 500),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists permintaan_konseling_status on public.permintaan_konseling (status, created_at);

create table if not exists public.sesi_konseling (
  id           uuid primary key default gen_random_uuid(),
  kasus_id     uuid not null references public.kasus_bk (id),
  mulai        timestamptz not null,
  durasi_menit smallint not null default 45 check (durasi_menit between 10 and 240),
  jenis        text not null default 'individu' check (jenis in ('individu', 'kelompok', 'konsultasi_ortu', 'kunjungan_rumah')),
  mode         text not null default 'tatap_muka' check (mode in ('tatap_muka', 'daring', 'telepon')),
  tempat       text not null default 'Ruang BK' check (char_length(tempat) <= 100),
  status       text not null default 'terjadwal' check (status in ('terjadwal', 'selesai', 'batal', 'tidak_hadir')),
  catatan_enc  text not null default '',
  konselor_id  uuid references public.pegawai (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists sesi_konseling_kasus on public.sesi_konseling (kasus_id, mulai);
create index if not exists sesi_konseling_mulai on public.sesi_konseling (mulai) where status = 'terjadwal';

create table if not exists public.tindak_lanjut_bk (
  id         uuid primary key default gen_random_uuid(),
  kasus_id   uuid not null references public.kasus_bk (id),
  rencana    text not null check (char_length(rencana) between 3 and 500),
  pihak      text not null default 'BK' check (char_length(pihak) <= 100),
  tenggat    date,
  status     text not null default 'rencana' check (status in ('rencana', 'berjalan', 'selesai', 'batal')),
  hasil      text not null default '' check (char_length(hasil) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.rujukan_eksternal_bk (
  id         uuid primary key default gen_random_uuid(),
  kasus_id   uuid not null references public.kasus_bk (id),
  lembaga    text not null check (char_length(lembaga) between 2 and 150),
  jenis      text not null default 'psikolog' check (jenis in ('psikolog', 'puskesmas', 'rumah_sakit', 'uptd_ppa', 'kepolisian', 'lainnya')),
  tanggal    date not null default ((now() at time zone 'Asia/Jakarta')::date),
  alasan     text not null default '' check (char_length(alasan) <= 500),
  hasil      text not null default '' check (char_length(hasil) <= 1000),
  status     text not null default 'diajukan' check (status in ('diajukan', 'diterima', 'selesai')),
  created_at timestamptz not null default now()
);
create table if not exists public.log_akses_bk (
  id       bigint generated always as identity primary key,
  kasus_id uuid not null references public.kasus_bk (id),
  user_id  uuid not null default auth.uid(),
  aksi     text not null check (aksi in ('buka', 'ubah_catatan', 'musnahkan')),
  alasan   text not null default '' check (char_length(alasan) <= 300),
  waktu    timestamptz not null default now()
);
create index if not exists log_akses_bk_idx on public.log_akses_bk (kasus_id, waktu desc);
alter table public.log_akses_bk alter column kasus_id drop not null;
alter table public.log_akses_bk add column if not exists permintaan_id uuid references public.permintaan_konseling (id);

-- penjaga & otomasi ---------------------------------------------------
create or replace function public.jaga_kasus_bk() returns trigger language plpgsql security definer set search_path = '' as $$
declare th smallint := (select retensi_tahun from public.pengaturan_bk where id = 1);
begin
  if tg_op = 'INSERT' then
    new.kode := 'BK-' || to_char(now() at time zone 'Asia/Jakarta', 'YY') || '-' || lpad(nextval('public.nomor_kasus_bk')::text, 4, '0');
    new.konselor_id := coalesce(new.konselor_id, public.pegawai_saya());
    if new.rujukan_id is not null then
      update public.rujukan_bk set status = 'ditangani' where id = new.rujukan_id and status = 'baru';
    end if;
  else
    new.kode := old.kode; new.siswa_id := old.siswa_id; new.created_at := old.created_at;
    if old.isi_dimusnahkan then new.asesmen_enc := ''; new.ringkasan_enc := ''; new.isi_dimusnahkan := true; end if;
    if new.status in ('selesai', 'dirujuk_luar') and old.status not in ('selesai', 'dirujuk_luar') then
      new.ditutup := (now() at time zone 'Asia/Jakarta')::date;
      new.retensi_sampai := new.ditutup + make_interval(years => th);
      if new.rujukan_id is not null then update public.rujukan_bk set status = 'selesai' where id = new.rujukan_id; end if;
    elsif new.status in ('aktif', 'pemantauan') then
      new.ditutup := null; new.retensi_sampai := null;
    end if;
    if new.saran_wali is distinct from old.saran_wali then new.saran_wali_pada := now(); end if;
    if (new.asesmen_enc is distinct from old.asesmen_enc or new.ringkasan_enc is distinct from old.ringkasan_enc) and not old.isi_dimusnahkan and not new.isi_dimusnahkan then
      insert into public.log_akses_bk (kasus_id, aksi) values (new.id, 'ubah_catatan');
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists jaga_kasus_bk on public.kasus_bk;
create trigger jaga_kasus_bk before insert or update on public.kasus_bk for each row execute function public.jaga_kasus_bk();

create or replace function public.jaga_permintaan_bk() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- isi permintaan tidak bisa diubah petugas; hanya status, kasus & balasan
  new.siswa_id := old.siswa_id; new.diajukan_oleh := old.diajukan_oleh; new.sumber := old.sumber; new.topik := old.topik;
  if not (new.pesan_enc = '' and current_setting('app.musnah', true) = '1') then new.pesan_enc := old.pesan_enc; end if;
  new.waktu_preferensi := old.waktu_preferensi; new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists jaga_permintaan_bk on public.permintaan_konseling;
create trigger jaga_permintaan_bk before update on public.permintaan_konseling for each row execute function public.jaga_permintaan_bk();

create or replace function public.notif_permintaan_bk() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status <> old.status or new.catatan_untuk_pemohon is distinct from old.catatan_untuk_pemohon then
    perform public.kirim_notif(new.diajukan_oleh, 'bk', 'Permintaan layanan BK: ' || case new.status when 'diterima' then 'diterima'
      when 'dijadwalkan' then 'sudah dijadwalkan' when 'selesai' then 'selesai' when 'ditolak' then 'tidak dapat dilayani' else new.status end,
      left(coalesce(nullif(new.catatan_untuk_pemohon, ''), 'Lihat detail di portal.'), 200), '/portal/bk', 'biasa', false);
  end if;
  return null;
end $$;
drop trigger if exists notif_permintaan_bk on public.permintaan_konseling;
create trigger notif_permintaan_bk after update on public.permintaan_konseling for each row execute function public.notif_permintaan_bk();

create or replace function public.jaga_sesi_bk() returns trigger language plpgsql security definer set search_path = '' as $$
declare k public.kasus_bk;
begin
  select * into k from public.kasus_bk where id = new.kasus_id;
  if tg_op = 'INSERT' then
    new.konselor_id := coalesce(new.konselor_id, k.konselor_id, public.pegawai_saya());
  else
    new.kasus_id := old.kasus_id; new.created_at := old.created_at;
    if k.isi_dimusnahkan then new.catatan_enc := ''; end if;
    if new.catatan_enc is distinct from old.catatan_enc and not k.isi_dimusnahkan then
      insert into public.log_akses_bk (kasus_id, aksi) values (new.kasus_id, 'ubah_catatan');
    end if;
  end if;
  if new.status = 'terjadwal' and exists (
      select 1 from public.sesi_konseling s where s.id <> new.id and s.status = 'terjadwal' and s.konselor_id = new.konselor_id
        and tstzrange(s.mulai, s.mulai + make_interval(mins => s.durasi_menit)) && tstzrange(new.mulai, new.mulai + make_interval(mins => new.durasi_menit))) then
    raise exception 'Bentrok: konselor sudah punya sesi pada jam tersebut' using errcode = '23P01';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists jaga_sesi_bk on public.sesi_konseling;
create trigger jaga_sesi_bk before insert or update on public.sesi_konseling for each row execute function public.jaga_sesi_bk();

-- pemberitahuan jadwal ke siswa (tanpa isi masalah; hanya di aplikasi, tidak lewat WhatsApp)
create or replace function public.notif_sesi_bk() returns trigger language plpgsql security definer set search_path = '' as $$
declare u uuid; ortu uuid; waktu text;
begin
  if tg_op = 'UPDATE' and new.mulai = old.mulai and new.status = old.status then return null; end if;
  if new.status not in ('terjadwal', 'batal') then return null; end if;
  waktu := to_char(new.mulai at time zone 'Asia/Jakarta', 'DD-MM-YYYY HH24:MI') || ' WIB';
  select s.user_id into u from public.kasus_bk k join public.siswa s on s.id = k.siswa_id where k.id = new.kasus_id;
  if new.jenis = 'konsultasi_ortu' then
    for ortu in select o.user_id from public.kasus_bk k join public.siswa_orang_tua so on so.siswa_id = k.siswa_id
                 join public.orang_tua o on o.id = so.orang_tua_id where k.id = new.kasus_id and o.user_id is not null loop
      perform public.kirim_notif(ortu, 'bk', case when new.status = 'batal' then 'Jadwal konsultasi BK dibatalkan' else 'Undangan konsultasi BK' end,
        waktu || ' · ' || new.tempat, '/portal/bk', 'penting', false);
    end loop;
  elsif u is not null then
    perform public.kirim_notif(u, 'bk', case when new.status = 'batal' then 'Jadwal layanan BK dibatalkan' else 'Jadwal layanan BK' end,
      waktu || ' · ' || new.tempat, '/portal/bk', 'biasa', false);
  end if;
  return null;
end $$;
drop trigger if exists notif_sesi_bk on public.sesi_konseling;
create trigger notif_sesi_bk after insert or update on public.sesi_konseling for each row execute function public.notif_sesi_bk();

-- fungsi ---------------------------------------------------------------
-- siswa (untuk dirinya) atau orang tua (untuk anaknya) mengajukan layanan; pesan sudah terenkripsi oleh server aplikasi
create or replace function public.ajukan_konseling(p_siswa uuid, p_kategori text, p_topik text, p_pesan_enc text, p_mendesak boolean, p_waktu text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare src text; nid uuid; u uuid;
begin
  if p_siswa = public.siswa_login() then src := 'siswa';
  elsif public.punya_peran('orang_tua') and public.diri_atau_anak(p_siswa) then src := 'ortu';
  else raise exception 'Hanya siswa (untuk dirinya) atau orang tua (untuk anaknya)' using errcode = '42501'; end if;
  if not exists (select 1 from public.kategori_konseling where kode = p_kategori and aktif) then raise exception 'Kategori tidak dikenal' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_topik, ''))) not between 3 and 150 then raise exception 'Topik 3–150 karakter' using errcode = '22023'; end if;
  if (select count(*) from public.permintaan_konseling where diajukan_oleh = auth.uid() and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Batas 5 permintaan per hari. Bila darurat, temui guru BK atau wali kelas langsung.' using errcode = '22023';
  end if;
  insert into public.permintaan_konseling (siswa_id, sumber, kategori, topik, pesan_enc, prioritas, waktu_preferensi)
  values (p_siswa, src, p_kategori, trim(p_topik), left(coalesce(p_pesan_enc, ''), 20000),
          case when p_mendesak then 'tinggi' else 'sedang' end, left(trim(coalesce(p_waktu, '')), 150))
  returning id into nid;
  for u in select public.pengguna_berizin('bk.konseling') loop
    perform public.kirim_notif(u, 'bk', case when p_mendesak then 'Permintaan layanan BK — MENDESAK' else 'Permintaan layanan BK baru' end,
      'Dari ' || case src when 'siswa' then 'siswa' else 'orang tua' end || '. Buka panel BK untuk detail.', '/admin/bk',
      case when p_mendesak then 'penting' else 'biasa' end, false);
  end loop;
  return nid;
end $$;

create or replace function public.permintaan_bk_saya()
returns table (id uuid, siswa text, kategori text, topik text, status text, catatan_untuk_pemohon text, dibuat timestamptz, sumber text)
language sql stable security definer set search_path = '' as $$
  select p.id, s.nama, k.nama, p.topik, p.status, p.catatan_untuk_pemohon, p.created_at, p.sumber
  from public.permintaan_konseling p join public.siswa s on s.id = p.siswa_id join public.kategori_konseling k on k.kode = p.kategori
  where p.diajukan_oleh = auth.uid() order by p.created_at desc limit 50;
$$;

-- jadwal untuk siswa sendiri; orang tua hanya melihat undangan konsultasi orang tua
create or replace function public.jadwal_bk_saya()
returns table (id uuid, siswa text, mulai timestamptz, durasi_menit smallint, jenis text, mode text, tempat text, status text, konselor text)
language sql stable security definer set search_path = '' as $$
  select x.id, s.nama, x.mulai, x.durasi_menit, x.jenis, x.mode, x.tempat, x.status, coalesce(g.nama, 'Guru BK')
  from public.sesi_konseling x join public.kasus_bk k on k.id = x.kasus_id join public.siswa s on s.id = k.siswa_id
  left join public.pegawai g on g.id = x.konselor_id
  where x.status in ('terjadwal', 'selesai') and x.mulai > now() - interval '60 days'
    and ((s.user_id = auth.uid() and x.jenis <> 'konsultasi_ortu')
         or (x.jenis = 'konsultasi_ortu' and public.punya_peran('orang_tua') and public.diri_atau_anak(s.id)))
  order by x.mulai desc limit 30;
$$;

-- membuka isi kasus: dicatat di log akses; konselor lain wajib menulis alasan
create or replace function public.buka_kasus_bk(p_id uuid, p_alasan text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare k public.kasus_bk;
begin
  if not public.punya_izin('bk.konseling') then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  select * into k from public.kasus_bk where id = p_id;
  if k.id is null then return null; end if;
  if k.konselor_id is distinct from public.pegawai_saya() and char_length(trim(coalesce(p_alasan, ''))) < 10 then
    raise exception 'PERLU_ALASAN' using errcode = '22023';
  end if;
  insert into public.log_akses_bk (kasus_id, aksi, alasan) values (p_id, 'buka', left(trim(coalesce(p_alasan, '')), 300));
  return jsonb_build_object(
    'asesmen_enc', k.asesmen_enc, 'ringkasan_enc', k.ringkasan_enc,
    'sesi', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'catatan_enc', s.catatan_enc) order by s.mulai)
                      from public.sesi_konseling s where s.kasus_id = p_id), '[]'),
    'permintaan', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'topik', r.topik, 'pesan_enc', r.pesan_enc, 'sumber', r.sumber,
                      'waktu_preferensi', r.waktu_preferensi, 'dibuat', r.created_at) order by r.created_at)
                      from public.permintaan_konseling r where r.kasus_id = p_id), '[]'));
end $$;

-- membaca pesan permintaan baru (belum jadi kasus) juga tercatat
create or replace function public.baca_permintaan_bk(p_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare r public.permintaan_konseling;
begin
  if not public.punya_izin('bk.konseling') then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  select * into r from public.permintaan_konseling where id = p_id;
  if r.id is not null then insert into public.log_akses_bk (kasus_id, permintaan_id, aksi, alasan) values (r.kasus_id, r.id, 'buka', 'baca permintaan'); end if;
  return r.pesan_enc;
end $$;

-- saran BK yang sengaja dibagikan kepada wali kelas (tanpa isi konseling)
create or replace function public.saran_bk_wali()
returns table (siswa_id uuid, siswa text, kelas text, saran text, tanggal timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.id, s.nama, coalesce((select kl.nama from public.anggota_kelas ak join public.kelas kl on kl.id = ak.kelas_id
           join public.tahun_ajaran t on t.id = ak.tahun_ajaran_id and t.aktif where ak.siswa_id = s.id limit 1), ''),
         k.saran_wali, k.saran_wali_pada
  from public.kasus_bk k join public.siswa s on s.id = k.siswa_id
  where k.saran_wali <> '' and k.status in ('aktif', 'pemantauan') and public.wali_dari_siswa(s.id)
  order by k.saran_wali_pada desc;
$$;

-- laporan agregat untuk pimpinan: tanpa nama; sel < 3 disamarkan
create or replace function public.statistik_bk(p_dari date, p_sampai date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare sm int := 3;
begin
  if not public.punya_izin('bk.agregat') then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  return jsonb_build_object(
    'kasus_baru', (select count(*) from public.kasus_bk where dibuka between p_dari and p_sampai),
    'kasus_aktif', (select count(*) from public.kasus_bk where status in ('aktif', 'pemantauan')),
    'kasus_selesai', (select count(*) from public.kasus_bk where ditutup between p_dari and p_sampai),
    'permintaan', (select count(*) from public.permintaan_konseling where (created_at at time zone 'Asia/Jakarta')::date between p_dari and p_sampai),
    'permintaan_siswa', (select count(*) from public.permintaan_konseling where sumber = 'siswa' and (created_at at time zone 'Asia/Jakarta')::date between p_dari and p_sampai),
    'sesi', (select count(*) from public.sesi_konseling where status = 'selesai' and (mulai at time zone 'Asia/Jakarta')::date between p_dari and p_sampai),
    'rujukan_luar', (select count(*) from public.rujukan_eksternal_bk where tanggal between p_dari and p_sampai),
    'rujukan_guru', (select count(*) from public.rujukan_bk where (dirujuk_pada at time zone 'Asia/Jakarta')::date between p_dari and p_sampai),
    'per_kategori', (select coalesce(jsonb_object_agg(x.nama, case when x.n < sm then null else x.n end), '{}') from (
        select kk.nama, count(*) n from public.kasus_bk k join public.kategori_konseling kk on kk.kode = k.kategori
        where k.dibuka between p_dari and p_sampai group by kk.nama) x),
    'per_tingkat', (select coalesce(jsonb_object_agg(x.tingkat, case when x.n < sm then null else x.n end), '{}') from (
        select coalesce(kl.tingkat, '?') tingkat, count(*) n from public.kasus_bk k
        left join public.anggota_kelas ak on ak.siswa_id = k.siswa_id and ak.tahun_ajaran_id = (select id from public.tahun_ajaran where aktif limit 1)
        left join public.kelas kl on kl.id = ak.kelas_id
        where k.dibuka between p_dari and p_sampai group by 1) x),
    'per_prioritas', (select coalesce(jsonb_object_agg(x.prioritas, case when x.n < sm then null else x.n end), '{}') from (
        select prioritas, count(*) n from public.kasus_bk where dibuka between p_dari and p_sampai group by 1) x),
    'rata_hari_tutup', (select round(avg(ditutup - dibuka)::numeric, 1) from public.kasus_bk where ditutup between p_dari and p_sampai)
  );
end $$;

-- penjadwal harian: pengingat sesi besok (siswa & konselor) dan tindak lanjut jatuh tempo (konselor)
create or replace function public.pengingat_bk() returns int language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0; besok date := (now() at time zone 'Asia/Jakarta')::date + 1; u uuid;
begin
  for r in select x.*, k.siswa_id, k.kode from public.sesi_konseling x join public.kasus_bk k on k.id = x.kasus_id
            where x.status = 'terjadwal' and (x.mulai at time zone 'Asia/Jakarta')::date = besok loop
    u := (select user_id from public.pegawai where id = r.konselor_id);
    if u is not null and not exists (select 1 from public.notifikasi where user_id = u and judul = 'Sesi BK besok' and isi like r.kode || '%' and created_at > now() - interval '20 hours') then
      perform public.kirim_notif(u, 'bk', 'Sesi BK besok', r.kode || ' · ' || to_char(r.mulai at time zone 'Asia/Jakarta', 'HH24:MI') || ' · ' || r.tempat, '/admin/bk', 'biasa', false);
      n := n + 1;
    end if;
    u := (select user_id from public.siswa where id = r.siswa_id);
    if r.jenis <> 'konsultasi_ortu' and u is not null and not exists (select 1 from public.notifikasi where user_id = u and judul = 'Pengingat: layanan BK besok' and created_at > now() - interval '20 hours') then
      perform public.kirim_notif(u, 'bk', 'Pengingat: layanan BK besok', to_char(r.mulai at time zone 'Asia/Jakarta', 'HH24:MI') || ' WIB · ' || r.tempat, '/portal/bk', 'biasa', false);
      n := n + 1;
    end if;
  end loop;
  for r in select t.*, k.kode, k.konselor_id from public.tindak_lanjut_bk t join public.kasus_bk k on k.id = t.kasus_id
            where t.status in ('rencana', 'berjalan') and t.tenggat <= (now() at time zone 'Asia/Jakarta')::date loop
    u := (select user_id from public.pegawai where id = r.konselor_id);
    if u is not null and not exists (select 1 from public.notifikasi where user_id = u and judul = 'Tindak lanjut BK jatuh tempo' and isi like r.kode || '%' and created_at > now() - interval '20 hours') then
      perform public.kirim_notif(u, 'bk', 'Tindak lanjut BK jatuh tempo', r.kode || ' · ' || left(r.rencana, 120), '/admin/bk', 'biasa', false);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- retensi: isi terenkripsi kasus yang sudah lewat masa simpan dimusnahkan; data agregat (kategori, tanggal) tetap
create or replace function public.musnahkan_retensi_bk() returns int language plpgsql security definer set search_path = '' as $$
declare k uuid; n int := 0;
begin
  for k in select id from public.kasus_bk where not isi_dimusnahkan and retensi_sampai is not null and retensi_sampai < (now() at time zone 'Asia/Jakarta')::date loop
    update public.kasus_bk set asesmen_enc = '', ringkasan_enc = '', saran_wali = '', isi_dimusnahkan = true where id = k;
    update public.sesi_konseling set catatan_enc = '' where kasus_id = k;
    perform set_config('app.musnah', '1', true);
    update public.permintaan_konseling set pesan_enc = '' where kasus_id = k;
    perform set_config('app.musnah', '0', true);
    insert into public.log_akses_bk (kasus_id, user_id, aksi, alasan) values (k, '00000000-0000-0000-0000-000000000000', 'musnahkan', 'masa retensi berakhir');
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.daftar_log_bk(p_batas int default 300)
returns table (waktu timestamptz, pengguna text, kode text, aksi text, alasan text, konselor_kasus boolean)
language sql stable security definer set search_path = '' as $$
  select l.waktu, coalesce((select p.nama from public.pengguna p where p.user_id = l.user_id), 'sistem'), coalesce(k.kode, 'permintaan'), l.aksi, l.alasan,
         k.konselor_id is not distinct from (select g.id from public.pegawai g where g.user_id = l.user_id)
  from public.log_akses_bk l left join public.kasus_bk k on k.id = l.kasus_id
  where public.punya_izin('bk.konseling') or public.punya_izin('audit.baca')
  order by l.waktu desc limit least(greatest(p_batas, 1), 1000);
$$;
revoke all on function public.daftar_log_bk(int) from public, anon;
grant execute on function public.daftar_log_bk(int) to authenticated;

revoke all on function public.ajukan_konseling(uuid, text, text, text, boolean, text), public.permintaan_bk_saya(), public.jadwal_bk_saya(),
  public.buka_kasus_bk(uuid, text), public.baca_permintaan_bk(uuid), public.saran_bk_wali(), public.statistik_bk(date, date) from public, anon;
grant execute on function public.ajukan_konseling(uuid, text, text, text, boolean, text), public.permintaan_bk_saya(), public.jadwal_bk_saya(),
  public.buka_kasus_bk(uuid, text), public.baca_permintaan_bk(uuid), public.saran_bk_wali(), public.statistik_bk(date, date) to authenticated;
revoke all on function public.pengingat_bk(), public.musnahkan_retensi_bk() from public, anon, authenticated;
grant execute on function public.pengingat_bk(), public.musnahkan_retensi_bk() to service_role;

-- =====================================================================
-- B. Ekstrakurikuler, OSIS & kegiatan
-- =====================================================================
create table if not exists public.pengaturan_ekskul (
  id          smallint primary key default 1 check (id = 1),
  maks_pilihan smallint not null default 2 check (maks_pilihan between 1 and 5)
);
insert into public.pengaturan_ekskul (id) values (1) on conflict do nothing;

create table if not exists public.organisasi (
  id              uuid primary key default gen_random_uuid(),
  jenis           text not null default 'ekskul' check (jenis in ('ekskul', 'osis', 'mpk', 'komunitas')),
  nama            text not null unique check (char_length(nama) between 2 and 100),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  singkatan       text not null default '' check (char_length(singkatan) <= 20),
  bidang          text not null default 'lainnya' check (bidang in ('olahraga', 'seni', 'akademik', 'keagamaan', 'teknologi', 'organisasi', 'lainnya')),
  deskripsi       text not null default '' check (char_length(deskripsi) <= 3000),
  logo_url        text not null default '' check (logo_url = '' or logo_url ~ '^https://'),
  warna           text not null default '#1e3a8a' check (warna ~ '^#[0-9a-fA-F]{6}$'),
  jadwal_rutin    text not null default '' check (char_length(jadwal_rutin) <= 200),
  tempat          text not null default '' check (char_length(tempat) <= 100),
  kuota           smallint not null default 0 check (kuota between 0 and 1000),
  syarat          text not null default '' check (char_length(syarat) <= 1000),
  tingkat_boleh   text[] not null default '{X,XI,XII}' check (tingkat_boleh <@ array['X', 'XI', 'XII']),
  daftar_mulai    date,
  daftar_selesai  date,
  field_tambahan  jsonb not null default '[]' check (jsonb_typeof(field_tambahan) = 'array' and jsonb_array_length(field_tambahan) <= 10),
  galeri          jsonb not null default '[]' check (jsonb_typeof(galeri) = 'array' and jsonb_array_length(galeri) <= 12),
  tampil_publik   boolean not null default true,
  aktif           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  constraint organisasi_daftar check (daftar_selesai is null or daftar_mulai is null or daftar_selesai >= daftar_mulai)
);
create table if not exists public.pembina_organisasi (
  organisasi_id uuid not null references public.organisasi (id),
  pegawai_id    uuid not null references public.pegawai (id),
  primary key (organisasi_id, pegawai_id)
);
create table if not exists public.pendaftaran_ekskul (
  id              uuid primary key default gen_random_uuid(),
  organisasi_id   uuid not null references public.organisasi (id),
  siswa_id        uuid not null references public.siswa (id),
  tahun_ajaran_id uuid not null references public.tahun_ajaran (id),
  pilihan         smallint not null default 1 check (pilihan between 1 and 5),
  alasan          text not null default '' check (char_length(alasan) <= 500),
  jawaban         jsonb not null default '{}' check (jsonb_typeof(jawaban) = 'object'),
  status          text not null default 'menunggu' check (status in ('menunggu', 'diterima', 'daftar_tunggu', 'ditolak', 'mundur')),
  catatan         text not null default '' check (char_length(catatan) <= 300),
  diputuskan_oleh uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organisasi_id, siswa_id, tahun_ajaran_id)
);
create index if not exists pendaftaran_ekskul_status on public.pendaftaran_ekskul (organisasi_id, status, created_at);
create table if not exists public.keanggotaan_org (
  id              uuid primary key default gen_random_uuid(),
  organisasi_id   uuid not null references public.organisasi (id),
  siswa_id        uuid not null references public.siswa (id),
  tahun_ajaran_id uuid not null references public.tahun_ajaran (id),
  jabatan         text not null default 'anggota' check (jabatan in ('anggota', 'ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'koordinator')),
  bidang          text not null default '' check (char_length(bidang) <= 60),
  status          text not null default 'aktif' check (status in ('aktif', 'keluar')),
  bergabung       date not null default ((now() at time zone 'Asia/Jakarta')::date),
  keluar          date,
  unique (organisasi_id, siswa_id, tahun_ajaran_id)
);
create index if not exists keanggotaan_org_siswa on public.keanggotaan_org (siswa_id);
create table if not exists public.kegiatan_org (
  id            uuid primary key default gen_random_uuid(),
  organisasi_id uuid not null references public.organisasi (id),
  judul         text not null check (char_length(judul) between 3 and 150),
  jenis         text not null default 'latihan' check (jenis in ('latihan', 'rapat', 'acara', 'lomba', 'lainnya')),
  mulai         timestamptz not null,
  selesai       timestamptz not null,
  tempat        text not null default '' check (char_length(tempat) <= 100),
  deskripsi     text not null default '' check (char_length(deskripsi) <= 1000),
  publik        boolean not null default false,
  dibuat_oleh   uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  constraint kegiatan_org_rentang check (selesai >= mulai)
);
create index if not exists kegiatan_org_idx on public.kegiatan_org (organisasi_id, mulai desc);
create table if not exists public.presensi_org (
  kegiatan_id uuid not null references public.kegiatan_org (id),
  siswa_id    uuid not null references public.siswa (id),
  status      text not null check (status in ('hadir', 'izin', 'sakit', 'alpa')),
  dicatat_oleh uuid default auth.uid(),
  waktu       timestamptz not null default now(),
  primary key (kegiatan_id, siswa_id)
);
create table if not exists public.program_kerja (
  id              uuid primary key default gen_random_uuid(),
  organisasi_id   uuid not null references public.organisasi (id),
  tahun_ajaran_id uuid not null references public.tahun_ajaran (id),
  judul           text not null check (char_length(judul) between 3 and 150),
  tujuan          text not null default '' check (char_length(tujuan) <= 1000),
  target_waktu    text not null default '' check (char_length(target_waktu) <= 60),
  indikator       text not null default '' check (char_length(indikator) <= 300),
  anggaran        numeric(14, 2) not null default 0 check (anggaran >= 0),
  status          text not null default 'rencana' check (status in ('rencana', 'berjalan', 'selesai', 'batal')),
  evaluasi        text not null default '' check (char_length(evaluasi) <= 1000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create table if not exists public.pengajuan_kegiatan (
  id                     uuid primary key default gen_random_uuid(),
  organisasi_id          uuid not null references public.organisasi (id),
  judul                  text not null check (char_length(judul) between 3 and 150),
  tujuan                 text not null default '' check (char_length(tujuan) <= 2000),
  mulai                  date not null,
  selesai                date not null,
  tempat                 text not null default '' check (char_length(tempat) <= 150),
  sasaran_peserta        int not null default 0 check (sasaran_peserta between 0 and 10000),
  risiko                 text not null default '' check (char_length(risiko) <= 1500),
  mitigasi               text not null default '' check (char_length(mitigasi) <= 1500),
  kebutuhan_sarpras      text not null default '' check (char_length(kebutuhan_sarpras) <= 1000),
  anggaran               jsonb not null default '[]' check (jsonb_typeof(anggaran) = 'array' and jsonb_array_length(anggaran) <= 50),
  sumber_dana            text not null default '' check (char_length(sumber_dana) <= 100),
  total_anggaran         numeric(14, 2) not null default 0,
  status                 text not null default 'draf' check (status in ('draf', 'diajukan', 'disetujui_pembina', 'disetujui', 'revisi', 'ditolak', 'lpj_diajukan', 'selesai')),
  catatan_reviu          text not null default '' check (char_length(catatan_reviu) <= 1000),
  lpj_ringkasan          text not null default '' check (char_length(lpj_ringkasan) <= 3000),
  lpj_realisasi          numeric(14, 2) check (lpj_realisasi >= 0),
  lpj_peserta            int check (lpj_peserta >= 0),
  lpj_tautan             text not null default '' check (lpj_tautan = '' or lpj_tautan ~ '^https://'),
  dibuat_oleh            uuid default auth.uid(),
  diajukan_pada          timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint pengajuan_rentang check (selesai >= mulai)
);
create index if not exists pengajuan_kegiatan_status on public.pengajuan_kegiatan (status, organisasi_id);
create table if not exists public.riwayat_pengajuan_kegiatan (
  id           bigint generated always as identity primary key,
  pengajuan_id uuid not null references public.pengajuan_kegiatan (id),
  status       text not null,
  catatan      text not null default '',
  oleh         uuid default auth.uid(),
  waktu        timestamptz not null default now()
);
create table if not exists public.sertifikat_org (
  id               uuid primary key default gen_random_uuid(),
  kode             text not null unique,
  organisasi_id    uuid not null references public.organisasi (id),
  siswa_id         uuid not null references public.siswa (id),
  jenis            text not null default 'keanggotaan' check (jenis in ('keanggotaan', 'kepengurusan', 'penghargaan', 'panitia', 'peserta')),
  judul            text not null check (char_length(judul) between 3 and 150),
  keterangan       text not null default '' check (char_length(keterangan) <= 300),
  tanggal          date not null default ((now() at time zone 'Asia/Jakarta')::date),
  diterbitkan_oleh uuid default auth.uid(),
  dicabut          boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists sertifikat_org_siswa on public.sertifikat_org (siswa_id);
alter table public.prestasi_siswa add column if not exists organisasi_id uuid references public.organisasi (id);

-- hak akses per organisasi --------------------------------------------
create or replace function public.pembina_org(p_org uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pembina_organisasi where organisasi_id = p_org and pegawai_id = public.pegawai_saya());
$$;
create or replace function public.kelola_org(p_org uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select public.punya_izin('ekskul.kelola') or public.pembina_org(p_org);
$$;
create or replace function public.jabatan_org(p_org uuid) returns text language sql stable security definer set search_path = '' as $$
  select k.jabatan from public.keanggotaan_org k join public.tahun_ajaran t on t.id = k.tahun_ajaran_id and t.aktif
  where k.organisasi_id = p_org and k.siswa_id = public.siswa_login() and k.status = 'aktif' limit 1;
$$;
-- siswa hanya mengelola bagian sesuai jabatannya
create or replace function public.hak_org(p_org uuid, p_aksi text) returns boolean language sql stable security definer set search_path = '' as $$
  select public.kelola_org(p_org) or coalesce(case p_aksi
    when 'kegiatan' then public.jabatan_org(p_org) in ('ketua', 'wakil_ketua', 'sekretaris', 'koordinator')
    when 'presensi' then public.jabatan_org(p_org) in ('ketua', 'wakil_ketua', 'sekretaris')
    when 'proker' then public.jabatan_org(p_org) in ('ketua', 'wakil_ketua')
    when 'pengajuan' then public.jabatan_org(p_org) in ('ketua', 'wakil_ketua', 'sekretaris', 'bendahara')
    when 'anggota' then public.jabatan_org(p_org) is not null
    else false end, false);
$$;
grant execute on function public.pembina_org(uuid), public.kelola_org(uuid), public.jabatan_org(uuid), public.hak_org(uuid, text) to authenticated;

-- penjaga --------------------------------------------------------------
create or replace function public.jaga_organisasi() returns trigger language plpgsql security definer set search_path = '' as $$
declare f jsonb;
begin
  for f in select * from jsonb_array_elements(new.field_tambahan) loop
    if coalesce(f ->> 'id', '') !~ '^f[0-9]{1,2}$' or char_length(coalesce(f ->> 'label', '')) not between 2 and 120
       or coalesce(f ->> 'jenis', '') not in ('teks', 'pilihan') then
      raise exception 'Isian tambahan tidak valid' using errcode = '22023';
    end if;
  end loop;
  if exists (select 1 from jsonb_array_elements_text(new.galeri) g where g !~ '^https://') then
    raise exception 'Tautan galeri harus https://' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and not public.punya_izin('ekskul.kelola') then
    -- pembina tidak mengubah identitas dasar organisasi
    new.jenis := old.jenis; new.nama := old.nama; new.slug := old.slug; new.aktif := old.aktif; new.deleted_at := old.deleted_at;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists jaga_organisasi on public.organisasi;
create trigger jaga_organisasi before insert or update on public.organisasi for each row execute function public.jaga_organisasi();

create or replace function public.notif_anggota_org(p_org uuid, p_judul text, p_isi text, p_tautan text) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  for u in select s.user_id from public.keanggotaan_org k join public.siswa s on s.id = k.siswa_id
           join public.tahun_ajaran t on t.id = k.tahun_ajaran_id and t.aktif
           where k.organisasi_id = p_org and k.status = 'aktif' and s.user_id is not null loop
    perform public.kirim_notif(u, 'ekskul', p_judul, p_isi, p_tautan, 'biasa', false);
  end loop;
end $$;
revoke all on function public.notif_anggota_org(uuid, text, text, text) from public, anon, authenticated;

create or replace function public.notif_pembina_org(p_org uuid, p_judul text, p_isi text, p_tautan text) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  for u in select g.user_id from public.pembina_organisasi p join public.pegawai g on g.id = p.pegawai_id
           where p.organisasi_id = p_org and g.user_id is not null loop
    perform public.kirim_notif(u, 'ekskul', p_judul, p_isi, p_tautan, 'biasa', false);
  end loop;
end $$;
revoke all on function public.notif_pembina_org(uuid, text, text, text) from public, anon, authenticated;

-- terima pendaftar: masuk keanggotaan (bila kuota penuh → daftar tunggu)
create or replace function public._terima_pendaftar(p_daftar uuid) returns text language plpgsql security definer set search_path = '' as $$
declare d public.pendaftaran_ekskul; o public.organisasi; n int; st text; u uuid;
begin
  select * into d from public.pendaftaran_ekskul where id = p_daftar for update;
  select * into o from public.organisasi where id = d.organisasi_id;
  select count(*) into n from public.keanggotaan_org where organisasi_id = d.organisasi_id and tahun_ajaran_id = d.tahun_ajaran_id and status = 'aktif';
  if o.kuota > 0 and n >= o.kuota then st := 'daftar_tunggu';
  else
    st := 'diterima';
    insert into public.keanggotaan_org (organisasi_id, siswa_id, tahun_ajaran_id) values (d.organisasi_id, d.siswa_id, d.tahun_ajaran_id)
    on conflict (organisasi_id, siswa_id, tahun_ajaran_id) do update set status = 'aktif', keluar = null, jabatan = 'anggota';
  end if;
  update public.pendaftaran_ekskul set status = st, diputuskan_oleh = coalesce(auth.uid(), diputuskan_oleh), updated_at = now() where id = p_daftar;
  u := (select user_id from public.siswa where id = d.siswa_id);
  if u is not null then
    perform public.kirim_notif(u, 'ekskul', case st when 'diterima' then 'Diterima di ' || o.nama else 'Masuk daftar tunggu ' || o.nama end,
      case st when 'diterima' then coalesce(nullif(o.jadwal_rutin, ''), 'Selamat bergabung!') else 'Kuota penuh. Anda otomatis diterima bila ada tempat.' end,
      '/portal/ekskul', 'biasa', false);
  end if;
  return st;
end $$;
revoke all on function public._terima_pendaftar(uuid) from public, anon, authenticated;

-- anggota keluar → peserta daftar tunggu terdepan otomatis naik
create or replace function public.anggota_keluar() returns trigger language plpgsql security definer set search_path = '' as $$
declare w uuid;
begin
  if new.status = 'keluar' and old.status = 'aktif' then
    new.keluar := (now() at time zone 'Asia/Jakarta')::date;
  end if;
  return new;
end $$;
drop trigger if exists anggota_keluar on public.keanggotaan_org;
create trigger anggota_keluar before update on public.keanggotaan_org for each row execute function public.anggota_keluar();
create or replace function public.naikkan_daftar_tunggu() returns trigger language plpgsql security definer set search_path = '' as $$
declare w uuid;
begin
  if new.status = 'keluar' and old.status = 'aktif' then
    select id into w from public.pendaftaran_ekskul where organisasi_id = new.organisasi_id and tahun_ajaran_id = new.tahun_ajaran_id
      and status = 'daftar_tunggu' order by created_at limit 1;
    if w is not null then perform public._terima_pendaftar(w); end if;
    update public.pendaftaran_ekskul set status = 'mundur' where organisasi_id = new.organisasi_id and siswa_id = new.siswa_id
      and tahun_ajaran_id = new.tahun_ajaran_id and status = 'diterima';
  end if;
  return null;
end $$;
drop trigger if exists naikkan_daftar_tunggu on public.keanggotaan_org;
create trigger naikkan_daftar_tunggu after update on public.keanggotaan_org for each row execute function public.naikkan_daftar_tunggu();

create or replace function public.jaga_pengajuan_kegiatan() returns trigger language plpgsql security definer set search_path = '' as $$
declare tot numeric := 0; i jsonb;
begin
  for i in select * from jsonb_array_elements(new.anggaran) loop
    if char_length(coalesce(i ->> 'uraian', '')) not between 2 and 150 or coalesce((i ->> 'volume')::numeric, -1) < 0 or coalesce((i ->> 'harga')::numeric, -1) < 0 then
      raise exception 'Rincian anggaran tidak valid' using errcode = '22023';
    end if;
    tot := tot + (i ->> 'volume')::numeric * (i ->> 'harga')::numeric;
  end loop;
  new.total_anggaran := tot;
  if tg_op = 'INSERT' then
    new.status := 'draf'; new.dibuat_oleh := auth.uid(); new.catatan_reviu := '';
  elsif current_setting('app.alur_pengajuan', true) is distinct from '1' then
    -- status hanya berubah lewat proses_pengajuan(); isi proposal hanya saat draf/revisi; LPJ hanya saat disetujui
    new.status := old.status; new.catatan_reviu := old.catatan_reviu; new.diajukan_pada := old.diajukan_pada;
    new.organisasi_id := old.organisasi_id; new.dibuat_oleh := old.dibuat_oleh;
    if old.status not in ('draf', 'revisi') then
      new.judul := old.judul; new.tujuan := old.tujuan; new.mulai := old.mulai; new.selesai := old.selesai; new.tempat := old.tempat;
      new.sasaran_peserta := old.sasaran_peserta; new.risiko := old.risiko; new.mitigasi := old.mitigasi;
      new.kebutuhan_sarpras := old.kebutuhan_sarpras; new.anggaran := old.anggaran; new.sumber_dana := old.sumber_dana; new.total_anggaran := old.total_anggaran;
    end if;
    if old.status <> 'disetujui' then
      new.lpj_ringkasan := old.lpj_ringkasan; new.lpj_realisasi := old.lpj_realisasi; new.lpj_peserta := old.lpj_peserta; new.lpj_tautan := old.lpj_tautan;
    end if;
    -- bendahara siswa hanya mengubah anggaran
    if not public.kelola_org(old.organisasi_id) and public.jabatan_org(old.organisasi_id) = 'bendahara' then
      new.judul := old.judul; new.tujuan := old.tujuan; new.mulai := old.mulai; new.selesai := old.selesai; new.tempat := old.tempat;
      new.sasaran_peserta := old.sasaran_peserta; new.risiko := old.risiko; new.mitigasi := old.mitigasi; new.kebutuhan_sarpras := old.kebutuhan_sarpras;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists jaga_pengajuan_kegiatan on public.pengajuan_kegiatan;
create trigger jaga_pengajuan_kegiatan before insert or update on public.pengajuan_kegiatan for each row execute function public.jaga_pengajuan_kegiatan();

create sequence if not exists public.nomor_sertifikat;

-- fungsi ---------------------------------------------------------------
create or replace function public.tahun_aktif_id() returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.tahun_ajaran where aktif limit 1;
$$;
grant execute on function public.tahun_aktif_id() to authenticated;

create or replace function public.daftar_ekskul(p_org uuid, p_pilihan int, p_alasan text, p_jawaban jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare sid uuid := public.siswa_login(); o public.organisasi; ta uuid := public.tahun_aktif_id(); tk text; n int; f jsonb; hari date := (now() at time zone 'Asia/Jakarta')::date;
  bersih jsonb := '{}'; v text;
begin
  if sid is null then raise exception 'Pendaftaran dilakukan siswa dari akunnya sendiri' using errcode = '42501'; end if;
  select * into o from public.organisasi where id = p_org and aktif and deleted_at is null;
  if o.id is null then raise exception 'Organisasi tidak ditemukan' using errcode = '22023'; end if;
  if o.daftar_mulai is null or hari not between o.daftar_mulai and coalesce(o.daftar_selesai, o.daftar_mulai) then
    raise exception 'Pendaftaran % sedang tidak dibuka', o.nama using errcode = '22023';
  end if;
  select kl.tingkat into tk from public.anggota_kelas ak join public.kelas kl on kl.id = ak.kelas_id where ak.siswa_id = sid and ak.tahun_ajaran_id = ta limit 1;
  if tk is null or not (tk = any (o.tingkat_boleh)) then raise exception 'Pendaftaran ini untuk kelas %', array_to_string(o.tingkat_boleh, ', ') using errcode = '22023'; end if;
  if exists (select 1 from public.pendaftaran_ekskul where organisasi_id = p_org and siswa_id = sid and tahun_ajaran_id = ta and status not in ('mundur', 'ditolak')) then
    raise exception 'Anda sudah mendaftar di %', o.nama using errcode = '22023';
  end if;
  select count(*) into n from public.pendaftaran_ekskul p join public.organisasi x on x.id = p.organisasi_id
   where p.siswa_id = sid and p.tahun_ajaran_id = ta and p.status in ('menunggu', 'diterima', 'daftar_tunggu') and x.jenis = 'ekskul';
  if o.jenis = 'ekskul' and n >= (select maks_pilihan from public.pengaturan_ekskul where id = 1) then
    raise exception 'Maksimal % ekskul per tahun ajaran', (select maks_pilihan from public.pengaturan_ekskul where id = 1) using errcode = '22023';
  end if;
  for f in select * from jsonb_array_elements(o.field_tambahan) loop
    v := trim(coalesce(p_jawaban ->> (f ->> 'id'), ''));
    if v = '' and coalesce((f ->> 'wajib')::boolean, false) then raise exception 'Isi: %', f ->> 'label' using errcode = '22023'; end if;
    if v <> '' and f ->> 'jenis' = 'pilihan' and not ((f -> 'pilihan') ? v) then raise exception 'Pilihan tidak valid: %', f ->> 'label' using errcode = '22023'; end if;
    if v <> '' then bersih := bersih || jsonb_build_object(f ->> 'id', left(v, 500)); end if;
  end loop;
  insert into public.pendaftaran_ekskul (organisasi_id, siswa_id, tahun_ajaran_id, pilihan, alasan, jawaban)
  values (p_org, sid, ta, greatest(1, least(coalesce(p_pilihan, 1), 5)), left(trim(coalesce(p_alasan, '')), 500), bersih)
  on conflict (organisasi_id, siswa_id, tahun_ajaran_id) do update
    set status = 'menunggu', pilihan = excluded.pilihan, alasan = excluded.alasan, jawaban = excluded.jawaban, catatan = '', updated_at = now(), created_at = now();
  perform public.notif_pembina_org(p_org, 'Pendaftar baru ' || o.nama, 'Periksa pendaftaran di panel.', '/admin/ekskul/' || p_org || '?tab=pendaftaran');
  return 'menunggu';
end $$;

create or replace function public.putuskan_pendaftaran(p_id uuid, p_terima boolean, p_catatan text default '')
returns text language plpgsql security definer set search_path = '' as $$
declare d public.pendaftaran_ekskul; u uuid;
begin
  select * into d from public.pendaftaran_ekskul where id = p_id;
  if d.id is null or not public.kelola_org(d.organisasi_id) then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  if d.status not in ('menunggu', 'daftar_tunggu') then raise exception 'Pendaftaran sudah diputuskan' using errcode = '22023'; end if;
  update public.pendaftaran_ekskul set catatan = left(coalesce(p_catatan, ''), 300) where id = p_id;
  if p_terima then return public._terima_pendaftar(p_id); end if;
  update public.pendaftaran_ekskul set status = 'ditolak', diputuskan_oleh = auth.uid(), updated_at = now() where id = p_id;
  u := (select user_id from public.siswa where id = d.siswa_id);
  if u is not null then
    perform public.kirim_notif(u, 'ekskul', 'Pendaftaran ' || (select nama from public.organisasi where id = d.organisasi_id) || ' belum diterima',
      coalesce(nullif(p_catatan, ''), 'Silakan mencoba ekskul lain.'), '/portal/ekskul', 'biasa', false);
  end if;
  return 'ditolak';
end $$;

create or replace function public.mundur_ekskul(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.pendaftaran_ekskul set status = 'mundur', updated_at = now()
   where id = p_id and siswa_id = public.siswa_login() and status in ('menunggu', 'daftar_tunggu');
  if not found then raise exception 'Pendaftaran tidak dapat dibatalkan' using errcode = '22023'; end if;
end $$;

-- daftar anggota: pengelola & sesama anggota (nama & kelas saja)
create or replace function public.anggota_org(p_org uuid)
returns table (id uuid, siswa_id uuid, nama text, kelas text, jabatan text, bidang text, status text, bergabung date)
language sql stable security definer set search_path = '' as $$
  select k.id, s.id, s.nama, coalesce(kl.nama, ''), k.jabatan, k.bidang, k.status, k.bergabung
  from public.keanggotaan_org k join public.siswa s on s.id = k.siswa_id
  join public.tahun_ajaran t on t.id = k.tahun_ajaran_id and t.aktif
  left join public.anggota_kelas ak on ak.siswa_id = s.id and ak.tahun_ajaran_id = t.id left join public.kelas kl on kl.id = ak.kelas_id
  where k.organisasi_id = p_org and public.hak_org(p_org, 'anggota')
  order by k.status, case k.jabatan when 'ketua' then 1 when 'wakil_ketua' then 2 when 'sekretaris' then 3 when 'bendahara' then 4 when 'koordinator' then 5 else 9 end, s.nama;
$$;

create or replace function public.pendaftar_org(p_org uuid)
returns table (id uuid, nama text, kelas text, pilihan smallint, alasan text, jawaban jsonb, status text, catatan text, dibuat timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, s.nama, coalesce(kl.nama, ''), p.pilihan, p.alasan, p.jawaban, p.status, p.catatan, p.created_at
  from public.pendaftaran_ekskul p join public.siswa s on s.id = p.siswa_id
  left join public.anggota_kelas ak on ak.siswa_id = s.id and ak.tahun_ajaran_id = p.tahun_ajaran_id left join public.kelas kl on kl.id = ak.kelas_id
  where p.organisasi_id = p_org and p.tahun_ajaran_id = public.tahun_aktif_id() and public.kelola_org(p_org)
  order by case p.status when 'menunggu' then 1 when 'daftar_tunggu' then 2 else 3 end, p.created_at;
$$;

create or replace function public.isi_presensi_org(p_kegiatan uuid, p_data jsonb) returns int language plpgsql security definer set search_path = '' as $$
declare g public.kegiatan_org; r jsonb; n int := 0;
begin
  select * into g from public.kegiatan_org where id = p_kegiatan;
  if g.id is null or not public.hak_org(g.organisasi_id, 'presensi') then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  for r in select * from jsonb_array_elements(p_data) loop
    if (r ->> 'status') not in ('hadir', 'izin', 'sakit', 'alpa') then continue; end if;
    if not exists (select 1 from public.keanggotaan_org k where k.organisasi_id = g.organisasi_id and k.siswa_id = (r ->> 'siswa_id')::uuid
                    and k.tahun_ajaran_id = public.tahun_aktif_id() and k.status = 'aktif') then continue; end if;
    insert into public.presensi_org (kegiatan_id, siswa_id, status) values (p_kegiatan, (r ->> 'siswa_id')::uuid, r ->> 'status')
    on conflict (kegiatan_id, siswa_id) do update set status = excluded.status, dicatat_oleh = auth.uid(), waktu = now();
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.rekap_kehadiran_org(p_org uuid)
returns table (siswa_id uuid, nama text, kegiatan int, hadir int, persen numeric)
language sql stable security definer set search_path = '' as $$
  select s.id, s.nama, count(p.*)::int, count(p.*) filter (where p.status = 'hadir')::int,
         round(100.0 * count(p.*) filter (where p.status = 'hadir') / nullif(count(p.*), 0), 0)
  from public.keanggotaan_org k join public.siswa s on s.id = k.siswa_id
  left join public.kegiatan_org g on g.organisasi_id = k.organisasi_id and g.mulai >= coalesce((select tanggal_mulai from public.tahun_ajaran where id = k.tahun_ajaran_id), '1900-01-01')
  left join public.presensi_org p on p.kegiatan_id = g.id and p.siswa_id = s.id
  where k.organisasi_id = p_org and k.tahun_ajaran_id = public.tahun_aktif_id() and k.status = 'aktif'
    and (public.hak_org(p_org, 'presensi') or public.punya_izin('ekskul.lihat'))
  group by s.id, s.nama order by s.nama;
$$;

create or replace function public.proses_pengajuan(p_id uuid, p_aksi text, p_catatan text default '')
returns text language plpgsql security definer set search_path = '' as $$
declare a public.pengajuan_kegiatan; baru text; kel boolean; u uuid; org text;
begin
  select * into a from public.pengajuan_kegiatan where id = p_id for update;
  if a.id is null then raise exception 'Pengajuan tidak ditemukan' using errcode = '22023'; end if;
  kel := public.punya_izin('ekskul.kelola');
  org := (select nama from public.organisasi where id = a.organisasi_id);
  baru := case
    when p_aksi = 'ajukan' and a.status in ('draf', 'revisi') and public.hak_org(a.organisasi_id, 'pengajuan') then 'diajukan'
    when p_aksi = 'setujui' and a.status = 'diajukan' and public.pembina_org(a.organisasi_id) then 'disetujui_pembina'
    when p_aksi = 'setujui' and a.status in ('diajukan', 'disetujui_pembina') and kel then 'disetujui'
    when p_aksi = 'revisi' and a.status in ('diajukan', 'disetujui_pembina') and (kel or public.pembina_org(a.organisasi_id)) then 'revisi'
    when p_aksi = 'tolak' and a.status in ('diajukan', 'disetujui_pembina') and (kel or public.pembina_org(a.organisasi_id)) then 'ditolak'
    when p_aksi = 'lpj' and a.status = 'disetujui' and public.hak_org(a.organisasi_id, 'pengajuan') then 'lpj_diajukan'
    when p_aksi = 'terima_lpj' and a.status = 'lpj_diajukan' and kel then 'selesai'
    when p_aksi = 'tolak_lpj' and a.status = 'lpj_diajukan' and kel then 'disetujui'
    else null end;
  if baru is null then raise exception 'Aksi tidak diizinkan pada tahap ini' using errcode = '42501'; end if;
  if baru = 'diajukan' and (char_length(a.tujuan) < 10 or a.mulai < (now() at time zone 'Asia/Jakarta')::date) then
    raise exception 'Lengkapi tujuan dan pastikan tanggal kegiatan belum lewat' using errcode = '22023';
  end if;
  if baru = 'lpj_diajukan' and char_length(a.lpj_ringkasan) < 20 then raise exception 'Isi ringkasan LPJ (minimal 20 karakter)' using errcode = '22023'; end if;
  if baru in ('revisi', 'ditolak') and char_length(trim(coalesce(p_catatan, ''))) < 5 then raise exception 'Tulis catatan untuk pengaju' using errcode = '22023'; end if;
  perform set_config('app.alur_pengajuan', '1', true);
  update public.pengajuan_kegiatan set status = baru, catatan_reviu = case when coalesce(p_catatan, '') <> '' then left(p_catatan, 1000) else catatan_reviu end,
    diajukan_pada = case when baru = 'diajukan' then now() else diajukan_pada end where id = p_id;
  perform set_config('app.alur_pengajuan', '0', true);
  insert into public.riwayat_pengajuan_kegiatan (pengajuan_id, status, catatan) values (p_id, baru, left(coalesce(p_catatan, ''), 1000));
  -- pemberitahuan ke tahap berikutnya
  if baru = 'diajukan' then
    perform public.notif_pembina_org(a.organisasi_id, 'Pengajuan kegiatan: ' || a.judul, org || ' · menunggu persetujuan pembina', '/admin/ekskul/pengajuan/' || p_id);
  elsif baru in ('disetujui_pembina', 'lpj_diajukan') then
    for u in select public.pengguna_berizin('ekskul.kelola') loop
      perform public.kirim_notif(u, 'ekskul', case when baru = 'lpj_diajukan' then 'LPJ kegiatan: ' else 'Pengajuan kegiatan: ' end || a.judul, org, '/admin/ekskul/pengajuan/' || p_id, 'biasa', false);
    end loop;
  end if;
  if baru in ('disetujui', 'revisi', 'ditolak', 'selesai') and a.dibuat_oleh is not null then
    perform public.kirim_notif(a.dibuat_oleh, 'ekskul', 'Pengajuan "' || a.judul || '": ' || replace(baru, '_', ' '), left(coalesce(nullif(p_catatan, ''), org), 200),
      case when exists (select 1 from public.siswa where user_id = a.dibuat_oleh) then '/portal/ekskul/' || a.organisasi_id else '/admin/ekskul/pengajuan/' || p_id end, 'biasa', false);
  end if;
  return baru;
end $$;

create or replace function public.terbitkan_sertifikat(p_org uuid, p_siswa uuid[], p_jenis text, p_judul text, p_keterangan text, p_tanggal date)
returns int language plpgsql security definer set search_path = '' as $$
declare s uuid; n int := 0; v_kode text; u uuid; abjad text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if not public.kelola_org(p_org) then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  foreach s in array p_siswa loop
    if not exists (select 1 from public.keanggotaan_org where organisasi_id = p_org and siswa_id = s) and p_jenis not in ('panitia', 'peserta', 'penghargaan') then continue; end if;
    loop
      v_kode := 'S22-';
      for i in 1..8 loop v_kode := v_kode || substr(abjad, 1 + floor(random() * length(abjad))::int, 1); end loop;
      exit when not exists (select 1 from public.sertifikat_org where sertifikat_org.kode = v_kode);
    end loop;
    insert into public.sertifikat_org (kode, organisasi_id, siswa_id, jenis, judul, keterangan, tanggal)
    values (v_kode, p_org, s, p_jenis, trim(p_judul), left(trim(coalesce(p_keterangan, '')), 300), coalesce(p_tanggal, (now() at time zone 'Asia/Jakarta')::date));
    u := (select user_id from public.siswa where id = s);
    if u is not null then perform public.kirim_notif(u, 'ekskul', 'Sertifikat baru: ' || trim(p_judul), 'Unduh di portal → Ekskul.', '/portal/ekskul', 'biasa', false); end if;
    n := n + 1;
  end loop;
  return n;
end $$;

-- verifikasi publik: nama disamarkan, cukup untuk mencocokkan dengan dokumen asli
create or replace function public.verifikasi_sertifikat(p_kode text)
returns table (kode text, nama_samaran text, organisasi text, jenis text, judul text, keterangan text, tanggal date, berlaku boolean)
language sql stable security definer set search_path = '' as $$
  select c.kode,
         (select string_agg(left(w, 1) || repeat('*', greatest(char_length(w) - 1, 0)), ' ') from unnest(string_to_array(s.nama, ' ')) w)
           || ' (' || left(s.nama, 1) || ')',
         o.nama, c.jenis, c.judul, c.keterangan, c.tanggal, not c.dicabut
  from public.sertifikat_org c join public.siswa s on s.id = c.siswa_id join public.organisasi o on o.id = c.organisasi_id
  where c.kode = upper(trim(p_kode));
$$;

-- data cetak sertifikat (pemilik/orang tua atau pengelola)
create or replace function public.data_sertifikat(p_id uuid)
returns table (kode text, nama text, nisn text, organisasi text, logo_url text, warna text, jenis text, judul text, keterangan text, tanggal date, dicabut boolean, pembina text)
language sql stable security definer set search_path = '' as $$
  select c.kode, s.nama, s.nisn, o.nama, o.logo_url, o.warna, c.jenis, c.judul, c.keterangan, c.tanggal, c.dicabut,
         coalesce((select string_agg(g.nama, ', ') from public.pembina_organisasi p join public.pegawai g on g.id = p.pegawai_id where p.organisasi_id = o.id), '')
  from public.sertifikat_org c join public.siswa s on s.id = c.siswa_id join public.organisasi o on o.id = c.organisasi_id
  where c.id = p_id and (public.diri_atau_anak(c.siswa_id) or public.kelola_org(c.organisasi_id));
$$;

-- portofolio anggota: riwayat keanggotaan & jabatan, kehadiran, sertifikat, prestasi
create or replace function public.portofolio_ekskul(p_siswa uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.diri_atau_anak(p_siswa) or public.punya_izin('ekskul.kelola') or public.punya_izin('ekskul.lihat')
          or exists (select 1 from public.keanggotaan_org k where k.siswa_id = p_siswa and public.pembina_org(k.organisasi_id))) then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'keanggotaan', coalesce((select jsonb_agg(jsonb_build_object('organisasi', o.nama, 'organisasi_id', o.id, 'warna', o.warna, 'tahun', t.nama, 'jabatan', k.jabatan,
        'bidang', k.bidang, 'status', k.status) order by t.tanggal_mulai desc, o.nama)
        from public.keanggotaan_org k join public.organisasi o on o.id = k.organisasi_id join public.tahun_ajaran t on t.id = k.tahun_ajaran_id
        where k.siswa_id = p_siswa), '[]'),
    'kehadiran', coalesce((select jsonb_agg(jsonb_build_object('organisasi', x.nama, 'kegiatan', x.n, 'hadir', x.h)) from (
        select o.nama, count(*) n, count(*) filter (where p.status = 'hadir') h from public.presensi_org p
        join public.kegiatan_org g on g.id = p.kegiatan_id join public.organisasi o on o.id = g.organisasi_id
        where p.siswa_id = p_siswa group by o.nama) x), '[]'),
    'sertifikat', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'kode', c.kode, 'judul', c.judul, 'organisasi', o.nama, 'tanggal', c.tanggal, 'dicabut', c.dicabut) order by c.tanggal desc)
        from public.sertifikat_org c join public.organisasi o on o.id = c.organisasi_id where c.siswa_id = p_siswa), '[]'),
    'prestasi', coalesce((select jsonb_agg(jsonb_build_object('nama', p.nama_kegiatan, 'tingkat', p.tingkat, 'peringkat', p.peringkat, 'tanggal', p.tanggal,
        'organisasi', o.nama) order by p.tanggal desc)
        from public.prestasi_siswa p left join public.organisasi o on o.id = p.organisasi_id where p.siswa_id = p_siswa and p.status = 'terverifikasi'), '[]')
  );
end $$;

-- website: daftar & profil organisasi (tanpa data siswa; prestasi tanpa nama)
create or replace function public.organisasi_publik()
returns table (id uuid, jenis text, nama text, slug text, singkatan text, bidang text, deskripsi text, logo_url text, warna text,
               jadwal_rutin text, jumlah_anggota int, pendaftaran_buka boolean)
language sql stable security definer set search_path = '' as $$
  select o.id, o.jenis, o.nama, o.slug, o.singkatan, o.bidang, left(o.deskripsi, 300), o.logo_url, o.warna, o.jadwal_rutin,
         (select count(*)::int from public.keanggotaan_org k join public.tahun_ajaran t on t.id = k.tahun_ajaran_id and t.aktif
           where k.organisasi_id = o.id and k.status = 'aktif'),
         o.daftar_mulai is not null and (now() at time zone 'Asia/Jakarta')::date between o.daftar_mulai and coalesce(o.daftar_selesai, o.daftar_mulai)
  from public.organisasi o where o.aktif and o.tampil_publik and o.deleted_at is null
  order by case o.jenis when 'osis' then 1 when 'mpk' then 2 else 3 end, o.nama;
$$;
create or replace function public.organisasi_publik_detail(p_slug text) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', o.id, 'jenis', o.jenis, 'nama', o.nama, 'singkatan', o.singkatan, 'bidang', o.bidang, 'deskripsi', o.deskripsi,
    'logo_url', o.logo_url, 'warna', o.warna, 'jadwal_rutin', o.jadwal_rutin, 'tempat', o.tempat, 'syarat', o.syarat, 'galeri', o.galeri,
    'tingkat_boleh', o.tingkat_boleh, 'daftar_mulai', o.daftar_mulai, 'daftar_selesai', o.daftar_selesai,
    'pembina', coalesce((select jsonb_agg(g.nama order by g.nama) from public.pembina_organisasi p join public.pegawai g on g.id = p.pegawai_id where p.organisasi_id = o.id), '[]'),
    'jumlah_anggota', (select count(*) from public.keanggotaan_org k join public.tahun_ajaran t on t.id = k.tahun_ajaran_id and t.aktif where k.organisasi_id = o.id and k.status = 'aktif'),
    'prestasi', coalesce((select jsonb_agg(jsonb_build_object('nama', x.nama_kegiatan, 'tingkat', x.tingkat, 'peringkat', x.peringkat, 'tanggal', x.tanggal) order by x.tanggal desc)
        from (select distinct on (p.nama_kegiatan, p.peringkat) p.nama_kegiatan, p.tingkat, p.peringkat, p.tanggal from public.prestasi_siswa p
              where p.organisasi_id = o.id and p.status = 'terverifikasi' order by p.nama_kegiatan, p.peringkat, p.tanggal desc limit 20) x), '[]'),
    'agenda', coalesce((select jsonb_agg(jsonb_build_object('judul', g.judul, 'jenis', g.jenis, 'mulai', g.mulai, 'tempat', g.tempat) order by g.mulai)
        from public.kegiatan_org g where g.organisasi_id = o.id and g.publik and g.mulai >= now() - interval '1 day' and g.mulai <= now() + interval '90 days'), '[]'))
  from public.organisasi o where o.slug = p_slug and o.aktif and o.tampil_publik and o.deleted_at is null;
$$;

create or replace function public.statistik_ekskul()
returns table (id uuid, nama text, jenis text, warna text, anggota int, menunggu int, daftar_tunggu int, kegiatan int, kehadiran numeric, pengajuan_aktif int)
language sql stable security definer set search_path = '' as $$
  select o.id, o.nama, o.jenis, o.warna,
    (select count(*)::int from public.keanggotaan_org k where k.organisasi_id = o.id and k.tahun_ajaran_id = public.tahun_aktif_id() and k.status = 'aktif'),
    (select count(*)::int from public.pendaftaran_ekskul p where p.organisasi_id = o.id and p.tahun_ajaran_id = public.tahun_aktif_id() and p.status = 'menunggu'),
    (select count(*)::int from public.pendaftaran_ekskul p where p.organisasi_id = o.id and p.tahun_ajaran_id = public.tahun_aktif_id() and p.status = 'daftar_tunggu'),
    (select count(*)::int from public.kegiatan_org g where g.organisasi_id = o.id and g.mulai >= coalesce((select tanggal_mulai from public.tahun_ajaran where aktif limit 1), '1900-01-01')),
    (select round(100.0 * count(*) filter (where p.status = 'hadir') / nullif(count(*), 0), 0) from public.presensi_org p join public.kegiatan_org g on g.id = p.kegiatan_id
       where g.organisasi_id = o.id and g.mulai >= coalesce((select tanggal_mulai from public.tahun_ajaran where aktif limit 1), '1900-01-01')),
    (select count(*)::int from public.pengajuan_kegiatan a where a.organisasi_id = o.id and a.status in ('diajukan', 'disetujui_pembina', 'lpj_diajukan'))
  from public.organisasi o
  where o.deleted_at is null and (public.punya_izin('ekskul.kelola') or public.punya_izin('ekskul.lihat') or public.pembina_org(o.id))
  order by case o.jenis when 'osis' then 1 when 'mpk' then 2 else 3 end, o.nama;
$$;

-- tautkan prestasi terverifikasi anggota ke organisasi (untuk portofolio & profil publik)
create or replace function public.tautkan_prestasi_org(p_prestasi uuid, p_org uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.kelola_org(p_org) then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  update public.prestasi_siswa p set organisasi_id = p_org where p.id = p_prestasi and p.status = 'terverifikasi'
     and exists (select 1 from public.keanggotaan_org k where k.organisasi_id = p_org and k.siswa_id = p.siswa_id);
  if not found then raise exception 'Prestasi tidak ditemukan / belum terverifikasi / bukan milik anggota' using errcode = '22023'; end if;
end $$;
-- prestasi terverifikasi para anggota (untuk dipilih pembina)
create or replace function public.prestasi_anggota_org(p_org uuid)
returns table (id uuid, nama text, kegiatan text, tingkat text, peringkat text, tanggal date, tertaut boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, s.nama, p.nama_kegiatan, p.tingkat, p.peringkat, p.tanggal, p.organisasi_id is not distinct from p_org
  from public.prestasi_siswa p join public.siswa s on s.id = p.siswa_id
  where p.status = 'terverifikasi' and public.kelola_org(p_org)
    and exists (select 1 from public.keanggotaan_org k where k.organisasi_id = p_org and k.siswa_id = p.siswa_id)
  order by p.tanggal desc limit 100;
$$;
revoke all on function public.tautkan_prestasi_org(uuid, uuid), public.prestasi_anggota_org(uuid) from public, anon;
grant execute on function public.tautkan_prestasi_org(uuid, uuid), public.prestasi_anggota_org(uuid) to authenticated;

revoke all on function public.daftar_ekskul(uuid, int, text, jsonb), public.putuskan_pendaftaran(uuid, boolean, text), public.mundur_ekskul(uuid),
  public.anggota_org(uuid), public.pendaftar_org(uuid), public.isi_presensi_org(uuid, jsonb), public.rekap_kehadiran_org(uuid),
  public.proses_pengajuan(uuid, text, text), public.terbitkan_sertifikat(uuid, uuid[], text, text, text, date), public.data_sertifikat(uuid),
  public.portofolio_ekskul(uuid), public.statistik_ekskul() from public, anon;
grant execute on function public.daftar_ekskul(uuid, int, text, jsonb), public.putuskan_pendaftaran(uuid, boolean, text), public.mundur_ekskul(uuid),
  public.anggota_org(uuid), public.pendaftar_org(uuid), public.isi_presensi_org(uuid, jsonb), public.rekap_kehadiran_org(uuid),
  public.proses_pengajuan(uuid, text, text), public.terbitkan_sertifikat(uuid, uuid[], text, text, text, date), public.data_sertifikat(uuid),
  public.portofolio_ekskul(uuid), public.statistik_ekskul() to authenticated;
revoke all on function public.verifikasi_sertifikat(text), public.organisasi_publik(), public.organisasi_publik_detail(text) from public;
grant execute on function public.verifikasi_sertifikat(text), public.organisasi_publik(), public.organisasi_publik_detail(text) to anon, authenticated;

-- =====================================================================
-- RLS
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['pengaturan_bk', 'kategori_konseling', 'kasus_bk', 'permintaan_konseling', 'sesi_konseling', 'tindak_lanjut_bk',
                           'rujukan_eksternal_bk', 'log_akses_bk', 'pengaturan_ekskul', 'organisasi', 'pembina_organisasi', 'pendaftaran_ekskul',
                           'keanggotaan_org', 'kegiatan_org', 'presensi_org', 'program_kerja', 'pengajuan_kegiatan', 'riwayat_pengajuan_kegiatan', 'sertifikat_org'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke truncate on public.%I from authenticated', t);
    -- tabel BK yang memuat ciphertext tidak diaudit per-baris (isi terenkripsi tidak boleh tersalin ke log audit umum); aksesnya tercatat di log_akses_bk
    if t not in ('kasus_bk', 'permintaan_konseling', 'sesi_konseling', 'log_akses_bk', 'presensi_org', 'riwayat_pengajuan_kegiatan') then
      execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
      execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.catat_audit()', t);
    end if;
  end loop;
end $$;

-- ---- BK ----
drop policy if exists "baca pengaturan bk" on public.pengaturan_bk;
create policy "baca pengaturan bk" on public.pengaturan_bk for select to authenticated using ((select public.punya_izin('bk.konseling')));
drop policy if exists "ubah pengaturan bk" on public.pengaturan_bk;
create policy "ubah pengaturan bk" on public.pengaturan_bk for update to authenticated
  using ((select public.punya_izin('bk.konseling'))) with check ((select public.punya_izin('bk.konseling')));
revoke insert, delete on public.pengaturan_bk from authenticated;

drop policy if exists "baca kategori konseling" on public.kategori_konseling;
create policy "baca kategori konseling" on public.kategori_konseling for select to authenticated using (true);
drop policy if exists "kelola kategori konseling" on public.kategori_konseling;
create policy "kelola kategori konseling" on public.kategori_konseling for all to authenticated
  using ((select public.punya_izin('bk.konseling'))) with check ((select public.punya_izin('bk.konseling')));
revoke delete on public.kategori_konseling from authenticated;

drop policy if exists "bk kasus" on public.kasus_bk;
create policy "bk kasus" on public.kasus_bk for all to authenticated
  using ((select public.punya_izin('bk.konseling'))) with check ((select public.punya_izin('bk.konseling')));
revoke delete on public.kasus_bk from authenticated;
-- kolom terenkripsi tidak bisa dibaca langsung: hanya lewat buka_kasus_bk() yang mencatat log akses
revoke select on public.kasus_bk from authenticated;
grant select (id, kode, siswa_id, kategori, prioritas, risiko, status, konselor_id, asal, rujukan_id, saran_wali, saran_wali_pada,
              dibuka, ditutup, retensi_sampai, isi_dimusnahkan, created_at, updated_at) on public.kasus_bk to authenticated;

drop policy if exists "baca permintaan bk" on public.permintaan_konseling;
create policy "baca permintaan bk" on public.permintaan_konseling for select to authenticated
  using ((select public.punya_izin('bk.konseling')) or diajukan_oleh = auth.uid());
drop policy if exists "proses permintaan bk" on public.permintaan_konseling;
create policy "proses permintaan bk" on public.permintaan_konseling for update to authenticated
  using ((select public.punya_izin('bk.konseling'))) with check ((select public.punya_izin('bk.konseling')));
revoke insert, delete on public.permintaan_konseling from authenticated;
revoke select on public.permintaan_konseling from authenticated;
grant select (id, siswa_id, diajukan_oleh, sumber, kategori, topik, prioritas, waktu_preferensi, status, kasus_id, catatan_untuk_pemohon, created_at, updated_at)
  on public.permintaan_konseling to authenticated;

drop policy if exists "bk sesi" on public.sesi_konseling;
create policy "bk sesi" on public.sesi_konseling for all to authenticated
  using ((select public.punya_izin('bk.konseling'))) with check ((select public.punya_izin('bk.konseling')));
revoke delete on public.sesi_konseling from authenticated;
revoke select on public.sesi_konseling from authenticated;
grant select (id, kasus_id, mulai, durasi_menit, jenis, mode, tempat, status, konselor_id, created_at, updated_at) on public.sesi_konseling to authenticated;

drop policy if exists "bk tindak lanjut" on public.tindak_lanjut_bk;
create policy "bk tindak lanjut" on public.tindak_lanjut_bk for all to authenticated
  using ((select public.punya_izin('bk.konseling'))) with check ((select public.punya_izin('bk.konseling')));
drop policy if exists "bk rujukan luar" on public.rujukan_eksternal_bk;
create policy "bk rujukan luar" on public.rujukan_eksternal_bk for all to authenticated
  using ((select public.punya_izin('bk.konseling'))) with check ((select public.punya_izin('bk.konseling')));
revoke delete on public.rujukan_eksternal_bk from authenticated;

drop policy if exists "baca log akses bk" on public.log_akses_bk;
create policy "baca log akses bk" on public.log_akses_bk for select to authenticated
  using ((select public.punya_izin('bk.konseling')) or (select public.punya_izin('audit.baca')));
revoke insert, update, delete on public.log_akses_bk from authenticated;

-- ---- Ekskul ----
drop policy if exists "baca pengaturan ekskul" on public.pengaturan_ekskul;
create policy "baca pengaturan ekskul" on public.pengaturan_ekskul for select to authenticated using (true);
drop policy if exists "ubah pengaturan ekskul" on public.pengaturan_ekskul;
create policy "ubah pengaturan ekskul" on public.pengaturan_ekskul for update to authenticated
  using ((select public.punya_izin('ekskul.kelola'))) with check ((select public.punya_izin('ekskul.kelola')));
revoke insert, delete on public.pengaturan_ekskul from authenticated;

drop policy if exists "baca organisasi" on public.organisasi;
create policy "baca organisasi" on public.organisasi for select to authenticated using (deleted_at is null or (select public.punya_izin('ekskul.kelola')));
drop policy if exists "tambah organisasi" on public.organisasi;
create policy "tambah organisasi" on public.organisasi for insert to authenticated with check ((select public.punya_izin('ekskul.kelola')));
drop policy if exists "ubah organisasi" on public.organisasi;
create policy "ubah organisasi" on public.organisasi for update to authenticated using (public.kelola_org(id)) with check (public.kelola_org(id));
revoke delete on public.organisasi from authenticated;

drop policy if exists "baca pembina" on public.pembina_organisasi;
create policy "baca pembina" on public.pembina_organisasi for select to authenticated using (true);
drop policy if exists "kelola pembina" on public.pembina_organisasi;
create policy "kelola pembina" on public.pembina_organisasi for all to authenticated
  using ((select public.punya_izin('ekskul.kelola'))) with check ((select public.punya_izin('ekskul.kelola')));

drop policy if exists "baca pendaftaran" on public.pendaftaran_ekskul;
create policy "baca pendaftaran" on public.pendaftaran_ekskul for select to authenticated
  using (public.kelola_org(organisasi_id) or public.diri_atau_anak(siswa_id) or (select public.punya_izin('ekskul.lihat')));
revoke insert, update, delete on public.pendaftaran_ekskul from authenticated;

drop policy if exists "baca keanggotaan" on public.keanggotaan_org;
create policy "baca keanggotaan" on public.keanggotaan_org for select to authenticated
  using (public.kelola_org(organisasi_id) or public.diri_atau_anak(siswa_id) or (select public.punya_izin('ekskul.lihat')));
drop policy if exists "ubah keanggotaan" on public.keanggotaan_org;
create policy "ubah keanggotaan" on public.keanggotaan_org for update to authenticated
  using (public.kelola_org(organisasi_id)) with check (public.kelola_org(organisasi_id));
revoke insert, delete on public.keanggotaan_org from authenticated;

drop policy if exists "baca kegiatan org" on public.kegiatan_org;
create policy "baca kegiatan org" on public.kegiatan_org for select to authenticated using ((select public.warga_aktif()));
drop policy if exists "kelola kegiatan org" on public.kegiatan_org;
create policy "kelola kegiatan org" on public.kegiatan_org for all to authenticated
  using (public.hak_org(organisasi_id, 'kegiatan')) with check (public.hak_org(organisasi_id, 'kegiatan'));

drop policy if exists "baca presensi org" on public.presensi_org;
create policy "baca presensi org" on public.presensi_org for select to authenticated
  using (public.diri_atau_anak(siswa_id) or exists (select 1 from public.kegiatan_org g where g.id = kegiatan_id and public.hak_org(g.organisasi_id, 'presensi'))
         or (select public.punya_izin('ekskul.lihat')));
revoke insert, update, delete on public.presensi_org from authenticated;

drop policy if exists "baca proker" on public.program_kerja;
create policy "baca proker" on public.program_kerja for select to authenticated
  using (public.hak_org(organisasi_id, 'anggota') or (select public.punya_izin('ekskul.lihat')));
drop policy if exists "kelola proker" on public.program_kerja;
create policy "kelola proker" on public.program_kerja for all to authenticated
  using (public.hak_org(organisasi_id, 'proker')) with check (public.hak_org(organisasi_id, 'proker'));

drop policy if exists "baca pengajuan kegiatan" on public.pengajuan_kegiatan;
create policy "baca pengajuan kegiatan" on public.pengajuan_kegiatan for select to authenticated
  using (public.hak_org(organisasi_id, 'pengajuan') or (select public.punya_izin('ekskul.lihat')) or (select public.punya_izin('ekskul.anggaran')));
drop policy if exists "tulis pengajuan kegiatan" on public.pengajuan_kegiatan;
create policy "tulis pengajuan kegiatan" on public.pengajuan_kegiatan for insert to authenticated with check (public.hak_org(organisasi_id, 'pengajuan'));
drop policy if exists "ubah pengajuan kegiatan" on public.pengajuan_kegiatan;
create policy "ubah pengajuan kegiatan" on public.pengajuan_kegiatan for update to authenticated
  using (public.hak_org(organisasi_id, 'pengajuan')) with check (public.hak_org(organisasi_id, 'pengajuan'));
revoke delete on public.pengajuan_kegiatan from authenticated;

drop policy if exists "baca riwayat pengajuan" on public.riwayat_pengajuan_kegiatan;
create policy "baca riwayat pengajuan" on public.riwayat_pengajuan_kegiatan for select to authenticated
  using (exists (select 1 from public.pengajuan_kegiatan a where a.id = pengajuan_id));
revoke insert, update, delete on public.riwayat_pengajuan_kegiatan from authenticated;

drop policy if exists "baca sertifikat" on public.sertifikat_org;
create policy "baca sertifikat" on public.sertifikat_org for select to authenticated
  using (public.diri_atau_anak(siswa_id) or public.kelola_org(organisasi_id) or (select public.punya_izin('ekskul.lihat')));
drop policy if exists "cabut sertifikat" on public.sertifikat_org;
create policy "cabut sertifikat" on public.sertifikat_org for update to authenticated using (public.kelola_org(organisasi_id)) with check (public.kelola_org(organisasi_id));
revoke insert, delete on public.sertifikat_org from authenticated;
revoke update on public.sertifikat_org from authenticated;
grant update (dicabut) on public.sertifikat_org to authenticated;

notify pgrst, 'reload schema';
