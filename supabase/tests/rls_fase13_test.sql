-- Uji hak akses Fase 13 (alumni & tracer study, mutu & akreditasi). Jalankan di database UJI.
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

delete from public.cerita_alumni; delete from public.kontribusi_alumni; delete from public.mentoring; delete from public.mentor_alumni; delete from public.peluang;
delete from public.rsvp_acara_alumni; delete from public.acara_alumni; delete from public.pendaftaran_alumni; delete from public.profil_alumni;
delete from public.rencana_perbaikan; delete from public.temuan_mutu; delete from public.akses_bukti_mutu; delete from public.tautan_bukti_mutu;
delete from public.bukti_mutu; delete from public.reviu_mutu; delete from public.evaluasi_indikator; delete from public.indikator_mutu; delete from public.standar_mutu;
delete from public.kerangka_mutu; delete from public.notifikasi;
update public.peran set wajib_mfa = false;

insert into public.pengguna (user_id, nama, email)
select pg_temp.uid(e), e, e || '@sman22.test' from unnest(array['siswa','guru','piket','humas','kepsek','walikelas','kesiswaan','operator','ortu']) e
on conflict (user_id) do update set aktif = true;
delete from public.pengguna_peran where user_id in (pg_temp.uid('piket'), pg_temp.uid('operator'), pg_temp.uid('kesiswaan'), pg_temp.uid('humas'), pg_temp.uid('walikelas'), pg_temp.uid('guru'));
insert into public.pengguna_peran (user_id, peran) values
  (pg_temp.uid('siswa'), 'siswa'), (pg_temp.uid('guru'), 'guru'), (pg_temp.uid('humas'), 'admin_alumni'), (pg_temp.uid('kepsek'), 'kepala_sekolah'),
  (pg_temp.uid('walikelas'), 'guru'), (pg_temp.uid('operator'), 'tim_mutu'), (pg_temp.uid('kesiswaan'), 'auditor')
on conflict do nothing;
update public.siswa set user_id = null where user_id = pg_temp.uid('siswa');
insert into public.siswa (id, nisn, nama, user_id, status, tanggal_lahir) values
  ('00000000-0000-0000-0000-0000000d0d01', '9930000001', 'Siswa Aktif', pg_temp.uid('siswa'), 'aktif', '2010-01-01'),
  ('00000000-0000-0000-0000-0000000d0d02', '9930000002', 'Lulusan Satu', null, 'lulus', '2006-05-05');
update public.pegawai set user_id = null where user_id in (pg_temp.uid('walikelas'), pg_temp.uid('guru'), pg_temp.uid('operator'));
insert into public.pegawai (id, nama, user_id) values
  ('00000000-0000-0000-0000-0000000d0b01', 'Koordinator Standar', pg_temp.uid('walikelas')),
  ('00000000-0000-0000-0000-0000000d0b02', 'Guru Lain', pg_temp.uid('guru'));

select set_config('uji.piket', pg_temp.uid('piket')::text, false);
-- ================= ALUMNI =================
select pg_temp.anon(); set local role anon;
do $$ begin
  begin perform public.daftar_alumni('Lulusan Satu', 2024, '9930000002', '2006-05-05', 'IPS', 'XII-3', 'lulusan@contoh.id', '', false, 'v1', 'ip1');
    raise exception 'GAGAL: tanpa persetujuan privasi'; exception when invalid_parameter_value then null; end;
  perform public.daftar_alumni('Lulusan Satu', 2024, '9930000002', '2006-05-05', 'IPS', 'XII-3', 'lulusan@contoh.id', '0812', true, 'v1', 'ip1');
  begin perform public.daftar_alumni('Lulusan Satu', 2024, '', null, '', '', 'LULUSAN@contoh.id', '', true, 'v1', 'ip2');
    raise exception 'GAGAL: email ganda'; exception when invalid_parameter_value then null; end;
  begin perform count(*) from public.pendaftaran_alumni; raise exception 'GAGAL: anon membaca pendaftaran'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: registrasi publik dengan persetujuan privasi & anti-ganda';
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  if (select count(*) from public.pendaftaran_alumni) <> 0 then raise exception 'GAGAL: guru melihat pendaftaran'; end if;
  begin perform public.impor_lulusan(2024); raise exception 'GAGAL: guru impor lulusan'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: guru tidak mengelola alumni';
