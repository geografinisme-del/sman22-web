-- Uji hak akses Fase 12 (BK, ekskul/OSIS). Jalankan di database UJI.
\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.uid(e text) returns uuid language sql as $$ select id from auth.users where email = e || '@sman22.test' $$;
create or replace function pg_temp.sebagai(e text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid(e), 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(pg_temp.uid(e)::text, ''), true);
end $$;
create or replace function pg_temp.anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

-- data uji lain diabaikan (dibatalkan oleh rollback)
delete from public.log_akses_bk; delete from public.tindak_lanjut_bk; delete from public.rujukan_eksternal_bk; delete from public.sesi_konseling;
delete from public.permintaan_konseling; delete from public.kasus_bk; delete from public.notifikasi;
delete from public.riwayat_pengajuan_kegiatan; delete from public.pengajuan_kegiatan; delete from public.sertifikat_org; delete from public.presensi_org;
delete from public.kegiatan_org; delete from public.program_kerja; delete from public.keanggotaan_org; delete from public.pendaftaran_ekskul;
delete from public.pembina_organisasi; update public.prestasi_siswa set organisasi_id = null; delete from public.organisasi;

insert into public.pengguna (user_id, nama, email)
select pg_temp.uid(e), e, e || '@sman22.test' from unnest(array['siswa','ortu','guru','piket','humas','kepsek','walikelas','kesiswaan','operator','admin']) e
on conflict (user_id) do update set aktif = true;
delete from public.pengguna_peran where user_id in (pg_temp.uid('piket'), pg_temp.uid('humas'), pg_temp.uid('operator'));
insert into public.pengguna_peran (user_id, peran) values
  (pg_temp.uid('siswa'), 'siswa'), (pg_temp.uid('ortu'), 'orang_tua'), (pg_temp.uid('guru'), 'guru'), (pg_temp.uid('piket'), 'bk'),
  (pg_temp.uid('humas'), 'bk'), (pg_temp.uid('kepsek'), 'kepala_sekolah'), (pg_temp.uid('walikelas'), 'guru'), (pg_temp.uid('kesiswaan'), 'kesiswaan'),
  (pg_temp.uid('operator'), 'keuangan'), (pg_temp.uid('admin'), 'super_admin')
on conflict do nothing;
update public.peran set wajib_mfa = false;
update public.siswa set user_id = null where user_id = pg_temp.uid('siswa');
insert into public.siswa (id, nisn, nama, user_id) values
  ('00000000-0000-0000-0000-0000000c0d01', '9920000001', 'Siswa Konseli', pg_temp.uid('siswa')),
  ('00000000-0000-0000-0000-0000000c0d02', '9920000002', 'Siswa Kedua', null);
insert into public.orang_tua (id, nama, user_id) values ('00000000-0000-0000-0000-0000000c0e01', 'Ortu K', pg_temp.uid('ortu')) on conflict (user_id) do nothing;
delete from public.siswa_orang_tua where orang_tua_id = (select id from public.orang_tua where user_id = pg_temp.uid('ortu'));
insert into public.siswa_orang_tua values ('00000000-0000-0000-0000-0000000c0d01', (select id from public.orang_tua where user_id = pg_temp.uid('ortu')), 'ibu');
update public.pegawai set user_id = null where user_id in (pg_temp.uid('walikelas'), pg_temp.uid('piket'), pg_temp.uid('humas'), pg_temp.uid('guru'));
insert into public.pegawai (id, nama, user_id) values
  ('00000000-0000-0000-0000-0000000c0b01', 'Wali Uji', pg_temp.uid('walikelas')),
  ('00000000-0000-0000-0000-0000000c0b02', 'Konselor Satu', pg_temp.uid('piket')),
  ('00000000-0000-0000-0000-0000000c0b03', 'Konselor Dua', pg_temp.uid('humas')),
  ('00000000-0000-0000-0000-0000000c0b04', 'Guru Biasa', pg_temp.uid('guru'));
insert into public.kelas (id, tahun_ajaran_id, tingkat, nama, wali_kelas_id)
  values ('00000000-0000-0000-0000-0000000c0c01', (select id from public.tahun_ajaran where aktif), 'X', 'X-UJI12', '00000000-0000-0000-0000-0000000c0b01');
