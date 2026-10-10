-- =====================================================================
--  Fase 3 — Absensi Siswa (Modul 09), Absensi Guru & Tendik (Modul 10),
--  Disiplin positif: SP & pemanggilan orang tua (aturan SABDA 22).
--  Jalankan SETELAH 20261008000000_akun_data_induk.sql. Idempotent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Peran & izin baru
-- ---------------------------------------------------------------------
insert into public.peran (kode, nama, keterangan, urutan) values
  ('kesiswaan', 'Kesiswaan', 'Mengelola absensi & menindaklanjuti disiplin siswa', 5),
  ('piket',     'Guru Piket', 'Mencatat keterlambatan & menyetujui koreksi absensi', 6)
on conflict (kode) do update set nama = excluded.nama, keterangan = excluded.keterangan;

insert into public.izin (kode, keterangan) values
  ('absensi.lihat',          'Melihat absensi & rekap seluruh siswa'),
  ('absensi.kelola',         'Mencatat/mengubah absensi siswa kapan saja & menyetujui koreksi'),
  ('disiplin.lihat',         'Melihat status SP & pemanggilan orang tua'),
  ('disiplin.kelola',        'Mengonfirmasi tindak lanjut disiplin'),
  ('absensi_pegawai.lihat',  'Melihat rekap kehadiran guru & pegawai'),
  ('absensi_pegawai.kelola', 'Mencatat izin/sakit/dinas guru & pegawai'),
  ('absensi.atur',           'Mengatur jam masuk, tanggal mulai hitung, dan hari libur')
on conflict (kode) do update set keterangan = excluded.keterangan;

insert into public.peran_izin (peran, izin) values
  ('super_admin', 'absensi.lihat'), ('super_admin', 'absensi.kelola'), ('super_admin', 'disiplin.lihat'),
  ('super_admin', 'disiplin.kelola'), ('super_admin', 'absensi_pegawai.lihat'), ('super_admin', 'absensi_pegawai.kelola'),
  ('super_admin', 'absensi.atur'),
  ('kepala_sekolah', 'absensi.lihat'), ('kepala_sekolah', 'disiplin.lihat'), ('kepala_sekolah', 'absensi_pegawai.lihat'),
  ('wakasek', 'absensi.lihat'), ('wakasek', 'disiplin.lihat'),
  ('kesiswaan', 'data_induk.baca'), ('kesiswaan', 'absensi.lihat'), ('kesiswaan', 'absensi.kelola'),
  ('kesiswaan', 'disiplin.lihat'), ('kesiswaan', 'disiplin.kelola'), ('kesiswaan', 'absensi.atur'),
  ('bk', 'absensi.lihat'), ('bk', 'disiplin.lihat'), ('bk', 'disiplin.kelola'),
  ('piket', 'absensi.lihat'), ('piket', 'absensi.kelola'),
  ('operator', 'absensi.lihat'), ('operator', 'absensi_pegawai.lihat'), ('operator', 'absensi_pegawai.kelola'), ('operator', 'absensi.atur')
on conflict do nothing;

