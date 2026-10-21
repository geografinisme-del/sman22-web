-- Guru & Tenaga Kependidikan (GTK): JABATAN terpisah dari PERAN, peran baru "pegawai" & "laboran", dasbor dasar.
-- Tidak ada DROP/TRUNCATE; tidak ada data lama yang diubah/dihapus (kolom baru bernilai bawaan, kebijakan & fungsi
-- diganti dengan versi yang memperluas/menjaga akses sebagaimana dijelaskan per bagian).
--
-- 1. jabatan_gtk (daftar yang bisa ditambah admin) + pengguna.jabatan — untuk TAMPILAN & DIREKTORI saja,
--    TIDAK menentukan hak akses. Isi awal: kategori jabatan umum (guru, TU, pustakawan, laboran, satpam, caraka,
--    sopir, tukang kebun) — bukan data pribadi.
-- 2. Peran baru: "pegawai" (Pegawai umum: dasbor dasar saja) & "laboran" (dasbor dasar + inventaris & jadwal lab).
--    Izin baru "sarpras.inventaris": menambah/mengubah data barang, TETAPI harga & sumber dana (anggaran) hanya boleh
--    diubah pemegang sarpras.kelola (dijaga trigger), tanpa hapus, tanpa persetujuan peminjaman.
-- 3. staf_aktif() TIDAK diubah (tetap definisi 20261111): perlu minimal satu peran selain siswa/orang tua/alumni.
--    Akun TANPA peran & akun yang HANYA alumni tidak pernah dianggap GTK → tidak membaca data internal
--    (pengumuman internal, kalender pegawai, direktori). Dasbor dasar aktif setelah admin memberi peran (min. "pegawai").
-- 4. direktori_gtk(): nama + jabatan + peran rekan GTK terverifikasi (punya peran GTK; tanpa email/telepon),
--    hanya untuk GTK aktif.
-- 5. lapor_akun_tanpa_peran(): akun tanpa peran yang masuk → notifikasi ke pemegang pengguna.kelola (maks. 1/24 jam)
--    agar admin memverifikasi & memberi peran.
-- 6. pengumuman.sasaran ('umum' | 'pegawai'): pengumuman internal hanya terbaca GTK aktif. Baris lama = 'umum'
--    (tetap publik seperti sebelumnya).

-- ---------------------------------------------------------------------
-- 1. Jabatan
-- ---------------------------------------------------------------------
create table if not exists public.jabatan_gtk (
  kode        text primary key check (kode ~ '^[a-z][a-z0-9_]{1,39}$'),
  nama        text not null check (char_length(nama) between 2 and 60),
  urutan      smallint not null default 0,
  aktif       boolean not null default true,
  created_at  timestamptz not null default now()
);
insert into public.jabatan_gtk (kode, nama, urutan) values
  ('guru', 'Guru', 1),
  ('tata_usaha', 'Tata usaha (TU)', 2),
  ('pustakawan', 'Pustakawan', 3),
  ('laboran', 'Laboran', 4),
  ('satpam', 'Satpam', 5),
  ('caraka', 'Caraka', 6),
  ('sopir', 'Sopir', 7),
  ('tukang_kebun', 'Tukang kebun', 8)
on conflict (kode) do nothing;

alter table public.jabatan_gtk enable row level security;
revoke all on public.jabatan_gtk from anon;
grant select, insert, update on public.jabatan_gtk to authenticated;
revoke delete, truncate on public.jabatan_gtk from authenticated;
drop policy if exists "gtk baca jabatan" on public.jabatan_gtk;
create policy "gtk baca jabatan" on public.jabatan_gtk for select to authenticated using (true);
drop policy if exists "admin tambah jabatan" on public.jabatan_gtk;
create policy "admin tambah jabatan" on public.jabatan_gtk for insert to authenticated with check ((select public.punya_izin('pengguna.kelola')));
drop policy if exists "admin ubah jabatan" on public.jabatan_gtk;
create policy "admin ubah jabatan" on public.jabatan_gtk for update to authenticated
  using ((select public.punya_izin('pengguna.kelola'))) with check ((select public.punya_izin('pengguna.kelola')));

alter table public.pengguna add column if not exists jabatan text references public.jabatan_gtk (kode) on update cascade;

-- ---------------------------------------------------------------------
-- 2. Peran pegawai & laboran, izin sarpras.inventaris
-- ---------------------------------------------------------------------
insert into public.peran (kode, nama, keterangan, urutan) values
  ('pegawai', 'Pegawai umum', 'Satpam, caraka, sopir, dan pegawai lain: dasbor dasar', 90),
  ('laboran', 'Laboran', 'Dasbor dasar + inventaris & jadwal laboratorium (tanpa anggaran/persetujuan)', 85)
on conflict (kode) do nothing;
insert into public.izin (kode, keterangan) values
  ('sarpras.inventaris', 'Menambah & mengubah data inventaris barang (tanpa harga/sumber dana, tanpa persetujuan peminjaman)')
