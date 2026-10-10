-- =====================================================================
-- Fase 10 — Modul 07 LMS & Modul 17 Sarana Prasarana
--   A. LMS: tugas + pengumpulan + penilaian, kuis online (dinilai server), pengingat tenggat
--   B. Sarpras: inventaris barang, ruang, peminjaman (cek bentrok), laporan kerusakan
-- Idempoten: aman dijalankan ulang.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper umum
-- ---------------------------------------------------------------------
create or replace function public.siswa_login()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.siswa where user_id = auth.uid() and deleted_at is null limit 1;
$$;
-- siswa ini anggota kelas tsb (tahun ajaran aktif)?
create or replace function public.siswa_di_kelas(p_siswa uuid, p_kelas uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.anggota_kelas ak join public.tahun_ajaran t on t.id = ak.tahun_ajaran_id and t.aktif
                  where ak.siswa_id = p_siswa and ak.kelas_id = p_kelas);
$$;
-- pengguna boleh melihat data siswa ini sebagai siswa itu sendiri / orang tuanya
create or replace function public.diri_atau_anak(p_siswa uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.siswa s where s.id = p_siswa and s.user_id = auth.uid())
      or exists (select 1 from public.siswa_orang_tua so join public.orang_tua o on o.id = so.orang_tua_id
                  where so.siswa_id = p_siswa and o.user_id = auth.uid());
$$;
grant execute on function public.siswa_login(), public.siswa_di_kelas(uuid, uuid), public.diri_atau_anak(uuid) to authenticated;

-- =====================================================================
-- A. LMS
-- =====================================================================
create table if not exists public.tugas (
  id               uuid primary key default gen_random_uuid(),
  pegawai_id       uuid not null references public.pegawai (id),
  mapel_id         uuid not null references public.mapel (id),
  judul            text not null check (char_length(judul) between 3 and 150),
  instruksi        text not null default '' check (char_length(instruksi) <= 5000),
  tautan           text not null default '' check (tautan = '' or tautan ~ '^https://'),
  tenggat          timestamptz not null,
  nilai_maks       smallint not null default 100 check (nilai_maks between 1 and 1000),
  terima_terlambat boolean not null default true,
  terbit           boolean not null default false,
  terbit_pada      timestamptz,
  tp_ids           uuid[] not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create table if not exists public.tugas_kelas (
  tugas_id uuid not null references public.tugas (id) on delete cascade,
  kelas_id uuid not null references public.kelas (id),
  primary key (tugas_id, kelas_id)
);
create table if not exists public.pengumpulan_tugas (
  id            uuid primary key default gen_random_uuid(),
  tugas_id      uuid not null references public.tugas (id) on delete cascade,
  siswa_id      uuid not null references public.siswa (id),
  jawaban       text not null default '' check (char_length(jawaban) <= 5000),
  tautan        text not null default '' check (tautan = '' or tautan ~ '^https://'),
  berkas_path   text not null default '' check (char_length(berkas_path) <= 300),
  berkas_nama   text not null default '' check (char_length(berkas_nama) <= 150),
  dikumpul_pada timestamptz not null default now(),
  terlambat     boolean not null default false,
  nilai         numeric(6, 2),
  komentar      text not null default '' check (char_length(komentar) <= 2000),
  status        text not null default 'dikumpulkan' check (status in ('dikumpulkan', 'dinilai', 'dikembalikan')),
  dinilai_oleh  uuid,
  dinilai_pada  timestamptz,
  unique (tugas_id, siswa_id)
);
create index if not exists pengumpulan_siswa on public.pengumpulan_tugas (siswa_id);

create table if not exists public.kuis (
  id            uuid primary key default gen_random_uuid(),
  pegawai_id    uuid not null references public.pegawai (id),
  mapel_id      uuid not null references public.mapel (id),
  judul         text not null check (char_length(judul) between 3 and 150),
  petunjuk      text not null default '' check (char_length(petunjuk) <= 2000),
  mulai         timestamptz not null,
  selesai       timestamptz not null,
  durasi_menit  smallint not null default 30 check (durasi_menit between 1 and 300),
  acak          boolean not null default true,
  tampil_hasil  text not null default 'setelah_tutup' check (tampil_hasil in ('langsung', 'setelah_tutup')),
  terbit        boolean not null default false,
  terbit_pada   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint kuis_rentang check (selesai > mulai)
);
create table if not exists public.kuis_kelas (
  kuis_id  uuid not null references public.kuis (id) on delete cascade,
  kelas_id uuid not null references public.kelas (id),
  primary key (kuis_id, kelas_id)
);
create table if not exists public.kuis_soal (
  id         uuid primary key default gen_random_uuid(),
  kuis_id    uuid not null references public.kuis (id) on delete cascade,
  urutan     smallint not null default 0,
  pertanyaan text not null check (char_length(pertanyaan) between 3 and 2000),
  pilihan    text[] not null check (array_length(pilihan, 1) between 2 and 5),
  kunci      smallint not null check (kunci between 0 and 4),
  pembahasan text not null default '' check (char_length(pembahasan) <= 1000),
  bobot      smallint not null default 1 check (bobot between 1 and 10),
  constraint soal_kunci check (kunci < array_length(pilihan, 1))
);
create index if not exists kuis_soal_kuis on public.kuis_soal (kuis_id, urutan);
create table if not exists public.kuis_percobaan (
  id           uuid primary key default gen_random_uuid(),
  kuis_id      uuid not null references public.kuis (id) on delete cascade,
  siswa_id     uuid not null references public.siswa (id),
  mulai_pada   timestamptz not null default now(),
  batas_pada   timestamptz not null,
  selesai_pada timestamptz,
  jawaban      jsonb not null default '{}'::jsonb,
  benar        int,
  total        int,
  skor         numeric(5, 2),
  unique (kuis_id, siswa_id)
);

-- guru pemilik tugas/kuis/kelas tujuan
create or replace function public.pemilik_tugas(p uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tugas where id = p and pegawai_id = public.pegawai_saya());
$$;
create or replace function public.pemilik_kuis(p uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.kuis where id = p and pegawai_id = public.pegawai_saya());
$$;
-- siswa/ortu: tugas/kuis ini ditujukan ke kelasnya?
create or replace function public.untuk_saya_tugas(p uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tugas_kelas tk where tk.tugas_id = p and public.warga_kelas(tk.kelas_id));
$$;
create or replace function public.untuk_saya_kuis(p uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.kuis_kelas kk where kk.kuis_id = p and public.warga_kelas(kk.kelas_id));
$$;
grant execute on function public.pemilik_tugas(uuid), public.pemilik_kuis(uuid), public.untuk_saya_tugas(uuid), public.untuk_saya_kuis(uuid) to authenticated;

-- penjaga: dibuat atas nama sendiri; kelas tujuan harus diajar guru tsb untuk mapel itu
create or replace function public.jaga_lms() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.pegawai_id is distinct from public.pegawai_saya() then raise exception 'Dibuat atas nama sendiri' using errcode = '42501'; end if;
  else
    new.pegawai_id := old.pegawai_id; new.updated_at := now();
  end if;
  if new.terbit and (tg_op = 'INSERT' or not old.terbit) then new.terbit_pada := now(); end if;
  return new;
end $$;
drop trigger if exists jaga_tugas on public.tugas;
create trigger jaga_tugas before insert or update on public.tugas for each row execute function public.jaga_lms();
drop trigger if exists jaga_kuis on public.kuis;
create trigger jaga_kuis before insert or update on public.kuis for each row execute function public.jaga_lms();

create or replace function public.jaga_lms_kelas() returns trigger language plpgsql security definer set search_path = '' as $$
declare g uuid; m uuid;
begin
  if tg_table_name = 'tugas_kelas' then select pegawai_id, mapel_id into g, m from public.tugas where id = new.tugas_id;
  else select pegawai_id, mapel_id into g, m from public.kuis where id = new.kuis_id; end if;
  if not exists (select 1 from public.penugasan_mengajar p join public.tahun_ajaran t on t.id = p.tahun_ajaran_id and t.aktif
                  where p.kelas_id = new.kelas_id and p.mapel_id = m and p.pegawai_id = g and p.deleted_at is null) then
    raise exception 'Kelas tersebut tidak Anda ajar untuk mapel ini' using errcode = '22023';
  end if;
  return new;
end $$;
drop trigger if exists jaga_tugas_kelas on public.tugas_kelas;
create trigger jaga_tugas_kelas before insert on public.tugas_kelas for each row execute function public.jaga_lms_kelas();
drop trigger if exists jaga_kuis_kelas on public.kuis_kelas;
create trigger jaga_kuis_kelas before insert on public.kuis_kelas for each row execute function public.jaga_lms_kelas();

-- kuis yang sudah dikerjakan siswa: soal tidak boleh diubah lagi (keadilan)
create or replace function public.jaga_soal() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.kuis_percobaan where kuis_id = coalesce(new.kuis_id, old.kuis_id)) then
    raise exception 'Kuis sudah dikerjakan siswa; soal tidak bisa diubah' using errcode = '22023';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists jaga_soal on public.kuis_soal;