-- piket & kesiswaan perlu melihat identitas siswa untuk mencatat absensi
create or replace function public.bisa_lihat_siswa(sid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    public.punya_izin('data_induk.baca')
    or public.punya_izin('absensi.kelola')
    or exists (select 1 from public.siswa s where s.id = sid and s.user_id = auth.uid())
    or exists (select 1 from public.siswa_orang_tua so join public.orang_tua o on o.id = so.orang_tua_id
               where so.siswa_id = sid and o.user_id = auth.uid())
    or exists (select 1 from public.anggota_kelas ak
               join public.kelas k on k.id = ak.kelas_id
               join public.tahun_ajaran t on t.id = k.tahun_ajaran_id
               where ak.siswa_id = sid and t.aktif and k.deleted_at is null
                 and k.wali_kelas_id is not null and k.wali_kelas_id = public.pegawai_saya());
$$;

-- ---------------------------------------------------------------------
-- 2. Pengaturan & kalender
-- ---------------------------------------------------------------------
alter table public.tahun_ajaran add column if not exists mulai_hitung_absensi date;
comment on column public.tahun_ajaran.mulai_hitung_absensi is 'Absensi sebelum tanggal ini tidak dihitung dalam rekap & disiplin';

create table if not exists public.pengaturan_absensi (
  id                  smallint primary key default 1 check (id = 1),
  jam_masuk_batas     time not null default '07:15',
  jam_pulang_mulai    time not null default '15:00',
  jam_pulang_selesai  time not null default '17:00',
  hari_sekolah        smallint[] not null default '{1,2,3,4,5}' check (hari_sekolah <@ '{1,2,3,4,5,6,7}'),
  updated_at          timestamptz not null default now()
);
insert into public.pengaturan_absensi (id) values (1) on conflict do nothing;

create table if not exists public.hari_libur (
  tanggal     date primary key,
  keterangan  text not null check (char_length(keterangan) between 2 and 120),
  created_at  timestamptz not null default now()
);

-- tanggal "hari ini" & awal minggu menurut WIB
create or replace function public.hari_ini() returns date language sql stable as $$
  select (now() at time zone 'Asia/Jakarta')::date;
$$;
create or replace function public.awal_minggu_ini() returns date language sql stable as $$
  select date_trunc('week', (now() at time zone 'Asia/Jakarta'))::date;
$$;

-- ---------------------------------------------------------------------
-- 3. Absensi siswa (hanya mencatat yang TIDAK hadir penuh; tanpa catatan = hadir)
-- ---------------------------------------------------------------------
create table if not exists public.absensi_siswa (
  id            uuid primary key default gen_random_uuid(),
  siswa_id      uuid not null references public.siswa (id),
  tanggal       date not null,
  status        text not null check (status in ('S', 'I', 'A', 'T', 'PC')),
  jam           time,
  keterangan    text not null default '' check (char_length(keterangan) <= 300),
  sumber        text not null default 'wali_kelas' check (sumber in ('wali_kelas', 'piket', 'admin', 'koreksi', 'impor')),
  dicatat_oleh  uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (siswa_id, tanggal)
);
create index if not exists absensi_siswa_tanggal_idx on public.absensi_siswa (tanggal);

-- penanda kelas sudah diabsen pada tanggal tertentu (membedakan "semua hadir" dan "belum dicek")
create table if not exists public.absensi_kelas_harian (
  kelas_id    uuid not null references public.kelas (id),
  tanggal     date not null,
  dicek_oleh  uuid default auth.uid(),
  dicek_pada  timestamptz not null default now(),
  primary key (kelas_id, tanggal)
);

create table if not exists public.pengajuan_koreksi (
  id             uuid primary key default gen_random_uuid(),
  siswa_id       uuid not null references public.siswa (id),
  tanggal        date not null,
  status_lama    text not null default 'H' check (status_lama in ('H', 'S', 'I', 'A', 'T', 'PC')),
  status_baru    text not null check (status_baru in ('H', 'S', 'I', 'A', 'T', 'PC')),
  alasan         text not null check (char_length(alasan) between 5 and 500),
  diajukan_oleh  uuid not null default auth.uid(),
  diajukan_pada  timestamptz not null default now(),
  status         text not null default 'menunggu' check (status in ('menunggu', 'disetujui', 'ditolak')),
  diputus_oleh   uuid,
  diputus_pada   timestamptz,
  catatan        text not null default '' check (char_length(catatan) <= 300)
);
create index if not exists pengajuan_menunggu_idx on public.pengajuan_koreksi (diajukan_pada) where status = 'menunggu';

-- wali kelas boleh mencatat untuk kelasnya HANYA pada minggu sekolah berjalan
create or replace function public.wali_dari_siswa(sid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.anggota_kelas ak
    join public.kelas k on k.id = ak.kelas_id
    join public.tahun_ajaran t on t.id = k.tahun_ajaran_id
    where ak.siswa_id = sid and t.aktif and k.deleted_at is null
      and k.wali_kelas_id is not null and k.wali_kelas_id = public.pegawai_saya()
  );
$$;

create or replace function public.bisa_catat_absensi(sid uuid, tgl date)
returns boolean language sql stable security definer set search_path = '' as $$
  select tgl <= public.hari_ini() and (
    public.punya_izin('absensi.kelola')
    or (tgl >= public.awal_minggu_ini() and public.wali_dari_siswa(sid))
  );
$$;

create or replace function public.bisa_cek_kelas(kid uuid, tgl date)
returns boolean language sql stable security definer set search_path = '' as $$
  select tgl <= public.hari_ini() and (
    public.punya_izin('absensi.kelola')
    or (tgl >= public.awal_minggu_ini()
        and exists (select 1 from public.kelas k where k.id = kid and k.wali_kelas_id = public.pegawai_saya()))
  );
$$;

revoke all on function public.wali_dari_siswa(uuid), public.bisa_catat_absensi(uuid, date), public.bisa_cek_kelas(uuid, date) from public;
grant execute on function public.wali_dari_siswa(uuid), public.bisa_catat_absensi(uuid, date), public.bisa_cek_kelas(uuid, date) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Disiplin: aturan berjenjang & konfirmasi tindak lanjut
-- ---------------------------------------------------------------------
create table if not exists public.aturan_disiplin (
  jenis      text not null check (jenis in ('alpa', 'terlambat')),
  ambang     integer not null check (ambang > 0),
  label      text not null,
  urutan     integer not null,
  primary key (jenis, ambang)
);
insert into public.aturan_disiplin (jenis, ambang, label, urutan) values
  ('alpa', 3, 'SP 1', 1), ('alpa', 6, 'SP 2', 2), ('alpa', 9, 'SP 3', 3),
  ('terlambat', 3, 'Pemanggilan Orang Tua 1', 1), ('terlambat', 6, 'Pemanggilan Orang Tua 2', 2),
  ('terlambat', 9, 'Pemanggilan Orang Tua 3', 3), ('terlambat', 12, 'SP 1', 4),
  ('terlambat', 15, 'SP 2', 5), ('terlambat', 18, 'SP 3', 6)
on conflict (jenis, ambang) do update set label = excluded.label, urutan = excluded.urutan;

create table if not exists public.tindak_lanjut_disiplin (
  id               uuid primary key default gen_random_uuid(),
  siswa_id         uuid not null references public.siswa (id),
  tahun_ajaran_id  uuid not null references public.tahun_ajaran (id),
  jenis            text not null check (jenis in ('alpa', 'terlambat')),
  ambang           integer not null,
  label            text not null,
  jumlah_saat_itu  integer not null,
  catatan          text not null check (char_length(catatan) between 3 and 1000),
  dikonfirmasi_oleh uuid not null default auth.uid(),
  dikonfirmasi_pada timestamptz not null default now(),
  unique (siswa_id, tahun_ajaran_id, jenis, ambang)
);

-- ---------------------------------------------------------------------
-- 5. Absensi guru & tendik
-- ---------------------------------------------------------------------
create table if not exists public.absensi_pegawai (
  id          uuid primary key default gen_random_uuid(),
  pegawai_id  uuid not null references public.pegawai (id),
  tanggal     date not null,
  status      text not null default 'H' check (status in ('H', 'T', 'S', 'I', 'DL', 'C')),
  jam_masuk   time,
  jam_pulang  time,
  keterangan  text not null default '' check (char_length(keterangan) <= 300),
  dicatat_oleh uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (pegawai_id, tanggal)
);
create index if not exists absensi_pegawai_tanggal_idx on public.absensi_pegawai (tanggal);

-- Presensi mandiri: jam diambil dari server (tidak bisa dipalsukan dari HP)
create or replace function public.presensi_saya(jenis text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  pid uuid := public.pegawai_saya();
  tgl date := public.hari_ini();
  jam time := (now() at time zone 'Asia/Jakarta')::time(0);
  atur public.pengaturan_absensi;
  r public.absensi_pegawai;
begin
  if pid is null then raise exception 'Akun Anda belum ditautkan ke data guru/pegawai' using errcode = '42501'; end if;
  select * into atur from public.pengaturan_absensi where id = 1;
  if extract(isodow from tgl)::smallint <> all (atur.hari_sekolah) or exists (select 1 from public.hari_libur where tanggal = tgl) then
    raise exception 'Hari ini bukan hari sekolah' using errcode = '22023';
  end if;
  select * into r from public.absensi_pegawai where pegawai_id = pid and tanggal = tgl;
  if jenis = 'masuk' then
    if r.jam_masuk is not null then raise exception 'Anda sudah presensi masuk pukul %', to_char(r.jam_masuk, 'HH24:MI') using errcode = '23505'; end if;
    if r.id is not null and r.status in ('S', 'I', 'DL', 'C') then raise exception 'Hari ini Anda tercatat izin/sakit/dinas' using errcode = '22023'; end if;
    insert into public.absensi_pegawai (pegawai_id, tanggal, status, jam_masuk)
    values (pid, tgl, case when jam > atur.jam_masuk_batas then 'T' else 'H' end, jam)
    on conflict (pegawai_id, tanggal) do update set jam_masuk = excluded.jam_masuk, status = excluded.status;
  elsif jenis = 'pulang' then
    if r.jam_masuk is null then raise exception 'Belum ada presensi masuk hari ini' using errcode = '22023'; end if;
    if r.jam_pulang is not null then raise exception 'Anda sudah presensi pulang pukul %', to_char(r.jam_pulang, 'HH24:MI') using errcode = '23505'; end if;
    if jam < atur.jam_pulang_mulai then raise exception 'Presensi pulang dibuka pukul %', to_char(atur.jam_pulang_mulai, 'HH24:MI') using errcode = '22023'; end if;
    update public.absensi_pegawai set jam_pulang = jam where id = r.id;
  else
    raise exception 'Jenis presensi tidak dikenal' using errcode = '22023';
  end if;
  return jsonb_build_object('tanggal', tgl, 'jam', to_char(jam, 'HH24:MI'), 'jenis', jenis);
end $$;
revoke all on function public.presensi_saya(text) from public, anon;
grant execute on function public.presensi_saya(text) to authenticated;

-- ---------------------------------------------------------------------
-- 6. Audit & updated_at
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['absensi_siswa', 'absensi_kelas_harian', 'pengajuan_koreksi', 'tindak_lanjut_disiplin',
                           'absensi_pegawai', 'hari_libur', 'pengaturan_absensi', 'aturan_disiplin'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.catat_audit()', t);
  end loop;
  foreach t in array array['absensi_siswa', 'absensi_pegawai', 'pengaturan_absensi'] loop
    execute format('drop trigger if exists updated_at_%1$s on public.%1$I', t);
    execute format('create trigger updated_at_%1$s before update on public.%1$I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 7. Row Level Security
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['pengaturan_absensi', 'hari_libur', 'absensi_siswa', 'absensi_kelas_harian', 'pengajuan_koreksi',
                           'aturan_disiplin', 'tindak_lanjut_disiplin', 'absensi_pegawai'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke truncate on public.%I from authenticated', t);
  end loop;
end $$;
revoke delete on public.pengajuan_koreksi, public.tindak_lanjut_disiplin, public.pengaturan_absensi, public.aturan_disiplin from authenticated;

-- pengaturan & kalender: dibaca semua pengguna login
drop policy if exists "baca pengaturan absensi" on public.pengaturan_absensi;
create policy "baca pengaturan absensi" on public.pengaturan_absensi for select to authenticated using (true);
drop policy if exists "ubah pengaturan absensi" on public.pengaturan_absensi;
create policy "ubah pengaturan absensi" on public.pengaturan_absensi for update to authenticated
  using ((select public.punya_izin('absensi.atur'))) with check ((select public.punya_izin('absensi.atur')));

drop policy if exists "baca hari libur" on public.hari_libur;
create policy "baca hari libur" on public.hari_libur for select to authenticated using (true);
drop policy if exists "kelola hari libur" on public.hari_libur;
create policy "kelola hari libur" on public.hari_libur for all to authenticated
  using ((select public.punya_izin('absensi.atur'))) with check ((select public.punya_izin('absensi.atur')));

-- tanggal mulai hitung hanya diubah lewat fungsi khusus (bukan seluruh kolom tahun ajaran)
drop policy if exists "atur mulai hitung" on public.tahun_ajaran;
create or replace function public.atur_mulai_hitung(ta_id uuid, tgl date)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.punya_izin('absensi.atur') then
    raise exception 'Tidak berhak' using errcode = '42501';
  end if;
  update public.tahun_ajaran set mulai_hitung_absensi = tgl where id = ta_id;
end $$;
revoke all on function public.atur_mulai_hitung(uuid, date) from public, anon;
grant execute on function public.atur_mulai_hitung(uuid, date) to authenticated;

-- pencatat selalu diisi oleh server (tidak bisa dipalsukan), status lama pengajuan diambil dari data
create or replace function public.isi_pencatat()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    if tg_table_name = 'absensi_kelas_harian' then new.dicek_oleh := auth.uid();
    elsif tg_table_name = 'pengajuan_koreksi' then
      if tg_op = 'INSERT' then
        new.diajukan_oleh := auth.uid();
        new.status_lama := coalesce((select a.status from public.absensi_siswa a
                                     where a.siswa_id = new.siswa_id and a.tanggal = new.tanggal), 'H');
      end if;
    else new.dicatat_oleh := auth.uid();
    end if;
  end if;
  return new;
end $$;
drop trigger if exists isi_pencatat on public.absensi_siswa;
create trigger isi_pencatat before insert or update on public.absensi_siswa for each row execute function public.isi_pencatat();
drop trigger if exists isi_pencatat on public.absensi_pegawai;
create trigger isi_pencatat before insert or update on public.absensi_pegawai for each row execute function public.isi_pencatat();
drop trigger if exists isi_pencatat on public.absensi_kelas_harian;
create trigger isi_pencatat before insert or update on public.absensi_kelas_harian for each row execute function public.isi_pencatat();
drop trigger if exists isi_pencatat on public.pengajuan_koreksi;
create trigger isi_pencatat before insert on public.pengajuan_koreksi for each row execute function public.isi_pencatat();

-- absensi siswa
drop policy if exists "baca absensi siswa" on public.absensi_siswa;
create policy "baca absensi siswa" on public.absensi_siswa for select to authenticated
  using ((select public.punya_izin('absensi.lihat')) or public.bisa_lihat_siswa(siswa_id));
drop policy if exists "catat absensi siswa" on public.absensi_siswa;
create policy "catat absensi siswa" on public.absensi_siswa for insert to authenticated
  with check (public.bisa_catat_absensi(siswa_id, tanggal));
drop policy if exists "ubah absensi siswa" on public.absensi_siswa;
create policy "ubah absensi siswa" on public.absensi_siswa for update to authenticated
  using (public.bisa_catat_absensi(siswa_id, tanggal)) with check (public.bisa_catat_absensi(siswa_id, tanggal));
drop policy if exists "hapus absensi siswa" on public.absensi_siswa;
create policy "hapus absensi siswa" on public.absensi_siswa for delete to authenticated
  using (public.bisa_catat_absensi(siswa_id, tanggal));

drop policy if exists "baca cek kelas" on public.absensi_kelas_harian;
create policy "baca cek kelas" on public.absensi_kelas_harian for select to authenticated
  using ((select public.punya_izin('absensi.lihat'))
         or exists (select 1 from public.kelas k where k.id = kelas_id and k.wali_kelas_id = public.pegawai_saya()));
drop policy if exists "tandai cek kelas" on public.absensi_kelas_harian;
create policy "tandai cek kelas" on public.absensi_kelas_harian for insert to authenticated with check (public.bisa_cek_kelas(kelas_id, tanggal));
drop policy if exists "perbarui cek kelas" on public.absensi_kelas_harian;
create policy "perbarui cek kelas" on public.absensi_kelas_harian for update to authenticated
  using (public.bisa_cek_kelas(kelas_id, tanggal)) with check (public.bisa_cek_kelas(kelas_id, tanggal));

-- pengajuan koreksi
drop policy if exists "baca pengajuan" on public.pengajuan_koreksi;
create policy "baca pengajuan" on public.pengajuan_koreksi for select to authenticated
  using ((select public.punya_izin('absensi.kelola')) or diajukan_oleh = auth.uid());
drop policy if exists "ajukan koreksi" on public.pengajuan_koreksi;
create policy "ajukan koreksi" on public.pengajuan_koreksi for insert to authenticated
  with check (diajukan_oleh = auth.uid() and status = 'menunggu' and diputus_oleh is null
              and tanggal <= public.hari_ini() and public.wali_dari_siswa(siswa_id));
drop policy if exists "putuskan pengajuan" on public.pengajuan_koreksi;
create policy "putuskan pengajuan" on public.pengajuan_koreksi for update to authenticated
  using ((select public.punya_izin('absensi.kelola'))) with check ((select public.punya_izin('absensi.kelola')));

-- disiplin
drop policy if exists "baca aturan disiplin" on public.aturan_disiplin;
create policy "baca aturan disiplin" on public.aturan_disiplin for select to authenticated using (true);
drop policy if exists "ubah aturan disiplin" on public.aturan_disiplin;
create policy "ubah aturan disiplin" on public.aturan_disiplin for all to authenticated
  using ((select public.punya_peran('super_admin'))) with check ((select public.punya_peran('super_admin')));

drop policy if exists "baca tindak lanjut" on public.tindak_lanjut_disiplin;
create policy "baca tindak lanjut" on public.tindak_lanjut_disiplin for select to authenticated
  using ((select public.punya_izin('disiplin.lihat')) or public.wali_dari_siswa(siswa_id)
         or exists (select 1 from public.siswa s where s.id = siswa_id and s.user_id = auth.uid())
         or exists (select 1 from public.siswa_orang_tua so join public.orang_tua o on o.id = so.orang_tua_id
                    where so.siswa_id = tindak_lanjut_disiplin.siswa_id and o.user_id = auth.uid()));
drop policy if exists "konfirmasi tindak lanjut" on public.tindak_lanjut_disiplin;
create policy "konfirmasi tindak lanjut" on public.tindak_lanjut_disiplin for insert to authenticated
  with check ((select public.punya_izin('disiplin.kelola')) and dikonfirmasi_oleh = auth.uid());

-- absensi pegawai: diri sendiri & yang berizin; presensi mandiri lewat fungsi presensi_saya()
drop policy if exists "baca absensi pegawai" on public.absensi_pegawai;
create policy "baca absensi pegawai" on public.absensi_pegawai for select to authenticated
  using ((select public.punya_izin('absensi_pegawai.lihat')) or pegawai_id = public.pegawai_saya());
drop policy if exists "kelola absensi pegawai" on public.absensi_pegawai;
create policy "kelola absensi pegawai" on public.absensi_pegawai for all to authenticated
  using ((select public.punya_izin('absensi_pegawai.kelola'))) with check ((select public.punya_izin('absensi_pegawai.kelola')));

-- ---------------------------------------------------------------------
-- 8. Fungsi: putuskan pengajuan, rekap, status disiplin
-- ---------------------------------------------------------------------
create or replace function public.putuskan_pengajuan(pid uuid, setuju boolean, catatan_putusan text default '')
returns void language plpgsql security invoker set search_path = '' as $$
declare p public.pengajuan_koreksi;
begin
  if not public.punya_izin('absensi.kelola') then
    raise exception 'Tidak berhak memutuskan pengajuan' using errcode = '42501';
  end if;
  select * into p from public.pengajuan_koreksi where id = pid for update;
  if p.id is null then raise exception 'Pengajuan tidak ditemukan' using errcode = 'P0002'; end if;
  if p.status <> 'menunggu' then raise exception 'Pengajuan sudah diputuskan' using errcode = '23514'; end if;
  if p.diajukan_oleh = auth.uid() then raise exception 'Tidak boleh memutuskan pengajuan sendiri' using errcode = '42501'; end if;

  update public.pengajuan_koreksi
     set status = case when setuju then 'disetujui' else 'ditolak' end,
         diputus_oleh = auth.uid(), diputus_pada = now(), catatan = left(coalesce(catatan_putusan, ''), 300)
   where id = pid;

  if setuju then
    if p.status_baru = 'H' then
      delete from public.absensi_siswa where siswa_id = p.siswa_id and tanggal = p.tanggal;
    else
      insert into public.absensi_siswa (siswa_id, tanggal, status, keterangan, sumber)
      values (p.siswa_id, p.tanggal, p.status_baru, left('Koreksi: ' || p.alasan, 300), 'koreksi')
      on conflict (siswa_id, tanggal) do update
        set status = excluded.status, keterangan = excluded.keterangan, sumber = 'koreksi', dicatat_oleh = auth.uid();
    end if;
  end if;
end $$;
revoke all on function public.putuskan_pengajuan(uuid, boolean, text) from public, anon;
grant execute on function public.putuskan_pengajuan(uuid, boolean, text) to authenticated;

-- jumlah hari sekolah efektif dalam rentang (memperhitungkan hari libur & tanggal mulai hitung)
create or replace function public.hari_efektif(dari date, sampai date)
returns integer language sql stable security invoker set search_path = '' as $$
  select count(*)::int
  from generate_series(
         greatest(dari, coalesce((select coalesce(mulai_hitung_absensi, tanggal_mulai) from public.tahun_ajaran where aktif), dari)),
         least(sampai, public.hari_ini()), interval '1 day') g(d)
  where extract(isodow from g.d)::smallint = any ((select hari_sekolah from public.pengaturan_absensi where id = 1)::smallint[])
    and not exists (select 1 from public.hari_libur h where h.tanggal = g.d::date);
$$;
grant execute on function public.hari_efektif(date, date) to authenticated;

-- rekap per siswa di satu kelas (tunduk pada RLS absensi_siswa)
create or replace function public.rekap_absensi_kelas(p_kelas uuid, p_dari date, p_sampai date)
returns table (siswa_id uuid, nisn text, nama text, jenis_kelamin text,
               sakit int, izin int, alpa int, terlambat int, pulang_cepat int, hari_efektif int, persen_hadir numeric)
language sql stable security invoker set search_path = '' as $$
  with he as (select public.hari_efektif(p_dari, p_sampai) as n),
  mulai as (select greatest(p_dari, coalesce((select coalesce(mulai_hitung_absensi, tanggal_mulai) from public.tahun_ajaran where aktif), p_dari)) as d)
  select s.id, s.nisn, s.nama, s.jenis_kelamin,
         count(*) filter (where a.status = 'S')::int,
         count(*) filter (where a.status = 'I')::int,
         count(*) filter (where a.status = 'A')::int,
         count(*) filter (where a.status = 'T')::int,
         count(*) filter (where a.status = 'PC')::int,
         (select n from he),
         case when (select n from he) = 0 then null
              else round(100.0 * ((select n from he) - count(*) filter (where a.status in ('S', 'I', 'A'))) / (select n from he), 1) end
  from public.anggota_kelas ak
  join public.siswa s on s.id = ak.siswa_id and s.deleted_at is null
  left join public.absensi_siswa a on a.siswa_id = s.id
       and a.tanggal between (select d from mulai) and least(p_sampai, public.hari_ini())
       and not exists (select 1 from public.hari_libur h where h.tanggal = a.tanggal)
  where ak.kelas_id = p_kelas
  group by s.id, s.nisn, s.nama, s.jenis_kelamin
  order by s.nama;
$$;
grant execute on function public.rekap_absensi_kelas(uuid, date, date) to authenticated;

-- status disiplin seluruh siswa yang terlihat oleh pemanggil, untuk tahun ajaran aktif
create or replace function public.status_disiplin()
returns table (siswa_id uuid, nama text, kelas text, jenis text, jumlah int, ambang int, label text, urutan int,
               dikonfirmasi boolean, dikonfirmasi_pada timestamptz, catatan text)
language sql stable security invoker set search_path = '' as $$
  with ta as (select id, coalesce(mulai_hitung_absensi, tanggal_mulai, '1900-01-01'::date) as mulai, tanggal_selesai
              from public.tahun_ajaran where aktif),
  hitung as (
    select a.siswa_id,
           case a.status when 'A' then 'alpa' else 'terlambat' end as jenis,
           count(*)::int as jumlah
    from public.absensi_siswa a, ta
    where a.status in ('A', 'T') and a.tanggal >= ta.mulai and (ta.tanggal_selesai is null or a.tanggal <= ta.tanggal_selesai)
      and not exists (select 1 from public.hari_libur h where h.tanggal = a.tanggal)
    group by a.siswa_id, 2
  )
  select h.siswa_id, s.nama, k.nama, h.jenis, h.jumlah, r.ambang, r.label, r.urutan,
         t.id is not null, t.dikonfirmasi_pada, t.catatan
  from hitung h
  join public.siswa s on s.id = h.siswa_id and s.deleted_at is null and s.status = 'aktif'
  join public.aturan_disiplin r on r.jenis = h.jenis and r.ambang <= h.jumlah
  cross join ta
  left join public.anggota_kelas ak on ak.siswa_id = s.id and ak.tahun_ajaran_id = ta.id
  left join public.kelas k on k.id = ak.kelas_id
  left join public.tindak_lanjut_disiplin t on t.siswa_id = h.siswa_id and t.tahun_ajaran_id = ta.id
       and t.jenis = h.jenis and t.ambang = r.ambang
  order by (t.id is not null), r.urutan desc, s.nama;
$$;
grant execute on function public.status_disiplin() to authenticated;

-- Nama wali kelas boleh dilihat semua staf (tanpa membuka data pegawai lain)
create or replace function public.nama_pegawai(pid uuid)
returns text language sql stable security definer set search_path = '' as $$
  select nama from public.pegawai where id = pid and auth.uid() is not null;
$$;
revoke all on function public.nama_pegawai(uuid) from public, anon;
grant execute on function public.nama_pegawai(uuid) to authenticated;

create or replace view public.kelas_ringkasan with (security_invoker = true) as
select k.id, k.tahun_ajaran_id, k.tingkat, k.nama, k.program, k.wali_kelas_id, k.deleted_at,
       t.nama as tahun_ajaran, t.aktif as tahun_aktif,
       public.nama_pegawai(k.wali_kelas_id) as wali_kelas,
       (select count(*) from public.anggota_kelas ak join public.siswa s on s.id = ak.siswa_id
         where ak.kelas_id = k.id and s.status = 'aktif' and s.deleted_at is null)::int as jumlah_siswa
from public.kelas k
join public.tahun_ajaran t on t.id = k.tahun_ajaran_id;

notify pgrst, 'reload schema';