insert into public.anggota_kelas (siswa_id, kelas_id, tahun_ajaran_id) values
  ('00000000-0000-0000-0000-0000000c0d01', '00000000-0000-0000-0000-0000000c0c01', (select id from public.tahun_ajaran where aktif)),
  ('00000000-0000-0000-0000-0000000c0d02', '00000000-0000-0000-0000-0000000c0c01', (select id from public.tahun_ajaran where aktif));

-- ================= BK =================
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  perform public.ajukan_konseling('00000000-0000-0000-0000-0000000c0d01', 'belajar', 'Sulit fokus belajar', 'v1:CIPHERTEXT', true, 'Selasa istirahat');
  begin perform public.ajukan_konseling('00000000-0000-0000-0000-0000000c0d02', 'belajar', 'Atas nama teman', 'x', false, '');
    raise exception 'GAGAL: siswa mengajukan atas nama orang lain'; exception when insufficient_privilege then null; end;
  if (select count(*) from public.permintaan_bk_saya()) <> 1 then raise exception 'GAGAL: siswa melihat permintaannya'; end if;
  begin perform pesan_enc from public.permintaan_konseling; raise exception 'GAGAL: kolom pesan terbaca langsung'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: siswa mengajukan layanan BK; pesan terenkripsi tidak bisa dibaca langsung';
end $$;
reset role;
select pg_temp.sebagai('ortu'); set local role authenticated;
do $$ begin
  perform public.ajukan_konseling('00000000-0000-0000-0000-0000000c0d01', 'keluarga', 'Konsultasi orang tua', '', false, '');
  if (select count(*) from public.permintaan_bk_saya()) <> 1 then raise exception 'GAGAL: ortu hanya melihat permintaan yang ia ajukan'; end if;
  raise notice 'LULUS: ortu mengajukan untuk anak & tidak melihat permintaan anak';
end $$;
reset role;
do $$ begin
  if (select count(*) from public.notifikasi n where n.user_id = pg_temp.uid('piket') and n.judul like 'Permintaan layanan BK%') <> 2 then raise exception 'GAGAL: notifikasi ke BK'; end if;
  if exists (select 1 from public.notifikasi where isi like '%Siswa Konseli%' or judul like '%Siswa Konseli%') then raise exception 'GAGAL: nama siswa bocor di notifikasi'; end if;
  raise notice 'LULUS: BK diberi tahu tanpa nama siswa';
end $$;
select pg_temp.sebagai('piket'); set local role authenticated;
do $$ declare k uuid; j jsonb; begin
  insert into public.kasus_bk (siswa_id, kategori, prioritas, asal, asesmen_enc) values ('00000000-0000-0000-0000-0000000c0d01', 'belajar', 'tinggi', 'permintaan', 'v1:ASESMEN')
    returning id into k;
  update public.permintaan_konseling set status = 'diterima', kasus_id = k, catatan_untuk_pemohon = 'Kita bertemu Selasa.', topik = 'diubah' where topik = 'Sulit fokus belajar';
  if not exists (select 1 from public.permintaan_konseling where topik = 'Sulit fokus belajar' and status = 'diterima') then raise exception 'GAGAL: proses permintaan / topik terkunci'; end if;
  insert into public.sesi_konseling (kasus_id, mulai, durasi_menit, catatan_enc) values (k, date_trunc('day', now()) + interval '1 day 3 hours', 45, 'v1:CATATAN');
  begin insert into public.sesi_konseling (kasus_id, mulai) values (k, date_trunc('day', now()) + interval '1 day 3 hours 30 minutes');
    raise exception 'GAGAL: sesi bentrok'; exception when exclusion_violation then null; end;
  insert into public.sesi_konseling (kasus_id, mulai, jenis) values (k, date_trunc('day', now()) + interval '2 days 3 hours', 'konsultasi_ortu');
  begin perform asesmen_enc from public.kasus_bk; raise exception 'GAGAL: asesmen terbaca tanpa log'; exception when insufficient_privilege then null; end;
  j := public.buka_kasus_bk(k);
  if j ->> 'asesmen_enc' <> 'v1:ASESMEN' or jsonb_array_length(j -> 'sesi') <> 2 then raise exception 'GAGAL: buka kasus %', j; end if;
  if (select count(*) from public.log_akses_bk where kasus_id = k and aksi = 'buka') <> 1 then raise exception 'GAGAL: log akses'; end if;
  update public.kasus_bk set saran_wali = 'Mohon beri kesempatan duduk di depan dan pantau tugas.' where id = k;
  insert into public.tindak_lanjut_bk (kasus_id, rencana, tenggat) values (k, 'Pantau nilai harian', current_date);
  raise notice 'LULUS: konselor membuat kasus, sesi (anti-bentrok), membuka isi dengan log';
