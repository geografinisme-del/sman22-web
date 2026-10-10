-- Uji hak akses Fase 9 (kurikulum). Jalankan di database UJI.
\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.uid(e text) returns uuid language sql as $$ select id from auth.users where email = e || '@sman22.test' $$;
create or replace function pg_temp.sebagai(e text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid(e), 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(pg_temp.uid(e)::text, ''), true);
end $$;

insert into public.pengguna (user_id, nama, email)
select pg_temp.uid(e), e, e || '@sman22.test' from unnest(array['humas','guru','walikelas','kepsek','siswa']) e
on conflict (user_id) do update set aktif = true;
insert into public.pengguna_peran (user_id, peran) values
  (pg_temp.uid('humas'), 'kurikulum'), (pg_temp.uid('guru'), 'guru'), (pg_temp.uid('walikelas'), 'guru'),
  (pg_temp.uid('kepsek'), 'kepala_sekolah'), (pg_temp.uid('siswa'), 'siswa')
on conflict do nothing;
update public.tahun_ajaran set aktif = false where aktif;
insert into public.tahun_ajaran (id, nama, aktif) values ('00000000-0000-0000-0000-0000000009a1', '2092/2093', true);
update public.pegawai set user_id = null where user_id in (pg_temp.uid('guru'), pg_temp.uid('walikelas'), pg_temp.uid('kepsek'));
insert into public.pegawai (id, nama, user_id) values
  ('00000000-0000-0000-0000-0000000009b1', 'Guru Kur A', pg_temp.uid('guru')),
  ('00000000-0000-0000-0000-0000000009b2', 'Guru Kur B', pg_temp.uid('walikelas')),
  ('00000000-0000-0000-0000-0000000009b3', 'Kepsek Kur', pg_temp.uid('kepsek'));
insert into public.kelas (id, tahun_ajaran_id, tingkat, nama) values
  ('00000000-0000-0000-0000-0000000009c1', '00000000-0000-0000-0000-0000000009a1', 'X', 'Kur-1'),
  ('00000000-0000-0000-0000-0000000009c2', '00000000-0000-0000-0000-0000000009a1', 'X', 'Kur-2');
update public.siswa set user_id = null where user_id = pg_temp.uid('siswa');
insert into public.siswa (id, nisn, nama, user_id) values ('00000000-0000-0000-0000-0000000009d1', '9990000001', 'Siswa Kur', pg_temp.uid('siswa'));
insert into public.anggota_kelas (siswa_id, kelas_id, tahun_ajaran_id) values
  ('00000000-0000-0000-0000-0000000009d1', '00000000-0000-0000-0000-0000000009c1', '00000000-0000-0000-0000-0000000009a1');
insert into public.mapel (id, nama) values ('00000000-0000-0000-0000-0000000009e1', 'Geo Kur'), ('00000000-0000-0000-0000-0000000009e2', 'Mat Kur');
insert into public.penugasan_mengajar (id, tahun_ajaran_id, kelas_id, mapel_id, pegawai_id, jp_per_minggu) values
  ('00000000-0000-0000-0000-0000000009f1', '00000000-0000-0000-0000-0000000009a1', '00000000-0000-0000-0000-0000000009c1', '00000000-0000-0000-0000-0000000009e1', '00000000-0000-0000-0000-0000000009b1', 3);
delete from public.notifikasi; delete from public.antrian_kirim;

-- ---------- STRUKTUR ----------
select pg_temp.sebagai('humas'); set local role authenticated;
do $$ begin
  insert into public.struktur_kurikulum (tahun_ajaran_id, tingkat, mapel_id, kelompok, jp_minggu) values
    ('00000000-0000-0000-0000-0000000009a1', 'X', '00000000-0000-0000-0000-0000000009e1', 'umum', 2),
    ('00000000-0000-0000-0000-0000000009a1', 'X', '00000000-0000-0000-0000-0000000009e2', 'umum', 4);
  if (select count(*) from public.cek_struktur_kelas() where kelas = 'Kur-1') <> 2 then raise exception 'GAGAL: cek struktur Kur-1 (JP beda + mapel belum ditugaskan)'; end if;
  if not exists (select 1 from public.cek_struktur_kelas() where kelas = 'Kur-1' and mapel = 'Geo Kur' and masalah like 'JP berbeda%') then raise exception 'GAGAL: JP berbeda tidak terdeteksi'; end if;
  raise notice 'LULUS: kurikulum menyusun struktur + cek kesesuaian';
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  begin
    insert into public.struktur_kurikulum (tahun_ajaran_id, tingkat, mapel_id, jp_minggu) values ('00000000-0000-0000-0000-0000000009a1', 'XI', '00000000-0000-0000-0000-0000000009e1', 2);
    raise exception 'GAGAL: guru mengubah struktur';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.cek_struktur_kelas()) <> 0 then raise exception 'GAGAL: guru melihat cek struktur'; end if;
  raise notice 'LULUS: guru tidak mengubah struktur';
