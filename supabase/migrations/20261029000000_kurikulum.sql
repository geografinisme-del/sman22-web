-- =====================================================================
-- Fase 9 — Modul 05 Kurikulum
--   A. Struktur kurikulum per tingkat (+ cek kesesuaian dengan penugasan)
--   B. Capaian (CP), Tujuan Pembelajaran / ATP & KKTP per mapel–fase
--   C. Perangkat ajar (modul ajar, prota, promes, …) + review kurikulum
--   D. Projek kokurikuler / P5
--   E. Supervisi akademik
--   F. Materi kelas digital (mode papan interaktif) + pemakaian Asisten AI
-- Idempoten: aman dijalankan ulang.
-- =====================================================================

insert into public.izin (kode, keterangan) values
  ('kurikulum.kelola', 'Mengelola struktur kurikulum, ATP, review perangkat ajar & projek kokurikuler'),
  ('supervisi.kelola', 'Menjadwalkan & melihat seluruh supervisi akademik')
on conflict (kode) do update set keterangan = excluded.keterangan;
insert into public.peran_izin (peran, izin) values
  ('super_admin', 'kurikulum.kelola'), ('kurikulum', 'kurikulum.kelola'), ('wakasek', 'kurikulum.kelola'),
  ('super_admin', 'supervisi.kelola'), ('kepala_sekolah', 'supervisi.kelola'), ('kurikulum', 'supervisi.kelola')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Helper
-- ---------------------------------------------------------------------
create or replace function public.fase_tingkat(p_tingkat text)
returns text language sql immutable set search_path = '' as $$
  select case when p_tingkat = 'X' then 'E' when p_tingkat in ('XI', 'XII') then 'F' end;
$$;

-- guru yang sedang login mengampu mapel ini (tahun ajaran aktif)?
create or replace function public.mengampu(p_mapel uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.penugasan_mengajar p join public.tahun_ajaran t on t.id = p.tahun_ajaran_id and t.aktif
                  where p.mapel_id = p_mapel and p.deleted_at is null and p.pegawai_id = public.pegawai_saya());
$$;

-- pengguna (siswa / orang tua) terkait dengan kelas ini di tahun ajaran aktif?
create or replace function public.warga_kelas(p_kelas uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.anggota_kelas ak join public.tahun_ajaran t on t.id = ak.tahun_ajaran_id and t.aktif
    join public.siswa s on s.id = ak.siswa_id and s.deleted_at is null
    where ak.kelas_id = p_kelas
      and (s.user_id = auth.uid()
           or exists (select 1 from public.siswa_orang_tua so join public.orang_tua o on o.id = so.orang_tua_id
                       where so.siswa_id = s.id and o.user_id = auth.uid())));
$$;
grant execute on function public.fase_tingkat(text), public.mengampu(uuid), public.warga_kelas(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- A. Struktur kurikulum
-- ---------------------------------------------------------------------
create table if not exists public.struktur_kurikulum (
  id              uuid primary key default gen_random_uuid(),
  tahun_ajaran_id uuid not null references public.tahun_ajaran (id) on delete cascade,
  tingkat         text not null check (tingkat in ('X', 'XI', 'XII')),
  mapel_id        uuid not null references public.mapel (id),
  kelompok        text not null default 'umum' check (kelompok in ('umum', 'pilihan', 'mulok')),
  jp_minggu       smallint not null check (jp_minggu between 0 and 12),
  keterangan      text not null default '' check (char_length(keterangan) <= 200),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tahun_ajaran_id, tingkat, mapel_id)
);

-- kesesuaian struktur ↔ penugasan mengajar per kelas (tahun ajaran aktif)
create or replace function public.cek_struktur_kelas()
returns table (kelas_id uuid, kelas text, tingkat text, mapel text, kelompok text, jp_struktur int, jp_penugasan int, masalah text)
language sql stable security definer set search_path = '' as $$
  with k as (
    select k.id, k.nama, k.tingkat, k.tahun_ajaran_id from public.kelas k
    join public.tahun_ajaran t on t.id = k.tahun_ajaran_id and t.aktif where k.deleted_at is null
  ), p as (
    select pm.kelas_id, pm.mapel_id, sum(pm.jp_per_minggu)::int jp from public.penugasan_mengajar pm
    where pm.deleted_at is null group by 1, 2
  ), s as (
    select sk.* from public.struktur_kurikulum sk join public.tahun_ajaran t on t.id = sk.tahun_ajaran_id and t.aktif
  )
  select k.id, k.nama, k.tingkat, m.nama, s.kelompok, s.jp_minggu::int, coalesce(p.jp, 0),
         case when p.jp is null and s.kelompok = 'umum' then 'Belum ada guru/penugasan'
              when p.jp is not null and p.jp <> s.jp_minggu then 'JP berbeda dari struktur' end
  from k join s on s.tingkat = k.tingkat join public.mapel m on m.id = s.mapel_id
  left join p on p.kelas_id = k.id and p.mapel_id = s.mapel_id
  where (public.punya_izin('kurikulum.kelola') or public.punya_izin('jadwal.kelola'))
    and ((p.jp is null and s.kelompok = 'umum') or (p.jp is not null and p.jp <> s.jp_minggu))
  union all
  select k.id, k.nama, k.tingkat, m.nama, null, null, p.jp, 'Tidak ada di struktur kurikulum'
  from k join p on p.kelas_id = k.id join public.mapel m on m.id = p.mapel_id
  where (public.punya_izin('kurikulum.kelola') or public.punya_izin('jadwal.kelola'))
    and exists (select 1 from s where s.tingkat = k.tingkat)
    and not exists (select 1 from s where s.tingkat = k.tingkat and s.mapel_id = p.mapel_id)
  order by 2, 4;
