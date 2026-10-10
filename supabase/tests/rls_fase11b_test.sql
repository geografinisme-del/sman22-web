-- Uji hak akses Fase 11b (reservasi, literasi, survei, penilaian layanan). Jalankan di database UJI.
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

insert into public.pengguna (user_id, nama, email)
select pg_temp.uid(e), e, e || '@sman22.test' from unnest(array['operator','siswa','ortu','guru','humas','piket','kesiswaan','walikelas']) e
on conflict (user_id) do update set aktif = true;
insert into public.pengguna_peran (user_id, peran) values
  (pg_temp.uid('operator'), 'pustakawan'), (pg_temp.uid('siswa'), 'siswa'), (pg_temp.uid('ortu'), 'orang_tua'), (pg_temp.uid('guru'), 'guru'),
  (pg_temp.uid('humas'), 'humas'), (pg_temp.uid('piket'), 'piket'), (pg_temp.uid('kesiswaan'), 'kesiswaan'), (pg_temp.uid('walikelas'), 'guru')
on conflict do nothing;
update public.siswa set user_id = null where user_id = pg_temp.uid('siswa');
insert into public.siswa (id, nisn, nama, user_id) values
  ('00000000-0000-0000-0000-00000000b0d1', '9910000001', 'Siswa Pustaka', pg_temp.uid('siswa')),
  ('00000000-0000-0000-0000-00000000b0d2', '9910000002', 'Siswa Lain', null);
insert into public.orang_tua (id, nama, user_id) values ('00000000-0000-0000-0000-00000000b0e1', 'Ortu P', pg_temp.uid('ortu')) on conflict (user_id) do nothing;
delete from public.siswa_orang_tua where orang_tua_id = (select id from public.orang_tua where user_id = pg_temp.uid('ortu'));
insert into public.siswa_orang_tua values ('00000000-0000-0000-0000-00000000b0d1', (select id from public.orang_tua where user_id = pg_temp.uid('ortu')), 'ayah');
update public.pegawai set user_id = null where user_id = pg_temp.uid('walikelas');
insert into public.pegawai (id, nama, user_id, nip) values ('00000000-0000-0000-0000-00000000b0b1', 'Guru PIC', pg_temp.uid('walikelas'), '199001012020121999');
update public.pengaturan_perpus set lama_pinjam = 7, maks_pinjam = 3, maks_perpanjang = 1, denda_per_hari = 500;
delete from public.notifikasi;
-- data uji lain (mis. dari e2e) diabaikan; semua dibatalkan oleh rollback
delete from public.riwayat_pengaduan; delete from public.pengaduan; delete from public.ulasan_buku; delete from public.jawaban_survei;
update public.pegawai set user_id = null where user_id = pg_temp.uid('operator');
insert into public.pegawai (id, nama, user_id, nip) values ('00000000-0000-0000-0000-00000000b0b2', 'Pustakawan Uji', pg_temp.uid('operator'), '199001012020121998')
  on conflict (id) do nothing;
update public.pegawai set user_id = pg_temp.uid('operator') where id = '00000000-0000-0000-0000-00000000b0b2';

-- ---------- RESERVASI ----------
select pg_temp.sebagai('operator'); set local role authenticated;
do $$ begin
  insert into public.buku (id, judul) values ('00000000-0000-0000-0000-00000000c101', 'Atlas Uji Reservasi');
  insert into public.eksemplar (buku_id, kode) values ('00000000-0000-0000-0000-00000000c101', 'RSV001');
  perform public.pinjam_buku('RSV001', '199001012020121999');
end $$;
reset role;
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ declare st text; begin
  st := public.pesan_buku('00000000-0000-0000-0000-00000000c101');
  if st <> 'menunggu' then raise exception 'GAGAL: pesanan menunggu saat semua dipinjam (%)', st; end if;
  begin perform public.pesan_buku('00000000-0000-0000-0000-00000000c101'); raise exception 'GAGAL: pesan ganda'; exception when invalid_parameter_value then null; end;
  begin insert into public.reservasi_buku (buku_id, siswa_id) values ('00000000-0000-0000-0000-00000000c101', '00000000-0000-0000-0000-00000000b0d2');
    raise exception 'GAGAL: siswa insert reservasi langsung'; exception when insufficient_privilege then null; end;
  if (select count(*) from public.reservasi_buku) <> 1 then raise exception 'GAGAL: siswa melihat pesanannya'; end if;
  raise notice 'LULUS: siswa memesan buku (antre, tanpa ganda)';