end $$;
reset role;
select pg_temp.sebagai('humas'); set local role authenticated;
do $$ declare r uuid; begin
  if public.impor_lulusan(2024) < 1 then raise exception 'GAGAL: impor lulusan'; end if;
  r := (select id from public.pendaftaran_alumni);
  if (select tingkat from public.cocok_pendaftaran_alumni(r) limit 1) <> 'kuat' then raise exception 'GAGAL: pencocokan NISN + tanggal lahir'; end if;
  perform public.setujui_pendaftaran_alumni(r, current_setting('uji.piket')::uuid, '00000000-0000-0000-0000-0000000d0d02');
  if not exists (select 1 from public.profil_alumni where user_id = current_setting('uji.piket')::uuid and siswa_id = '00000000-0000-0000-0000-0000000d0d02' and terverifikasi) then
    raise exception 'GAGAL: profil tertaut ke data lulusan'; end if;
  insert into public.peluang (judul, jenis, sasaran, status) values ('Beasiswa Uji', 'beasiswa', 'keduanya', 'tayang');
  insert into public.acara_alumni (judul, mulai, kuota, publik) values ('Reuni Akbar', now() + interval '10 days', 1, true);
  raise notice 'LULUS: admin alumni mengimpor lulusan, mencocokkan & menyetujui';
end $$;
reset role;
select pg_temp.sebagai('piket'); set local role authenticated;
do $$ declare me uuid; m uuid; begin
  me := public.alumni_saya();
  if me is null then raise exception 'GAGAL: alumni terverifikasi'; end if;
  if public.staf_aktif() or public.warga_aktif() then raise exception 'GAGAL: alumni dianggap staf/warga'; end if;
  update public.profil_alumni set nama = 'Ganti Nama', status_kegiatan = 'kuliah', institusi = 'ITB', tampil_direktori = true, field_direktori = '{institusi}' where id = me;
  if (select nama from public.profil_alumni where id = me) <> 'Lulusan Satu' or (select status_kegiatan from public.profil_alumni where id = me) <> 'kuliah' then
    raise exception 'GAGAL: alumni mengubah identitas / tracer'; end if;
  if (select count(*) from public.profil_alumni) <> 1 then raise exception 'GAGAL: alumni melihat profil orang lain'; end if;
  if (select institusi from public.direktori_alumni()) <> 'ITB' or (select email from public.direktori_alumni()) is not null then raise exception 'GAGAL: direktori sesuai consent'; end if;
  if (select count(*) from public.peluang) <> 1 then raise exception 'GAGAL: alumni melihat peluang'; end if;
  insert into public.peluang (judul, jenis, sasaran, status, diajukan_oleh) values ('Lowongan dari alumni', 'lowongan', 'alumni', 'menunggu', auth.uid());
  begin insert into public.peluang (judul, sasaran, status, diajukan_oleh) values ('Langsung tayang', 'alumni', 'tayang', auth.uid());
    raise exception 'GAGAL: alumni menayangkan sendiri'; exception when insufficient_privilege then null; end;
  perform public.rsvp_acara_alumni_set((select id from public.acara_alumni), true);
  insert into public.mentor_alumni (profil_id, bidang, deskripsi) values (me, 'Teknik Sipil', 'Berbagi pengalaman kuliah teknik') returning id into m;
  insert into public.cerita_alumni (profil_id, judul, isi, izin_publik) values (me, 'Dari Cibiru ke ITB', repeat('Cerita perjalanan kuliah saya. ', 4), true);
  if (select count(*) from public.kegiatan_org) > 0 then raise exception 'GAGAL: alumni melihat kegiatan sekolah'; end if;
  raise notice 'LULUS: alumni mengelola profil (identitas terkunci), direktori sesuai consent, peluang & cerita lewat moderasi';