end $$;
reset role;

-- ---------- TP / ATP ----------
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  insert into public.tujuan_pembelajaran (mapel_id, fase, tingkat, semester, kode, deskripsi, kktp, alokasi_jp)
  values ('00000000-0000-0000-0000-0000000009e1', 'F', 'X', 1, 'TP 1', 'Peserta didik menganalisis dinamika litosfer', 'Mampu menjelaskan 3 tenaga endogen', 6);
  if (select fase from public.tujuan_pembelajaran where kode = 'TP 1' and mapel_id = '00000000-0000-0000-0000-0000000009e1') <> 'E' then raise exception 'GAGAL: fase tidak mengikuti tingkat'; end if;
  begin
    insert into public.tujuan_pembelajaran (mapel_id, fase, tingkat, semester, deskripsi) values ('00000000-0000-0000-0000-0000000009e2', 'E', 'X', 1, 'Bukan mapel saya sama sekali');
    raise exception 'GAGAL: guru menulis TP mapel yang tidak diampu';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: guru pengampu menyusun TP/KKTP';
end $$;
reset role;
select pg_temp.sebagai('humas'); set local role authenticated;
insert into public.atp_status (mapel_id, fase, status) values ('00000000-0000-0000-0000-0000000009e1', 'E', 'final');
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ declare n int; begin
  update public.tujuan_pembelajaran set deskripsi = 'Diubah setelah final oleh guru' where mapel_id = '00000000-0000-0000-0000-0000000009e1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'GAGAL: guru mengubah ATP final'; end if;
  raise notice 'LULUS: ATP final terkunci untuk guru';
end $$;
reset role;
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  if exists (select 1 from public.tujuan_pembelajaran) then raise exception 'GAGAL: siswa membaca TP'; end if;
  if not exists (select 1 from public.struktur_kurikulum where tahun_ajaran_id = '00000000-0000-0000-0000-0000000009a1') then raise exception 'GAGAL: siswa tidak melihat struktur'; end if;
  raise notice 'LULUS: siswa melihat struktur, tidak TP';
end $$;
reset role;

-- ---------- PERANGKAT AJAR ----------
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ declare pid uuid; begin
  insert into public.perangkat_ajar (tahun_ajaran_id, semester, pegawai_id, mapel_id, tingkat, jenis, judul, tautan, status)
  values ('00000000-0000-0000-0000-0000000009a1', 1, '00000000-0000-0000-0000-0000000009b1', '00000000-0000-0000-0000-0000000009e1', 'X', 'prota', 'Prota Geo X', 'https://contoh.id/prota', 'disetujui')
  returning id into pid;
  if (select status from public.perangkat_ajar where id = pid) <> 'draf' then raise exception 'GAGAL: guru langsung menyetujui sendiri'; end if;
  begin
    insert into public.perangkat_ajar (tahun_ajaran_id, semester, pegawai_id, mapel_id, tingkat, jenis, judul, tautan)
    values ('00000000-0000-0000-0000-0000000009a1', 1, '00000000-0000-0000-0000-0000000009b2', '00000000-0000-0000-0000-0000000009e1', 'X', 'prota', 'Atas nama orang', 'https://contoh.id/x');
    raise exception 'GAGAL: unggah atas nama guru lain';
  exception when insufficient_privilege then null; end;
  update public.perangkat_ajar set status = 'diajukan' where id = pid;
  begin
    update public.perangkat_ajar set status = 'disetujui' where id = pid;
    raise exception 'GAGAL: guru menyetujui perangkat sendiri';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: guru mengunggah & mengajukan perangkat';