end $$;
reset role;
select pg_temp.sebagai('ortu'); set local role authenticated;
do $$ begin
  begin perform public.pesan_buku('00000000-0000-0000-0000-00000000c101'); raise exception 'GAGAL: ortu memesan'; exception when insufficient_privilege then null; end;
  if (select count(*) from public.reservasi_buku) <> 1 then raise exception 'GAGAL: ortu melihat pesanan anak'; end if;
  raise notice 'LULUS: ortu hanya melihat pesanan anak';
end $$;
reset role;
select pg_temp.sebagai('operator'); set local role authenticated;
do $$ declare r record; begin
  perform public.kembalikan_buku('RSV001');
  select status, batas_ambil into r from public.reservasi_buku where buku_id = '00000000-0000-0000-0000-00000000c101';
  if r.status <> 'siap' or r.batas_ambil <> current_date + 3 then raise exception 'GAGAL: pesanan siap setelah dikembalikan (%)', r.status; end if;
  begin perform public.pinjam_buku('RSV001', '199001012020121999'); raise exception 'GAGAL: eksemplar ditahan dipinjam orang lain'; exception when invalid_parameter_value then null; end;
  if (select count(*) from public.daftar_reservasi()) <> 1 then raise exception 'GAGAL: daftar reservasi petugas'; end if;
  if (select tersedia from public.katalog_publik('Atlas Uji Reservasi')) <> 0 then raise exception 'GAGAL: katalog menghitung eksemplar ditahan'; end if;
  perform public.pinjam_buku('RSV001', '9910000001');
  if (select status from public.reservasi_buku where buku_id = '00000000-0000-0000-0000-00000000c101') <> 'diambil' then raise exception 'GAGAL: pesanan diambil'; end if;
  raise notice 'LULUS: eksemplar ditahan untuk pemesan, lalu diambil';
end $$;
reset role;
do $$ begin
  if not exists (select 1 from public.notifikasi where user_id = pg_temp.uid('siswa') and judul = 'Buku pesanan siap diambil') then raise exception 'GAGAL: notifikasi pesanan siap'; end if;
  -- kedaluwarsa: pesanan siap yang lewat batas diteruskan ke antrean berikutnya
  insert into public.eksemplar (buku_id, kode) values ('00000000-0000-0000-0000-00000000c101', 'RSV002');
  insert into public.reservasi_buku (buku_id, pegawai_id, status, eksemplar_id, batas_ambil, siap_pada)
    values ('00000000-0000-0000-0000-00000000c101', '00000000-0000-0000-0000-00000000b0b1', 'siap', (select id from public.eksemplar where kode = 'RSV002'), current_date - 1, now());
  insert into public.reservasi_buku (buku_id, siswa_id) values ('00000000-0000-0000-0000-00000000c101', '00000000-0000-0000-0000-00000000b0d2');
  perform public.rapikan_reservasi();
  if (select status from public.reservasi_buku where pegawai_id = '00000000-0000-0000-0000-00000000b0b1' and buku_id = '00000000-0000-0000-0000-00000000c101') <> 'kedaluwarsa'
     or (select status from public.reservasi_buku where siswa_id = '00000000-0000-0000-0000-00000000b0d2') <> 'siap' then
    raise exception 'GAGAL: kedaluwarsa & diteruskan';
  end if;
  raise notice 'LULUS: pesanan kedaluwarsa diteruskan ke antrean berikutnya';
end $$;

