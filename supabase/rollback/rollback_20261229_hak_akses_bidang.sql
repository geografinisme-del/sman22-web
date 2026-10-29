-- Rollback migrasi 20261229000000_hak_akses_bidang.sql (hanya dengan izin pemilik).
-- Mengembalikan kode peran, izin, kebijakan, dan fungsi ke keadaan 29 Okt 2026.
-- TIDAK mengembalikan isi log aktivitas yang sudah disamarkan (bagian I) — itu hanya bisa dari backup.
-- Akun yang setelah migrasi diberi peran waka_* dipindahkan kembali ke kode lama.

-- K. kunci izin super admin
drop trigger if exists jaga_izin_super_admin on public.peran_izin;
drop function if exists public.jaga_izin_super_admin();

-- J. fungsi penjaga kembali ke definisi 29 Okt 2026
CREATE OR REPLACE FUNCTION public.statistik_humas(p_dari date, p_sampai date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare hari date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if not (public.punya_izin('humas.kelola') or public.punya_izin('pengaduan.kelola') or public.punya_izin('pengaduan.rahasia')) then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'masuk', (select count(*) from public.pengaduan where (created_at at time zone 'Asia/Jakarta')::date between p_dari and p_sampai),
    'rahasia', (select count(*) from public.pengaduan where rahasia and (created_at at time zone 'Asia/Jakarta')::date between p_dari and p_sampai),
    'aktif', (select count(*) from public.pengaduan where status in ('baru', 'diproses')),
    'lewat_tenggat', (select count(*) from public.pengaduan where status in ('baru', 'diproses') and tenggat < hari),
    'per_status', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from public.pengaduan
                    where (created_at at time zone 'Asia/Jakarta')::date between p_dari and p_sampai group by status) x),
    'per_kategori', (select coalesce(jsonb_object_agg(kategori, n), '{}') from (select kategori, count(*) n from public.pengaduan
                    where (created_at at time zone 'Asia/Jakarta')::date between p_dari and p_sampai group by kategori) x),
    'tepat_waktu', (select round(100.0 * count(*) filter (where (selesai_pada at time zone 'Asia/Jakarta')::date <= tenggat) / nullif(count(*), 0))
                    from public.pengaduan where selesai_pada is not null and (selesai_pada at time zone 'Asia/Jakarta')::date between p_dari and p_sampai),
    'rata_hari', (select round(avg(extract(epoch from selesai_pada - created_at) / 86400)::numeric, 1)
                    from public.pengaduan where selesai_pada is not null and (selesai_pada at time zone 'Asia/Jakarta')::date between p_dari and p_sampai),
    'rating', (select round(avg(rating), 2) from public.pengaduan where rating is not null and (selesai_pada at time zone 'Asia/Jakarta')::date between p_dari and p_sampai),
    'jumlah_rating', (select count(*) from public.pengaduan where rating is not null and (selesai_pada at time zone 'Asia/Jakarta')::date between p_dari and p_sampai),
    'mitra_aktif', (select count(*) from public.kemitraan where deleted_at is null and (berakhir is null or berakhir >= hari)),
    'mitra_segera', (select count(*) from public.kemitraan where deleted_at is null and berakhir between hari and hari + 30),
    'kegiatan_mitra', (select count(*) from public.kegiatan_mitra where tanggal between p_dari and p_sampai),
    'tamu', (select coalesce(sum(jumlah), 0) from public.buku_tamu where (masuk at time zone 'Asia/Jakarta')::date between p_dari and p_sampai),
    'survei_aktif', (select count(*) from public.survei where deleted_at is null and terbit and hari between mulai and selesai),
    'responden', (select count(*) from public.jawaban_survei where (created_at at time zone 'Asia/Jakarta')::date between p_dari and p_sampai)
  );
end $function$;

