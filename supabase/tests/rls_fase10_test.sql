-- Uji hak akses Fase 10 (LMS & sarpras). Jalankan di database UJI.
\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.uid(e text) returns uuid language sql as $$ select id from auth.users where email = e || '@sman22.test' $$;
create or replace function pg_temp.sebagai(e text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid(e), 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(pg_temp.uid(e)::text, ''), true);
end $$;

insert into public.pengguna (user_id, nama, email)
select pg_temp.uid(e), e, e || '@sman22.test' from unnest(array['guru','walikelas','siswa','ortu','kesiswaan','operator']) e
on conflict (user_id) do update set aktif = true;
insert into public.pengguna_peran (user_id, peran) values
  (pg_temp.uid('guru'), 'guru'), (pg_temp.uid('walikelas'), 'guru'), (pg_temp.uid('siswa'), 'siswa'), (pg_temp.uid('ortu'), 'orang_tua'),
  (pg_temp.uid('kesiswaan'), 'sarpras'), (pg_temp.uid('operator'), 'operator')
on conflict do nothing;
update public.tahun_ajaran set aktif = false where aktif;
insert into public.tahun_ajaran (id, nama, aktif) values ('00000000-0000-0000-0000-00000000a0a1', '2090/2091', true);
update public.pegawai set user_id = null where user_id in (pg_temp.uid('guru'), pg_temp.uid('walikelas'));
insert into public.pegawai (id, nama, user_id) values
  ('00000000-0000-0000-0000-00000000a0b1', 'Guru LMS A', pg_temp.uid('guru')), ('00000000-0000-0000-0000-00000000a0b2', 'Guru LMS B', pg_temp.uid('walikelas'));
insert into public.kelas (id, tahun_ajaran_id, tingkat, nama) values
  ('00000000-0000-0000-0000-00000000a0c1', '00000000-0000-0000-0000-00000000a0a1', 'X', 'L-1'),
  ('00000000-0000-0000-0000-00000000a0c2', '00000000-0000-0000-0000-00000000a0a1', 'X', 'L-2');
update public.siswa set user_id = null where user_id = pg_temp.uid('siswa');
insert into public.siswa (id, nisn, nama, user_id) values
  ('00000000-0000-0000-0000-00000000a0d1', '9900000001', 'Siswa LMS', pg_temp.uid('siswa')),
  ('00000000-0000-0000-0000-00000000a0d2', '9900000002', 'Siswa Lain', null);
insert into public.anggota_kelas (siswa_id, kelas_id, tahun_ajaran_id) values
  ('00000000-0000-0000-0000-00000000a0d1', '00000000-0000-0000-0000-00000000a0c1', '00000000-0000-0000-0000-00000000a0a1'),
  ('00000000-0000-0000-0000-00000000a0d2', '00000000-0000-0000-0000-00000000a0c2', '00000000-0000-0000-0000-00000000a0a1');
insert into public.orang_tua (id, nama, user_id) values ('00000000-0000-0000-0000-00000000a0e1', 'Ortu LMS', pg_temp.uid('ortu'))
on conflict (user_id) do nothing;
delete from public.siswa_orang_tua where orang_tua_id = (select id from public.orang_tua where user_id = pg_temp.uid('ortu'));
insert into public.siswa_orang_tua values ('00000000-0000-0000-0000-00000000a0d1', (select id from public.orang_tua where user_id = pg_temp.uid('ortu')), 'ibu');
insert into public.mapel (id, nama) values ('00000000-0000-0000-0000-00000000a0f1', 'Geo LMS');
insert into public.penugasan_mengajar (tahun_ajaran_id, kelas_id, mapel_id, pegawai_id, jp_per_minggu) values
  ('00000000-0000-0000-0000-00000000a0a1', '00000000-0000-0000-0000-00000000a0c1', '00000000-0000-0000-0000-00000000a0f1', '00000000-0000-0000-0000-00000000a0b1', 2);
insert into public.ruang (id, nama, jenis, bisa_dipinjam) values ('00000000-0000-0000-0000-00000000a0aa', 'Lab LMS', 'laboratorium', true);
delete from public.notifikasi; delete from public.antrian_kirim;

-- ---------- TUGAS ----------
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  insert into public.tugas (id, pegawai_id, mapel_id, judul, instruksi, tenggat, terbit)
  values ('00000000-0000-0000-0000-00000000a111', '00000000-0000-0000-0000-00000000a0b1', '00000000-0000-0000-0000-00000000a0f1', 'Peta Gempa', 'Buat peta', now() + interval '20 hours', true);
  insert into public.tugas_kelas values ('00000000-0000-0000-0000-00000000a111', '00000000-0000-0000-0000-00000000a0c1');
  begin
    insert into public.tugas_kelas values ('00000000-0000-0000-0000-00000000a111', '00000000-0000-0000-0000-00000000a0c2');
    raise exception 'GAGAL: tugas untuk kelas yang tidak diajar';
  exception when invalid_parameter_value then null; end;
  if public.umumkan_lms('tugas', '00000000-0000-0000-0000-00000000a111') <> 1 then raise exception 'GAGAL: umumkan tugas'; end if;
  raise notice 'LULUS: guru membuat & mengumumkan tugas';