-- ---------- JURNAL BACA, TANTANGAN, ULASAN ----------
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ declare j uuid; begin
  insert into public.jurnal_baca (siswa_id, judul, halaman, menit, ringkasan)
    values ('00000000-0000-0000-0000-00000000b0d1', 'Laskar Pelangi', 120, 90, 'Kisah sepuluh anak Belitung yang bersekolah dengan penuh semangat.') returning id into j;
  begin insert into public.jurnal_baca (siswa_id, judul, halaman, ringkasan) values ('00000000-0000-0000-0000-00000000b0d2', 'Palsu', 10, 'Mencoba menulis jurnal atas nama teman sekelas.');
    raise exception 'GAGAL: jurnal atas nama orang lain'; exception when insufficient_privilege then null; end;
  update public.jurnal_baca set status = 'disetujui' where id = j;
  if (select status from public.jurnal_baca where id = j) <> 'diajukan' then raise exception 'GAGAL: siswa menyetujui jurnal sendiri'; end if;
  perform public.ulas_buku('00000000-0000-0000-0000-00000000c101', 5, 'Atlasnya lengkap dan petanya jelas sekali.');
  begin update public.ulasan_buku set status = 'tampil'; exception when insufficient_privilege then null; end;
  if exists (select 1 from public.ulasan_buku where status = 'tampil') then raise exception 'GAGAL: siswa menampilkan ulasan sendiri'; end if;
  raise notice 'LULUS: siswa menulis jurnal & ulasan (tanpa bisa menyetujui sendiri)';
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  if (select count(*) from public.jurnal_baca) <> 0 then raise exception 'GAGAL: guru biasa melihat jurnal siswa'; end if;
  if (select count(*) from public.daftar_jurnal('semua')) <> 0 then raise exception 'GAGAL: guru biasa daftar jurnal'; end if;
  begin perform public.progres_literasi(gen_random_uuid()); raise exception 'GAGAL: guru biasa progres literasi'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: guru biasa tidak melihat jurnal baca';
end $$;
reset role;
select pg_temp.sebagai('operator'); set local role authenticated;
do $$ declare t uuid; begin
  update public.jurnal_baca set status = 'disetujui', catatan_pembina = 'Bagus', ringkasan = 'diubah pembina' where siswa_id = '00000000-0000-0000-0000-00000000b0d1';
  if (select ringkasan from public.jurnal_baca where siswa_id = '00000000-0000-0000-0000-00000000b0d1') = 'diubah pembina' then raise exception 'GAGAL: pembina mengubah isi'; end if;
  insert into public.tantangan_literasi (judul, mulai, selesai, target_buku) values ('Tantangan Uji', current_date - 7, current_date + 7, 1) returning id into t;
  if not (select tuntas from public.progres_literasi(t) where nama = 'Siswa Pustaka') then raise exception 'GAGAL: progres tantangan'; end if;
  update public.ulasan_buku set status = 'tampil';
  if (select rating from public.katalog_publik('Atlas Uji Reservasi')) <> 5 then raise exception 'GAGAL: rating di katalog'; end if;
  perform public.tetapkan_duta('9910000001');
  raise notice 'LULUS: pustakawan memeriksa jurnal, tantangan, moderasi ulasan, duta';
end $$;
reset role;
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  if (select buku from public.tantangan_saya() where judul = 'Tantangan Uji') <> 1 then raise exception 'GAGAL: tantangan_saya'; end if;
  begin update public.jurnal_baca set ringkasan = 'Ubah setelah disetujui oleh siswa sendiri ya.'; raise exception 'GAGAL: ubah jurnal disetujui';
    exception when invalid_parameter_value then null; end;
  if (select count(*) from public.daftar_duta()) <> 1 then raise exception 'GAGAL: siswa melihat status dutanya'; end if;
  raise notice 'LULUS: siswa melihat progres tantangan & jurnal terkunci';
end $$;
reset role;
select pg_temp.anon(); set local role anon;
do $$ begin
  if (select count(*) from public.ulasan_publik('00000000-0000-0000-0000-00000000c101') where penulis = 'Siswa') <> 1 then raise exception 'GAGAL: ulasan publik tanpa nama'; end if;
  begin perform count(*) from public.jurnal_baca; raise exception 'GAGAL: anon membaca jurnal'; exception when insufficient_privilege then null; end;
  begin perform public.pesan_buku('00000000-0000-0000-0000-00000000c101'); raise exception 'GAGAL: anon memesan'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: publik hanya melihat ulasan anonim';
end $$;
reset role;