end $$;
reset role;
select pg_temp.sebagai('walikelas'); set local role authenticated;
do $$ begin
  if exists (select 1 from public.perangkat_ajar) then raise exception 'GAGAL: guru lain melihat perangkat'; end if;
  raise notice 'LULUS: perangkat tidak terlihat guru lain';
end $$;
reset role;
select pg_temp.sebagai('humas'); set local role authenticated;
do $$ declare pid uuid := (select id from public.perangkat_ajar where judul = 'Prota Geo X'); begin
  if not exists (select 1 from public.notifikasi where judul = 'Perangkat ajar menunggu diperiksa') then raise exception 'GAGAL: kurikulum tidak diberi tahu'; end if;
  begin perform public.review_perangkat(pid, false, ''); raise exception 'GAGAL: revisi tanpa catatan';
  exception when invalid_parameter_value then null; end;
  perform public.review_perangkat(pid, false, 'Lengkapi alokasi waktu');
  raise notice 'LULUS: kurikulum meminta revisi';
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ declare pid uuid := (select id from public.perangkat_ajar where judul = 'Prota Geo X'); begin
  if not exists (select 1 from public.notifikasi where judul = 'Perangkat ajar perlu revisi') then raise exception 'GAGAL: guru tidak diberi tahu revisi'; end if;
  update public.perangkat_ajar set tautan = 'https://contoh.id/prota-v2', status = 'diajukan' where id = pid;
end $$;
reset role;
select pg_temp.sebagai('humas'); set local role authenticated;
select public.review_perangkat((select id from public.perangkat_ajar where judul = 'Prota Geo X'), true, 'OK');
do $$ begin
  if (select prota from public.rekap_perangkat(1::smallint) where guru = 'Guru Kur A') <> 'disetujui' then raise exception 'GAGAL: rekap perangkat'; end if;
  raise notice 'LULUS: disetujui & rekap kelengkapan';
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  begin
    update public.perangkat_ajar set judul = 'Ubah setelah disetujui' where judul = 'Prota Geo X';
    raise exception 'GAGAL: perangkat disetujui diubah';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: perangkat disetujui terkunci';
end $$;
reset role;

-- ---------- SUPERVISI ----------
select pg_temp.sebagai('kepsek'); set local role authenticated;
insert into public.supervisi_akademik (id, tahun_ajaran_id, semester, pegawai_id, supervisor_id, tanggal)
values ('00000000-0000-0000-0000-0000000009aa', '00000000-0000-0000-0000-0000000009a1', 1, '00000000-0000-0000-0000-0000000009b1', '00000000-0000-0000-0000-0000000009b2', public.hari_ini() + 3);
reset role;
select pg_temp.sebagai('walikelas'); set local role authenticated;
do $$ begin
  begin
    update public.supervisi_akademik set status = 'selesai' where id = '00000000-0000-0000-0000-0000000009aa';
    raise exception 'GAGAL: selesai tanpa skor';
  exception when invalid_parameter_value then null; end;
  update public.supervisi_akademik set skor = '{"p1":"4","p2":"3","p3":"3","p4":"2"}', kekuatan = 'Pembukaan menarik', status = 'selesai' where id = '00000000-0000-0000-0000-0000000009aa';
  if (select nilai from public.supervisi_akademik where id = '00000000-0000-0000-0000-0000000009aa') <> 75 then raise exception 'GAGAL: nilai supervisi'; end if;
  begin
    update public.supervisi_akademik set kekuatan = 'diubah' where id = '00000000-0000-0000-0000-0000000009aa';
    raise exception 'GAGAL: supervisor mengubah hasil final';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: supervisor mengisi instrumen';
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ declare n int; begin
  if not exists (select 1 from public.notifikasi where judul = 'Hasil supervisi akademik tersedia') then raise exception 'GAGAL: guru tidak diberi tahu hasil'; end if;
  update public.supervisi_akademik set nilai = 100 where id = '00000000-0000-0000-0000-0000000009aa';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'GAGAL: guru mengubah nilainya sendiri'; end if;
  perform public.tanggapi_supervisi('00000000-0000-0000-0000-0000000009aa', 'Terima kasih, akan saya perbaiki');
  if (select tanggapan_guru from public.supervisi_akademik where id = '00000000-0000-0000-0000-0000000009aa') <> 'Terima kasih, akan saya perbaiki'
     or (select nilai from public.supervisi_akademik where id = '00000000-0000-0000-0000-0000000009aa') <> 75 then raise exception 'GAGAL: tanggapan guru'; end if;
  raise notice 'LULUS: guru membaca hasil & menanggapi';