end $$;
reset role;
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  if not exists (select 1 from public.tugas) then raise exception 'GAGAL: siswa tidak melihat tugas kelasnya'; end if;
  begin
    insert into public.pengumpulan_tugas (tugas_id, siswa_id, jawaban) values ('00000000-0000-0000-0000-00000000a111', '00000000-0000-0000-0000-00000000a0d1', 'x');
    raise exception 'GAGAL: insert pengumpulan langsung';
  exception when insufficient_privilege then null; end;
  begin perform public.kumpul_tugas('00000000-0000-0000-0000-00000000a111', '', '', '', ''); raise exception 'GAGAL: kumpul kosong';
  exception when invalid_parameter_value then null; end;
  begin perform public.kumpul_tugas('00000000-0000-0000-0000-00000000a111', 'ok', '', 'orang-lain/tugas/x.pdf', 'x.pdf'); raise exception 'GAGAL: berkas milik orang lain';
  exception when insufficient_privilege then null; end;
  perform public.kumpul_tugas('00000000-0000-0000-0000-00000000a111', 'Peta saya terlampir', 'https://contoh.id/peta', '', '');
  if (select status from public.pengumpulan_tugas) <> 'dikumpulkan' then raise exception 'GAGAL: status kumpul'; end if;
  raise notice 'LULUS: siswa mengumpulkan tugas lewat fungsi';
end $$;
reset role;
select pg_temp.sebagai('walikelas'); set local role authenticated;
do $$ begin
  if exists (select 1 from public.pengumpulan_tugas) or exists (select 1 from public.tugas) then raise exception 'GAGAL: guru lain melihat tugas'; end if;
  begin perform public.nilai_tugas((select id from public.pengumpulan_tugas limit 1), 90); exception when others then null; end;
  raise notice 'LULUS: guru lain tidak melihat/menilai';
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ declare pid uuid := (select id from public.pengumpulan_tugas); begin
  if (select count(*) from public.rekap_tugas('00000000-0000-0000-0000-00000000a111')) <> 1 then raise exception 'GAGAL: rekap tugas'; end if;
  begin perform public.nilai_tugas(pid, 150); raise exception 'GAGAL: nilai > maks';
  exception when invalid_parameter_value then null; end;
  perform public.nilai_tugas(pid, 88, 'Bagus, legenda kurang lengkap');
  raise notice 'LULUS: guru pemilik menilai';
end $$;
reset role;
select pg_temp.sebagai('ortu'); set local role authenticated;
do $$ begin
  if (select nilai from public.pengumpulan_tugas) <> 88 then raise exception 'GAGAL: ortu tidak melihat nilai anak'; end if;
  begin perform public.kumpul_tugas('00000000-0000-0000-0000-00000000a111', 'ortu mengerjakan'); raise exception 'GAGAL: ortu mengumpulkan';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: orang tua melihat nilai (tanpa bisa mengumpulkan)';
end $$;
reset role;
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  begin perform public.kumpul_tugas('00000000-0000-0000-0000-00000000a111', 'revisi setelah dinilai'); raise exception 'GAGAL: kumpul ulang setelah dinilai';
  exception when invalid_parameter_value then null; end;
  if not exists (select 1 from public.notifikasi where judul like 'Nilai tugas%') then raise exception 'GAGAL: notifikasi nilai'; end if;
  raise notice 'LULUS: tugas dinilai terkunci + notifikasi nilai';
end $$;
reset role;
-- pengingat tenggat (dipanggil penjadwal)
select pg_temp.sebagai('guru'); set local role authenticated;
insert into public.tugas (id, pegawai_id, mapel_id, judul, tenggat, terbit) values
  ('00000000-0000-0000-0000-00000000a112', '00000000-0000-0000-0000-00000000a0b1', '00000000-0000-0000-0000-00000000a0f1', 'Tugas Besok', now() + interval '10 hours', true);
insert into public.tugas_kelas values ('00000000-0000-0000-0000-00000000a112', '00000000-0000-0000-0000-00000000a0c1');
reset role;
do $$ begin
  if public.pengingat_tugas() < 1 then raise exception 'GAGAL: pengingat tugas'; end if;
  if public.pengingat_tugas() <> 0 then raise exception 'GAGAL: pengingat dikirim ganda'; end if;
  raise notice 'LULUS: pengingat tenggat sekali per tugas';
end $$;