-- ---------- PENGADUAN: SLA, riwayat, penilaian ----------
select pg_temp.anon(); set local role anon;
create temp table aduan_uji as select * from public.kirim_pengaduan('informasi', 'Permohonan data kelulusan', 'Mohon informasi jumlah lulusan yang diterima PTN tahun lalu.', 'Warga', '', false, 'iphash-b');
reset role;
do $$ begin
  if (select tenggat from public.pengaduan where tiket = (select tiket from aduan_uji)) <> current_date + 10 then raise exception 'GAGAL: SLA kategori informasi 10 hari'; end if;
  raise notice 'LULUS: tenggat mengikuti SLA kategori';
end $$;
grant select on aduan_uji to anon, authenticated;
select pg_temp.sebagai('humas'); set local role authenticated;
do $$ begin
  update public.pengaduan set status = 'selesai', tanggapan_publik = 'Data terlampir di laman prestasi.', rating = 1 where tiket = (select tiket from aduan_uji);
  if (select rating from public.pengaduan where tiket = (select tiket from aduan_uji)) is not null then raise exception 'GAGAL: petugas mengisi rating'; end if;
  if (select count(*) from public.riwayat_pengaduan r join public.pengaduan p on p.id = r.pengaduan_id where p.tiket = (select tiket from aduan_uji)) <> 1 then raise exception 'GAGAL: riwayat tanggapan'; end if;
  begin update public.sla_pengaduan set hari = 5 where kategori = 'saran'; end;
  if (select hari from public.sla_pengaduan where kategori = 'saran') <> 5 then raise exception 'GAGAL: humas atur SLA'; end if;
  if (select (public.statistik_humas(current_date - 30, current_date) ->> 'masuk')::int) < 1 then raise exception 'GAGAL: statistik humas'; end if;
  raise notice 'LULUS: humas menutup pengaduan, riwayat tercatat, SLA diatur, statistik';
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  begin perform public.statistik_humas(current_date - 30, current_date); raise exception 'GAGAL: guru statistik humas'; exception when insufficient_privilege then null; end;
  if (select count(*) from public.riwayat_pengaduan) <> 0 then raise exception 'GAGAL: guru melihat riwayat pengaduan'; end if;
  update public.sla_pengaduan set hari = 60;
  if exists (select 1 from public.sla_pengaduan where hari = 60) then raise exception 'GAGAL: guru ubah SLA'; end if;
  raise notice 'LULUS: guru tidak melihat statistik/riwayat & tidak mengubah SLA';
end $$;
reset role;
select pg_temp.anon(); set local role anon;
do $$ begin
  if public.nilai_pengaduan((select tiket from aduan_uji), 'SALAHKODE1', 5) then raise exception 'GAGAL: nilai dengan kode salah'; end if;
  if not public.nilai_pengaduan((select tiket from aduan_uji), (select kode from aduan_uji), 4, 'Cepat') then raise exception 'GAGAL: nilai pengaduan'; end if;
  if public.nilai_pengaduan((select tiket from aduan_uji), (select kode from aduan_uji), 1) then raise exception 'GAGAL: nilai dua kali'; end if;
  if (select rating from public.cek_pengaduan((select tiket from aduan_uji), (select kode from aduan_uji))) <> 4 then raise exception 'GAGAL: rating di cek'; end if;
  raise notice 'LULUS: pelapor menilai layanan sekali dengan tiket + kode';
end $$;
reset role;

-- ---------- SURVEI ----------
select pg_temp.sebagai('humas'); set local role authenticated;
do $$ begin
  insert into public.survei (id, judul, sasaran, pertanyaan, selesai, terbit) values
   ('00000000-0000-0000-0000-00000000d101', 'Kepuasan Layanan TU', 'publik',
    '[{"id":"q1","jenis":"skala","teks":"Seberapa puas?"},{"id":"q2","jenis":"pilihan","teks":"Layanan","pilihan":["Legalisir","Mutasi"]},{"id":"q3","jenis":"teks","teks":"Saran","wajib":false}]', current_date + 7, true),
   ('00000000-0000-0000-0000-00000000d102', 'Survei Ortu', 'ortu', '[{"id":"q1","jenis":"skala","teks":"Puas?"}]', current_date + 7, true);
