-- =====================================================================
-- A2 — Hak akses per bidang (DRAF, BELUM DIJALANKAN; menunggu persetujuan pemilik)
--   A. Pengaman: batal bila masih ada akun berperan `wakasek` (bidangnya harus ditetapkan manual dulu).
--   B. Izin baru: humas.lihat, pengaduan.lihat, pengaduan.metadata, pengguna.kelola_dasar.
--   C. Peran bidang diganti kode: kurikulum→waka_kurikulum, kesiswaan→waka_kesiswaan, sarpras→waka_sarpras,
--      humas→waka_humas (akun dipindahkan); peran `wakasek` generik dihapus.
--   D. Daftar izin baru untuk peran yang disentuh (sumber kebenaran = daftar di bawah).
--   E. Rujukan BK: hanya BK + guru pembuat rujukan.
--   F. Pengaduan: kelola biasa = waka_humas; rahasia = BK + waka_kesiswaan; kepala sekolah lihat saja;
--      super admin metadata saja (view pengaduan_ringkas).
--   G. Kepala sekolah boleh MELIHAT data humas (kemitraan, survei, kontak media, buku tamu).
--   H. Operator: kelola akun & peran DASAR saja (guru, wali_kelas, piket, pegawai, laboran, siswa, orang_tua),
--      tidak bisa menyentuh akun yang punya peran lain.
--   I. Log aktivitas: tabel berisi data pribadi/rahasia hanya dicatat metadata (id + nama kolom yang berubah);
--      15 catatan lama di production ikut disamarkan (TIDAK BISA DIKEMBALIKAN selain dari backup).
-- Tidak ada DROP TABLE/TRUNCATE. Rollback: supabase/rollback/rollback_20261229_hak_akses_bidang.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- A. pengaman
-- ---------------------------------------------------------------------
do $$
declare n int;
begin
  select count(*) into n from public.pengguna_peran where peran = 'wakasek';
  if n > 0 then
    raise exception 'Masih ada % akun berperan wakasek: tetapkan bidangnya (waka_kurikulum/kesiswaan/sarpras/humas) dulu', n;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- B. izin baru
-- ---------------------------------------------------------------------
insert into public.izin (kode, keterangan) values
  ('humas.lihat', 'Melihat data humas (kemitraan, survei, kontak media, buku tamu) tanpa mengubah'),
  ('pengaduan.lihat', 'Melihat semua pengaduan termasuk rahasia, tanpa mengubah'),
  ('pengaduan.metadata', 'Melihat tiket, kategori, tanggal & status pengaduan saja (tanpa isi & identitas pelapor)'),
  ('pengguna.kelola_dasar', 'Membuat akun, reset sandi, memberi/mencabut peran dasar (guru, wali kelas, piket, pegawai, laboran, siswa, orang tua)')
on conflict (kode) do update set keterangan = excluded.keterangan;

-- ---------------------------------------------------------------------
-- C. peran bidang: ganti kode (FK pengguna_peran tanpa ON UPDATE CASCADE → salin, pindahkan, hapus)
-- ---------------------------------------------------------------------
create temp table _ganti_peran (lama text primary key, baru text not null, nama text not null) on commit drop;
insert into _ganti_peran values
  ('kurikulum', 'waka_kurikulum', 'Wakasek Kurikulum'),
  ('kesiswaan', 'waka_kesiswaan', 'Wakasek Kesiswaan'),
  ('sarpras',   'waka_sarpras',   'Wakasek Sarpras'),
  ('humas',     'waka_humas',     'Wakasek Humas');

insert into public.peran (kode, nama, keterangan, urutan, wajib_mfa)
select g.baru, g.nama, p.keterangan, p.urutan, p.wajib_mfa
from _ganti_peran g join public.peran p on p.kode = g.lama
on conflict (kode) do update set nama = excluded.nama;

insert into public.pengguna_peran (user_id, peran, diberikan_oleh, created_at)
select pp.user_id, g.baru, pp.diberikan_oleh, pp.created_at
from public.pengguna_peran pp join _ganti_peran g on g.lama = pp.peran
on conflict do nothing;

delete from public.pengguna_peran where peran in (select lama from _ganti_peran);
-- peran_izin peran lama ikut terhapus (ON DELETE CASCADE)
delete from public.peran where kode in (select lama from _ganti_peran) or kode = 'wakasek';

-- ---------------------------------------------------------------------
-- D. izin per peran yang disentuh (daftar lengkap)
-- ---------------------------------------------------------------------
delete from public.peran_izin where peran in
  ('super_admin', 'kepala_sekolah', 'operator', 'waka_kurikulum', 'waka_kesiswaan', 'waka_sarpras', 'waka_humas');