$$;

create or replace function public.salin_struktur(p_dari uuid, p_ke uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.punya_izin('kurikulum.kelola') then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  insert into public.struktur_kurikulum (tahun_ajaran_id, tingkat, mapel_id, kelompok, jp_minggu, keterangan)
  select p_ke, tingkat, mapel_id, kelompok, jp_minggu, keterangan from public.struktur_kurikulum where tahun_ajaran_id = p_dari
  on conflict (tahun_ajaran_id, tingkat, mapel_id) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.cek_struktur_kelas(), public.salin_struktur(uuid, uuid) from public, anon;
grant execute on function public.cek_struktur_kelas(), public.salin_struktur(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- B. CP, TP/ATP, KKTP
-- ---------------------------------------------------------------------
create table if not exists public.capaian_pembelajaran (
  id          uuid primary key default gen_random_uuid(),
  mapel_id    uuid not null references public.mapel (id),
  fase        text not null check (fase in ('E', 'F')),
  elemen      text not null check (char_length(elemen) between 2 and 120),
  deskripsi   text not null check (char_length(deskripsi) between 10 and 3000),
  urutan      smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index if not exists cp_mapel_fase on public.capaian_pembelajaran (mapel_id, fase) where deleted_at is null;

create table if not exists public.tujuan_pembelajaran (
  id          uuid primary key default gen_random_uuid(),
  mapel_id    uuid not null references public.mapel (id),
  fase        text not null check (fase in ('E', 'F')),
  tingkat     text not null check (tingkat in ('X', 'XI', 'XII')),
  semester    smallint not null check (semester in (1, 2)),
  kode        text not null default '' check (char_length(kode) <= 20),
  elemen      text not null default '' check (char_length(elemen) <= 120),
  deskripsi   text not null check (char_length(deskripsi) between 10 and 500),
  kktp        text not null default '' check (char_length(kktp) <= 1000),
  alokasi_jp  smallint not null default 0 check (alokasi_jp between 0 and 99),
  urutan      smallint not null default 0,
  dibuat_oleh uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint tp_fase_tingkat check (fase = public.fase_tingkat(tingkat))
);
create index if not exists tp_mapel_fase on public.tujuan_pembelajaran (mapel_id, fase, tingkat, semester, urutan) where deleted_at is null;

-- status ATP per mapel–fase: final = dikunci kurikulum (guru tidak bisa mengubah)
create table if not exists public.atp_status (
  mapel_id    uuid not null references public.mapel (id),
  fase        text not null check (fase in ('E', 'F')),
  status      text not null default 'draf' check (status in ('draf', 'final')),
  catatan     text not null default '' check (char_length(catatan) <= 500),
  diubah_oleh uuid default auth.uid(),
  updated_at  timestamptz not null default now(),
  primary key (mapel_id, fase)
);

create or replace function public.boleh_ubah_atp(p_mapel uuid, p_fase text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.punya_izin('kurikulum.kelola')
      or (public.mengampu(p_mapel)
          and coalesce((select status from public.atp_status where mapel_id = p_mapel and fase = p_fase), 'draf') = 'draf');
$$;
grant execute on function public.boleh_ubah_atp(uuid, text) to authenticated;

create or replace function public.jaga_tp() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.dibuat_oleh := old.dibuat_oleh;
    new.updated_at := now();
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    new.fase := public.fase_tingkat(new.tingkat);
  end if;
  return new;
end $$;
drop trigger if exists jaga_tp on public.tujuan_pembelajaran;
create trigger jaga_tp before insert or update on public.tujuan_pembelajaran for each row execute function public.jaga_tp();

-- ---------------------------------------------------------------------
-- C. Perangkat ajar
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('perangkat', 'perangkat', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "unggah berkas privat sendiri" on storage.objects;
create policy "unggah berkas privat sendiri" on storage.objects for insert to authenticated
  with check (bucket_id in ('bukti', 'presensi', 'perangkat') and split_part(name, '/', 1) = auth.uid()::text);
drop policy if exists "lihat berkas privat sendiri" on storage.objects;
create policy "lihat berkas privat sendiri" on storage.objects for select to authenticated
  using (bucket_id in ('bukti', 'presensi', 'perangkat') and split_part(name, '/', 1) = auth.uid()::text);

create table if not exists public.perangkat_ajar (
  id              uuid primary key default gen_random_uuid(),
  tahun_ajaran_id uuid not null references public.tahun_ajaran (id),
  semester        smallint not null check (semester in (1, 2)),
  pegawai_id      uuid not null references public.pegawai (id),
  mapel_id        uuid not null references public.mapel (id),
  tingkat         text not null check (tingkat in ('X', 'XI', 'XII')),
  jenis           text not null check (jenis in ('prota', 'promes', 'modul_ajar', 'atp', 'bahan_ajar', 'asesmen', 'lainnya')),
  judul           text not null check (char_length(judul) between 3 and 150),
  berkas_path     text not null default '' check (char_length(berkas_path) <= 300),
  berkas_nama     text not null default '' check (char_length(berkas_nama) <= 150),
  tautan          text not null default '' check (tautan = '' or tautan ~ '^https://'),
  tp_ids          uuid[] not null default '{}',
  status          text not null default 'draf' check (status in ('draf', 'diajukan', 'disetujui', 'revisi')),
  catatan_review  text not null default '' check (char_length(catatan_review) <= 1000),
  direview_oleh   uuid,
  direview_pada   timestamptz,
  diajukan_pada   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  constraint perangkat_ada_isi check (berkas_path <> '' or tautan <> '')
);
create index if not exists perangkat_guru on public.perangkat_ajar (pegawai_id, tahun_ajaran_id) where deleted_at is null;
create index if not exists perangkat_status on public.perangkat_ajar (status) where deleted_at is null;

create or replace function public.jaga_perangkat() returns trigger language plpgsql security definer set search_path = '' as $$
declare kelola boolean := public.punya_izin('kurikulum.kelola');
begin
  if tg_op = 'INSERT' then
    if not kelola and new.pegawai_id is distinct from public.pegawai_saya() then
      raise exception 'Perangkat ajar hanya bisa diunggah atas nama sendiri' using errcode = '42501';
    end if;
    if new.status not in ('draf', 'diajukan') then new.status := 'draf'; end if;
  else
    new.updated_at := now();
    if not kelola then
      if old.status = 'disetujui' then
        raise exception 'Perangkat yang sudah disetujui tidak bisa diubah. Unggah versi baru bila perlu.' using errcode = '42501';
      end if;
      if old.status = 'diajukan' and new.status <> 'draf' then
        raise exception 'Perangkat sedang diperiksa. Tarik pengajuan dulu untuk mengubahnya.' using errcode = '42501';
      end if;
      if new.status in ('disetujui', 'revisi') then
        raise exception 'Status ini diberikan oleh kurikulum' using errcode = '42501';
      end if;
      new.pegawai_id := old.pegawai_id;
      new.catatan_review := old.catatan_review; new.direview_oleh := old.direview_oleh; new.direview_pada := old.direview_pada;
    end if;
  end if;
  if new.status = 'diajukan' and (tg_op = 'INSERT' or old.status <> 'diajukan') then new.diajukan_pada := now(); end if;
  return new;
end $$;
drop trigger if exists jaga_perangkat on public.perangkat_ajar;
create trigger jaga_perangkat before insert or update on public.perangkat_ajar for each row execute function public.jaga_perangkat();

create or replace function public.review_perangkat(p_id uuid, p_setuju boolean, p_catatan text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare r public.perangkat_ajar;
begin
  if not public.punya_izin('kurikulum.kelola') then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  if not p_setuju and char_length(trim(coalesce(p_catatan, ''))) < 3 then
    raise exception 'Tulis catatan revisi untuk guru' using errcode = '22023';
  end if;
  update public.perangkat_ajar
     set status = case when p_setuju then 'disetujui' else 'revisi' end, catatan_review = left(coalesce(trim(p_catatan), ''), 1000),
         direview_oleh = auth.uid(), direview_pada = now()
   where id = p_id and deleted_at is null and status in ('diajukan', 'disetujui', 'revisi')
   returning * into r;
  if r.id is null then raise exception 'Perangkat tidak ditemukan atau belum diajukan' using errcode = '22023'; end if;
  perform public.kirim_notif((select user_id from public.pegawai where id = r.pegawai_id), 'kurikulum',
    case when p_setuju then 'Perangkat ajar disetujui' else 'Perangkat ajar perlu revisi' end,
    r.judul || coalesce(' — ' || nullif(trim(p_catatan), ''), ''), '/admin/perangkat-ajar');
end $$;
revoke all on function public.review_perangkat(uuid, boolean, text) from public, anon;
grant execute on function public.review_perangkat(uuid, boolean, text) to authenticated;

create or replace function public.notif_perangkat() returns trigger language plpgsql security definer set search_path = '' as $$
declare u uuid; n int;
begin
  if new.status = 'diajukan' and (tg_op = 'INSERT' or old.status <> 'diajukan') then
    -- satu pemberitahuan per guru per hari agar tidak membanjiri kurikulum
    select count(*) into n from public.perangkat_ajar where pegawai_id = new.pegawai_id and status = 'diajukan'
      and diajukan_pada::date = now()::date and id <> new.id;
    if n = 0 then
      for u in select public.pengguna_berizin('kurikulum.kelola') loop
        perform public.kirim_notif(u, 'kurikulum', 'Perangkat ajar menunggu diperiksa',
          public.nama_pegawai(new.pegawai_id) || ': ' || new.judul, '/admin/perangkat-ajar/review', 'biasa', false);
      end loop;
    end if;
  end if;
  return null;
end $$;
drop trigger if exists notif_perangkat on public.perangkat_ajar;
create trigger notif_perangkat after insert or update of status on public.perangkat_ajar for each row execute function public.notif_perangkat();

-- rekap kelengkapan: setiap penugasan (guru × mapel × tingkat) dibandingkan perangkat yang disetujui
create or replace function public.rekap_perangkat(p_semester smallint)
returns table (pegawai_id uuid, guru text, mapel_id uuid, mapel text, tingkat text,
               prota text, promes text, modul_ajar int, modul_disetujui int, atp text, total_diajukan int)
language sql stable security definer set search_path = '' as $$
  with t as (select id from public.tahun_ajaran where aktif),
  tugas as (
    select distinct pm.pegawai_id, pm.mapel_id, k.tingkat from public.penugasan_mengajar pm
    join public.kelas k on k.id = pm.kelas_id
    where pm.tahun_ajaran_id = (select id from t) and pm.deleted_at is null and pm.pegawai_id is not null
  ), pa as (
    select * from public.perangkat_ajar where tahun_ajaran_id = (select id from t) and semester = p_semester and deleted_at is null
  ), st as (
    select x.pegawai_id, x.mapel_id, x.tingkat, j.jenis,
      (select case when bool_or(status = 'disetujui') then 'disetujui' when bool_or(status = 'diajukan') then 'diajukan'
                   when bool_or(status = 'revisi') then 'revisi' when count(*) > 0 then 'draf' else 'belum' end
         from pa where pa.pegawai_id = x.pegawai_id and pa.mapel_id = x.mapel_id and pa.tingkat = x.tingkat and pa.jenis = j.jenis) s
    from tugas x cross join (values ('prota'), ('promes'), ('atp')) j(jenis)
  )
  select x.pegawai_id, g.nama, x.mapel_id, m.nama, x.tingkat,
    (select s from st where st.pegawai_id = x.pegawai_id and st.mapel_id = x.mapel_id and st.tingkat = x.tingkat and st.jenis = 'prota'),
    (select s from st where st.pegawai_id = x.pegawai_id and st.mapel_id = x.mapel_id and st.tingkat = x.tingkat and st.jenis = 'promes'),
    (select count(*)::int from pa where pa.pegawai_id = x.pegawai_id and pa.mapel_id = x.mapel_id and pa.tingkat = x.tingkat and pa.jenis = 'modul_ajar'),
    (select count(*)::int from pa where pa.pegawai_id = x.pegawai_id and pa.mapel_id = x.mapel_id and pa.tingkat = x.tingkat and pa.jenis = 'modul_ajar' and pa.status = 'disetujui'),
    (select s from st where st.pegawai_id = x.pegawai_id and st.mapel_id = x.mapel_id and st.tingkat = x.tingkat and st.jenis = 'atp'),
    (select count(*)::int from pa where pa.pegawai_id = x.pegawai_id and pa.mapel_id = x.mapel_id and pa.tingkat = x.tingkat and pa.status = 'diajukan')
  from tugas x join public.pegawai g on g.id = x.pegawai_id join public.mapel m on m.id = x.mapel_id
  where public.punya_izin('kurikulum.kelola') or public.punya_izin('supervisi.kelola') or x.pegawai_id = public.pegawai_saya()
  order by g.nama, m.nama, x.tingkat;
$$;
revoke all on function public.rekap_perangkat(smallint) from public, anon;
grant execute on function public.rekap_perangkat(smallint) to authenticated;

-- ---------------------------------------------------------------------
-- D. Projek kokurikuler / P5
-- ---------------------------------------------------------------------
create table if not exists public.projek_kokurikuler (
  id              uuid primary key default gen_random_uuid(),
  tahun_ajaran_id uuid not null references public.tahun_ajaran (id),
  semester        smallint not null check (semester in (1, 2)),
  judul           text not null check (char_length(judul) between 3 and 150),
  tema            text not null check (char_length(tema) between 3 and 120),
  dimensi         text[] not null default '{}',
  deskripsi       text not null default '' check (char_length(deskripsi) <= 3000),
  tingkat         text not null check (tingkat in ('X', 'XI', 'XII')),
  koordinator_id  uuid references public.pegawai (id),
  mulai           date not null,
  selesai         date not null,
  alokasi_jp      smallint not null default 0 check (alokasi_jp between 0 and 500),
  status          text not null default 'rencana' check (status in ('rencana', 'berjalan', 'selesai')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  constraint projek_rentang check (selesai >= mulai),
  constraint projek_dimensi check (dimensi <@ array['keimanan', 'kewargaan', 'penalaran_kritis', 'kreativitas', 'kolaborasi', 'kemandirian', 'kesehatan', 'komunikasi'])
);
create table if not exists public.projek_kelas (
  projek_id      uuid not null references public.projek_kokurikuler (id) on delete cascade,
  kelas_id       uuid not null references public.kelas (id),
  fasilitator_id uuid references public.pegawai (id),
  primary key (projek_id, kelas_id)
);

create or replace function public.jaga_projek() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  -- koordinator hanya boleh mengubah status & deskripsi
  if not public.punya_izin('kurikulum.kelola') then
    if old.koordinator_id is distinct from public.pegawai_saya() then raise exception 'Akses ditolak' using errcode = '42501'; end if;
    new.judul := old.judul; new.tema := old.tema; new.dimensi := old.dimensi; new.tingkat := old.tingkat;
    new.koordinator_id := old.koordinator_id; new.mulai := old.mulai; new.selesai := old.selesai;
    new.alokasi_jp := old.alokasi_jp; new.deleted_at := old.deleted_at; new.tahun_ajaran_id := old.tahun_ajaran_id;
  end if;
  return new;
end $$;
drop trigger if exists jaga_projek on public.projek_kokurikuler;
create trigger jaga_projek before update on public.projek_kokurikuler for each row execute function public.jaga_projek();

-- ---------------------------------------------------------------------
-- E. Supervisi akademik
-- ---------------------------------------------------------------------
create table if not exists public.supervisi_akademik (
  id              uuid primary key default gen_random_uuid(),
  tahun_ajaran_id uuid not null references public.tahun_ajaran (id),
  semester        smallint not null check (semester in (1, 2)),
  pegawai_id      uuid not null references public.pegawai (id),
  supervisor_id   uuid not null references public.pegawai (id),
  tanggal         date not null,
  jadwal_id       uuid references public.jadwal (id) on delete set null,
  status          text not null default 'terjadwal' check (status in ('terjadwal', 'selesai', 'batal')),
  skor            jsonb not null default '{}'::jsonb,
  nilai           numeric(5, 2) check (nilai between 0 and 100),
  kekuatan        text not null default '' check (char_length(kekuatan) <= 2000),
  perbaikan       text not null default '' check (char_length(perbaikan) <= 2000),
  rekomendasi     text not null default '' check (char_length(rekomendasi) <= 2000),
  tanggapan_guru  text not null default '' check (char_length(tanggapan_guru) <= 2000),
  dibuat_oleh     uuid default auth.uid(),
  selesai_pada    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint supervisi_beda check (pegawai_id <> supervisor_id)
);
create index if not exists supervisi_guru on public.supervisi_akademik (pegawai_id, tanggal);

create or replace function public.jaga_supervisi() returns trigger language plpgsql security definer set search_path = '' as $$
declare kelola boolean := public.punya_izin('supervisi.kelola'); saya uuid := public.pegawai_saya(); n int; total numeric; t text;
begin
  if tg_op = 'UPDATE' then
    -- guru yang disupervisi (hanya lewat tanggapi_supervisi): cuma kolom tanggapan yang berubah
    if old.pegawai_id = saya then
      t := new.tanggapan_guru;
      new := old;
      new.tanggapan_guru := t;
      new.updated_at := now();
      return new;
    end if;
    new.updated_at := now();
    new.dibuat_oleh := old.dibuat_oleh;
    new.tanggapan_guru := old.tanggapan_guru;
    if not kelola then
      if old.supervisor_id is distinct from saya then raise exception 'Akses ditolak' using errcode = '42501'; end if;
      if old.status = 'selesai' then raise exception 'Hasil supervisi yang sudah final tidak bisa diubah supervisor' using errcode = '42501'; end if;
      new.pegawai_id := old.pegawai_id; new.supervisor_id := old.supervisor_id; new.tahun_ajaran_id := old.tahun_ajaran_id;
      new.semester := old.semester;
      if new.status = 'batal' then raise exception 'Pembatalan dilakukan oleh kepala sekolah/kurikulum' using errcode = '42501'; end if;
    end if;
  end if;
  -- nilai = rata-rata skor (1–4) × 25
  select count(*), sum(v::numeric) into n, total from jsonb_each_text(new.skor) e(k, v) where v ~ '^[1-4]$';
  new.nilai := case when n > 0 then round(total / n * 25, 2) end;
  if new.status = 'selesai' then
    if n = 0 then raise exception 'Isi skor instrumen sebelum menyelesaikan supervisi' using errcode = '22023'; end if;
    if tg_op = 'INSERT' or old.status <> 'selesai' then new.selesai_pada := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists jaga_supervisi on public.supervisi_akademik;
create trigger jaga_supervisi before insert or update on public.supervisi_akademik for each row execute function public.jaga_supervisi();

create or replace function public.notif_supervisi() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.kirim_notif((select user_id from public.pegawai where id = new.pegawai_id), 'kurikulum',
      'Jadwal supervisi akademik ' || to_char(new.tanggal, 'DD-MM-YYYY'), 'Supervisor: ' || public.nama_pegawai(new.supervisor_id), '/admin/supervisi');
    perform public.kirim_notif((select user_id from public.pegawai where id = new.supervisor_id), 'kurikulum',
      'Tugas supervisi ' || to_char(new.tanggal, 'DD-MM-YYYY'), 'Guru: ' || public.nama_pegawai(new.pegawai_id), '/admin/supervisi');
  elsif new.status = 'selesai' and old.status <> 'selesai' then
    perform public.kirim_notif((select user_id from public.pegawai where id = new.pegawai_id), 'kurikulum',
      'Hasil supervisi akademik tersedia', 'Silakan baca catatan & beri tanggapan.', '/admin/supervisi');
  end if;
  return null;
end $$;
drop trigger if exists notif_supervisi on public.supervisi_akademik;
create trigger notif_supervisi after insert or update of status on public.supervisi_akademik for each row execute function public.notif_supervisi();

create or replace function public.tanggapi_supervisi(p_id uuid, p_teks text)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.supervisi_akademik;
begin
  select * into s from public.supervisi_akademik where id = p_id;
  if s.id is null or s.pegawai_id is distinct from public.pegawai_saya() then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  if s.status <> 'selesai' then raise exception 'Supervisi belum selesai' using errcode = '22023'; end if;
  update public.supervisi_akademik set tanggapan_guru = left(trim(coalesce(p_teks, '')), 2000) where id = p_id;
end $$;
revoke all on function public.tanggapi_supervisi(uuid, text) from public, anon;
grant execute on function public.tanggapi_supervisi(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- F. Materi kelas digital (papan interaktif) & pemakaian AI
-- ---------------------------------------------------------------------
create table if not exists public.materi_kelas (
  id          uuid primary key default gen_random_uuid(),
  pegawai_id  uuid not null references public.pegawai (id),
  mapel_id    uuid not null references public.mapel (id),
  judul       text not null check (char_length(judul) between 3 and 150),
  ringkasan   text not null default '' check (char_length(ringkasan) <= 500),
  slide       jsonb not null default '[]'::jsonb check (jsonb_typeof(slide) = 'array' and jsonb_array_length(slide) <= 60),
  tp_ids      uuid[] not null default '{}',
  terbit      boolean not null default false,
  terbit_pada timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint materi_ukuran check (octet_length(slide::text) <= 200000)
);
create table if not exists public.materi_kelas_target (
  materi_id uuid not null references public.materi_kelas (id) on delete cascade,
  kelas_id  uuid not null references public.kelas (id),
  primary key (materi_id, kelas_id)
);

create or replace function public.jaga_materi() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.pegawai_id is distinct from public.pegawai_saya() then raise exception 'Materi dibuat atas nama sendiri' using errcode = '42501'; end if;
  else
    new.pegawai_id := old.pegawai_id; new.updated_at := now();
  end if;
  if new.terbit and (tg_op = 'INSERT' or not old.terbit) then new.terbit_pada := now(); end if;
  return new;
end $$;
drop trigger if exists jaga_materi on public.materi_kelas;
create trigger jaga_materi before insert or update on public.materi_kelas for each row execute function public.jaga_materi();

-- kelas tujuan harus kelas yang diajar guru tsb untuk mapel itu
create or replace function public.jaga_materi_target() returns trigger language plpgsql security definer set search_path = '' as $$
declare m public.materi_kelas;
begin
  select * into m from public.materi_kelas where id = new.materi_id;
  if not exists (select 1 from public.penugasan_mengajar p join public.tahun_ajaran t on t.id = p.tahun_ajaran_id and t.aktif
                  where p.kelas_id = new.kelas_id and p.mapel_id = m.mapel_id and p.pegawai_id = m.pegawai_id and p.deleted_at is null) then
    raise exception 'Kelas tersebut tidak Anda ajar untuk mapel ini' using errcode = '22023';
  end if;
  return new;
end $$;
drop trigger if exists jaga_materi_target on public.materi_kelas_target;
create trigger jaga_materi_target before insert on public.materi_kelas_target for each row execute function public.jaga_materi_target();

-- pemberitahuan ke siswa saat materi diterbitkan (lonceng saja)
create or replace function public.umumkan_materi(p_id uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare m public.materi_kelas; u uuid; n int := 0;
begin
  select * into m from public.materi_kelas where id = p_id and deleted_at is null;
  if m.id is null or m.pegawai_id is distinct from public.pegawai_saya() or not m.terbit then
    raise exception 'Materi tidak ditemukan / belum terbit' using errcode = '22023';
  end if;
  for u in select distinct s.user_id from public.materi_kelas_target mt
            join public.anggota_kelas ak on ak.kelas_id = mt.kelas_id
            join public.tahun_ajaran t on t.id = ak.tahun_ajaran_id and t.aktif
            join public.siswa s on s.id = ak.siswa_id and s.deleted_at is null
           where mt.materi_id = p_id and s.user_id is not null loop
    perform public.kirim_notif(u, 'kurikulum', 'Materi baru: ' || m.judul,
      (select nama from public.mapel where id = m.mapel_id) || ' — ' || coalesce(public.nama_pegawai(m.pegawai_id), ''),
      '/portal/materi/' || m.id, 'biasa', false);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.umumkan_materi(uuid) from public, anon;
grant execute on function public.umumkan_materi(uuid) to authenticated;

-- nama panggilan siswa satu kelas untuk "pilih acak" di papan interaktif (hanya guru pengampu/wali kelas tsb)
create or replace function public.nama_siswa_kelas(p_kelas uuid)
returns table (nama text) language sql stable security definer set search_path = '' as $$
  select split_part(s.nama, ' ', 1) || coalesce(' ' || left(nullif(split_part(s.nama, ' ', 2), ''), 1) || '.', '')
  from public.anggota_kelas ak join public.tahun_ajaran t on t.id = ak.tahun_ajaran_id and t.aktif
  join public.siswa s on s.id = ak.siswa_id and s.deleted_at is null
  where ak.kelas_id = p_kelas
    and (exists (select 1 from public.penugasan_mengajar p where p.kelas_id = p_kelas and p.deleted_at is null and p.pegawai_id = public.pegawai_saya())
         or exists (select 1 from public.kelas k where k.id = p_kelas and k.wali_kelas_id = public.pegawai_saya()))
  order by s.nama;
$$;
revoke all on function public.nama_siswa_kelas(uuid) from public, anon;
grant execute on function public.nama_siswa_kelas(uuid) to authenticated;

create table if not exists public.pemakaian_ai (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid(),
  fitur       text not null check (fitur in ('tp', 'modul_ajar', 'slide', 'soal', 'lainnya')),
  token_masuk int not null default 0,
  token_keluar int not null default 0,
  berhasil    boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists pemakaian_ai_user on public.pemakaian_ai (user_id, created_at);

-- kuota harian per orang (default 30), hanya staf
create or replace function public.ambil_kuota_ai(p_fitur text)
returns int language plpgsql security definer set search_path = '' as $$
declare n int; batas int := 30;
begin
  if not public.staf_aktif() then raise exception 'Asisten AI hanya untuk guru & staf' using errcode = '42501'; end if;
  select count(*) into n from public.pemakaian_ai where user_id = auth.uid()
    and created_at >= ((now() at time zone 'Asia/Jakarta')::date at time zone 'Asia/Jakarta');
  if n >= batas then raise exception 'Kuota Asisten AI hari ini (% permintaan) sudah habis. Coba lagi besok.', batas using errcode = '22023'; end if;
  insert into public.pemakaian_ai (user_id, fitur) values (auth.uid(), p_fitur);
  return batas - n - 1;
end $$;
revoke all on function public.ambil_kuota_ai(text) from public, anon;
grant execute on function public.ambil_kuota_ai(text) to authenticated;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['struktur_kurikulum', 'capaian_pembelajaran', 'tujuan_pembelajaran', 'atp_status', 'perangkat_ajar',
                           'projek_kokurikuler', 'projek_kelas', 'supervisi_akademik', 'materi_kelas', 'materi_kelas_target', 'pemakaian_ai'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke truncate on public.%I from authenticated', t);
    if t <> 'pemakaian_ai' then
      execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
      execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.catat_audit()', t);
    end if;
  end loop;
end $$;

-- struktur: dibaca semua warga yang login, dikelola kurikulum
drop policy if exists "baca struktur" on public.struktur_kurikulum;
create policy "baca struktur" on public.struktur_kurikulum for select to authenticated using (true);
drop policy if exists "kelola struktur" on public.struktur_kurikulum;
create policy "kelola struktur" on public.struktur_kurikulum for all to authenticated
  using ((select public.punya_izin('kurikulum.kelola'))) with check ((select public.punya_izin('kurikulum.kelola')));

-- CP & TP: dibaca staf, diubah kurikulum / guru pengampu (selama ATP belum final)
drop policy if exists "baca cp" on public.capaian_pembelajaran;
create policy "baca cp" on public.capaian_pembelajaran for select to authenticated using ((select public.staf_aktif()));
drop policy if exists "kelola cp" on public.capaian_pembelajaran;
create policy "kelola cp" on public.capaian_pembelajaran for all to authenticated
  using (public.boleh_ubah_atp(mapel_id, fase)) with check (public.boleh_ubah_atp(mapel_id, fase));
drop policy if exists "baca tp" on public.tujuan_pembelajaran;
create policy "baca tp" on public.tujuan_pembelajaran for select to authenticated using ((select public.staf_aktif()));
drop policy if exists "kelola tp" on public.tujuan_pembelajaran;
create policy "kelola tp" on public.tujuan_pembelajaran for all to authenticated
  using (public.boleh_ubah_atp(mapel_id, fase)) with check (public.boleh_ubah_atp(mapel_id, fase));
revoke delete on public.capaian_pembelajaran, public.tujuan_pembelajaran from authenticated;  -- arsip saja
drop policy if exists "baca atp status" on public.atp_status;
create policy "baca atp status" on public.atp_status for select to authenticated using ((select public.staf_aktif()));
drop policy if exists "kelola atp status" on public.atp_status;
create policy "kelola atp status" on public.atp_status for all to authenticated
  using ((select public.punya_izin('kurikulum.kelola'))) with check ((select public.punya_izin('kurikulum.kelola')));

-- perangkat ajar: pemilik, kurikulum, kepala sekolah (supervisi)
drop policy if exists "baca perangkat" on public.perangkat_ajar;
create policy "baca perangkat" on public.perangkat_ajar for select to authenticated
  using (pegawai_id = (select public.pegawai_saya()) or (select public.punya_izin('kurikulum.kelola')) or (select public.punya_izin('supervisi.kelola')));
drop policy if exists "tambah perangkat" on public.perangkat_ajar;
create policy "tambah perangkat" on public.perangkat_ajar for insert to authenticated
  with check (pegawai_id = (select public.pegawai_saya()) or (select public.punya_izin('kurikulum.kelola')));
drop policy if exists "ubah perangkat" on public.perangkat_ajar;
create policy "ubah perangkat" on public.perangkat_ajar for update to authenticated
  using (pegawai_id = (select public.pegawai_saya()) or (select public.punya_izin('kurikulum.kelola')))
  with check (pegawai_id = (select public.pegawai_saya()) or (select public.punya_izin('kurikulum.kelola')));
revoke delete on public.perangkat_ajar from authenticated;

-- projek kokurikuler: dibaca semua yang login, dikelola kurikulum (koordinator boleh ubah status)
drop policy if exists "baca projek" on public.projek_kokurikuler;
create policy "baca projek" on public.projek_kokurikuler for select to authenticated using (deleted_at is null or (select public.punya_izin('kurikulum.kelola')));
drop policy if exists "tambah projek" on public.projek_kokurikuler;
create policy "tambah projek" on public.projek_kokurikuler for insert to authenticated with check ((select public.punya_izin('kurikulum.kelola')));
drop policy if exists "ubah projek" on public.projek_kokurikuler;
create policy "ubah projek" on public.projek_kokurikuler for update to authenticated
  using ((select public.punya_izin('kurikulum.kelola')) or koordinator_id = (select public.pegawai_saya()))
  with check ((select public.punya_izin('kurikulum.kelola')) or koordinator_id = (select public.pegawai_saya()));
revoke delete on public.projek_kokurikuler from authenticated;
drop policy if exists "baca projek kelas" on public.projek_kelas;
create policy "baca projek kelas" on public.projek_kelas for select to authenticated using (true);
drop policy if exists "kelola projek kelas" on public.projek_kelas;
create policy "kelola projek kelas" on public.projek_kelas for all to authenticated
  using ((select public.punya_izin('kurikulum.kelola'))) with check ((select public.punya_izin('kurikulum.kelola')));

-- supervisi: guru ybs, supervisor, kepala sekolah/kurikulum
drop policy if exists "baca supervisi" on public.supervisi_akademik;
create policy "baca supervisi" on public.supervisi_akademik for select to authenticated
  using (pegawai_id = (select public.pegawai_saya()) or supervisor_id = (select public.pegawai_saya()) or (select public.punya_izin('supervisi.kelola')));
drop policy if exists "tambah supervisi" on public.supervisi_akademik;
create policy "tambah supervisi" on public.supervisi_akademik for insert to authenticated with check ((select public.punya_izin('supervisi.kelola')));
drop policy if exists "ubah supervisi" on public.supervisi_akademik;
create policy "ubah supervisi" on public.supervisi_akademik for update to authenticated
  using (supervisor_id = (select public.pegawai_saya()) or (select public.punya_izin('supervisi.kelola')))
  with check (supervisor_id = (select public.pegawai_saya()) or (select public.punya_izin('supervisi.kelola')));
revoke delete on public.supervisi_akademik from authenticated;

-- materi: pemilik; siswa/ortu kelas tujuan bila terbit; kurikulum melihat semua
drop policy if exists "baca materi" on public.materi_kelas;
create policy "baca materi" on public.materi_kelas for select to authenticated
  using (pegawai_id = (select public.pegawai_saya()) or (select public.punya_izin('kurikulum.kelola'))
         or (terbit and deleted_at is null and exists (select 1 from public.materi_kelas_target mt where mt.materi_id = materi_kelas.id and public.warga_kelas(mt.kelas_id))));
drop policy if exists "tambah materi" on public.materi_kelas;
create policy "tambah materi" on public.materi_kelas for insert to authenticated with check (pegawai_id = (select public.pegawai_saya()));
drop policy if exists "ubah materi" on public.materi_kelas;
create policy "ubah materi" on public.materi_kelas for update to authenticated
  using (pegawai_id = (select public.pegawai_saya())) with check (pegawai_id = (select public.pegawai_saya()));
revoke delete on public.materi_kelas from authenticated;
drop policy if exists "baca materi target" on public.materi_kelas_target;
create policy "baca materi target" on public.materi_kelas_target for select to authenticated using (true);
create or replace function public.pemilik_materi(p_materi uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.materi_kelas m where m.id = p_materi and m.pegawai_id = public.pegawai_saya());
$$;
grant execute on function public.pemilik_materi(uuid) to authenticated;
drop policy if exists "kelola materi target" on public.materi_kelas_target;
create policy "kelola materi target" on public.materi_kelas_target for all to authenticated
  using (public.pemilik_materi(materi_id)) with check (public.pemilik_materi(materi_id));

-- pemakaian AI: lewat fungsi; dibaca pemiliknya & super admin
drop policy if exists "baca pemakaian ai" on public.pemakaian_ai;
create policy "baca pemakaian ai" on public.pemakaian_ai for select to authenticated
  using (user_id = (select auth.uid()) or (select public.punya_izin('pengguna.kelola')));
revoke insert, update, delete on public.pemakaian_ai from authenticated;

-- izin baca berkas perangkat: gunakan rute /berkas (cek RLS baris, lalu tautan bertanda tangan)

notify pgrst, 'reload schema';