end $$;
reset role;
select pg_temp.sebagai('humas'); set local role authenticated;
do $$ declare k uuid := (select id from public.kasus_bk limit 1); begin
  begin perform public.buka_kasus_bk(k); raise exception 'GAGAL: konselor lain tanpa alasan'; exception when invalid_parameter_value then null; end;
  perform public.buka_kasus_bk(k, 'Menggantikan konselor yang cuti');
  raise notice 'LULUS: konselor lain wajib menulis alasan';
end $$;
reset role;
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  if (select count(*) from public.jadwal_bk_saya()) <> 1 then raise exception 'GAGAL: siswa melihat jadwalnya (bukan konsultasi ortu)'; end if;
  if (select count(*) from public.kasus_bk) <> 0 then raise exception 'GAGAL: siswa melihat kasus'; end if;
  if not exists (select 1 from public.permintaan_bk_saya() where catatan_untuk_pemohon = 'Kita bertemu Selasa.') then raise exception 'GAGAL: balasan BK'; end if;
  raise notice 'LULUS: siswa melihat jadwal & balasan, bukan catatan';
end $$;
reset role;
select pg_temp.sebagai('ortu'); set local role authenticated;
do $$ begin
  if (select count(*) from public.jadwal_bk_saya()) <> 1 or (select jenis from public.jadwal_bk_saya() limit 1) <> 'konsultasi_ortu' then raise exception 'GAGAL: ortu hanya undangan konsultasi ortu'; end if;
  raise notice 'LULUS: ortu hanya melihat undangan konsultasi orang tua';
end $$;
reset role;
select pg_temp.sebagai('walikelas'); set local role authenticated;
do $$ begin
  if (select count(*) from public.kasus_bk) <> 0 then raise exception 'GAGAL: wali melihat kasus'; end if;
  begin perform public.buka_kasus_bk((select id from public.kasus_bk limit 1)); raise exception 'GAGAL: wali membuka kasus'; exception when insufficient_privilege then null; end;
  if (select count(*) from public.saran_bk_wali()) <> 1 then raise exception 'GAGAL: wali menerima saran BK'; end if;
  raise notice 'LULUS: wali hanya menerima saran yang dibagikan BK';
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  if (select count(*) from public.saran_bk_wali()) <> 0 then raise exception 'GAGAL: guru lain menerima saran'; end if;
  begin perform public.statistik_bk(current_date - 30, current_date); raise exception 'GAGAL: guru statistik bk'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: guru lain tidak melihat apa pun';
end $$;
reset role;
select pg_temp.sebagai('kepsek'); set local role authenticated;
do $$ declare j jsonb; begin
  if (select count(*) from public.kasus_bk) <> 0 then raise exception 'GAGAL: kepsek melihat kasus'; end if;
  j := public.statistik_bk(current_date - 30, current_date);
  if (j ->> 'kasus_baru')::int <> 1 or (j -> 'per_kategori' ->> 'Belajar') is not null then raise exception 'GAGAL: agregat & penyamaran sel kecil %', j; end if;
  raise notice 'LULUS: kepsek hanya agregat (sel < 3 disamarkan)';
end $$;
reset role;
select pg_temp.sebagai('admin'); set local role authenticated;
do $$ begin
  if (select count(*) from public.kasus_bk) <> 0 then raise exception 'GAGAL: super admin melihat kasus'; end if;
  raise notice 'LULUS: super admin tidak membaca kasus konseling';