end $$;
reset role;
select pg_temp.sebagai('humas'); set local role authenticated;
do $$ begin
  update public.mentor_alumni set status = 'disetujui';
  update public.cerita_alumni set status = 'tayang';
  raise notice 'LULUS: admin alumni menyetujui mentor & cerita';
end $$;
reset role;
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  if (select count(*) from public.mentor_tersedia()) <> 1 then raise exception 'GAGAL: siswa melihat mentor'; end if;
  perform public.ajukan_mentoring((select id from public.mentor_tersedia()), 'Ingin tahu kuliah teknik sipil');
  if (select count(*) from public.profil_alumni) <> 0 or (select count(*) from public.direktori_alumni()) <> 0 then raise exception 'GAGAL: siswa melihat data alumni'; end if;
  if (select count(*) from public.peluang) <> 1 then raise exception 'GAGAL: siswa melihat peluang keduanya saja'; end if;
  raise notice 'LULUS: siswa melihat mentor & peluang, mengajukan mentoring; tanpa akses data alumni';
end $$;
reset role;
select pg_temp.sebagai('piket'); set local role authenticated;
do $$ begin
  if (select count(*) from public.mentoring_saya()) <> 0 then raise exception 'GAGAL: mentor melihat sebelum disetujui sekolah'; end if;
end $$;
reset role;
select pg_temp.sebagai('humas'); set local role authenticated;
do $$ begin update public.mentoring set status = 'disetujui', catatan_sekolah = 'Pertemuan di aula, didampingi BK'; end $$;
reset role;
select pg_temp.sebagai('piket'); set local role authenticated;
do $$ begin
  if (select count(*) from public.mentoring_saya()) <> 1 then raise exception 'GAGAL: mentor melihat setelah disetujui'; end if;
  raise notice 'LULUS: mentor melihat siswa hanya setelah disetujui sekolah';
end $$;
reset role;
select pg_temp.anon(); set local role anon;
do $$ begin
  if (select count(*) from public.cerita_alumni_publik()) <> 1 or (select count(*) from public.acara_alumni_publik()) <> 1 then raise exception 'GAGAL: konten publik'; end if;
  if (public.ringkasan_alumni_publik() ->> 'cukup')::boolean then raise exception 'GAGAL: ringkasan publik < 10 responden harus ditahan'; end if;
  begin perform count(*) from public.profil_alumni; raise exception 'GAGAL: anon membaca profil'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: publik hanya cerita tayang, acara publik, ringkasan agregat';
end $$;
reset role;
select pg_temp.sebagai('kepsek'); set local role authenticated;
do $$ begin
  if (select total from public.statistik_alumni() where tahun_lulus = 2024) < 1 or (select kuliah from public.statistik_alumni() where tahun_lulus = 2024) is not null then
    raise exception 'GAGAL: statistik agregat tersamar'; end if;
  if (select count(*) from public.profil_alumni) <> 0 then raise exception 'GAGAL: kepsek membaca profil pribadi'; end if;
  raise notice 'LULUS: pimpinan hanya statistik agregat (sel kecil disamarkan)';
end $$;
reset role;
-- tracer study per angkatan
select pg_temp.sebagai('humas'); set local role authenticated;
do $$ begin
  insert into public.survei (id, judul, sasaran, angkatan, pertanyaan, selesai, terbit) values
   ('00000000-0000-0000-0000-0000000d5001', 'Tracer 2024', 'alumni', '{2024}', '[{"id":"q1","jenis":"pilihan","teks":"Status","pilihan":["Kuliah","Bekerja"]}]', current_date + 30, true),
   ('00000000-0000-0000-0000-0000000d5002', 'Tracer 2020', 'alumni', '{2020}', '[{"id":"q1","jenis":"skala","teks":"Puas"}]', current_date + 30, true);
end $$;
reset role;
select pg_temp.sebagai('piket'); set local role authenticated;
do $$ begin
  if (select count(*) from public.survei_aktif() where judul like 'Tracer%') <> 1 then raise exception 'GAGAL: tracer sesuai angkatan'; end if;
  perform public.isi_survei('00000000-0000-0000-0000-0000000d5001', '{"q1":"Kuliah"}');
  begin perform public.isi_survei('00000000-0000-0000-0000-0000000d5002', '{"q1":4}'); raise exception 'GAGAL: angkatan lain'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: alumni mengisi tracer study angkatannya saja';