end $$;
reset role;
select pg_temp.anon(); set local role anon;
do $$ begin
  perform public.isi_survei('00000000-0000-0000-0000-00000000d101', '{"q1":5,"q2":"Legalisir","q3":"Antrean lebih cepat"}', 'ip-s');
  begin perform public.isi_survei('00000000-0000-0000-0000-00000000d101', '{"q1":9,"q2":"Legalisir"}', 'ip-s'); raise exception 'GAGAL: skala di luar 1-5';
    exception when invalid_parameter_value then null; end;
  begin perform public.isi_survei('00000000-0000-0000-0000-00000000d101', '{"q1":3,"q2":"Lain"}', 'ip-s'); raise exception 'GAGAL: pilihan asing';
    exception when invalid_parameter_value then null; end;
  begin perform public.isi_survei('00000000-0000-0000-0000-00000000d102', '{"q1":3}', 'ip-s'); raise exception 'GAGAL: anon isi survei ortu';
    exception when insufficient_privilege then null; end;
  begin perform count(*) from public.jawaban_survei; raise exception 'GAGAL: anon baca jawaban'; exception when insufficient_privilege then null; end;
  if (select count(*) from public.survei_aktif() where id::text like '00000000-0000-0000-0000-00000000d1%') <> 1 then raise exception 'GAGAL: survei aktif publik'; end if;
  raise notice 'LULUS: publik mengisi survei tervalidasi';
end $$;
reset role;
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  begin perform public.isi_survei('00000000-0000-0000-0000-00000000d102', '{"q1":3}'); raise exception 'GAGAL: siswa isi survei ortu';
    exception when insufficient_privilege then null; end;
  begin perform count(*) from public.jawaban_survei; raise exception 'GAGAL: siswa baca jawaban'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: siswa tidak bisa mengisi survei untuk ortu';
end $$;
reset role;
select pg_temp.sebagai('ortu'); set local role authenticated;
do $$ begin
  perform public.isi_survei('00000000-0000-0000-0000-00000000d102', '{"q1":4}');
  begin perform public.isi_survei('00000000-0000-0000-0000-00000000d102', '{"q1":4}'); raise exception 'GAGAL: ortu isi dua kali';
    exception when invalid_parameter_value then null; end;
  if not (select sudah from public.survei_aktif() where id = '00000000-0000-0000-0000-00000000d102') then raise exception 'GAGAL: tanda sudah mengisi'; end if;
  raise notice 'LULUS: ortu mengisi survei sekali';
end $$;
reset role;
select pg_temp.sebagai('humas'); set local role authenticated;
do $$ declare h jsonb; begin
  h := public.hasil_survei('00000000-0000-0000-0000-00000000d101');
  if (h ->> 'responden')::int <> 1 or (h -> 'pertanyaan' -> 0 ->> 'rata')::numeric <> 5 or (h -> 'pertanyaan' -> 1 -> 'sebaran' ->> 'Legalisir')::int <> 1 then
    raise exception 'GAGAL: hasil survei %', h;
  end if;
  begin update public.survei set pertanyaan = '[]' where id = '00000000-0000-0000-0000-00000000d101'; raise exception 'GAGAL: pertanyaan diubah setelah ada jawaban';
    exception when invalid_parameter_value then null; end;
  insert into public.kontak_media (nama, media) values ('Redaksi', 'Pikiran Rakyat');
  insert into public.kemitraan (id, mitra) values ('00000000-0000-0000-0000-00000000d201', 'Universitas Uji');
  insert into public.kegiatan_mitra (kemitraan_id, tanggal, kegiatan, nilai) values ('00000000-0000-0000-0000-00000000d201', current_date, 'Kuliah tamu', 5);
  raise notice 'LULUS: humas melihat hasil agregat, mengelola kontak media & kegiatan mitra';
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  if (select count(*) from public.kontak_media) <> 0 then raise exception 'GAGAL: guru melihat kontak media'; end if;
  begin perform public.hasil_survei('00000000-0000-0000-0000-00000000d101'); raise exception 'GAGAL: guru hasil survei'; exception when insufficient_privilege then null; end;
  begin insert into public.kegiatan_mitra (kemitraan_id, tanggal, kegiatan) values ('00000000-0000-0000-0000-00000000d201', current_date, 'Palsu');
    raise exception 'GAGAL: guru catat kegiatan mitra'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: guru tidak melihat kontak media / hasil survei';
end $$;
reset role;

rollback;