end $$;
reset role;
do $$ declare k uuid := (select id from public.kasus_bk limit 1); begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid('piket'), 'role', 'authenticated')::text, true);
  update public.kasus_bk set status = 'selesai' where id = k;
  if (select retensi_sampai from public.kasus_bk where id = k) <> current_date + interval '3 years' then raise exception 'GAGAL: retensi'; end if;
  update public.kasus_bk set retensi_sampai = current_date - 1 where id = k;
  perform public.musnahkan_retensi_bk();
  if (select asesmen_enc from public.kasus_bk where id = k) <> '' or exists (select 1 from public.sesi_konseling where kasus_id = k and catatan_enc <> '')
     or exists (select 1 from public.permintaan_konseling where kasus_id = k and pesan_enc <> '') then raise exception 'GAGAL: pemusnahan isi'; end if;
  raise notice 'LULUS: isi kasus dimusnahkan setelah masa retensi';
end $$;

-- ================= EKSKUL =================
select pg_temp.sebagai('kesiswaan'); set local role authenticated;
do $$ begin
  insert into public.organisasi (id, jenis, nama, slug, bidang, kuota, daftar_mulai, daftar_selesai, field_tambahan, deskripsi)
  values ('00000000-0000-0000-0000-0000000e0001', 'ekskul', 'KOMPFI Uji', 'kompfi-uji', 'teknologi', 1, current_date - 1, current_date + 7,
          '[{"id":"f1","label":"Laptop pribadi?","jenis":"pilihan","pilihan":["Ya","Tidak"],"wajib":true}]', 'Komunitas fotografi & film'),
         ('00000000-0000-0000-0000-0000000e0002', 'osis', 'OSIS Uji', 'osis-uji', 'organisasi', 0, null, null, '[]', '');
  insert into public.pembina_organisasi values ('00000000-0000-0000-0000-0000000e0001', '00000000-0000-0000-0000-0000000c0b01');
  update public.pengaturan_ekskul set maks_pilihan = 2;
  raise notice 'LULUS: kesiswaan membuat organisasi & pembina';
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  begin insert into public.organisasi (nama, slug) values ('Liar', 'liar'); raise exception 'GAGAL: guru membuat organisasi'; exception when insufficient_privilege then null; end;
  update public.organisasi set deskripsi = 'diubah guru';
  if exists (select 1 from public.organisasi where deskripsi = 'diubah guru') then raise exception 'GAGAL: guru bukan pembina mengubah'; end if;
  raise notice 'LULUS: guru bukan pembina tidak mengelola';
end $$;
reset role;
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  begin perform public.daftar_ekskul('00000000-0000-0000-0000-0000000e0001', 1, 'Suka foto', '{}'); raise exception 'GAGAL: isian wajib';
    exception when invalid_parameter_value then null; end;
  perform public.daftar_ekskul('00000000-0000-0000-0000-0000000e0001', 1, 'Suka foto', '{"f1":"Ya"}');
  begin perform public.daftar_ekskul('00000000-0000-0000-0000-0000000e0001', 1, 'lagi', '{"f1":"Ya"}'); raise exception 'GAGAL: daftar ganda';
    exception when invalid_parameter_value then null; end;
  begin perform public.daftar_ekskul('00000000-0000-0000-0000-0000000e0002', 1, '', '{}'); raise exception 'GAGAL: pendaftaran tertutup';
    exception when invalid_parameter_value then null; end;
  raise notice 'LULUS: siswa mendaftar (isian tambahan, ganda, periode)';
end $$;
reset role;
-- siswa kedua (tanpa akun) mendaftar lewat data uji
insert into public.pendaftaran_ekskul (organisasi_id, siswa_id, tahun_ajaran_id, jawaban) values
  ('00000000-0000-0000-0000-0000000e0001', '00000000-0000-0000-0000-0000000c0d02', (select id from public.tahun_ajaran where aktif), '{"f1":"Tidak"}');
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  begin perform public.putuskan_pendaftaran((select id from public.pendaftaran_ekskul limit 1), true); raise exception 'GAGAL: guru memutuskan';
    exception when insufficient_privilege then null; end;
  if (select count(*) from public.pendaftar_org('00000000-0000-0000-0000-0000000e0001')) <> 0 then raise exception 'GAGAL: guru melihat pendaftar'; end if;
  raise notice 'LULUS: guru lain tidak memutuskan pendaftaran';
