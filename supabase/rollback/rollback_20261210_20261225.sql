-- ROLLBACK DARURAT untuk migrasi 20261210 … 20261225 (cabang langit-cerah).
-- JANGAN dijalankan kecuali ada masalah setelah migrasi dan sudah ada BACKUP. Bukan migrasi: berkas ini sengaja
-- di luar folder migrations/ agar tidak pernah ikut "supabase db push".
--
-- Yang dilakukan: mengembalikan objek LAMA ke definisi produksi sebelum migrasi (policy "publik baca pengumuman",
-- fungsi staf_aktif) lalu menghapus objek BARU yang dibuat ketujuh migrasi itu.
-- PERHATIAN — data yang diisi lewat fitur baru setelah migrasi IKUT HILANG (kartu beranda, tur, halaman CMS,
-- menu, foto halaman masuk, jabatan, prestasi, info SPMB, portal bidang, kolom is_placeholder/alumni_ptn/...).
-- Bucket storage "tur-sekolah" & "portal" TIDAK dihapus (berkasnya tetap; hanya policy tulisnya dicabut).
-- Pengumuman internal (sasaran='pegawai') DISEMBUNYIKAN (aktif=false) sebelum kolom sasaran dihapus,
-- agar tidak tiba-tiba terbaca publik.

begin;

-- ===================== 20261225_gtk_jabatan_peran =====================
update public.pengumuman set aktif = false where sasaran = 'pegawai';
drop policy if exists "gtk baca pengumuman internal" on public.pengumuman;
drop policy if exists "publik baca pengumuman" on public.pengumuman;
-- definisi produksi sebelum migrasi (dibaca dari pg_policies, 21 Okt 2026)
create policy "publik baca pengumuman" on public.pengumuman for select to anon, authenticated
  using (deleted_at is null and aktif and (tayang_mulai is null or tayang_mulai <= now())
         and (tayang_selesai is null or tayang_selesai > now()));
alter table public.pengumuman drop column if exists sasaran;

drop function if exists public.lapor_akun_tanpa_peran();
drop function if exists public.direktori_gtk();
-- definisi produksi sebelum migrasi (20261111_alumni_mutu)
create or replace function public.staf_aktif()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pengguna p join public.pengguna_peran pp on pp.user_id = p.user_id
                  where p.user_id = auth.uid() and p.aktif and pp.peran not in ('siswa', 'orang_tua', 'alumni'));
$$;

drop trigger if exists jaga_anggaran_barang on public.barang;
drop function if exists public.jaga_anggaran_barang();
drop policy if exists "inventaris tambah barang" on public.barang;
drop policy if exists "inventaris ubah barang" on public.barang;
delete from public.peran_izin where izin = 'sarpras.inventaris' or peran in ('laboran', 'pegawai');
delete from public.pengguna_peran where peran in ('laboran', 'pegawai');
delete from public.izin where kode = 'sarpras.inventaris';
delete from public.peran where kode in ('laboran', 'pegawai');

alter table public.pengguna drop column if exists jabatan;
drop table if exists public.jabatan_gtk;

-- ===================== 20261224_portal_masuk =====================
drop policy if exists "pengelola unggah portal" on storage.objects;
drop policy if exists "pengelola ubah portal" on storage.objects;
drop policy if exists "pengelola lihat portal" on storage.objects;
drop table if exists public.portal_pengaturan;
drop table if exists public.portal_login;

-- ===================== 20261223_menu_navigasi =====================
drop table if exists public.menu_sorotan;
drop table if exists public.menu_keterangan;
drop table if exists public.menu_grup;

-- ===================== 20261222_halaman_publik =====================
drop table if exists public.halaman_cms;
drop table if exists public.fasilitas;
drop table if exists public.staf_publik;

-- ===================== 20261221_tur_sekolah =====================
drop policy if exists "pengelola unggah tur" on storage.objects;
drop policy if exists "pengelola ubah tur" on storage.objects;
drop policy if exists "pengelola lihat tur" on storage.objects;
drop policy if exists "pengelola hapus tur" on storage.objects;
drop table if exists public.tur_sekolah;
drop function if exists public.tur_cek_maks_aktif();
alter table public.profil_sekolah drop column if exists lulusan_pt_persen;
alter table public.profil_sekolah drop column if exists kepala_sekolah_jabatan;

-- ===================== 20261220_kartu_beranda =====================
drop table if exists public.kartu_beranda;

-- ===================== 20261210_buku_tahunan =====================
drop table if exists public.portal_bidang;
drop table if exists public.spmb_info;
drop table if exists public.prestasi;
alter table public.profil_sekolah drop column if exists alumni_ptn;
alter table public.profil_sekolah drop column if exists alumni_ptn_tahun;
alter table public.profil_sekolah drop column if exists alumni_ptn_keterangan;
alter table public.berita drop column if exists is_placeholder;
alter table public.galeri drop column if exists is_placeholder;
alter table public.hero_slide drop column if exists is_placeholder;

commit;