insert into public.peran_izin (peran, izin)
select 'super_admin', unnest(array[
  'absensi_pegawai.kelola','absensi_pegawai.lihat','absensi.atur','absensi.kelola','absensi.lihat','akun_portal.kelola',
  'alumni.kelola','alumni.lihat','audit.baca','bk.agregat','data_induk.baca','data_induk.kelola','disiplin.kelola',
  'disiplin.lihat','ekskul.kelola','ekskul.lihat','humas.kelola','izin_pegawai.setujui','jadwal.kelola','jadwal.pengganti',
  'kalender.kelola','kesiswaan.kelola','kesiswaan.lihat','konten.kelola','konten.terbitkan','kurikulum.kelola',
  'literasi.kelola','mutu.kelola','mutu.lihat','pengaduan.metadata','pengguna.kelola','pengguna.kelola_dasar',
  'perpus.kelola','perpus.lihat','sarpras.inventaris','sarpras.kelola','sarpras.lihat','supervisi.kelola','tamu.catat'])
union all select 'kepala_sekolah', unnest(array[
  'absensi_pegawai.lihat','absensi.lihat','alumni.lihat','audit.baca','bk.agregat','data_induk.baca','disiplin.lihat',
  'ekskul.anggaran','ekskul.lihat','humas.lihat','izin_pegawai.setujui','kesiswaan.lihat','konten.terbitkan','mutu.lihat',
  'pengaduan.lihat','perpus.lihat','sarpras.lihat','supervisi.kelola'])
union all select 'operator', unnest(array[
  'absensi_pegawai.kelola','absensi_pegawai.lihat','absensi.lihat','akun_portal.kelola','data_induk.baca',
  'data_induk.kelola','pengguna.kelola_dasar','sarpras.lihat','tamu.catat'])
union all select 'waka_kurikulum', unnest(array[
  'data_induk.baca','jadwal.kelola','jadwal.pengganti','kalender.kelola','kurikulum.kelola','mutu.lihat','perpus.lihat',
  'supervisi.kelola'])
union all select 'waka_kesiswaan', unnest(array[
  'absensi.atur','absensi.kelola','absensi.lihat','data_induk.baca','disiplin.kelola','disiplin.lihat','ekskul.kelola',
  'ekskul.lihat','kesiswaan.kelola','kesiswaan.lihat','pengaduan.rahasia'])
union all select 'waka_sarpras', unnest(array['sarpras.inventaris','sarpras.kelola','sarpras.lihat'])
union all select 'waka_humas', unnest(array[
  'alumni.kelola','alumni.lihat','humas.kelola','konten.kelola','pengaduan.kelola','tamu.catat']);

-- ---------------------------------------------------------------------
-- E. rujukan BK: BK + guru pembuat rujukan (super admin tidak lagi punya bk.rujukan)
-- ---------------------------------------------------------------------
drop policy if exists "bk baca rujukan" on public.rujukan_bk;
create policy "baca rujukan bk" on public.rujukan_bk for select
  using ((select public.punya_izin('bk.rujukan')) or dirujuk_oleh = (select auth.uid()));