end $$;
reset role;
select pg_temp.sebagai('walikelas'); set local role authenticated;
do $$ begin
  if public.putuskan_pendaftaran((select id from public.pendaftaran_ekskul where siswa_id = '00000000-0000-0000-0000-0000000c0d01'), true) <> 'diterima' then raise exception 'GAGAL: terima'; end if;
  if public.putuskan_pendaftaran((select id from public.pendaftaran_ekskul where siswa_id = '00000000-0000-0000-0000-0000000c0d02'), true) <> 'daftar_tunggu' then raise exception 'GAGAL: kuota → daftar tunggu'; end if;
  update public.keanggotaan_org set jabatan = 'anggota' where siswa_id = '00000000-0000-0000-0000-0000000c0d01';
  raise notice 'LULUS: pembina menerima; kuota penuh → daftar tunggu';
end $$;
reset role;
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  begin insert into public.kegiatan_org (organisasi_id, judul, mulai, selesai) values ('00000000-0000-0000-0000-0000000e0001', 'Latihan', now(), now() + interval '2 hours');
    raise exception 'GAGAL: anggota biasa membuat kegiatan'; exception when insufficient_privilege then null; end;
  if (select count(*) from public.anggota_org('00000000-0000-0000-0000-0000000e0001')) <> 1 then raise exception 'GAGAL: anggota melihat daftar anggota'; end if;
  raise notice 'LULUS: anggota biasa hanya melihat';
end $$;
reset role;
update public.keanggotaan_org set jabatan = 'ketua' where siswa_id = '00000000-0000-0000-0000-0000000c0d01';
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ declare g uuid; a uuid; begin
  insert into public.kegiatan_org (organisasi_id, judul, mulai, selesai, publik) values ('00000000-0000-0000-0000-0000000e0001', 'Hunting foto', now(), now() + interval '2 hours', true) returning id into g;
  if public.isi_presensi_org(g, '[{"siswa_id":"00000000-0000-0000-0000-0000000c0d01","status":"hadir"},{"siswa_id":"00000000-0000-0000-0000-0000000c0d02","status":"hadir"}]') <> 1 then
    raise exception 'GAGAL: presensi hanya untuk anggota aktif'; end if;
  insert into public.pengajuan_kegiatan (organisasi_id, judul, tujuan, mulai, selesai, risiko, anggaran)
    values ('00000000-0000-0000-0000-0000000e0001', 'Pameran Foto', 'Memamerkan karya anggota kepada warga sekolah', current_date + 14, current_date + 15, 'Cuaca',
            '[{"uraian":"Cetak foto","volume":20,"satuan":"lembar","harga":15000}]') returning id into a;
  if (select total_anggaran from public.pengajuan_kegiatan where id = a) <> 300000 then raise exception 'GAGAL: total anggaran'; end if;
  perform public.proses_pengajuan(a, 'ajukan');
  update public.pengajuan_kegiatan set judul = 'Diubah setelah diajukan' where id = a;
  if (select judul from public.pengajuan_kegiatan where id = a) <> 'Pameran Foto' then raise exception 'GAGAL: proposal terkunci'; end if;
  begin perform public.proses_pengajuan(a, 'setujui'); raise exception 'GAGAL: ketua menyetujui sendiri'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: ketua membuat kegiatan, presensi, dan mengajukan proposal';
end $$;
reset role;
select pg_temp.sebagai('walikelas'); set local role authenticated;
do $$ begin
  if public.proses_pengajuan((select id from public.pengajuan_kegiatan limit 1), 'setujui') <> 'disetujui_pembina' then raise exception 'GAGAL: pembina setujui'; end if;
  raise notice 'LULUS: pembina menyetujui tahap 1';