end $$;
reset role;
select pg_temp.sebagai('humas'); set local role authenticated;
do $$ declare h jsonb := public.hasil_survei('00000000-0000-0000-0000-0000000d5001'); begin
  if (h ->> 'responden')::int <> 1 or (h -> 'per_angkatan' ->> '2024') is not null then raise exception 'GAGAL: hasil tracer agregat %', h; end if;
  raise notice 'LULUS: hasil tracer agregat per angkatan (tersamar < 3)';
end $$;
reset role;

-- ================= MUTU =================
select pg_temp.sebagai('operator'); set local role authenticated;
do $$ declare k uuid; s uuid; i uuid; b uuid; begin
  insert into public.kerangka_mutu (id, kode, nama, versi, status, periode_aktif) values ('00000000-0000-0000-0000-0000000d6001', 'IASP', 'Instrumen Akreditasi Satuan Pendidikan', '2024', 'aktif', '2026/2027');
  insert into public.standar_mutu (id, kerangka_id, kode, nama, koordinator_id) values ('00000000-0000-0000-0000-0000000d6101', '00000000-0000-0000-0000-0000000d6001', 'K1', 'Kinerja pendidik', null);
  insert into public.indikator_mutu (id, standar_id, kode, nama, pemilik_id) values
    ('00000000-0000-0000-0000-0000000d6201', '00000000-0000-0000-0000-0000000d6101', '1.1', 'Pendidik merencanakan pembelajaran', '00000000-0000-0000-0000-0000000d0b01'),
    ('00000000-0000-0000-0000-0000000d6202', '00000000-0000-0000-0000-0000000d6101', '1.2', 'Pendidik melaksanakan asesmen', null);
  raise notice 'LULUS: tim mutu menyusun kerangka, standar, indikator';
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  if (select count(*) from public.indikator_mutu) <> 0 then raise exception 'GAGAL: guru lain melihat indikator'; end if;
  begin insert into public.bukti_mutu (judul, jenis, tautan) values ('Bukti liar', 'tautan', 'https://x.id'); raise exception 'GAGAL: guru lain mengunggah bukti';
    exception when insufficient_privilege then null; end;
  raise notice 'LULUS: guru bukan pemilik tidak mengakses mutu';
end $$;
reset role;
select pg_temp.sebagai('walikelas'); set local role authenticated;
do $$ declare b uuid; e uuid; begin
  if (select count(*) from public.indikator_mutu) < 1 then raise exception 'GAGAL: pemilik melihat indikator'; end if;
  insert into public.evaluasi_indikator (indikator_id, periode, target, capaian, status, persetujuan) values ('00000000-0000-0000-0000-0000000d6201', '2026/2027', '100% guru menyusun modul ajar', '92%', 'proses', 'disetujui') returning id into e;
  if (select persetujuan from public.evaluasi_indikator where id = e) <> 'draf' then raise exception 'GAGAL: pemilik menyetujui sendiri'; end if;
  begin insert into public.evaluasi_indikator (indikator_id, periode) values ('00000000-0000-0000-0000-0000000d6202', '2026/2027'); raise exception 'GAGAL: indikator bukan miliknya';
    exception when insufficient_privilege then null; end;
  insert into public.bukti_mutu (judul, jenis, sumber_modul, sumber_ref) values ('Rekap perangkat ajar', 'modul', 'perangkat_ajar', 'rekap') returning id into b;
  insert into public.tautan_bukti_mutu (bukti_id, indikator_id, periode) values (b, '00000000-0000-0000-0000-0000000d6201', '2026/2027');
  insert into public.bukti_mutu (judul, jenis, tautan, versi_dari) values ('Rekap perangkat ajar v2', 'tautan', 'https://drive.google.com/x', b);
  if (select versi from public.bukti_mutu where judul like '%v2') <> 2 or not (select digantikan from public.bukti_mutu where id = b) then raise exception 'GAGAL: versi bukti'; end if;
  begin update public.bukti_mutu set judul = 'diubah' where id = b; exception when insufficient_privilege then null; end;
  if exists (select 1 from public.bukti_mutu where judul = 'diubah') then raise exception 'GAGAL: bukti diubah'; end if;
  perform public.reviu_evaluasi(e, 'diajukan');
  begin perform public.reviu_evaluasi(e, 'disetujui'); raise exception 'GAGAL: pemilik menyetujui'; exception when insufficient_privilege then null; end;
  begin update public.evaluasi_indikator set capaian = '99%' where id = e; raise exception 'GAGAL: ubah saat ditinjau'; exception when invalid_parameter_value then null; end;
  raise notice 'LULUS: pemilik indikator mengisi evaluasi, menautkan & membuat versi bukti, mengajukan';