create trigger jaga_soal before insert or update or delete on public.kuis_soal for each row execute function public.jaga_soal();

-- --------------------------- Tugas: kumpul & nilai ---------------------------
create or replace function public.kumpul_tugas(p_tugas uuid, p_jawaban text, p_tautan text default '', p_berkas text default '', p_berkas_nama text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare t public.tugas; s uuid := public.siswa_login(); lama public.pengumpulan_tugas;
begin
  if s is null then raise exception 'Hanya siswa yang dapat mengumpulkan tugas' using errcode = '42501'; end if;
  select * into t from public.tugas where id = p_tugas and terbit and deleted_at is null;
  if t.id is null or not exists (select 1 from public.tugas_kelas tk where tk.tugas_id = p_tugas and public.siswa_di_kelas(s, tk.kelas_id)) then
    raise exception 'Tugas tidak ditemukan' using errcode = '42501';
  end if;
  if now() > t.tenggat and not t.terima_terlambat then raise exception 'Tenggat sudah lewat' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_jawaban, ''))) = 0 and coalesce(p_tautan, '') = '' and coalesce(p_berkas, '') = '' then
    raise exception 'Isi jawaban, tautan, atau unggah berkas' using errcode = '22023';
  end if;
  if coalesce(p_berkas, '') <> '' and split_part(p_berkas, '/', 1) <> auth.uid()::text then
    raise exception 'Berkas tidak valid' using errcode = '42501';
  end if;
  select * into lama from public.pengumpulan_tugas where tugas_id = p_tugas and siswa_id = s;
  if lama.status = 'dinilai' then raise exception 'Tugas sudah dinilai; hubungi guru bila perlu mengumpulkan ulang' using errcode = '22023'; end if;
  insert into public.pengumpulan_tugas (tugas_id, siswa_id, jawaban, tautan, berkas_path, berkas_nama, dikumpul_pada, terlambat, status)
  values (p_tugas, s, left(coalesce(p_jawaban, ''), 5000), coalesce(p_tautan, ''), coalesce(nullif(p_berkas, ''), lama.berkas_path, ''),
          case when coalesce(p_berkas, '') <> '' then left(coalesce(p_berkas_nama, ''), 150) else coalesce(lama.berkas_nama, '') end,
          now(), now() > t.tenggat, 'dikumpulkan')
  on conflict (tugas_id, siswa_id) do update set jawaban = excluded.jawaban, tautan = excluded.tautan, berkas_path = excluded.berkas_path,
    berkas_nama = excluded.berkas_nama, dikumpul_pada = now(), terlambat = excluded.terlambat, status = 'dikumpulkan';
end $$;