-- ---------------------------------------------------------------------
-- F. pengaduan
-- ---------------------------------------------------------------------
-- menangani (ubah): biasa = pengaduan.kelola; rahasia = pengaduan.rahasia; PIC yang ditugaskan tetap boleh
create or replace function public.boleh_pengaduan(p_rahasia boolean, p_pic uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case when p_rahasia then public.punya_izin('pengaduan.rahasia')
              else public.punya_izin('pengaduan.kelola') end
      or (p_pic is not null and p_pic = public.pegawai_saya());
$$;
-- membaca isi: yang menangani + pengaduan.lihat (kepala sekolah)
create or replace function public.boleh_baca_pengaduan(p_rahasia boolean, p_pic uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.boleh_pengaduan(p_rahasia, p_pic) or public.punya_izin('pengaduan.lihat');
$$;
grant execute on function public.boleh_baca_pengaduan(boolean, uuid) to anon, authenticated, service_role;

drop policy if exists "baca pengaduan" on public.pengaduan;
create policy "baca pengaduan" on public.pengaduan for select using (public.boleh_baca_pengaduan(rahasia, pic_id));
drop policy if exists "baca riwayat pengaduan" on public.riwayat_pengaduan;
create policy "baca riwayat pengaduan" on public.riwayat_pengaduan for select
  using (exists (select 1 from public.pengaduan p where p.id = riwayat_pengaduan.pengaduan_id
                 and public.boleh_baca_pengaduan(p.rahasia, p.pic_id)));

-- metadata saja (tanpa isi, nama, kontak, catatan) untuk pengaduan.metadata (super admin)
create or replace view public.pengaduan_ringkas with (security_barrier = true) as
  select id, tiket, kategori, rahasia, status, tenggat, selesai_pada, created_at, updated_at
  from public.pengaduan
  where (select public.punya_izin('pengaduan.metadata')) or public.boleh_baca_pengaduan(rahasia, pic_id);
revoke all on public.pengaduan_ringkas from anon, public;
grant select on public.pengaduan_ringkas to authenticated;

-- ---------------------------------------------------------------------
-- G. kepala sekolah melihat data humas
-- ---------------------------------------------------------------------
create policy "lihat kemitraan" on public.kemitraan for select using ((select public.punya_izin('humas.lihat')));
create policy "lihat kegiatan mitra" on public.kegiatan_mitra for select using ((select public.punya_izin('humas.lihat')));
create policy "lihat kontak media" on public.kontak_media for select using ((select public.punya_izin('humas.lihat')));
create policy "lihat survei" on public.survei for select using ((select public.punya_izin('humas.lihat')));
create policy "lihat jawaban survei" on public.jawaban_survei for select using ((select public.punya_izin('humas.lihat')));
create policy "lihat buku tamu" on public.buku_tamu for select using ((select public.punya_izin('humas.lihat')));

-- ---------------------------------------------------------------------
-- H. operator: akun & peran dasar
-- ---------------------------------------------------------------------
create or replace function public.peran_dasar(p text)
returns boolean language sql immutable set search_path = '' as $$
  select p = any (array['guru', 'wali_kelas', 'piket', 'pegawai', 'laboran', 'siswa', 'orang_tua']);
$$;
-- akun "dilindungi" = punya minimal satu peran di luar peran dasar
create or replace function public.akun_dilindungi(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pengguna_peran where user_id = uid and not public.peran_dasar(peran));
$$;
grant execute on function public.peran_dasar(text) to authenticated, service_role;
grant execute on function public.akun_dilindungi(uuid) to authenticated, service_role;

drop policy if exists "pengguna lihat" on public.pengguna;
create policy "pengguna lihat" on public.pengguna for select using (
  user_id = auth.uid() or (select public.punya_izin('pengguna.kelola')) or (select public.punya_izin('audit.baca'))
  or (select public.punya_izin('pengguna.kelola_dasar')));
drop policy if exists "pengguna tambah" on public.pengguna;
create policy "pengguna tambah" on public.pengguna for insert with check (
  (select public.punya_izin('pengguna.kelola')) or (select public.punya_izin('pengguna.kelola_dasar')));
drop policy if exists "pengguna ubah" on public.pengguna;
create policy "pengguna ubah" on public.pengguna for update
  using ((select public.punya_izin('pengguna.kelola'))
         or ((select public.punya_izin('pengguna.kelola_dasar')) and not public.akun_dilindungi(user_id)))
  with check ((select public.punya_izin('pengguna.kelola'))
         or ((select public.punya_izin('pengguna.kelola_dasar')) and not public.akun_dilindungi(user_id)));

drop policy if exists "peran pengguna lihat" on public.pengguna_peran;
create policy "peran pengguna lihat" on public.pengguna_peran for select using (
  user_id = auth.uid() or (select public.punya_izin('pengguna.kelola')) or (select public.punya_izin('pengguna.kelola_dasar')));
drop policy if exists "peran pengguna tambah" on public.pengguna_peran;
create policy "peran pengguna tambah" on public.pengguna_peran for insert with check (
  (select public.punya_izin('pengguna.kelola'))
  or ((select public.punya_izin('pengguna.kelola_dasar')) and public.peran_dasar(peran) and not public.akun_dilindungi(user_id)));
drop policy if exists "peran pengguna hapus" on public.pengguna_peran;
create policy "peran pengguna hapus" on public.pengguna_peran for delete using (
  (select public.punya_izin('pengguna.kelola'))
  or ((select public.punya_izin('pengguna.kelola_dasar')) and public.peran_dasar(peran) and not public.akun_dilindungi(user_id)));

-- ---------------------------------------------------------------------
-- I. log aktivitas: tabel sensitif hanya metadata
-- ---------------------------------------------------------------------
create or replace function public.samarkan_audit(p_tabel text, p_data jsonb, p_banding jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select case when p_data is null then null else jsonb_build_object(
    'id', p_data ->> 'id',
    '_disamarkan', true,
    'kolom', coalesce((select jsonb_agg(k order by k) from jsonb_object_keys(p_data) k
                       where p_banding is null or p_data -> k is distinct from p_banding -> k), '[]'::jsonb)) end;
$$;

create or replace function public.tabel_audit_sensitif(p_tabel text)
returns boolean language sql immutable set search_path = '' as $$
  select p_tabel = any (array['siswa', 'orang_tua', 'siswa_orang_tua', 'pegawai', 'pengaduan', 'rujukan_bk',
    'tindak_lanjut_bk', 'rujukan_eksternal_bk', 'pelanggaran_siswa', 'pembinaan_siswa', 'izin_ortu']);
$$;

create or replace function public.catat_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  lama jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  baru jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  if public.tabel_audit_sensitif(tg_table_name) then
    lama := public.samarkan_audit(tg_table_name, lama, baru);
    baru := public.samarkan_audit(tg_table_name, baru, case when tg_op = 'UPDATE' then to_jsonb(old) end);
  end if;
  insert into public.audit_log (user_id, tabel, aksi, record_id, data_lama, data_baru)
  values (auth.uid(), tg_table_name, tg_op,
          coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id', ''), lama, baru);
  return coalesce(new, old);
end $$;

-- catatan lama (production: 15 baris) ikut disamarkan
update public.audit_log
   set data_lama = public.samarkan_audit(tabel, data_lama, data_baru),
       data_baru = public.samarkan_audit(tabel, data_baru, data_lama)
 where public.tabel_audit_sensitif(tabel)
   and not coalesce((data_baru ->> '_disamarkan')::boolean, (data_lama ->> '_disamarkan')::boolean, false);
