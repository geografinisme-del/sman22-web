-- =====================================================================
--  Fase 4 — Portal Siswa & Orang Tua
--  Akun portal (login dengan NISN), izin/sakit online dari orang tua.
--  Jalankan SETELAH 20261010000000_absensi.sql. Idempotent.
-- =====================================================================

insert into public.izin (kode, keterangan) values
  ('akun_portal.kelola', 'Membuat akun portal siswa & orang tua')
on conflict (kode) do update set keterangan = excluded.keterangan;
insert into public.peran_izin (peran, izin) values
  ('super_admin', 'akun_portal.kelola'), ('operator', 'akun_portal.kelola')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 1. Mendaftarkan akun portal (dipanggil server setelah akun Auth dibuat)
-- ---------------------------------------------------------------------
create or replace function public.daftarkan_akun_portal(p_user uuid, p_jenis text, p_siswa uuid, p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.siswa; oid uuid;
begin
  if not public.punya_izin('akun_portal.kelola') then
    raise exception 'Tidak berhak membuat akun portal' using errcode = '42501';
  end if;
  select * into s from public.siswa where id = p_siswa and deleted_at is null;
  if s.id is null then raise exception 'Siswa tidak ditemukan' using errcode = 'P0002'; end if;

  if p_jenis = 'siswa' then
    if s.user_id is not null then raise exception 'Siswa % sudah punya akun', s.nama using errcode = '23505'; end if;
    insert into public.pengguna (user_id, nama, email) values (p_user, s.nama, p_email);
    insert into public.pengguna_peran (user_id, peran) values (p_user, 'siswa');
    update public.siswa set user_id = p_user where id = s.id;
  elsif p_jenis = 'orang_tua' then
    if exists (select 1 from public.siswa_orang_tua so join public.orang_tua o on o.id = so.orang_tua_id
               where so.siswa_id = s.id and o.user_id is not null) then
      raise exception 'Orang tua % sudah punya akun', s.nama using errcode = '23505';
    end if;
    -- pakai data ibu, lalu ayah, lalu wali; bila belum ada buat data wali baru
    select so.orang_tua_id into oid from public.siswa_orang_tua so
      where so.siswa_id = s.id order by case so.hubungan when 'ibu' then 1 when 'ayah' then 2 else 3 end limit 1;
    if oid is null then
      insert into public.orang_tua (nama) values ('Orang tua ' || s.nama) returning id into oid;
      insert into public.siswa_orang_tua (siswa_id, orang_tua_id, hubungan) values (s.id, oid, 'wali');
    end if;
    insert into public.pengguna (user_id, nama, email)
      values (p_user, coalesce((select nama from public.orang_tua where id = oid), 'Orang tua ' || s.nama), p_email);
    insert into public.pengguna_peran (user_id, peran) values (p_user, 'orang_tua');
    update public.orang_tua set user_id = p_user where id = oid;
  else
    raise exception 'Jenis akun tidak dikenal' using errcode = '22023';
  end if;
end $$;
revoke all on function public.daftarkan_akun_portal(uuid, text, uuid, text) from public, anon;
grant execute on function public.daftarkan_akun_portal(uuid, text, uuid, text) to authenticated;

-- Daftar siswa satu kelas beserta status akun portalnya (untuk pengelola akun)
create or replace function public.status_akun_portal(p_kelas uuid)
returns table (siswa_id uuid, nisn text, nama text, akun_siswa boolean, akun_ortu boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.punya_izin('akun_portal.kelola') then
    raise exception 'Tidak berhak' using errcode = '42501';
  end if;
  return query
  select s.id, s.nisn, s.nama, s.user_id is not null,
         exists (select 1 from public.siswa_orang_tua so join public.orang_tua o on o.id = so.orang_tua_id
                 where so.siswa_id = s.id and o.user_id is not null)
  from public.anggota_kelas ak join public.siswa s on s.id = ak.siswa_id
  where ak.kelas_id = p_kelas and s.deleted_at is null and s.status = 'aktif'
  order by s.nama;
end $$;
revoke all on function public.status_akun_portal(uuid) from public, anon;
grant execute on function public.status_akun_portal(uuid) to authenticated;

-- user_id akun portal (siswa / orang tua) milik satu siswa — HANYA bila akun itu murni akun portal,
-- agar pengelola akun portal tidak bisa mengatur ulang sandi akun staf.
create or replace function public.akun_portal_siswa(p_siswa uuid, p_jenis text)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare uid uuid;
begin
  if not public.punya_izin('akun_portal.kelola') then
    raise exception 'Tidak berhak' using errcode = '42501';
  end if;
  if p_jenis = 'siswa' then
    select user_id into uid from public.siswa where id = p_siswa and deleted_at is null;
  else
    select o.user_id into uid from public.siswa_orang_tua so join public.orang_tua o on o.id = so.orang_tua_id
     where so.siswa_id = p_siswa and o.user_id is not null limit 1;
  end if;
  if uid is null then return null; end if;
  if exists (select 1 from public.pengguna_peran where user_id = uid and peran not in ('siswa', 'orang_tua')) then
    raise exception 'Akun ini bukan akun portal' using errcode = '42501';
  end if;
  return uid;
end $$;
revoke all on function public.akun_portal_siswa(uuid, text) from public, anon;
grant execute on function public.akun_portal_siswa(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Izin / sakit online dari orang tua
-- ---------------------------------------------------------------------
create table if not exists public.izin_ortu (
  id              uuid primary key default gen_random_uuid(),
  siswa_id        uuid not null references public.siswa (id),
  jenis           text not null check (jenis in ('S', 'I')),
  tanggal_mulai   date not null,
  tanggal_selesai date not null,
  alasan          text not null check (char_length(alasan) between 5 and 500),
  diajukan_oleh   uuid not null default auth.uid(),
  diajukan_pada   timestamptz not null default now(),
  status          text not null default 'menunggu' check (status in ('menunggu', 'diterima', 'ditolak', 'dibatalkan')),
  diproses_oleh   uuid,
  diproses_pada   timestamptz,
  catatan         text not null default '' check (char_length(catatan) <= 300),
  check (tanggal_selesai >= tanggal_mulai and tanggal_selesai - tanggal_mulai <= 13)
);
create index if not exists izin_ortu_menunggu_idx on public.izin_ortu (diajukan_pada) where status = 'menunggu';

create or replace function public.ortu_dari_siswa(sid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.siswa_orang_tua so join public.orang_tua o on o.id = so.orang_tua_id
                 where so.siswa_id = sid and o.user_id = auth.uid());
$$;
revoke all on function public.ortu_dari_siswa(uuid) from public;
grant execute on function public.ortu_dari_siswa(uuid) to authenticated;

create or replace function public.jaga_izin_ortu()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.diajukan_oleh := auth.uid();
    new.status := 'menunggu';
    new.diproses_oleh := null;
    new.diproses_pada := null;
    if new.tanggal_mulai < public.hari_ini() - 3 then
      raise exception 'Izin hanya bisa diajukan paling lambat 3 hari setelah tanggalnya' using errcode = '22023';
    end if;
    if new.tanggal_mulai > public.hari_ini() + 30 then
      raise exception 'Izin hanya bisa diajukan paling lama 30 hari sebelumnya' using errcode = '22023';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists jaga_izin_ortu on public.izin_ortu;
create trigger jaga_izin_ortu before insert on public.izin_ortu for each row execute function public.jaga_izin_ortu();
drop trigger if exists audit_izin_ortu on public.izin_ortu;
create trigger audit_izin_ortu after insert or update or delete on public.izin_ortu for each row execute function public.catat_audit();

alter table public.izin_ortu enable row level security;
revoke all on public.izin_ortu from anon;
revoke delete, truncate on public.izin_ortu from authenticated;

drop policy if exists "baca izin ortu" on public.izin_ortu;
create policy "baca izin ortu" on public.izin_ortu for select to authenticated
  using ((select public.punya_izin('absensi.lihat')) or public.wali_dari_siswa(siswa_id)
         or public.ortu_dari_siswa(siswa_id) or diajukan_oleh = auth.uid());
drop policy if exists "ajukan izin ortu" on public.izin_ortu;
create policy "ajukan izin ortu" on public.izin_ortu for insert to authenticated
  with check (public.ortu_dari_siswa(siswa_id));
-- pembatalan oleh orang tua dilakukan lewat fungsi; pemrosesan oleh wali/piket lewat fungsi proses_izin_ortu

create or replace function public.batalkan_izin_ortu(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.izin_ortu set status = 'dibatalkan', diproses_pada = now()
   where id = p_id and status = 'menunggu' and diajukan_oleh = auth.uid();
  if not found then raise exception 'Izin tidak dapat dibatalkan' using errcode = '23514'; end if;
end $$;
revoke all on function public.batalkan_izin_ortu(uuid) from public, anon;
grant execute on function public.batalkan_izin_ortu(uuid) to authenticated;

-- Wali kelas siswa itu / piket / kesiswaan memutuskan; bila diterima, absensi terisi otomatis
create or replace function public.proses_izin_ortu(p_id uuid, terima boolean, p_catatan text default '')
returns integer language plpgsql security definer set search_path = '' as $$
declare z public.izin_ortu; d date; n int := 0; atur public.pengaturan_absensi;
begin
  select * into z from public.izin_ortu where id = p_id for update;
  if z.id is null then raise exception 'Izin tidak ditemukan' using errcode = 'P0002'; end if;
  if not (public.punya_izin('absensi.kelola') or public.wali_dari_siswa(z.siswa_id)) then
    raise exception 'Tidak berhak memproses izin ini' using errcode = '42501';
  end if;
  if z.status <> 'menunggu' then raise exception 'Izin sudah diproses' using errcode = '23514'; end if;

  update public.izin_ortu
     set status = case when terima then 'diterima' else 'ditolak' end,
         diproses_oleh = auth.uid(), diproses_pada = now(), catatan = left(coalesce(p_catatan, ''), 300)
   where id = p_id;

  if terima then
    select * into atur from public.pengaturan_absensi where id = 1;
    for d in select g::date from generate_series(z.tanggal_mulai, z.tanggal_selesai, interval '1 day') g loop
      continue when extract(isodow from d)::smallint <> all (atur.hari_sekolah);
      continue when exists (select 1 from public.hari_libur where tanggal = d);
      insert into public.absensi_siswa (siswa_id, tanggal, status, keterangan, sumber, dicatat_oleh)
      values (z.siswa_id, d, z.jenis, left('Izin orang tua: ' || z.alasan, 300), 'wali_kelas', auth.uid())
      on conflict (siswa_id, tanggal) do update
        set status = excluded.status, keterangan = excluded.keterangan
        where public.absensi_siswa.status in ('A', 'S', 'I');  -- tidak menimpa catatan terlambat/pulang cepat
      n := n + 1;
    end loop;
  end if;
  return n;
end $$;
revoke all on function public.proses_izin_ortu(uuid, boolean, text) from public, anon;
grant execute on function public.proses_izin_ortu(uuid, boolean, text) to authenticated;

notify pgrst, 'reload schema';