-- ---------- KUIS ----------
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  insert into public.kuis (id, pegawai_id, mapel_id, judul, mulai, selesai, durasi_menit, tampil_hasil, terbit)
  values ('00000000-0000-0000-0000-00000000a121', '00000000-0000-0000-0000-00000000a0b1', '00000000-0000-0000-0000-00000000a0f1', 'Kuis Litosfer', now() - interval '1 hour', now() + interval '1 hour', 20, 'langsung', true);
  insert into public.kuis_kelas values ('00000000-0000-0000-0000-00000000a121', '00000000-0000-0000-0000-00000000a0c1');
  insert into public.kuis_soal (id, kuis_id, urutan, pertanyaan, pilihan, kunci) values
    ('00000000-0000-0000-0000-00000000a131', '00000000-0000-0000-0000-00000000a121', 1, 'Sesar di utara Bandung?', array['Cimandiri','Lembang','Opak'], 1),
    ('00000000-0000-0000-0000-00000000a132', '00000000-0000-0000-0000-00000000a121', 2, 'Lapisan terluar bumi?', array['Kerak','Mantel','Inti'], 0);
  raise notice 'LULUS: guru menyusun kuis';
end $$;
reset role;
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ declare r record; begin
  begin perform 1 from public.kuis_soal; if found then raise exception 'GAGAL: siswa membaca tabel soal (kunci)'; end if;
  exception when insufficient_privilege then null; end;
  if exists (select 1 from public.soal_kuis_saya('00000000-0000-0000-0000-00000000a121')) then raise exception 'GAGAL: soal tampil sebelum mulai'; end if;
  select * into r from public.mulai_kuis('00000000-0000-0000-0000-00000000a121');
  if (select count(*) from public.soal_kuis_saya('00000000-0000-0000-0000-00000000a121')) <> 2 then raise exception 'GAGAL: soal untuk siswa'; end if;
  perform public.jawab_kuis('00000000-0000-0000-0000-00000000a121', '{"00000000-0000-0000-0000-00000000a131":1,"00000000-0000-0000-0000-00000000a132":2,"bukan-soal":3}');
  if (select jawaban from public.soal_kuis_saya('00000000-0000-0000-0000-00000000a121') where id = '00000000-0000-0000-0000-00000000a131') <> 1 then raise exception 'GAGAL: simpan jawaban'; end if;
  if public.jawab_kuis('00000000-0000-0000-0000-00000000a121', '{"00000000-0000-0000-0000-00000000a131":1,"00000000-0000-0000-0000-00000000a132":2}', true) <> 50 then raise exception 'GAGAL: skor kuis'; end if;
  if exists (select 1 from public.soal_kuis_saya('00000000-0000-0000-0000-00000000a121')) then raise exception 'GAGAL: soal masih tampil setelah selesai'; end if;
  begin perform public.jawab_kuis('00000000-0000-0000-0000-00000000a121', '{}', true); raise exception 'GAGAL: kerjakan ulang';
  exception when invalid_parameter_value then null; end;
  if (select count(*) from public.hasil_kuis('00000000-0000-0000-0000-00000000a121')) <> 2 then raise exception 'GAGAL: pembahasan (tampil langsung)'; end if;
  raise notice 'LULUS: siswa mengerjakan kuis, dinilai di server, kunci tersembunyi';
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  if (select skor from public.rekap_kuis('00000000-0000-0000-0000-00000000a121') where nama = 'Siswa LMS') <> 50 then raise exception 'GAGAL: rekap kuis'; end if;
  begin update public.kuis_soal set kunci = 2 where id = '00000000-0000-0000-0000-00000000a131'; raise exception 'GAGAL: soal diubah setelah dikerjakan';
  exception when invalid_parameter_value then null; end;
  raise notice 'LULUS: rekap kuis & soal terkunci setelah dikerjakan';
end $$;
reset role;
select pg_temp.sebagai('ortu'); set local role authenticated;
do $$ begin
  if (select max(skor) from public.hasil_kuis('00000000-0000-0000-0000-00000000a121', '00000000-0000-0000-0000-00000000a0d1')) <> 50 then raise exception 'GAGAL: ortu melihat hasil kuis'; end if;
  if exists (select 1 from public.hasil_kuis('00000000-0000-0000-0000-00000000a121', '00000000-0000-0000-0000-00000000a0d2')) then raise exception 'GAGAL: ortu melihat hasil anak lain'; end if;
  raise notice 'LULUS: orang tua hanya melihat hasil anaknya';
end $$;
reset role;

