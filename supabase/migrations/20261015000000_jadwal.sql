-- =====================================================================
--  Fase 5 — Jadwal Pelajaran (Modul 06)
--  Mapel, ruang, jam pelajaran (1 JP = 40 menit, bisa diatur), penugasan
--  mengajar, jadwal mingguan tanpa bentrok, guru pengganti / perubahan
--  sementara, dan jadwal piket guru.
--  Jalankan SETELAH 20261012000000_portal.sql. Idempotent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Peran & izin
-- ---------------------------------------------------------------------
insert into public.peran (kode, nama, keterangan, urutan) values
  ('kurikulum', 'Wakasek Kurikulum', 'Menyusun jadwal pelajaran, penugasan mengajar, dan guru pengganti', 4)
on conflict (kode) do update set nama = excluded.nama, keterangan = excluded.keterangan;

insert into public.izin (kode, keterangan) values
  ('jadwal.kelola',    'Menyusun jadwal, mapel, ruang, jam pelajaran, penugasan mengajar, piket'),
  ('jadwal.pengganti', 'Mengatur guru pengganti & perubahan jadwal harian')
on conflict (kode) do update set keterangan = excluded.keterangan;

insert into public.peran_izin (peran, izin) values
  ('super_admin', 'jadwal.kelola'), ('super_admin', 'jadwal.pengganti'),
  ('kurikulum', 'jadwal.kelola'), ('kurikulum', 'jadwal.pengganti'), ('kurikulum', 'data_induk.baca'),
  ('operator', 'jadwal.kelola'),
  ('piket', 'jadwal.pengganti')
on conflict do nothing;

create or replace function public.nama_hari(h smallint)
returns text language sql immutable set search_path = '' as $$
  select (array['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'])[h];
$$;

