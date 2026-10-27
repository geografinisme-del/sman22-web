-- =====================================================================
-- "Lihat sebagai…" (pratinjau peran) untuk super admin — DRAF, menunggu persetujuan.
--   A. peran_pratinjau(): peran yang sedang dipratinjau, dibaca dari header permintaan `x-pratinjau-peran`
--      (dikirim server Next hanya bila cookie pratinjau bertanda tangan sah). Header HANYA berlaku bila pemanggil
--      super admin aktif dengan sesi AAL2 (lolos MFA); untuk siapa pun selain itu header diabaikan.
--      Pratinjau hanya MEMPERSEMPIT hak: izin dihitung dari peran yang dipratinjau, bukan dari super admin.
--   B. punya_izin / punya_peran / akses_saya: cabang pratinjau (tanpa header → perilaku lama persis).
--   C. pra_permintaan(): pre-request PostgREST — selama pratinjau, transaksi dijadikan READ ONLY sehingga SEMUA
--      insert/update/delete/RPC penulis lewat API ditolak database.
--   D. catat_pratinjau(): catatan mulai/selesai pratinjau di audit_log (tabel yang sudah ada; tanpa tabel baru).
-- Tidak ada DROP/TRUNCATE dan tidak ada data lama yang diubah. Rollback: supabase/rollback/rollback_20261228_pratinjau_peran.sql
-- Idempoten: aman dijalankan ulang.
-- =====================================================================

-- ---------------------------------------------------------------------
-- A. peran yang sedang dipratinjau (null = bukan pratinjau)
-- ---------------------------------------------------------------------
create or replace function public.peran_pratinjau()
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  h text;
  p text;
begin
  h := current_setting('request.headers', true);
  if h is null or h = '' then return null; end if;
  p := nullif(trim(h::json ->> 'x-pratinjau-peran'), '');
  if p is null then return null; end if;
  -- hanya super admin aktif dengan sesi AAL2; selain itu header tidak berarti apa-apa
  if not public.aal2() or not exists (
    select 1 from public.pengguna g join public.pengguna_peran pp on pp.user_id = g.user_id
    where g.user_id = auth.uid() and g.aktif and pp.peran = 'super_admin'
  ) then
    return null;
  end if;
  -- peran tak dikenal / super_admin sendiri → dianggap "tanpa peran" (paling sempit), bukan hak penuh
  if p = 'super_admin' or not exists (select 1 from public.peran where kode = p) then
    return '__tanpa_peran__';
  end if;
  return p;