end $$;
reset role;
select pg_temp.sebagai('kesiswaan'); set local role authenticated;
do $$ declare e uuid := (select id from public.evaluasi_indikator); r record; begin
  perform public.reviu_evaluasi(e, 'revisi', 'Lampirkan contoh modul ajar');
  begin update public.indikator_mutu set nama = 'x'; exception when insufficient_privilege then null; end;
  if exists (select 1 from public.indikator_mutu where nama = 'x') then raise exception 'GAGAL: auditor mengubah indikator'; end if;
  insert into public.temuan_mutu (kerangka_id, indikator_id, periode, jenis, uraian, pj_id) values ('00000000-0000-0000-0000-0000000d6001', '00000000-0000-0000-0000-0000000d6201', '2026/2027', 'minor', 'Sebagian modul ajar belum memuat asesmen diagnostik', '00000000-0000-0000-0000-0000000d0b01');
  select * into r from public.analisis_mutu('00000000-0000-0000-0000-0000000d6001', '2026/2027') where kode = '1.2';
  if not ('tanpa_pemilik' = any (r.celah) and 'tanpa_bukti' = any (r.celah)) then raise exception 'GAGAL: analisis kesenjangan %', r.celah; end if;
  if (select temuan_terbuka from public.analisis_mutu('00000000-0000-0000-0000-0000000d6001', '2026/2027') where kode = '1.1') <> 1 then raise exception 'GAGAL: temuan di analisis'; end if;
  raise notice 'LULUS: auditor meninjau (revisi), mencatat temuan; analisis kesenjangan';
end $$;
reset role;
select pg_temp.sebagai('walikelas'); set local role authenticated;
do $$ begin
  if (select count(*) from public.temuan_mutu) <> 1 then raise exception 'GAGAL: PJ melihat temuan'; end if;
  insert into public.rencana_perbaikan (temuan_id, kegiatan, pj_id, tenggat) values ((select id from public.temuan_mutu), 'Workshop asesmen diagnostik untuk guru', '00000000-0000-0000-0000-0000000d0b01', current_date + 2);
  update public.evaluasi_indikator set capaian = '95%';
  raise notice 'LULUS: PJ membuat rencana perbaikan & memperbaiki evaluasi setelah revisi';
end $$;
reset role;
select pg_temp.sebagai('operator'); set local role authenticated;
do $$ declare baru uuid; begin
  baru := public.salin_kerangka_mutu('00000000-0000-0000-0000-0000000d6001', '2025');
  if (select count(*) from public.indikator_mutu i join public.standar_mutu s on s.id = i.standar_id where s.kerangka_id = baru) <> 2 then raise exception 'GAGAL: salin versi kerangka'; end if;
  perform public.reviu_evaluasi((select id from public.evaluasi_indikator), 'diajukan');
  perform public.reviu_evaluasi((select id from public.evaluasi_indikator), 'disetujui');
  if (select count(*) from public.reviu_mutu) <> 4 then raise exception 'GAGAL: riwayat reviu'; end if;
  raise notice 'LULUS: kerangka berversi & riwayat persetujuan';
end $$;
reset role;
do $$ begin
  if public.pengingat_mutu() < 1 then raise exception 'GAGAL: pengingat mutu'; end if;
  raise notice 'LULUS: pengingat bukti & tenggat rencana';
end $$;

rollback;