-- ---------------------------------------------------------------------
-- 2. Mata pelajaran & ruang
-- ---------------------------------------------------------------------
create table if not exists public.mapel (
  id         uuid primary key default gen_random_uuid(),
  kode       text not null default '' check (char_length(kode) <= 20),
  nama       text not null check (char_length(nama) between 2 and 100),
  kelompok   text not null default 'umum' check (kelompok in ('umum', 'pilihan', 'muatan_lokal', 'lainnya')),
  urutan     smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index if not exists mapel_nama_unik on public.mapel (lower(nama)) where deleted_at is null;

create table if not exists public.ruang (
  id         uuid primary key default gen_random_uuid(),
  nama       text not null check (char_length(nama) between 1 and 60),
  jenis      text not null default 'kelas' check (jenis in ('kelas', 'laboratorium', 'lapangan', 'lainnya')),
  kapasitas  smallint check (kapasitas is null or kapasitas between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index if not exists ruang_nama_unik on public.ruang (lower(nama)) where deleted_at is null;

-- ---------------------------------------------------------------------
-- 3. Jam pelajaran per hari. Jadwal merujuk (hari, jp_ke), sehingga jam
--    mulai/selesai bisa diubah kapan saja tanpa merusak jadwal.
-- ---------------------------------------------------------------------
create table if not exists public.jam_pelajaran (
  id          uuid primary key default gen_random_uuid(),
  hari        smallint not null check (hari between 1 and 7),
  urutan      smallint not null,
  jenis       text not null check (jenis in ('pelajaran', 'istirahat', 'ibadah', 'upacara', 'kegiatan')),
  jp_ke       smallint check (jp_ke between 1 and 15),
  jam_mulai   time not null,
  jam_selesai time not null,
  label       text not null default '' check (char_length(label) <= 60),
  check (jam_selesai > jam_mulai),
  check ((jenis = 'pelajaran') = (jp_ke is not null)),
  unique (hari, urutan),
  unique (hari, jp_ke)
);

-- ---------------------------------------------------------------------
-- 4. Penugasan mengajar (guru – mapel – kelas – JP per minggu)
-- ---------------------------------------------------------------------
create table if not exists public.penugasan_mengajar (
  id              uuid primary key default gen_random_uuid(),
  tahun_ajaran_id uuid not null references public.tahun_ajaran (id),
  kelas_id        uuid not null references public.kelas (id),
  mapel_id        uuid not null references public.mapel (id),
  pegawai_id      uuid references public.pegawai (id),
  jp_per_minggu   smallint not null default 2 check (jp_per_minggu between 0 and 20),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create unique index if not exists penugasan_unik on public.penugasan_mengajar (kelas_id, mapel_id) where deleted_at is null;
create index if not exists penugasan_pegawai_idx on public.penugasan_mengajar (pegawai_id) where deleted_at is null;

create or replace function public.isi_penugasan()
returns trigger language plpgsql set search_path = '' as $$
begin
  select tahun_ajaran_id into new.tahun_ajaran_id from public.kelas where id = new.kelas_id;
  return new;
end $$;
drop trigger if exists isi_penugasan on public.penugasan_mengajar;
create trigger isi_penugasan before insert or update of kelas_id on public.penugasan_mengajar
  for each row execute function public.isi_penugasan();

-- ---------------------------------------------------------------------
-- 5. Jadwal mingguan. Bentrok dicegah oleh indeks unik (aman walau dua
--    orang menyimpan bersamaan).
-- ---------------------------------------------------------------------
create table if not exists public.jadwal (
  id              uuid primary key default gen_random_uuid(),
  penugasan_id    uuid not null references public.penugasan_mengajar (id),
  kelas_id        uuid not null references public.kelas (id),
  pegawai_id      uuid references public.pegawai (id),
  tahun_ajaran_id uuid not null references public.tahun_ajaran (id),
  hari            smallint not null check (hari between 1 and 7),
  jp_ke           smallint not null check (jp_ke between 1 and 15),
  ruang_id        uuid references public.ruang (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint jadwal_kelas_unik unique (kelas_id, hari, jp_ke),
  constraint jadwal_guru_unik unique (tahun_ajaran_id, pegawai_id, hari, jp_ke),
  constraint jadwal_ruang_unik unique (tahun_ajaran_id, ruang_id, hari, jp_ke)
);
create index if not exists jadwal_penugasan_idx on public.jadwal (penugasan_id);

create or replace function public.isi_jadwal()
returns trigger language plpgsql set search_path = '' as $$
declare p public.penugasan_mengajar;
begin
  select * into p from public.penugasan_mengajar where id = new.penugasan_id and deleted_at is null;
  if p.id is null then raise exception 'Penugasan mengajar tidak ditemukan' using errcode = 'P0002'; end if;
  new.kelas_id := p.kelas_id;
  new.pegawai_id := p.pegawai_id;
  new.tahun_ajaran_id := p.tahun_ajaran_id;
  if not exists (select 1 from public.jam_pelajaran where hari = new.hari and jp_ke = new.jp_ke) then
    raise exception 'JP ke-% hari % belum diatur di Jam Pelajaran', new.jp_ke, public.nama_hari(new.hari) using errcode = '22023';
  end if;
  return new;
end $$;
drop trigger if exists isi_jadwal on public.jadwal;
create trigger isi_jadwal before insert or update on public.jadwal for each row execute function public.isi_jadwal();

-- guru penugasan diganti → jadwalnya ikut; penugasan diarsipkan → jadwalnya dihapus
create or replace function public.sinkron_penugasan()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    delete from public.jadwal where penugasan_id = new.id;
  elsif new.pegawai_id is distinct from old.pegawai_id then
    update public.jadwal set pegawai_id = new.pegawai_id where penugasan_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists sinkron_penugasan on public.penugasan_mengajar;
create trigger sinkron_penugasan after update on public.penugasan_mengajar for each row execute function public.sinkron_penugasan();

-- ---------------------------------------------------------------------
-- 6. Perubahan sementara: guru pengganti, tugas mandiri, ditiadakan, pindah ruang
-- ---------------------------------------------------------------------
create table if not exists public.perubahan_jadwal (
  id                   uuid primary key default gen_random_uuid(),
  jadwal_id            uuid not null references public.jadwal (id) on delete cascade,
  tanggal              date not null,
  jenis                text not null check (jenis in ('pengganti', 'tugas', 'ditiadakan', 'pindah_ruang')),
  pegawai_pengganti_id uuid references public.pegawai (id),
  ruang_id             uuid references public.ruang (id),
  catatan              text not null default '' check (char_length(catatan) <= 300),
  dibuat_oleh          uuid default auth.uid(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (jadwal_id, tanggal),
  check (jenis <> 'pengganti' or pegawai_pengganti_id is not null),
  check (jenis <> 'pindah_ruang' or ruang_id is not null)
);
create index if not exists perubahan_tanggal_idx on public.perubahan_jadwal (tanggal);

-- Apakah guru sedang terpakai pada slot (tanggal, hari, jp)? Memperhitungkan jadwal tetap yang
-- sedang digantikan/ditiadakan, dan tugas menggantikan di kelas lain.
create or replace function public.guru_sibuk(p_guru uuid, p_tanggal date, p_hari smallint, p_jp smallint, p_kecuali uuid default null)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select 'mengajar di ' || k.nama
       from public.jadwal j join public.kelas k on k.id = j.kelas_id
       join public.tahun_ajaran t on t.id = j.tahun_ajaran_id and t.aktif
      where j.pegawai_id = p_guru and j.hari = p_hari and j.jp_ke = p_jp
        and not exists (select 1 from public.perubahan_jadwal x where x.jadwal_id = j.id and x.tanggal = p_tanggal
                         and x.jenis in ('pengganti', 'tugas', 'ditiadakan') and x.id is distinct from p_kecuali)
      limit 1),
    (select 'menggantikan di ' || k.nama
       from public.perubahan_jadwal x join public.jadwal j on j.id = x.jadwal_id join public.kelas k on k.id = j.kelas_id
      where x.pegawai_pengganti_id = p_guru and x.tanggal = p_tanggal and j.hari = p_hari and j.jp_ke = p_jp
        and x.id is distinct from p_kecuali
      limit 1));
$$;
revoke all on function public.guru_sibuk(uuid, date, smallint, smallint, uuid) from public, anon;
grant execute on function public.guru_sibuk(uuid, date, smallint, smallint, uuid) to authenticated;

create or replace function public.jaga_perubahan_jadwal()
returns trigger language plpgsql security definer set search_path = '' as $$
declare j public.jadwal; alasan text;
begin
  select * into j from public.jadwal where id = new.jadwal_id;
  if tg_op = 'INSERT' then new.dibuat_oleh := auth.uid(); end if;
  new.updated_at := now();
  if extract(isodow from new.tanggal)::smallint <> j.hari then
    raise exception 'Tanggal % bukan hari %', to_char(new.tanggal, 'DD-MM-YYYY'), public.nama_hari(j.hari) using errcode = '22023';
  end if;
  if exists (select 1 from public.hari_libur where tanggal = new.tanggal) then
    raise exception 'Tanggal tersebut hari libur' using errcode = '22023';
  end if;
  if new.jenis <> 'pengganti' then new.pegawai_pengganti_id := null; end if;
  if new.jenis <> 'pindah_ruang' then new.ruang_id := null; end if;
  if new.jenis = 'pengganti' then
    if new.pegawai_pengganti_id = j.pegawai_id then
      raise exception 'Guru pengganti sama dengan guru pengampu' using errcode = '22023';
    end if;
    alasan := public.guru_sibuk(new.pegawai_pengganti_id, new.tanggal, j.hari, j.jp_ke, new.id);
    if alasan is not null then
      raise exception 'Bentrok: % sedang % pada JP ke-% hari itu',
        (select nama from public.pegawai where id = new.pegawai_pengganti_id), alasan, j.jp_ke using errcode = '23P01';
    end if;
  end if;
  if new.jenis = 'pindah_ruang' then
    if exists (select 1 from public.jadwal j2 join public.tahun_ajaran t on t.id = j2.tahun_ajaran_id and t.aktif
                where j2.ruang_id = new.ruang_id and j2.hari = j.hari and j2.jp_ke = j.jp_ke and j2.id <> j.id
                  and not exists (select 1 from public.perubahan_jadwal x where x.jadwal_id = j2.id and x.tanggal = new.tanggal
                                   and x.jenis in ('ditiadakan', 'pindah_ruang')))
       or exists (select 1 from public.perubahan_jadwal x join public.jadwal j3 on j3.id = x.jadwal_id
                   where x.ruang_id = new.ruang_id and x.tanggal = new.tanggal and j3.hari = j.hari and j3.jp_ke = j.jp_ke
                     and x.id <> new.id) then
      raise exception 'Bentrok: ruang tersebut sedang dipakai pada JP ke-%', j.jp_ke using errcode = '23P01';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists jaga_perubahan_jadwal on public.perubahan_jadwal;
create trigger jaga_perubahan_jadwal before insert or update on public.perubahan_jadwal
  for each row execute function public.jaga_perubahan_jadwal();

-- ---------------------------------------------------------------------
-- 7. Jadwal piket guru (mingguan)
-- ---------------------------------------------------------------------
create table if not exists public.piket_guru (
  id              uuid primary key default gen_random_uuid(),
  tahun_ajaran_id uuid not null references public.tahun_ajaran (id),
  hari            smallint not null check (hari between 1 and 7),
  pegawai_id      uuid not null references public.pegawai (id),
  created_at      timestamptz not null default now(),
  unique (tahun_ajaran_id, hari, pegawai_id)
);

-- ---------------------------------------------------------------------
-- 8. Audit, updated_at, RLS
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['mapel', 'ruang', 'jam_pelajaran', 'penugasan_mengajar', 'jadwal', 'perubahan_jadwal', 'piket_guru'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.catat_audit()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke truncate on public.%I from authenticated', t);
    -- jadwal bukan data rahasia: semua pengguna yang login (guru, siswa, orang tua) boleh melihat
    execute format('drop policy if exists "baca %1$s" on public.%1$I', t);
    execute format('create policy "baca %1$s" on public.%1$I for select to authenticated using (true)', t);
  end loop;
  foreach t in array array['mapel', 'ruang', 'penugasan_mengajar', 'jadwal'] loop
    execute format('drop trigger if exists updated_at_%1$s on public.%1$I', t);
    execute format('create trigger updated_at_%1$s before update on public.%1$I for each row execute function public.set_updated_at()', t);
  end loop;
  foreach t in array array['mapel', 'ruang', 'jam_pelajaran', 'penugasan_mengajar', 'jadwal', 'piket_guru'] loop
    execute format('drop policy if exists "kelola %1$s" on public.%1$I', t);
    execute format('create policy "kelola %1$s" on public.%1$I for all to authenticated using ((select public.punya_izin(''jadwal.kelola''))) with check ((select public.punya_izin(''jadwal.kelola'')))', t);
  end loop;
end $$;
-- data referensi tidak dihapus permanen (diarsipkan lewat deleted_at)
revoke delete on public.mapel, public.ruang, public.penugasan_mengajar from authenticated;

drop policy if exists "kelola perubahan_jadwal" on public.perubahan_jadwal;
create policy "kelola perubahan_jadwal" on public.perubahan_jadwal for all to authenticated
  using ((select public.punya_izin('jadwal.pengganti')) or (select public.punya_izin('jadwal.kelola')))
  with check ((select public.punya_izin('jadwal.pengganti')) or (select public.punya_izin('jadwal.kelola')));

-- ---------------------------------------------------------------------
-- 9. Tampilan & fungsi
-- ---------------------------------------------------------------------
create or replace view public.jadwal_lengkap with (security_invoker = true) as
select j.id, j.penugasan_id, j.kelas_id, j.pegawai_id, j.tahun_ajaran_id, j.hari, j.jp_ke, j.ruang_id,
       k.nama as kelas, k.tingkat, m.id as mapel_id, m.nama as mapel, m.kode as kode_mapel,
       public.nama_pegawai(j.pegawai_id) as guru, r.nama as ruang,
       jp.jam_mulai, jp.jam_selesai, t.aktif as tahun_aktif
from public.jadwal j
join public.kelas k on k.id = j.kelas_id
join public.penugasan_mengajar p on p.id = j.penugasan_id
join public.mapel m on m.id = p.mapel_id
join public.tahun_ajaran t on t.id = j.tahun_ajaran_id
left join public.ruang r on r.id = j.ruang_id
left join public.jam_pelajaran jp on jp.hari = j.hari and jp.jp_ke = j.jp_ke;
revoke all on public.jadwal_lengkap from anon;
grant select on public.jadwal_lengkap to authenticated;

create or replace view public.penugasan_ringkasan with (security_invoker = true) as
select p.id, p.tahun_ajaran_id, p.kelas_id, k.nama as kelas, p.mapel_id, m.nama as mapel, m.kode as kode_mapel,
       p.pegawai_id, public.nama_pegawai(p.pegawai_id) as guru, p.jp_per_minggu,
       (select count(*) from public.jadwal j where j.penugasan_id = p.id)::int as jp_terjadwal
from public.penugasan_mengajar p
join public.kelas k on k.id = p.kelas_id
join public.mapel m on m.id = p.mapel_id
where p.deleted_at is null;
revoke all on public.penugasan_ringkasan from anon;
grant select on public.penugasan_ringkasan to authenticated;

-- Atur jam satu hari sekaligus. Ditolak bila jumlah JP baru lebih sedikit dari JP yang sudah dipakai jadwal.
create or replace function public.atur_jam_hari(p_hari smallint, p_isi jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare r record; akhir time; n int := 0; jp int := 0; maks_dipakai int;
begin
  if not public.punya_izin('jadwal.kelola') then raise exception 'Tidak berhak' using errcode = '42501'; end if;
  if p_hari not between 1 and 7 then raise exception 'Hari tidak valid' using errcode = '22023'; end if;
  delete from public.jam_pelajaran where hari = p_hari;
  for r in select * from jsonb_to_recordset(coalesce(p_isi, '[]'::jsonb))
             as x(jenis text, jam_mulai time, jam_selesai time, label text) order by jam_mulai loop
    if akhir is not null and r.jam_mulai < akhir then
      raise exception 'Jam % tumpang tindih dengan jam sebelumnya', to_char(r.jam_mulai, 'HH24:MI') using errcode = '22023';
    end if;
    n := n + 1;
    if r.jenis = 'pelajaran' then jp := jp + 1; end if;
    insert into public.jam_pelajaran (hari, urutan, jenis, jp_ke, jam_mulai, jam_selesai, label)
    values (p_hari, n, r.jenis, case when r.jenis = 'pelajaran' then jp end, r.jam_mulai, r.jam_selesai, coalesce(r.label, ''));
    akhir := r.jam_selesai;
  end loop;
  select max(j.jp_ke) into maks_dipakai from public.jadwal j join public.tahun_ajaran t on t.id = j.tahun_ajaran_id and t.aktif
   where j.hari = p_hari;
  if maks_dipakai > jp then
    raise exception 'Hari % sudah memakai sampai JP ke-% di jadwal. Kosongkan jadwal JP tersebut dulu.', public.nama_hari(p_hari), maks_dipakai
      using errcode = '23514';
  end if;
  return n;
end $$;
revoke all on function public.atur_jam_hari(smallint, jsonb) from public, anon;
grant execute on function public.atur_jam_hari(smallint, jsonb) to authenticated;

-- Simpan jadwal satu kelas (semua atau tidak sama sekali), dengan pesan bentrok yang jelas.
create or replace function public.simpan_jadwal_kelas(p_kelas uuid, p_isi jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare pesan text; n int;
begin
  if not public.punya_izin('jadwal.kelola') then raise exception 'Tidak berhak' using errcode = '42501'; end if;

  create temp table if not exists _isi (hari smallint, jp_ke smallint, penugasan_id uuid, ruang_id uuid, pegawai_id uuid) on commit drop;
  truncate _isi;
  insert into _isi (hari, jp_ke, penugasan_id, ruang_id)
  select x.hari, x.jp_ke, x.penugasan_id, x.ruang_id
    from jsonb_to_recordset(coalesce(p_isi, '[]'::jsonb)) as x(hari smallint, jp_ke smallint, penugasan_id uuid, ruang_id uuid);

  if exists (select 1 from _isi group by hari, jp_ke having count(*) > 1) then
    raise exception 'Ada slot yang terisi dua kali' using errcode = '22023';
  end if;
  if exists (select 1 from _isi i left join public.penugasan_mengajar p on p.id = i.penugasan_id and p.deleted_at is null
              where p.id is null or p.kelas_id <> p_kelas) then
    raise exception 'Mapel tidak terdaftar di penugasan kelas ini' using errcode = '22023';
  end if;
  update _isi i set pegawai_id = p.pegawai_id from public.penugasan_mengajar p where p.id = i.penugasan_id;

  select string_agg(b, E'\n') into pesan from (
    select format('%s sudah mengajar di %s, %s JP ke-%s', public.nama_pegawai(j.pegawai_id), k.nama, public.nama_hari(i.hari), i.jp_ke) as b
      from _isi i join public.jadwal j on j.pegawai_id = i.pegawai_id and j.hari = i.hari and j.jp_ke = i.jp_ke
      join public.kelas k on k.id = j.kelas_id
      join public.kelas kk on kk.id = p_kelas and kk.tahun_ajaran_id = j.tahun_ajaran_id
     where j.kelas_id <> p_kelas
    union all
    select format('Ruang %s dipakai %s, %s JP ke-%s', r.nama, k.nama, public.nama_hari(i.hari), i.jp_ke)
      from _isi i join public.jadwal j on j.ruang_id = i.ruang_id and j.hari = i.hari and j.jp_ke = i.jp_ke
      join public.ruang r on r.id = i.ruang_id join public.kelas k on k.id = j.kelas_id
      join public.kelas kk on kk.id = p_kelas and kk.tahun_ajaran_id = j.tahun_ajaran_id
     where j.kelas_id <> p_kelas
    limit 8) s;
  if pesan is not null then raise exception 'Bentrok:%', E'\n' || pesan using errcode = '23P01'; end if;

  delete from public.jadwal j where j.kelas_id = p_kelas
     and not exists (select 1 from _isi i where i.hari = j.hari and i.jp_ke = j.jp_ke);
  insert into public.jadwal (penugasan_id, kelas_id, tahun_ajaran_id, hari, jp_ke, ruang_id)
  select i.penugasan_id, p_kelas, (select tahun_ajaran_id from public.kelas where id = p_kelas), i.hari, i.jp_ke, i.ruang_id from _isi i
  on conflict (kelas_id, hari, jp_ke) do update
    set penugasan_id = excluded.penugasan_id, ruang_id = excluded.ruang_id
    where (public.jadwal.penugasan_id, public.jadwal.ruang_id) is distinct from (excluded.penugasan_id, excluded.ruang_id);
  select count(*) into n from _isi;
  return n;
end $$;
revoke all on function public.simpan_jadwal_kelas(uuid, jsonb) from public, anon;
grant execute on function public.simpan_jadwal_kelas(uuid, jsonb) to authenticated;

-- Guru yang bisa menggantikan pada satu slot: tidak mengajar/menggantikan di jam itu
-- dan tidak tercatat sakit/izin/dinas/cuti pada tanggal itu. Urut dari yang paling ringan hari itu.
create or replace function public.guru_tersedia(p_jadwal uuid, p_tanggal date)
returns table (id uuid, nama text, jp_hari_itu int)
language plpgsql stable security definer set search_path = '' as $$
declare j public.jadwal;
begin
  if not (public.punya_izin('jadwal.pengganti') or public.punya_izin('jadwal.kelola')) then
    raise exception 'Tidak berhak' using errcode = '42501';
  end if;
  select * into j from public.jadwal where public.jadwal.id = p_jadwal;
  return query
  select g.id, g.nama,
         ((select count(*) from public.jadwal x where x.pegawai_id = g.id and x.hari = j.hari and x.tahun_ajaran_id = j.tahun_ajaran_id)
          + (select count(*) from public.perubahan_jadwal y where y.pegawai_pengganti_id = g.id and y.tanggal = p_tanggal))::int
  from public.pegawai g
  where g.jenis = 'guru' and g.status = 'aktif' and g.deleted_at is null and g.id is distinct from j.pegawai_id
    and public.guru_sibuk(g.id, p_tanggal, j.hari, j.jp_ke) is null
    and not exists (select 1 from public.absensi_pegawai a where a.pegawai_id = g.id and a.tanggal = p_tanggal
                    and a.status in ('S', 'I', 'DL', 'C'))
  order by 3, 2;
end $$;
revoke all on function public.guru_tersedia(uuid, date) from public, anon;
grant execute on function public.guru_tersedia(uuid, date) to authenticated;

-- Guru yang berhalangan pada tanggal tertentu (untuk piket menyiapkan pengganti)
create or replace function public.guru_berhalangan(p_tanggal date)
returns table (pegawai_id uuid, nama text, status text, keterangan text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.punya_izin('jadwal.pengganti') or public.punya_izin('jadwal.kelola')) then
    raise exception 'Tidak berhak' using errcode = '42501';
  end if;
  return query
  select a.pegawai_id, g.nama, a.status, a.keterangan
    from public.absensi_pegawai a join public.pegawai g on g.id = a.pegawai_id
   where a.tanggal = p_tanggal and a.status in ('S', 'I', 'DL', 'C')
   order by g.nama;
end $$;
revoke all on function public.guru_berhalangan(date) from public, anon;
grant execute on function public.guru_berhalangan(date) to authenticated;

-- Impor penugasan mengajar sekaligus (semua atau tidak sama sekali); baris yang sudah ada diperbarui
create or replace function public.impor_penugasan(p_isi jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare r record; n int := 0;
begin
  if not public.punya_izin('jadwal.kelola') then raise exception 'Tidak berhak' using errcode = '42501'; end if;
  for r in select * from jsonb_to_recordset(coalesce(p_isi, '[]'::jsonb))
             as x(kelas_id uuid, mapel_id uuid, pegawai_id uuid, jp_per_minggu smallint) loop
    update public.penugasan_mengajar set pegawai_id = r.pegawai_id, jp_per_minggu = r.jp_per_minggu
     where kelas_id = r.kelas_id and mapel_id = r.mapel_id and deleted_at is null
       and (pegawai_id, jp_per_minggu) is distinct from (r.pegawai_id, r.jp_per_minggu);
    if not exists (select 1 from public.penugasan_mengajar where kelas_id = r.kelas_id and mapel_id = r.mapel_id and deleted_at is null) then
      insert into public.penugasan_mengajar (kelas_id, mapel_id, pegawai_id, jp_per_minggu)
      values (r.kelas_id, r.mapel_id, r.pegawai_id, r.jp_per_minggu);
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.impor_penugasan(jsonb) from public, anon;
grant execute on function public.impor_penugasan(jsonb) to authenticated;

notify pgrst, 'reload schema';
