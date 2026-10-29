-- Rollback migrasi 20261229000000_hak_akses_bidang.sql (hanya dengan izin pemilik).
-- Mengembalikan kode peran, izin, kebijakan, dan fungsi ke keadaan 29 Okt 2026.
-- TIDAK mengembalikan isi log aktivitas yang sudah disamarkan (bagian I) — itu hanya bisa dari backup.
-- Akun yang setelah migrasi diberi peran waka_* dipindahkan kembali ke kode lama.

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
drop policy if exists "baca rujukan bk" on public.rujukan_bk;
create policy "bk baca rujukan" on public.rujukan_bk for select using ((select public.punya_izin('bk.rujukan')));

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