create or replace function public.nilai_tugas(p_id uuid, p_nilai numeric, p_komentar text default '', p_kembalikan boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare k public.pengumpulan_tugas; t public.tugas;
begin
  select * into k from public.pengumpulan_tugas where id = p_id;
  select * into t from public.tugas where id = k.tugas_id;
  if k.id is null or t.pegawai_id is distinct from public.pegawai_saya() then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  if not p_kembalikan and (p_nilai is null or p_nilai < 0 or p_nilai > t.nilai_maks) then
    raise exception 'Nilai harus 0–%', t.nilai_maks using errcode = '22023';
  end if;
  update public.pengumpulan_tugas
     set nilai = case when p_kembalikan then null else p_nilai end, komentar = left(coalesce(p_komentar, ''), 2000),
         status = case when p_kembalikan then 'dikembalikan' else 'dinilai' end, dinilai_oleh = auth.uid(), dinilai_pada = now()
   where id = p_id;
  perform public.kirim_notif((select user_id from public.siswa where id = k.siswa_id), 'kurikulum',
    case when p_kembalikan then 'Tugas dikembalikan untuk diperbaiki' else 'Nilai tugas: ' || t.judul end,
    case when p_kembalikan then t.judul || coalesce(' — ' || nullif(p_komentar, ''), '') else 'Nilai ' || trim(to_char(p_nilai, 'FM999990.##')) || '/' || t.nilai_maks end,
    '/portal/tugas/' || t.id, 'biasa', false);
end $$;

-- pemberitahuan tugas/kuis terbit ke siswa (lonceng)
create or replace function public.umumkan_lms(p_jenis text, p_id uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare u uuid; n int := 0; judul text; tenggat timestamptz; ok boolean;
begin
  if p_jenis = 'tugas' then
    select t.judul, t.tenggat, t.terbit and t.pegawai_id = public.pegawai_saya() into judul, tenggat, ok from public.tugas t where t.id = p_id;
  else
    select k.judul, k.mulai, k.terbit and k.pegawai_id = public.pegawai_saya() into judul, tenggat, ok from public.kuis k where k.id = p_id;
  end if;
  if not coalesce(ok, false) then raise exception 'Tidak ditemukan / belum terbit' using errcode = '22023'; end if;
  for u in select distinct s.user_id from public.anggota_kelas ak
            join public.tahun_ajaran t on t.id = ak.tahun_ajaran_id and t.aktif
            join public.siswa s on s.id = ak.siswa_id and s.deleted_at is null and s.user_id is not null
           where ak.kelas_id in (select kelas_id from public.tugas_kelas where tugas_id = p_id and p_jenis = 'tugas'
                                 union select kelas_id from public.kuis_kelas where kuis_id = p_id and p_jenis = 'kuis') loop
    perform public.kirim_notif(u, 'kurikulum', case when p_jenis = 'tugas' then 'Tugas baru: ' else 'Kuis: ' end || judul,
      case when p_jenis = 'tugas' then 'Tenggat ' else 'Dibuka ' end || to_char(tenggat at time zone 'Asia/Jakarta', 'DD-MM-YYYY HH24:MI') || ' WIB',
      '/portal/' || p_jenis || '/' || p_id, 'biasa', false);
    n := n + 1;
  end loop;
  return n;
end $$;

-- pengingat harian (dipanggil penjadwal dengan kunci server): tenggat ≤ 24 jam & belum mengumpulkan
create or replace function public.pengingat_tugas()
returns int language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  for r in select distinct t.id, t.judul, t.tenggat, s.user_id from public.tugas t
            join public.tugas_kelas tk on tk.tugas_id = t.id
            join public.anggota_kelas ak on ak.kelas_id = tk.kelas_id
            join public.tahun_ajaran ta on ta.id = ak.tahun_ajaran_id and ta.aktif
            join public.siswa s on s.id = ak.siswa_id and s.deleted_at is null and s.user_id is not null
           where t.terbit and t.deleted_at is null and t.tenggat between now() and now() + interval '24 hours'
             and not exists (select 1 from public.pengumpulan_tugas p where p.tugas_id = t.id and p.siswa_id = s.id)
             and not exists (select 1 from public.notifikasi x where x.user_id = s.user_id and x.tautan = '/portal/tugas/' || t.id
                              and x.judul like 'Pengingat%') loop
    perform public.kirim_notif(r.user_id, 'kurikulum', 'Pengingat: ' || r.judul,
      'Tenggat ' || to_char(r.tenggat at time zone 'Asia/Jakarta', 'DD-MM HH24:MI') || ' WIB dan Anda belum mengumpulkan.', '/portal/tugas/' || r.id, 'biasa', false);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.pengingat_tugas() from public, anon, authenticated;
grant execute on function public.pengingat_tugas() to service_role;

-- --------------------------- Kuis: kerjakan & nilai di server ---------------------------
create or replace function public._nilai_percobaan(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.kuis_percobaan; b int; tot int; sb numeric; st numeric;
begin
  select * into a from public.kuis_percobaan where id = p_id;
  select count(*) filter (where (a.jawaban ->> s.id::text)::int = s.kunci), count(*),
         coalesce(sum(s.bobot) filter (where (a.jawaban ->> s.id::text)::int = s.kunci), 0), coalesce(sum(s.bobot), 0)
    into b, tot, sb, st
    from public.kuis_soal s where s.kuis_id = a.kuis_id;
  update public.kuis_percobaan set benar = b, total = tot, skor = case when st > 0 then round(sb / st * 100, 2) else 0 end,
         selesai_pada = coalesce(selesai_pada, least(now(), batas_pada))
   where id = p_id;
end $$;
revoke all on function public._nilai_percobaan(uuid) from public, anon, authenticated;

-- selesaikan otomatis percobaan yang waktunya habis
create or replace function public._tutup_kedaluwarsa(p_kuis uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare x uuid;
begin
  for x in select id from public.kuis_percobaan where kuis_id = p_kuis and selesai_pada is null and batas_pada < now() loop
    perform public._nilai_percobaan(x);
  end loop;
end $$;
revoke all on function public._tutup_kedaluwarsa(uuid) from public, anon, authenticated;

create or replace function public.mulai_kuis(p_kuis uuid)
returns table (batas_pada timestamptz, selesai boolean) language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare k public.kuis; s uuid := public.siswa_login(); a public.kuis_percobaan;
begin
  if s is null then raise exception 'Hanya siswa yang dapat mengerjakan kuis' using errcode = '42501'; end if;
  select * into k from public.kuis where id = p_kuis and terbit and deleted_at is null;
  if k.id is null or not exists (select 1 from public.kuis_kelas kk where kk.kuis_id = p_kuis and public.siswa_di_kelas(s, kk.kelas_id)) then
    raise exception 'Kuis tidak ditemukan' using errcode = '42501';
  end if;
  perform public._tutup_kedaluwarsa(p_kuis);
  select * into a from public.kuis_percobaan where kuis_id = p_kuis and siswa_id = s;
  if a.id is null then
    if now() < k.mulai then raise exception 'Kuis belum dibuka (mulai %)', to_char(k.mulai at time zone 'Asia/Jakarta', 'DD-MM HH24:MI') using errcode = '22023'; end if;
    if now() >= k.selesai then raise exception 'Kuis sudah ditutup' using errcode = '22023'; end if;
    insert into public.kuis_percobaan (kuis_id, siswa_id, batas_pada)
    values (p_kuis, s, least(now() + make_interval(mins => k.durasi_menit), k.selesai)) returning * into a;
  end if;
  return query select a.batas_pada, a.selesai_pada is not null;
end $$;

-- soal untuk siswa: TANPA kunci; hanya selama percobaannya berjalan
create or replace function public.soal_kuis_saya(p_kuis uuid)
returns table (id uuid, pertanyaan text, pilihan text[], jawaban int) language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare a public.kuis_percobaan; k public.kuis;
begin
  select * into a from public.kuis_percobaan where kuis_id = p_kuis and siswa_id = public.siswa_login();
  if a.id is null or a.selesai_pada is not null or a.batas_pada < now() then return; end if;
  select * into k from public.kuis where id = p_kuis;
  return query select s.id, s.pertanyaan, s.pilihan, (a.jawaban ->> s.id::text)::int from public.kuis_soal s where s.kuis_id = p_kuis
    order by case when k.acak then md5(a.id::text || s.id::text) else lpad(s.urutan::text, 5, '0') end;
end $$;

create or replace function public.jawab_kuis(p_kuis uuid, p_jawaban jsonb, p_selesai boolean default false)
returns numeric language plpgsql security definer set search_path = '' as $$
declare a public.kuis_percobaan; k public.kuis; bersih jsonb;
begin
  select * into a from public.kuis_percobaan where kuis_id = p_kuis and siswa_id = public.siswa_login() for update;
  if a.id is null then raise exception 'Mulai kuis terlebih dahulu' using errcode = '22023'; end if;
  if a.selesai_pada is not null then raise exception 'Kuis sudah diselesaikan' using errcode = '22023'; end if;
  -- simpan hanya jawaban untuk soal kuis ini (indeks 0–4), selama masih dalam batas waktu (+30 detik toleransi jaringan)
  if now() <= a.batas_pada + interval '30 seconds' then
    select coalesce(jsonb_object_agg(s.id::text, (p_jawaban ->> s.id::text)::int), '{}'::jsonb) into bersih
      from public.kuis_soal s where s.kuis_id = p_kuis and (p_jawaban ->> s.id::text) ~ '^[0-4]$';
    update public.kuis_percobaan set jawaban = bersih where id = a.id;
  end if;
  if p_selesai or now() > a.batas_pada then
    perform public._nilai_percobaan(a.id);
    select * into k from public.kuis where id = p_kuis;
    return case when k.tampil_hasil = 'langsung' then (select skor from public.kuis_percobaan where id = a.id) end;
  end if;
  return null;
end $$;

-- hasil & pembahasan untuk siswa/ortu: setelah selesai (langsung) atau setelah kuis ditutup
create or replace function public.hasil_kuis(p_kuis uuid, p_siswa uuid default null)
returns table (soal_id uuid, pertanyaan text, pilihan text[], kunci smallint, pembahasan text, jawaban int, skor numeric, benar int, total int)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare k public.kuis; a public.kuis_percobaan; sid uuid := coalesce(p_siswa, public.siswa_login());
begin
  if sid is null or not public.diri_atau_anak(sid) then return; end if;
  select * into k from public.kuis where id = p_kuis;
  perform public._tutup_kedaluwarsa(p_kuis);
  select * into a from public.kuis_percobaan where kuis_id = p_kuis and siswa_id = sid;
  if a.id is null or a.selesai_pada is null then return; end if;
  if k.tampil_hasil = 'setelah_tutup' and now() < k.selesai then return; end if;
  return query select s.id, s.pertanyaan, s.pilihan, s.kunci, s.pembahasan, (a.jawaban ->> s.id::text)::int, a.skor, a.benar, a.total
    from public.kuis_soal s where s.kuis_id = p_kuis order by s.urutan;
end $$;

-- status kuis untuk siswa/ortu (skor hanya bila boleh ditampilkan)
create or replace function public.status_kuis(p_siswa uuid)
returns table (kuis_id uuid, mulai_pada timestamptz, selesai_pada timestamptz, skor numeric)
language sql stable security definer set search_path = '' as $$
  select a.kuis_id, a.mulai_pada, coalesce(a.selesai_pada, case when a.batas_pada < now() then a.batas_pada end),
         case when k.tampil_hasil = 'langsung' or now() >= k.selesai then a.skor end
  from public.kuis_percobaan a join public.kuis k on k.id = a.kuis_id
  where a.siswa_id = p_siswa and public.diri_atau_anak(p_siswa);
$$;
revoke all on function public.status_kuis(uuid) from public, anon;
grant execute on function public.status_kuis(uuid) to authenticated;

-- rekap nilai kuis untuk guru pemilik
create or replace function public.rekap_kuis(p_kuis uuid)
returns table (siswa_id uuid, nama text, kelas text, mulai_pada timestamptz, selesai_pada timestamptz, benar int, total int, skor numeric)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not (public.pemilik_kuis(p_kuis) or public.punya_izin('kurikulum.kelola')) then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  perform public._tutup_kedaluwarsa(p_kuis);
  return query
    select s.id, s.nama, k.nama, a.mulai_pada, a.selesai_pada, a.benar, a.total, a.skor
    from public.kuis_kelas kk join public.kelas k on k.id = kk.kelas_id
    join public.anggota_kelas ak on ak.kelas_id = kk.kelas_id join public.tahun_ajaran t on t.id = ak.tahun_ajaran_id and t.aktif
    join public.siswa s on s.id = ak.siswa_id and s.deleted_at is null
    left join public.kuis_percobaan a on a.kuis_id = p_kuis and a.siswa_id = s.id
    where kk.kuis_id = p_kuis order by k.nama, s.nama;
end $$;

-- daftar siswa kelas tujuan tugas + status pengumpulan (guru pemilik)
create or replace function public.rekap_tugas(p_tugas uuid)
returns table (siswa_id uuid, nama text, kelas text, pengumpulan_id uuid, status text, dikumpul_pada timestamptz, terlambat boolean, nilai numeric)
language sql stable security definer set search_path = '' as $$
  select s.id, s.nama, k.nama, p.id, coalesce(p.status, 'belum'), p.dikumpul_pada, p.terlambat, p.nilai
  from public.tugas_kelas tk join public.kelas k on k.id = tk.kelas_id
  join public.anggota_kelas ak on ak.kelas_id = tk.kelas_id join public.tahun_ajaran t on t.id = ak.tahun_ajaran_id and t.aktif
  join public.siswa s on s.id = ak.siswa_id and s.deleted_at is null
  left join public.pengumpulan_tugas p on p.tugas_id = p_tugas and p.siswa_id = s.id
  where tk.tugas_id = p_tugas and (public.pemilik_tugas(p_tugas) or public.punya_izin('kurikulum.kelola'))
  order by k.nama, s.nama;
$$;

revoke all on function public.kumpul_tugas(uuid, text, text, text, text), public.nilai_tugas(uuid, numeric, text, boolean), public.umumkan_lms(text, uuid),
  public.mulai_kuis(uuid), public.soal_kuis_saya(uuid), public.jawab_kuis(uuid, jsonb, boolean), public.hasil_kuis(uuid, uuid),
  public.rekap_kuis(uuid), public.rekap_tugas(uuid) from public, anon;
grant execute on function public.kumpul_tugas(uuid, text, text, text, text), public.nilai_tugas(uuid, numeric, text, boolean), public.umumkan_lms(text, uuid),
  public.mulai_kuis(uuid), public.soal_kuis_saya(uuid), public.jawab_kuis(uuid, jsonb, boolean), public.hasil_kuis(uuid, uuid),
  public.rekap_kuis(uuid), public.rekap_tugas(uuid) to authenticated;

-- berkas jawaban tugas (privat)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('tugas', 'tugas', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('sarpras', 'sarpras', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "unggah berkas privat sendiri" on storage.objects;
create policy "unggah berkas privat sendiri" on storage.objects for insert to authenticated
  with check (bucket_id in ('bukti', 'presensi', 'perangkat', 'tugas', 'sarpras') and split_part(name, '/', 1) = auth.uid()::text);
drop policy if exists "lihat berkas privat sendiri" on storage.objects;
create policy "lihat berkas privat sendiri" on storage.objects for select to authenticated
  using (bucket_id in ('bukti', 'presensi', 'perangkat', 'tugas', 'sarpras') and split_part(name, '/', 1) = auth.uid()::text);

-- =====================================================================
-- B. Sarana & prasarana
-- =====================================================================
insert into public.peran (kode, nama, keterangan, urutan) values ('sarpras', 'Wakasek Sarpras', 'Mengelola inventaris, ruang, peminjaman & perbaikan', 4)
on conflict (kode) do nothing;
insert into public.izin (kode, keterangan) values
  ('sarpras.kelola', 'Mengelola inventaris, ruang, menyetujui peminjaman & menangani kerusakan'),
  ('sarpras.lihat', 'Melihat inventaris & rekap aset')
on conflict (kode) do update set keterangan = excluded.keterangan;
insert into public.peran_izin (peran, izin) values
  ('super_admin', 'sarpras.kelola'), ('sarpras', 'sarpras.kelola'), ('sarpras', 'sarpras.lihat'), ('super_admin', 'sarpras.lihat'),
  ('kepala_sekolah', 'sarpras.lihat'), ('wakasek', 'sarpras.lihat'), ('operator', 'sarpras.lihat')
on conflict do nothing;

alter table public.ruang add column if not exists gedung text not null default '' check (char_length(gedung) <= 60);
alter table public.ruang add column if not exists kondisi text not null default 'baik' check (kondisi in ('baik', 'rusak_ringan', 'rusak_berat'));
alter table public.ruang add column if not exists bisa_dipinjam boolean not null default false;
alter table public.ruang add column if not exists penanggung_jawab_id uuid references public.pegawai (id);
drop policy if exists "kelola ruang sarpras" on public.ruang;
create policy "kelola ruang sarpras" on public.ruang for update to authenticated
  using ((select public.punya_izin('sarpras.kelola'))) with check ((select public.punya_izin('sarpras.kelola')));
drop policy if exists "tambah ruang sarpras" on public.ruang;
create policy "tambah ruang sarpras" on public.ruang for insert to authenticated with check ((select public.punya_izin('sarpras.kelola')));

create table if not exists public.kategori_barang (
  id    uuid primary key default gen_random_uuid(),
  kode  text not null unique check (kode ~ '^[A-Z]{2,5}$'),
  nama  text not null check (char_length(nama) between 2 and 60),
  urutan smallint not null default 0
);
insert into public.kategori_barang (kode, nama, urutan) values
  ('ELK', 'Elektronik & TIK', 1), ('MBL', 'Mebel', 2), ('LAB', 'Alat laboratorium', 3), ('OLR', 'Alat olahraga', 4),
  ('KES', 'Alat kesenian', 5), ('BKU', 'Buku & media', 6), ('KND', 'Kendaraan', 7), ('LN', 'Lainnya', 9)
on conflict (kode) do nothing;

create sequence if not exists public.nomor_barang;
create table if not exists public.barang (
  id              uuid primary key default gen_random_uuid(),
  kode            text not null unique,
  nama            text not null check (char_length(nama) between 2 and 150),
  kategori_id     uuid not null references public.kategori_barang (id),
  merk            text not null default '' check (char_length(merk) <= 100),
  spesifikasi     text not null default '' check (char_length(spesifikasi) <= 1000),
  ruang_id        uuid references public.ruang (id),
  jumlah          int not null default 1 check (jumlah between 1 and 100000),
  satuan          text not null default 'unit' check (char_length(satuan) <= 20),
  kondisi         text not null default 'baik' check (kondisi in ('baik', 'rusak_ringan', 'rusak_berat', 'hilang')),
  sumber_dana     text not null default '' check (char_length(sumber_dana) <= 60),
  tahun_perolehan smallint check (tahun_perolehan between 1950 and 2100),
  harga           numeric(14, 2) check (harga >= 0),
  bisa_dipinjam   boolean not null default false,
  foto_path       text not null default '' check (char_length(foto_path) <= 300),
  keterangan      text not null default '' check (char_length(keterangan) <= 1000),
  alasan_hapus    text not null default '' check (char_length(alasan_hapus) <= 300),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index if not exists barang_ruang on public.barang (ruang_id) where deleted_at is null;

-- kode inventaris otomatis: SMAN22/<KATEGORI>/<TAHUN>/<0001>
create or replace function public.jaga_barang() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.kode, '') = '' then
      new.kode := 'SMAN22/' || (select kode from public.kategori_barang where id = new.kategori_id) || '/'
               || coalesce(new.tahun_perolehan, extract(year from now())::int) || '/' || lpad(nextval('public.nomor_barang')::text, 4, '0');
    end if;
  else
    new.kode := old.kode; new.updated_at := now();
    if new.deleted_at is not null and old.deleted_at is null and char_length(trim(new.alasan_hapus)) < 3 then
      raise exception 'Tulis alasan penghapusan aset (mis. rusak berat, hibah, hilang)' using errcode = '22023';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists jaga_barang on public.barang;
create trigger jaga_barang before insert or update on public.barang for each row execute function public.jaga_barang();

create table if not exists public.peminjaman (
  id               uuid primary key default gen_random_uuid(),
  peminjam_id      uuid not null default auth.uid(),
  ruang_id         uuid references public.ruang (id),
  barang_id        uuid references public.barang (id),
  jumlah           int not null default 1 check (jumlah between 1 and 1000),
  mulai            timestamptz not null,
  selesai          timestamptz not null,
  keperluan        text not null check (char_length(keperluan) between 5 and 300),
  status           text not null default 'diajukan' check (status in ('diajukan', 'disetujui', 'ditolak', 'dibatalkan', 'dipinjam', 'dikembalikan')),
  catatan          text not null default '' check (char_length(catatan) <= 300),
  kondisi_kembali  text not null default '' check (char_length(kondisi_kembali) <= 300),
  diputus_oleh     uuid,
  diputus_pada     timestamptz,
  dikembalikan_pada timestamptz,
  created_at       timestamptz not null default now(),
  constraint pinjam_satu check ((ruang_id is null) <> (barang_id is null)),
  constraint pinjam_rentang check (selesai > mulai and selesai - mulai <= interval '31 days')
);
create index if not exists peminjaman_waktu on public.peminjaman (mulai, selesai) where status in ('diajukan', 'disetujui', 'dipinjam');

-- alasan bentrok (null = aman). Ruang juga dicek terhadap jadwal pelajaran hari itu.
create or replace function public.bentrok_pinjam(p_ruang uuid, p_barang uuid, p_jumlah int, p_mulai timestamptz, p_selesai timestamptz, p_kecuali uuid default null)
returns text language plpgsql stable security definer set search_path = '' as $$
declare r record; dipakai int; stok int; tgl date := (p_mulai at time zone 'Asia/Jakarta')::date;
begin
  if p_ruang is not null then
    select p.mulai, p.selesai into r from public.peminjaman p where p.ruang_id = p_ruang and p.status in ('disetujui', 'dipinjam')
      and p.id is distinct from p_kecuali and tstzrange(p.mulai, p.selesai) && tstzrange(p_mulai, p_selesai) limit 1;
    if found then return 'ruang sudah dipinjam ' || to_char(r.mulai at time zone 'Asia/Jakarta', 'DD-MM HH24:MI') || '–' || to_char(r.selesai at time zone 'Asia/Jakarta', 'HH24:MI'); end if;
    if (p_selesai at time zone 'Asia/Jakarta')::date = tgl and not exists (select 1 from public.hari_libur where tanggal = tgl) then
      select k.nama kelas, jp.jp_ke into r from public.jadwal j
        join public.tahun_ajaran t on t.id = j.tahun_ajaran_id and t.aktif
        join public.kelas k on k.id = j.kelas_id
        join public.jam_pelajaran jp on jp.hari = j.hari and jp.jp_ke = j.jp_ke
       where j.ruang_id = p_ruang and j.hari = extract(isodow from tgl)
         and not exists (select 1 from public.perubahan_jadwal x where x.jadwal_id = j.id and x.tanggal = tgl and x.jenis in ('ditiadakan', 'pindah_ruang'))
         and (tgl + jp.jam_mulai) < (p_selesai at time zone 'Asia/Jakarta') and (tgl + jp.jam_selesai) > (p_mulai at time zone 'Asia/Jakarta')
       limit 1;
      if found then return 'ruang dipakai kelas ' || r.kelas || ' (JP ' || r.jp_ke || ')'; end if;
    end if;
  else
    select jumlah into stok from public.barang where id = p_barang and deleted_at is null and kondisi in ('baik', 'rusak_ringan');
    select coalesce(sum(p.jumlah), 0) into dipakai from public.peminjaman p where p.barang_id = p_barang and p.status in ('disetujui', 'dipinjam')
      and p.id is distinct from p_kecuali and tstzrange(p.mulai, p.selesai) && tstzrange(p_mulai, p_selesai);
    if coalesce(stok, 0) - dipakai < p_jumlah then
      return 'barang tersedia ' || greatest(coalesce(stok, 0) - dipakai, 0) || ' pada waktu itu';
    end if;
  end if;
  return null;
end $$;

create or replace function public.ajukan_pinjam(p_ruang uuid, p_barang uuid, p_jumlah int, p_mulai timestamptz, p_selesai timestamptz, p_keperluan text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare alasan text; nid uuid; u uuid;
begin
  if not public.staf_aktif() then raise exception 'Peminjaman hanya untuk guru & staf' using errcode = '42501'; end if;
  if p_mulai < now() - interval '1 hour' then raise exception 'Waktu mulai sudah lewat' using errcode = '22023'; end if;
  if p_ruang is not null and not exists (select 1 from public.ruang where id = p_ruang and bisa_dipinjam and deleted_at is null) then
    raise exception 'Ruang ini tidak bisa dipinjam' using errcode = '22023'; end if;
  if p_barang is not null and not exists (select 1 from public.barang where id = p_barang and bisa_dipinjam and deleted_at is null) then
    raise exception 'Barang ini tidak bisa dipinjam' using errcode = '22023'; end if;
  if p_ruang is not null and (p_mulai at time zone 'Asia/Jakarta')::date <> (p_selesai at time zone 'Asia/Jakarta')::date then
    raise exception 'Peminjaman ruang harus di hari yang sama' using errcode = '22023'; end if;
  alasan := public.bentrok_pinjam(p_ruang, p_barang, coalesce(p_jumlah, 1), p_mulai, p_selesai);
  if alasan is not null then raise exception 'Bentrok: %', alasan using errcode = '23P01'; end if;
  insert into public.peminjaman (ruang_id, barang_id, jumlah, mulai, selesai, keperluan)
  values (p_ruang, p_barang, coalesce(p_jumlah, 1), p_mulai, p_selesai, trim(p_keperluan)) returning id into nid;
  for u in select public.pengguna_berizin('sarpras.kelola') loop
    perform public.kirim_notif(u, 'sarpras', 'Pengajuan peminjaman',
      coalesce((select nama from public.ruang where id = p_ruang), (select nama from public.barang where id = p_barang)) || ' · '
      || to_char(p_mulai at time zone 'Asia/Jakarta', 'DD-MM HH24:MI'), '/admin/sarpras/peminjaman', 'biasa', false);
  end loop;
  return nid;
end $$;

create or replace function public.proses_pinjam(p_id uuid, p_aksi text, p_catatan text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare p public.peminjaman; alasan text; baru text; kelola boolean := public.punya_izin('sarpras.kelola');
begin
  select * into p from public.peminjaman where id = p_id for update;
  if p.id is null then raise exception 'Tidak ditemukan' using errcode = '22023'; end if;
  if p_aksi = 'batal' then
    if p.peminjam_id <> auth.uid() or p.status not in ('diajukan', 'disetujui') then raise exception 'Tidak bisa dibatalkan' using errcode = '42501'; end if;
    baru := 'dibatalkan';
  else
    if not kelola then raise exception 'Akses ditolak' using errcode = '42501'; end if;
    case p_aksi
      when 'setuju' then
        if p.status <> 'diajukan' then raise exception 'Status tidak sesuai' using errcode = '22023'; end if;
        alasan := public.bentrok_pinjam(p.ruang_id, p.barang_id, p.jumlah, p.mulai, p.selesai, p.id);
        if alasan is not null then raise exception 'Bentrok: %', alasan using errcode = '23P01'; end if;
        baru := 'disetujui';
      when 'tolak' then
        if p.status <> 'diajukan' then raise exception 'Status tidak sesuai' using errcode = '22023'; end if;
        if char_length(trim(coalesce(p_catatan, ''))) < 3 then raise exception 'Tulis alasan penolakan' using errcode = '22023'; end if;
        baru := 'ditolak';
      when 'serahkan' then
        if p.status <> 'disetujui' then raise exception 'Status tidak sesuai' using errcode = '22023'; end if;
        baru := 'dipinjam';
      when 'kembali' then
        if p.status not in ('disetujui', 'dipinjam') then raise exception 'Status tidak sesuai' using errcode = '22023'; end if;
        baru := 'dikembalikan';
      else raise exception 'Aksi tidak dikenal' using errcode = '22023';
    end case;
  end if;
  update public.peminjaman set status = baru,
    catatan = case when p_aksi in ('setuju', 'tolak') then left(coalesce(trim(p_catatan), ''), 300) else catatan end,
    kondisi_kembali = case when p_aksi = 'kembali' then left(coalesce(trim(p_catatan), ''), 300) else kondisi_kembali end,
    diputus_oleh = case when p_aksi in ('setuju', 'tolak') then auth.uid() else diputus_oleh end,
    diputus_pada = case when p_aksi in ('setuju', 'tolak') then now() else diputus_pada end,
    dikembalikan_pada = case when p_aksi = 'kembali' then now() else dikembalikan_pada end
  where id = p_id;
  if p_aksi in ('setuju', 'tolak') then
    perform public.kirim_notif(p.peminjam_id, 'sarpras', case when p_aksi = 'setuju' then 'Peminjaman disetujui' else 'Peminjaman ditolak' end,
      coalesce((select nama from public.ruang where id = p.ruang_id), (select nama from public.barang where id = p.barang_id)) || ' · '
      || to_char(p.mulai at time zone 'Asia/Jakarta', 'DD-MM HH24:MI') || coalesce(' — ' || nullif(trim(p_catatan), ''), ''),
      '/admin/sarpras/peminjaman');
  end if;
end $$;
revoke all on function public.bentrok_pinjam(uuid, uuid, int, timestamptz, timestamptz, uuid), public.ajukan_pinjam(uuid, uuid, int, timestamptz, timestamptz, text),
  public.proses_pinjam(uuid, text, text) from public, anon;
grant execute on function public.bentrok_pinjam(uuid, uuid, int, timestamptz, timestamptz, uuid), public.ajukan_pinjam(uuid, uuid, int, timestamptz, timestamptz, text),
  public.proses_pinjam(uuid, text, text) to authenticated;

create table if not exists public.laporan_kerusakan (
  id            uuid primary key default gen_random_uuid(),
  pelapor_id    uuid not null default auth.uid(),
  barang_id     uuid references public.barang (id),
  ruang_id      uuid references public.ruang (id),
  judul         text not null check (char_length(judul) between 3 and 150),
  deskripsi     text not null default '' check (char_length(deskripsi) <= 2000),
  foto_path     text not null default '' check (char_length(foto_path) <= 300),
  prioritas     text not null default 'sedang' check (prioritas in ('rendah', 'sedang', 'tinggi')),
  status        text not null default 'dilaporkan' check (status in ('dilaporkan', 'diproses', 'selesai', 'ditolak')),
  penanganan    text not null default '' check (char_length(penanganan) <= 2000),
  biaya         numeric(14, 2) check (biaya >= 0),
  ditangani_oleh uuid,
  selesai_pada  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists kerusakan_status on public.laporan_kerusakan (status, created_at);

create or replace function public.jaga_kerusakan() returns trigger language plpgsql security definer set search_path = '' as $$
declare kelola boolean := public.punya_izin('sarpras.kelola');
begin
  if tg_op = 'INSERT' then
    new.pelapor_id := auth.uid(); new.status := 'dilaporkan'; new.penanganan := ''; new.biaya := null; new.ditangani_oleh := null;
    if not public.staf_aktif() then raise exception 'Laporan kerusakan untuk guru & staf' using errcode = '42501'; end if;
    if new.foto_path <> '' and split_part(new.foto_path, '/', 1) <> auth.uid()::text then raise exception 'Foto tidak valid' using errcode = '42501'; end if;
  else
    if not kelola then raise exception 'Akses ditolak' using errcode = '42501'; end if;
    new.pelapor_id := old.pelapor_id; new.updated_at := now();
    if new.status <> old.status then new.ditangani_oleh := auth.uid(); end if;
    if new.status = 'selesai' and old.status <> 'selesai' then new.selesai_pada := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists jaga_kerusakan on public.laporan_kerusakan;
create trigger jaga_kerusakan before insert or update on public.laporan_kerusakan for each row execute function public.jaga_kerusakan();

create or replace function public.notif_kerusakan() returns trigger language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  if tg_op = 'INSERT' then
    for u in select public.pengguna_berizin('sarpras.kelola') loop
      perform public.kirim_notif(u, 'sarpras', 'Laporan kerusakan' || case when new.prioritas = 'tinggi' then ' (mendesak)' else '' end,
        new.judul || coalesce(' · ' || (select nama from public.ruang where id = new.ruang_id), ''), '/admin/sarpras/kerusakan',
        case when new.prioritas = 'tinggi' then 'penting' else 'biasa' end);
    end loop;
  elsif new.status <> old.status then
    perform public.kirim_notif(new.pelapor_id, 'sarpras', 'Laporan kerusakan ' || new.status, new.judul || coalesce(' — ' || nullif(new.penanganan, ''), ''),
      '/admin/sarpras/kerusakan', 'biasa', false);
  end if;
  return null;
end $$;
drop trigger if exists notif_kerusakan on public.laporan_kerusakan;
create trigger notif_kerusakan after insert or update of status on public.laporan_kerusakan for each row execute function public.notif_kerusakan();

-- nama pengguna (guru/staf) untuk sesama staf, mis. daftar peminjam
create or replace function public.nama_pengguna(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  select nama from public.pengguna where user_id = p_user and public.staf_aktif();
$$;
grant execute on function public.nama_pengguna(uuid) to authenticated;

-- rekap aset
create or replace function public.rekap_sarpras()
returns table (kategori text, kondisi text, jenis int, unit bigint, nilai numeric)
language sql stable security definer set search_path = '' as $$
  select k.nama, b.kondisi, count(*)::int, sum(b.jumlah), sum(coalesce(b.harga, 0) * b.jumlah)
  from public.barang b join public.kategori_barang k on k.id = b.kategori_id
  where b.deleted_at is null and (public.punya_izin('sarpras.lihat') or public.punya_izin('sarpras.kelola'))
  group by k.nama, k.urutan, b.kondisi order by k.urutan, b.kondisi;
$$;
revoke all on function public.rekap_sarpras() from public, anon;
grant execute on function public.rekap_sarpras() to authenticated;

-- =====================================================================
-- RLS
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['tugas', 'tugas_kelas', 'pengumpulan_tugas', 'kuis', 'kuis_kelas', 'kuis_soal', 'kuis_percobaan',
                           'kategori_barang', 'barang', 'peminjaman', 'laporan_kerusakan'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke truncate on public.%I from authenticated', t);
    if t not in ('kuis_percobaan', 'kuis_soal') then
      execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
      execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.catat_audit()', t);
    end if;
  end loop;
end $$;

-- tugas & kuis: pemilik; siswa/ortu kelas tujuan bila terbit; kurikulum melihat
drop policy if exists "baca tugas" on public.tugas;
create policy "baca tugas" on public.tugas for select to authenticated
  using (pegawai_id = (select public.pegawai_saya()) or (select public.punya_izin('kurikulum.kelola'))
         or (terbit and deleted_at is null and public.untuk_saya_tugas(id)));
drop policy if exists "tulis tugas" on public.tugas;
create policy "tulis tugas" on public.tugas for insert to authenticated with check (pegawai_id = (select public.pegawai_saya()));
drop policy if exists "ubah tugas" on public.tugas;
create policy "ubah tugas" on public.tugas for update to authenticated
  using (pegawai_id = (select public.pegawai_saya())) with check (pegawai_id = (select public.pegawai_saya()));
drop policy if exists "baca kuis" on public.kuis;
create policy "baca kuis" on public.kuis for select to authenticated
  using (pegawai_id = (select public.pegawai_saya()) or (select public.punya_izin('kurikulum.kelola'))
         or (terbit and deleted_at is null and public.untuk_saya_kuis(id)));
drop policy if exists "tulis kuis" on public.kuis;
create policy "tulis kuis" on public.kuis for insert to authenticated with check (pegawai_id = (select public.pegawai_saya()));
drop policy if exists "ubah kuis" on public.kuis;
create policy "ubah kuis" on public.kuis for update to authenticated
  using (pegawai_id = (select public.pegawai_saya())) with check (pegawai_id = (select public.pegawai_saya()));
revoke delete on public.tugas, public.kuis from authenticated;

drop policy if exists "baca tugas kelas" on public.tugas_kelas;
create policy "baca tugas kelas" on public.tugas_kelas for select to authenticated using (true);
drop policy if exists "kelola tugas kelas" on public.tugas_kelas;
create policy "kelola tugas kelas" on public.tugas_kelas for all to authenticated using (public.pemilik_tugas(tugas_id)) with check (public.pemilik_tugas(tugas_id));
drop policy if exists "baca kuis kelas" on public.kuis_kelas;
create policy "baca kuis kelas" on public.kuis_kelas for select to authenticated using (true);
drop policy if exists "kelola kuis kelas" on public.kuis_kelas;
create policy "kelola kuis kelas" on public.kuis_kelas for all to authenticated using (public.pemilik_kuis(kuis_id)) with check (public.pemilik_kuis(kuis_id));

-- soal (berisi kunci): HANYA guru pemilik & kurikulum. Siswa memakai soal_kuis_saya()/hasil_kuis().
drop policy if exists "kelola soal" on public.kuis_soal;
create policy "kelola soal" on public.kuis_soal for all to authenticated
  using (public.pemilik_kuis(kuis_id) or (select public.punya_izin('kurikulum.kelola'))) with check (public.pemilik_kuis(kuis_id));

-- pengumpulan & percobaan: siswa/ortu sendiri (baca), guru pemilik (baca); tulis lewat fungsi
drop policy if exists "baca pengumpulan" on public.pengumpulan_tugas;
create policy "baca pengumpulan" on public.pengumpulan_tugas for select to authenticated
  using (public.diri_atau_anak(siswa_id) or public.pemilik_tugas(tugas_id) or (select public.punya_izin('kurikulum.kelola')));
revoke insert, update, delete on public.pengumpulan_tugas from authenticated;
drop policy if exists "baca percobaan" on public.kuis_percobaan;
create policy "baca percobaan" on public.kuis_percobaan for select to authenticated
  using (public.pemilik_kuis(kuis_id) or (select public.punya_izin('kurikulum.kelola')));
revoke insert, update, delete on public.kuis_percobaan from authenticated;

-- sarpras
drop policy if exists "baca kategori barang" on public.kategori_barang;
create policy "baca kategori barang" on public.kategori_barang for select to authenticated using (true);
drop policy if exists "kelola kategori barang" on public.kategori_barang;
create policy "kelola kategori barang" on public.kategori_barang for all to authenticated
  using ((select public.punya_izin('sarpras.kelola'))) with check ((select public.punya_izin('sarpras.kelola')));
drop policy if exists "baca barang" on public.barang;
create policy "baca barang" on public.barang for select to authenticated
  using ((select public.staf_aktif()) and (deleted_at is null or (select public.punya_izin('sarpras.kelola')) or (select public.punya_izin('sarpras.lihat'))));
drop policy if exists "kelola barang" on public.barang;
create policy "kelola barang" on public.barang for all to authenticated
  using ((select public.punya_izin('sarpras.kelola'))) with check ((select public.punya_izin('sarpras.kelola')));
revoke delete on public.barang from authenticated;

drop policy if exists "baca peminjaman" on public.peminjaman;
create policy "baca peminjaman" on public.peminjaman for select to authenticated
  using (peminjam_id = (select auth.uid()) or (select public.punya_izin('sarpras.kelola')) or (select public.punya_izin('sarpras.lihat'))
         or ((select public.staf_aktif()) and status in ('disetujui', 'dipinjam')));
revoke insert, update, delete on public.peminjaman from authenticated;

drop policy if exists "baca kerusakan" on public.laporan_kerusakan;
create policy "baca kerusakan" on public.laporan_kerusakan for select to authenticated
  using (pelapor_id = (select auth.uid()) or (select public.punya_izin('sarpras.kelola')) or (select public.punya_izin('sarpras.lihat')));
drop policy if exists "lapor kerusakan" on public.laporan_kerusakan;
create policy "lapor kerusakan" on public.laporan_kerusakan for insert to authenticated with check ((select public.staf_aktif()));
drop policy if exists "tangani kerusakan" on public.laporan_kerusakan;
create policy "tangani kerusakan" on public.laporan_kerusakan for update to authenticated
  using ((select public.punya_izin('sarpras.kelola'))) with check ((select public.punya_izin('sarpras.kelola')));
revoke delete on public.laporan_kerusakan from authenticated;

notify pgrst, 'reload schema';