end $$;
-- dipanggil pre-request & fungsi izin untuk SEMUA permintaan (termasuk pengunjung tanpa login): wajib bisa dieksekusi
-- anon. Untuk anon/pengguna biasa hasilnya selalu null.
grant execute on function public.peran_pratinjau() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- B. fungsi izin dengan cabang pratinjau (cabang lain = definisi 20261026000000 tanpa perubahan)
-- ---------------------------------------------------------------------
create or replace function public.punya_izin(kode text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when public.peran_pratinjau() is not null then exists (
      select 1 from public.peran_izin pi where pi.peran = public.peran_pratinjau() and pi.izin = punya_izin.kode
    )
    else exists (
      select 1
      from public.pengguna p
      join public.pengguna_peran pp on pp.user_id = p.user_id
      join public.peran r on r.kode = pp.peran
      join public.peran_izin pi on pi.peran = pp.peran
      where p.user_id = auth.uid() and p.aktif and pi.izin = punya_izin.kode
        and (not r.wajib_mfa or public.aal2())
    )
  end;
$$;

create or replace function public.punya_peran(kode text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when public.peran_pratinjau() is not null then public.peran_pratinjau() = punya_peran.kode
    else exists (
      select 1
      from public.pengguna p
      join public.pengguna_peran pp on pp.user_id = p.user_id
      join public.peran r on r.kode = pp.peran
      where p.user_id = auth.uid() and p.aktif and pp.peran = punya_peran.kode
        and (not r.wajib_mfa or public.aal2())
    )
  end;
$$;

create or replace function public.akses_saya()
returns jsonb language sql stable security definer set search_path = '' as $$
  with saya as (select p.nama, p.aktif from public.pengguna p where p.user_id = auth.uid()),
  r as (
    select pp.peran, x.urutan, (x.wajib_mfa and not public.aal2()) as tertunda
    from public.pengguna_peran pp join public.peran x on x.kode = pp.peran
    where pp.user_id = auth.uid()
  ),
  pr as (select public.peran_pratinjau() as peran)
  select case
    when (select peran from pr) is not null then jsonb_build_object(
      'nama',  coalesce((select nama from saya), ''),
      'aktif', true,
      'aal',   coalesce(auth.jwt() ->> 'aal', 'aal1'),
      'pratinjau', (select peran from pr),
      'peran', case when (select peran from pr) = '__tanpa_peran__' then '[]'::jsonb else jsonb_build_array((select peran from pr)) end,
      'peran_tertunda', '[]'::jsonb,
      'izin',  coalesce((select jsonb_agg(distinct pi.izin) from public.peran_izin pi where pi.peran = (select peran from pr)), '[]'::jsonb)
    )
    else jsonb_build_object(
      'nama',  coalesce((select nama from saya), ''),
      'aktif', coalesce((select aktif from saya), false),
      'aal',   coalesce(auth.jwt() ->> 'aal', 'aal1'),
      'peran', coalesce((select jsonb_agg(peran order by urutan) from r where not tertunda), '[]'::jsonb),
      'peran_tertunda', coalesce((select jsonb_agg(peran order by urutan) from r where tertunda), '[]'::jsonb),
      'izin',  coalesce((select jsonb_agg(distinct pi.izin) from r join public.peran_izin pi on pi.peran = r.peran
                          where not r.tertunda and coalesce((select aktif from saya), false)), '[]'::jsonb)
    )
  end;
$$;

-- ---------------------------------------------------------------------
-- C. pre-request PostgREST: pratinjau = transaksi hanya-baca
-- ---------------------------------------------------------------------
create or replace function public.pra_permintaan()
returns void language plpgsql set search_path = '' as $$
begin
  if public.peran_pratinjau() is not null then
    set local transaction_read_only = on;
  end if;
end $$;
grant execute on function public.pra_permintaan() to anon, authenticated, service_role;

-- fungsi dibuat dulu, baru dipasang sebagai pre-request (urutan ini penting: pre-request yang hilang
-- membuat SEMUA permintaan API gagal)
alter role authenticator set pgrst.db_pre_request to 'public.pra_permintaan';
notify pgrst, 'reload config';

-- ---------------------------------------------------------------------
-- D. catatan aktivitas pratinjau (audit_log yang sudah ada)
-- ---------------------------------------------------------------------
create or replace function public.catat_pratinjau(p_aksi text, p_peran text, p_alasan text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_aksi not in ('mulai', 'selesai') then
    raise exception 'Aksi pratinjau tidak dikenal' using errcode = '22023';
  end if;
  -- hanya super admin AAL2; dipanggil server TANPA header pratinjau (sebelum mulai / sesudah selesai)
  if not public.aal2() or not exists (
    select 1 from public.pengguna g join public.pengguna_peran pp on pp.user_id = g.user_id
    where g.user_id = auth.uid() and g.aktif and pp.peran = 'super_admin'
  ) then
    raise exception 'Hanya super admin (dengan verifikasi dua langkah) yang dapat memakai pratinjau peran' using errcode = '42501';
  end if;
  insert into public.audit_log (user_id, tabel, aksi, record_id, data_baru)
  values (auth.uid(), 'pratinjau', case p_aksi when 'mulai' then 'PRATINJAU_MULAI' else 'PRATINJAU_SELESAI' end, p_peran,
          jsonb_build_object('peristiwa', 'pratinjau_' || p_aksi, 'peran', p_peran, 'alasan', p_alasan));
end $$;
revoke all on function public.catat_pratinjau(text, text, text) from public, anon;
grant execute on function public.catat_pratinjau(text, text, text) to authenticated;
