-- Rollback 20261228000000_pratinjau_peran.sql (HANYA dengan izin pemilik).
-- Urutan penting: lepas pre-request DULU (pre-request yang menunjuk fungsi yang sudah dihapus membuat semua API gagal).
-- Data tidak tersentuh; catatan PRATINJAU_* di audit_log dibiarkan sebagai riwayat.

alter role authenticator reset pgrst.db_pre_request;
notify pgrst, 'reload config';

-- fungsi izin kembali ke definisi 20261026000000_keamanan_kalender.sql
create or replace function public.punya_izin(kode text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.pengguna p
    join public.pengguna_peran pp on pp.user_id = p.user_id
    join public.peran r on r.kode = pp.peran
    join public.peran_izin pi on pi.peran = pp.peran
    where p.user_id = auth.uid() and p.aktif and pi.izin = punya_izin.kode
      and (not r.wajib_mfa or public.aal2())
  );
$$;

create or replace function public.punya_peran(kode text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.pengguna p
    join public.pengguna_peran pp on pp.user_id = p.user_id
    join public.peran r on r.kode = pp.peran
    where p.user_id = auth.uid() and p.aktif and pp.peran = punya_peran.kode
      and (not r.wajib_mfa or public.aal2())
  );
$$;

create or replace function public.akses_saya()
returns jsonb language sql stable security definer set search_path = '' as $$
  with saya as (select p.nama, p.aktif from public.pengguna p where p.user_id = auth.uid()),
  r as (
    select pp.peran, x.urutan, (x.wajib_mfa and not public.aal2()) as tertunda
    from public.pengguna_peran pp join public.peran x on x.kode = pp.peran
    where pp.user_id = auth.uid()
  )
  select jsonb_build_object(
    'nama',  coalesce((select nama from saya), ''),
    'aktif', coalesce((select aktif from saya), false),
    'aal',   coalesce(auth.jwt() ->> 'aal', 'aal1'),
    'peran', coalesce((select jsonb_agg(peran order by urutan) from r where not tertunda), '[]'::jsonb),
    'peran_tertunda', coalesce((select jsonb_agg(peran order by urutan) from r where tertunda), '[]'::jsonb),
    'izin',  coalesce((select jsonb_agg(distinct pi.izin) from r join public.peran_izin pi on pi.peran = r.peran
                        where not r.tertunda and coalesce((select aktif from saya), false)), '[]'::jsonb)
  );
$$;

drop function if exists public.pra_permintaan();
drop function if exists public.catat_pratinjau(text, text, text);
drop function if exists public.peran_pratinjau();