on conflict (kode) do nothing;
insert into public.peran_izin (peran, izin) values
  ('laboran', 'sarpras.lihat'), ('laboran', 'sarpras.inventaris'),
  ('sarpras', 'sarpras.inventaris'), ('super_admin', 'sarpras.inventaris')
on conflict do nothing;

drop policy if exists "inventaris tambah barang" on public.barang;
create policy "inventaris tambah barang" on public.barang for insert to authenticated
  with check ((select public.punya_izin('sarpras.inventaris')));
drop policy if exists "inventaris ubah barang" on public.barang;
create policy "inventaris ubah barang" on public.barang for update to authenticated
  using ((select public.punya_izin('sarpras.inventaris'))) with check ((select public.punya_izin('sarpras.inventaris')));

-- anggaran (harga & sumber dana) hanya diubah pemegang sarpras.kelola; sesi layanan (tanpa auth.uid) tidak dibatasi
create or replace function public.jaga_anggaran_barang() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.punya_izin('sarpras.kelola') then return new; end if;
  if tg_op = 'INSERT' then
    if new.harga is not null or new.sumber_dana <> '' then
      raise exception 'Harga & sumber dana barang hanya diisi Wakasek Sarpras' using errcode = '42501';
    end if;
  elsif new.harga is distinct from old.harga or new.sumber_dana is distinct from old.sumber_dana then
    raise exception 'Harga & sumber dana barang hanya diubah Wakasek Sarpras' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists jaga_anggaran_barang on public.barang;
create trigger jaga_anggaran_barang before insert or update on public.barang
  for each row execute function public.jaga_anggaran_barang();

-- ---------------------------------------------------------------------
-- 3. staf_aktif: TIDAK diubah (lihat keterangan di atas)
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 4. Direktori GTK (tanpa email/telepon)
-- ---------------------------------------------------------------------
create or replace function public.direktori_gtk()
returns table (nama text, jabatan text, peran text[])
language sql stable security definer set search_path = '' as $$
  select p.nama,
         coalesce(j.nama, ''),
         coalesce(array_agg(r.nama order by r.urutan) filter (where r.kode is not null), '{}')
  from public.pengguna p
  left join public.jabatan_gtk j on j.kode = p.jabatan
  left join public.pengguna_peran pp on pp.user_id = p.user_id
  left join public.peran r on r.kode = pp.peran
  where public.staf_aktif() and p.aktif and p.nama <> ''
    -- hanya GTK terverifikasi: punya minimal satu peran selain siswa/orang tua/alumni (akun tanpa peran tidak tercantum)
    and exists (select 1 from public.pengguna_peran x where x.user_id = p.user_id and x.peran not in ('siswa', 'orang_tua', 'alumni'))
  group by p.user_id, p.nama, j.nama
  order by p.nama;
$$;
revoke all on function public.direktori_gtk() from public, anon;
grant execute on function public.direktori_gtk() to authenticated;

-- ---------------------------------------------------------------------
-- 5. Notifikasi admin untuk akun GTK tanpa peran
-- ---------------------------------------------------------------------
create or replace function public.lapor_akun_tanpa_peran()
returns void language plpgsql security definer set search_path = '' as $$
declare
  saya public.pengguna;
  v_tautan text;
  admin uuid;
begin
  select * into saya from public.pengguna where user_id = auth.uid() and aktif;
  if saya.user_id is null or exists (select 1 from public.pengguna_peran where user_id = saya.user_id) then return; end if;
  v_tautan := '/admin/pengguna/' || saya.user_id::text;
  for admin in select public.pengguna_berizin('pengguna.kelola') loop
    if not exists (select 1 from public.notifikasi n where n.user_id = admin and n.tautan = v_tautan and n.created_at > now() - interval '24 hours') then
      perform public.kirim_notif(admin, 'akun', 'Akun GTK belum diberi peran',
        coalesce(nullif(saya.nama, ''), saya.email) || ' masuk tanpa peran (menunggu verifikasi). Periksa akunnya, lalu tetapkan peran & jabatannya.', v_tautan, 'biasa');
    end if;
  end loop;
end $$;
revoke all on function public.lapor_akun_tanpa_peran() from public, anon;
grant execute on function public.lapor_akun_tanpa_peran() to authenticated;

-- ---------------------------------------------------------------------
-- 6. Pengumuman internal untuk GTK
-- ---------------------------------------------------------------------
alter table public.pengumuman add column if not exists sasaran text not null default 'umum' check (sasaran in ('umum', 'pegawai'));
drop policy if exists "publik baca pengumuman" on public.pengumuman;
create policy "publik baca pengumuman" on public.pengumuman for select to anon, authenticated
  using (deleted_at is null and aktif and sasaran = 'umum' and (tayang_mulai is null or tayang_mulai <= now())
         and (tayang_selesai is null or tayang_selesai > now()));
drop policy if exists "gtk baca pengumuman internal" on public.pengumuman;
create policy "gtk baca pengumuman internal" on public.pengumuman for select to authenticated
  using (deleted_at is null and aktif and sasaran = 'pegawai' and (tayang_mulai is null or tayang_mulai <= now())
         and (tayang_selesai is null or tayang_selesai > now()) and (select public.staf_aktif()));