end $$;
reset role;
select pg_temp.sebagai('operator'); set local role authenticated;
do $$ begin
  if (select total_anggaran from public.pengajuan_kegiatan limit 1) <> 300000 then raise exception 'GAGAL: keuangan melihat anggaran'; end if;
  begin perform public.proses_pengajuan((select id from public.pengajuan_kegiatan limit 1), 'setujui'); raise exception 'GAGAL: keuangan menyetujui';
    exception when insufficient_privilege then null; end;
  update public.pengajuan_kegiatan set sumber_dana = 'x';
  if exists (select 1 from public.pengajuan_kegiatan where sumber_dana = 'x') then raise exception 'GAGAL: keuangan mengubah'; end if;
  raise notice 'LULUS: keuangan hanya melihat anggaran';
end $$;
reset role;
select pg_temp.sebagai('kesiswaan'); set local role authenticated;
do $$ declare a uuid := (select id from public.pengajuan_kegiatan limit 1); begin
  if public.proses_pengajuan(a, 'setujui') <> 'disetujui' then raise exception 'GAGAL: kesiswaan setujui'; end if;
  if public.terbitkan_sertifikat('00000000-0000-0000-0000-0000000e0001', array['00000000-0000-0000-0000-0000000c0d01'::uuid], 'kepengurusan', 'Ketua KOMPFI 2026/2027', '', current_date) <> 1 then
    raise exception 'GAGAL: terbitkan sertifikat'; end if;
  raise notice 'LULUS: kesiswaan menyetujui & menerbitkan sertifikat';
end $$;
reset role;
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ declare a uuid := (select id from public.pengajuan_kegiatan limit 1); begin
  update public.pengajuan_kegiatan set lpj_ringkasan = 'Pameran berjalan lancar, 150 pengunjung dari warga sekolah.', lpj_realisasi = 280000 where id = a;
  if public.proses_pengajuan(a, 'lpj') <> 'lpj_diajukan' then raise exception 'GAGAL: LPJ'; end if;
  if jsonb_array_length(public.portofolio_ekskul('00000000-0000-0000-0000-0000000c0d01') -> 'sertifikat') <> 1 then raise exception 'GAGAL: portofolio'; end if;
  if (select count(*) from public.data_sertifikat((select id from public.sertifikat_org limit 1))) <> 1 then raise exception 'GAGAL: cetak sertifikat sendiri'; end if;
  raise notice 'LULUS: ketua mengirim LPJ; portofolio & sertifikat terlihat';
end $$;
reset role;
-- anggota keluar → daftar tunggu naik otomatis
select pg_temp.sebagai('walikelas'); set local role authenticated;
do $$ begin
  update public.keanggotaan_org set status = 'keluar' where siswa_id = '00000000-0000-0000-0000-0000000c0d01';
  if (select status from public.pendaftaran_ekskul where siswa_id = '00000000-0000-0000-0000-0000000c0d02') <> 'diterima'
     or not exists (select 1 from public.keanggotaan_org where siswa_id = '00000000-0000-0000-0000-0000000c0d02' and status = 'aktif') then
    raise exception 'GAGAL: daftar tunggu naik'; end if;
  raise notice 'LULUS: peserta daftar tunggu otomatis diterima saat ada yang keluar';
end $$;
reset role;
create temp table kode_uji as select kode from public.sertifikat_org limit 1;
grant select on kode_uji to anon;
select pg_temp.anon(); set local role anon;
do $$ declare v record; begin
  select * into v from public.verifikasi_sertifikat((select kode from kode_uji));
  if not v.berlaku or v.nama_samaran like '%Konseli%' or v.nama_samaran not like 'S%' then raise exception 'GAGAL: verifikasi tersamar %', v.nama_samaran; end if;
  begin perform count(*) from public.sertifikat_org; raise exception 'GAGAL: anon membaca sertifikat'; exception when insufficient_privilege then null; end;
  if (select count(*) from public.organisasi_publik() where nama like '%Uji') <> 2 then raise exception 'GAGAL: organisasi publik'; end if;
  if (public.organisasi_publik_detail('kompfi-uji')::text) like '%Siswa%' then raise exception 'GAGAL: nama siswa di profil publik'; end if;
  if jsonb_array_length(public.organisasi_publik_detail('kompfi-uji') -> 'agenda') <> 1 then raise exception 'GAGAL: agenda publik'; end if;
  raise notice 'LULUS: publik memverifikasi sertifikat (nama disamarkan) & melihat profil tanpa data siswa';
end $$;
reset role;

rollback;