end $$;
reset role;
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  if exists (select 1 from public.supervisi_akademik) or exists (select 1 from public.perangkat_ajar) then raise exception 'GAGAL: siswa melihat supervisi/perangkat'; end if;
  raise notice 'LULUS: siswa tidak melihat supervisi & perangkat';
end $$;
reset role;

-- ---------- PROJEK KOKURIKULER ----------
select pg_temp.sebagai('humas'); set local role authenticated;
insert into public.projek_kokurikuler (id, tahun_ajaran_id, semester, judul, tema, dimensi, tingkat, koordinator_id, mulai, selesai)
values ('00000000-0000-0000-0000-0000000009ab', '00000000-0000-0000-0000-0000000009a1', 1, 'Bandung Bebas Sampah', 'Gaya Hidup Berkelanjutan',
        array['kolaborasi', 'penalaran_kritis'], 'X', '00000000-0000-0000-0000-0000000009b2', public.hari_ini(), public.hari_ini() + 30);
insert into public.projek_kelas values ('00000000-0000-0000-0000-0000000009ab', '00000000-0000-0000-0000-0000000009c1', '00000000-0000-0000-0000-0000000009b1');
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ declare n int; begin
  update public.projek_kokurikuler set status = 'berjalan' where id = '00000000-0000-0000-0000-0000000009ab';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'GAGAL: bukan koordinator mengubah projek'; end if;
end $$;
reset role;
select pg_temp.sebagai('walikelas'); set local role authenticated;
do $$ begin
  update public.projek_kokurikuler set status = 'berjalan', judul = 'Diganti koordinator' where id = '00000000-0000-0000-0000-0000000009ab';
  if (select status || '|' || judul from public.projek_kokurikuler where id = '00000000-0000-0000-0000-0000000009ab') <> 'berjalan|Bandung Bebas Sampah' then
    raise exception 'GAGAL: koordinator hanya boleh ubah status'; end if;
  raise notice 'LULUS: projek kokurikuler (koordinator ubah status saja)';
end $$;
reset role;

-- ---------- MATERI DIGITAL & AI ----------
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ declare mid uuid; begin
  insert into public.materi_kelas (pegawai_id, mapel_id, judul, slide) values ('00000000-0000-0000-0000-0000000009b1', '00000000-0000-0000-0000-0000000009e1',
    'Lempeng Tektonik', '[{"jenis":"isi","judul":"Pengantar","isi":"Bumi tersusun atas lempeng"}]') returning id into mid;
  insert into public.materi_kelas_target values (mid, '00000000-0000-0000-0000-0000000009c1');
  begin
    insert into public.materi_kelas_target values (mid, '00000000-0000-0000-0000-0000000009c2');
    raise exception 'GAGAL: materi untuk kelas yang tidak diajar';
  exception when invalid_parameter_value then null; end;
  if public.ambil_kuota_ai('slide') <> 29 then raise exception 'GAGAL: kuota AI'; end if;
  raise notice 'LULUS: guru membuat materi + kuota AI';
end $$;
reset role;
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  if exists (select 1 from public.materi_kelas) then raise exception 'GAGAL: siswa melihat materi draf'; end if;
  begin perform public.ambil_kuota_ai('soal'); raise exception 'GAGAL: siswa memakai AI';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
update public.materi_kelas set terbit = true where judul = 'Lempeng Tektonik';
select public.umumkan_materi((select id from public.materi_kelas where judul = 'Lempeng Tektonik'));
reset role;
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  if (select count(*) from public.materi_kelas) <> 1 then raise exception 'GAGAL: siswa tidak melihat materi terbit'; end if;
  if not exists (select 1 from public.notifikasi where judul = 'Materi baru: Lempeng Tektonik') then raise exception 'GAGAL: siswa tidak diberi tahu materi'; end if;
  raise notice 'LULUS: siswa kelas tujuan melihat materi terbit';
end $$;
reset role;
select pg_temp.sebagai('walikelas'); set local role authenticated;
do $$ declare n int; begin
  update public.materi_kelas set judul = 'Diubah guru lain';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'GAGAL: guru lain mengubah materi'; end if;
  raise notice 'LULUS: materi hanya diubah pemiliknya';
end $$;
reset role;

rollback;