-- ---------- SARPRAS ----------
select pg_temp.sebagai('kesiswaan'); set local role authenticated;
do $$ declare b uuid; begin
  insert into public.barang (nama, kategori_id, jumlah, bisa_dipinjam, tahun_perolehan, harga)
  values ('Proyektor Uji', (select id from public.kategori_barang where kode = 'ELK'), 2, true, 2025, 5000000) returning id into b;
  if (select kode from public.barang where id = b) !~ '^SMAN22/ELK/2025/\d{4}$' then raise exception 'GAGAL: kode inventaris otomatis'; end if;
  begin update public.barang set deleted_at = now() where id = b; raise exception 'GAGAL: hapus aset tanpa alasan';
  exception when invalid_parameter_value then null; end;
  if (select sum(unit) from public.rekap_sarpras()) < 2 then raise exception 'GAGAL: rekap sarpras'; end if;
  raise notice 'LULUS: sarpras mencatat inventaris (kode otomatis)';
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ declare p1 uuid; b uuid := (select id from public.barang where nama = 'Proyektor Uji'); m timestamptz := date_trunc('day', now()) + interval '2 days 3 hours'; begin
  begin insert into public.barang (nama, kategori_id) values ('Iseng', (select id from public.kategori_barang limit 1)); raise exception 'GAGAL: guru menambah barang';
  exception when insufficient_privilege then null; end;
  p1 := public.ajukan_pinjam(null, b, 2, m, m + interval '2 hours', 'Presentasi P5');
  perform public.ajukan_pinjam('00000000-0000-0000-0000-00000000a0aa', null, 1, m, m + interval '2 hours', 'Praktikum tanah');
  begin perform public.proses_pinjam(p1, 'setuju'); raise exception 'GAGAL: guru menyetujui sendiri';
  exception when insufficient_privilege then null; end;
  insert into public.laporan_kerusakan (judul, ruang_id, prioritas) values ('AC lab bocor', '00000000-0000-0000-0000-00000000a0aa', 'tinggi');
  update public.laporan_kerusakan set status = 'selesai';
  if exists (select 1 from public.laporan_kerusakan where status = 'selesai') then raise exception 'GAGAL: pelapor menyelesaikan sendiri'; end if;
  raise notice 'LULUS: guru meminjam & melapor kerusakan';
end $$;
reset role;
select pg_temp.sebagai('kesiswaan'); set local role authenticated;
do $$ declare b uuid := (select id from public.barang where nama = 'Proyektor Uji'); m timestamptz := date_trunc('day', now()) + interval '2 days 3 hours'; begin
  if not exists (select 1 from public.notifikasi where judul = 'Pengajuan peminjaman') then raise exception 'GAGAL: sarpras tidak diberi tahu'; end if;
  if not exists (select 1 from public.notifikasi where judul like 'Laporan kerusakan (mendesak)%') then raise exception 'GAGAL: notif kerusakan mendesak'; end if;
  perform public.proses_pinjam(id, 'setuju') from public.peminjaman where barang_id = b;
  if public.bentrok_pinjam(null, b, 1, m + interval '1 hour', m + interval '3 hours') is null then raise exception 'GAGAL: stok barang tidak dicek'; end if;
  perform public.proses_pinjam(id, 'setuju') from public.peminjaman where ruang_id = '00000000-0000-0000-0000-00000000a0aa';
  if public.bentrok_pinjam('00000000-0000-0000-0000-00000000a0aa', null, 1, m + interval '1 hour', m + interval '3 hours') is null then raise exception 'GAGAL: ruang bentrok tidak terdeteksi'; end if;
  update public.laporan_kerusakan set status = 'selesai', penanganan = 'Pipa AC diganti', biaya = 150000;
  raise notice 'LULUS: sarpras menyetujui (cek bentrok) & menangani kerusakan';
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  if not exists (select 1 from public.notifikasi where judul = 'Peminjaman disetujui') then raise exception 'GAGAL: peminjam tidak diberi tahu'; end if;
  if not exists (select 1 from public.notifikasi where judul = 'Laporan kerusakan selesai') then raise exception 'GAGAL: pelapor tidak diberi tahu'; end if;
  raise notice 'LULUS: notifikasi peminjaman & kerusakan';
end $$;
reset role;
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  if exists (select 1 from public.barang) then raise exception 'GAGAL: siswa melihat inventaris'; end if;
  begin perform public.ajukan_pinjam('00000000-0000-0000-0000-00000000a0aa', null, 1, now() + interval '1 day', now() + interval '1 day 1 hour', 'Siswa pinjam');
    raise exception 'GAGAL: siswa meminjam'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: siswa tidak mengakses sarpras';
end $$;
reset role;
select pg_temp.sebagai('operator'); set local role authenticated;
do $$ begin
  if not exists (select 1 from public.barang) then raise exception 'GAGAL: operator (lihat) tidak melihat inventaris'; end if;
  update public.barang set nama = 'diubah operator';
  if exists (select 1 from public.barang where nama = 'diubah operator') then raise exception 'GAGAL: operator mengubah barang'; end if;
  raise notice 'LULUS: operator hanya melihat inventaris';
end $$;
reset role;

rollback;