CREATE OR REPLACE FUNCTION public.hasil_survei(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$;

CREATE OR REPLACE FUNCTION public.cari_akun(email_dicari text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.punya_izin('pengguna.kelola') then
    raise exception 'Tidak berhak' using errcode = '42501';
  end if;
  return (select id from auth.users where lower(email) = lower(trim(email_dicari)) limit 1);
end $function$;

CREATE OR REPLACE FUNCTION public.catat_keamanan_pengguna(p_user uuid, p_peristiwa text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t text[] := public._teks_keamanan(p_peristiwa);
begin
  if not public.punya_izin('pengguna.kelola') then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  if p_peristiwa not in ('sandi_direset', 'mfa_direset', 'tautan_reset') then
    raise exception 'Peristiwa tidak dikenal' using errcode = '22023';
  end if;
  insert into public.audit_log (user_id, tabel, aksi, record_id, data_baru)
  values (auth.uid(), 'auth', 'KEAMANAN', p_user::text, jsonb_build_object('peristiwa', p_peristiwa, 'target', p_user));
  perform public.kirim_notif(p_user, 'keamanan', t[1], t[2], '/admin/keamanan', 'penting');
end $function$;

CREATE OR REPLACE FUNCTION public.cabut_sesi_pengguna(p_user uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.punya_izin('pengguna.kelola') then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  if exists (select 1 from public.pengguna_peran where user_id = p_user and peran = 'super_admin')
     and not public.punya_peran('super_admin') then
    raise exception 'Hanya super admin yang dapat mengakhiri sesi super admin' using errcode = '42501';
  end if;
  begin
    delete from auth.sessions where user_id = p_user;
    return true;
  exception when insufficient_privilege then
    return false;  -- proyek yang membatasi akses skema auth: sesi berakhir sendiri saat token kedaluwarsa
  end;
end $function$;


-- I. log aktivitas: fungsi pencatat kembali mencatat seluruh baris
create or replace function public.catat_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
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
drop function if exists public.tabel_audit_sensitif(text);
drop function if exists public.samarkan_audit(text, jsonb, jsonb);

-- H. operator
drop policy if exists "peran pengguna hapus" on public.pengguna_peran;
create policy "peran pengguna hapus" on public.pengguna_peran for delete using ((select public.punya_izin('pengguna.kelola')));
drop policy if exists "peran pengguna tambah" on public.pengguna_peran;
create policy "peran pengguna tambah" on public.pengguna_peran for insert with check ((select public.punya_izin('pengguna.kelola')));
drop policy if exists "peran pengguna lihat" on public.pengguna_peran;
create policy "peran pengguna lihat" on public.pengguna_peran for select using (user_id = auth.uid() or (select public.punya_izin('pengguna.kelola')));
drop policy if exists "pengguna ubah" on public.pengguna;
create policy "pengguna ubah" on public.pengguna for update
  using ((select public.punya_izin('pengguna.kelola'))) with check ((select public.punya_izin('pengguna.kelola')));
drop policy if exists "pengguna tambah" on public.pengguna;
create policy "pengguna tambah" on public.pengguna for insert with check ((select public.punya_izin('pengguna.kelola')));
drop policy if exists "pengguna lihat" on public.pengguna;
create policy "pengguna lihat" on public.pengguna for select
  using (user_id = auth.uid() or (select public.punya_izin('pengguna.kelola')) or (select public.punya_izin('audit.baca')));
drop function if exists public.akun_dilindungi(uuid);
drop function if exists public.peran_dasar(text);

-- G. humas
drop policy if exists "lihat buku tamu" on public.buku_tamu;
drop policy if exists "lihat jawaban survei" on public.jawaban_survei;
drop policy if exists "lihat survei" on public.survei;
drop policy if exists "lihat kontak media" on public.kontak_media;
drop policy if exists "lihat kegiatan mitra" on public.kegiatan_mitra;
drop policy if exists "lihat kemitraan" on public.kemitraan;

-- F. pengaduan
drop view if exists public.pengaduan_ringkas;
drop policy if exists "baca riwayat pengaduan" on public.riwayat_pengaduan;
create policy "baca riwayat pengaduan" on public.riwayat_pengaduan for select
  using (exists (select 1 from public.pengaduan p where p.id = riwayat_pengaduan.pengaduan_id and public.boleh_pengaduan(p.rahasia, p.pic_id)));
drop policy if exists "baca pengaduan" on public.pengaduan;
create policy "baca pengaduan" on public.pengaduan for select using (public.boleh_pengaduan(rahasia, pic_id));
drop function if exists public.boleh_baca_pengaduan(boolean, uuid);
create or replace function public.boleh_pengaduan(p_rahasia boolean, p_pic uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case when p_rahasia then public.punya_izin('pengaduan.rahasia')
              else public.punya_izin('pengaduan.kelola') or public.punya_izin('pengaduan.rahasia') end
      or (p_pic is not null and p_pic = public.pegawai_saya());
$$;

-- E. rujukan BK
drop function if exists public.rujukan_saya();

-- C + D. peran & izin
insert into public.peran (kode, nama, keterangan, urutan, wajib_mfa) values
  ('wakasek', 'Wakil Kepala Sekolah', 'Melihat seluruh data induk', 3, false)
on conflict (kode) do nothing;
create temp table _ganti_peran (lama text primary key, baru text not null, nama text not null) on commit drop;
insert into _ganti_peran values
  ('kurikulum', 'waka_kurikulum', 'Wakasek Kurikulum'), ('kesiswaan', 'waka_kesiswaan', 'Kesiswaan'),
  ('sarpras', 'waka_sarpras', 'Wakasek Sarpras'), ('humas', 'waka_humas', 'Humas / Admin Konten');
insert into public.peran (kode, nama, keterangan, urutan, wajib_mfa)
select g.lama, g.nama, p.keterangan, p.urutan, p.wajib_mfa from _ganti_peran g join public.peran p on p.kode = g.baru
on conflict (kode) do nothing;
insert into public.pengguna_peran (user_id, peran, diberikan_oleh, created_at)
select pp.user_id, g.lama, pp.diberikan_oleh, pp.created_at from public.pengguna_peran pp join _ganti_peran g on g.baru = pp.peran
on conflict do nothing;
delete from public.pengguna_peran where peran in (select baru from _ganti_peran);
delete from public.peran where kode in (select baru from _ganti_peran);

delete from public.peran_izin where peran in ('super_admin', 'kepala_sekolah', 'operator', 'wakasek', 'kurikulum', 'kesiswaan', 'sarpras', 'humas');
insert into public.peran_izin (peran, izin)
select 'super_admin', unnest(array[
  'absensi_pegawai.kelola','absensi_pegawai.lihat','absensi.atur','absensi.kelola','absensi.lihat','akun_portal.kelola',
  'alumni.kelola','alumni.lihat','audit.baca','bk.agregat','bk.rujukan','data_induk.baca','data_induk.kelola',
  'disiplin.kelola','disiplin.lihat','ekskul.kelola','ekskul.lihat','humas.kelola','izin_pegawai.setujui','jadwal.kelola',
  'jadwal.pengganti','kalender.kelola','kesiswaan.kelola','kesiswaan.lihat','konten.kelola','konten.terbitkan',
  'kurikulum.kelola','literasi.kelola','mutu.kelola','mutu.lihat','pengaduan.kelola','pengaduan.rahasia','pengguna.kelola',
  'perpus.kelola','perpus.lihat','sarpras.inventaris','sarpras.kelola','sarpras.lihat','supervisi.kelola','tamu.catat'])
union all select 'kepala_sekolah', unnest(array[
  'absensi_pegawai.lihat','absensi.lihat','alumni.lihat','audit.baca','bk.agregat','data_induk.baca','disiplin.lihat',
  'ekskul.anggaran','ekskul.lihat','humas.kelola','izin_pegawai.setujui','kesiswaan.lihat','konten.terbitkan','mutu.kelola',
  'mutu.lihat','pengaduan.kelola','pengaduan.rahasia','perpus.lihat','sarpras.lihat','supervisi.kelola'])
union all select 'wakasek', unnest(array[
  'absensi.lihat','bk.agregat','data_induk.baca','disiplin.lihat','ekskul.lihat','kalender.kelola','kesiswaan.lihat',
  'kurikulum.kelola','mutu.lihat','sarpras.lihat'])
union all select 'operator', unnest(array[
  'absensi_pegawai.kelola','absensi_pegawai.lihat','absensi.atur','absensi.lihat','akun_portal.kelola','data_induk.baca',
  'data_induk.kelola','jadwal.kelola','sarpras.lihat','tamu.catat'])
union all select 'kurikulum', unnest(array[
  'data_induk.baca','jadwal.kelola','jadwal.pengganti','kalender.kelola','kurikulum.kelola','mutu.lihat','perpus.lihat',
  'supervisi.kelola'])
union all select 'sarpras', unnest(array['sarpras.inventaris','sarpras.kelola','sarpras.lihat'])
union all select 'kesiswaan', unnest(array[
  'absensi.atur','absensi.kelola','absensi.lihat','data_induk.baca','disiplin.kelola','disiplin.lihat','ekskul.kelola',
  'ekskul.lihat','kesiswaan.kelola','kesiswaan.lihat','pengaduan.rahasia'])
union all select 'humas', unnest(array[
  'alumni.kelola','alumni.lihat','humas.kelola','kalender.kelola','konten.kelola','pengaduan.kelola','tamu.catat']);

-- B. izin baru (peran_izin terkait ikut terhapus, ON DELETE CASCADE)
delete from public.izin where kode in ('humas.lihat', 'pengaduan.lihat', 'pengaduan.metadata', 'pengguna.kelola_dasar');

delete from supabase_migrations.schema_migrations where version = '20261229000000';
