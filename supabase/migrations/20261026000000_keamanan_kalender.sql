-- =====================================================================
-- Fase 8 — Modul 03 (Akun, Peran & Hak Akses) & Modul 06 (Jadwal & Kalender)
--   A. MFA wajib per peran (izin peran tsb hanya berlaku pada sesi AAL2)
--   B. Audit & notifikasi peristiwa keamanan (login, ganti sandi, MFA)
--   C. Kalender kegiatan sekolah (+ sinkron ke hari libur KBM)
--   D. Pengajuan tukar jam / minta digantikan oleh guru
--   E. Notifikasi perubahan jadwal ke guru pengampu & siswa kelas
--   F. Riwayat perubahan jadwal untuk kurikulum
-- Idempoten: aman dijalankan ulang.
-- =====================================================================

-- ---------------------------------------------------------------------
-- A. MFA wajib per peran
-- ---------------------------------------------------------------------
alter table public.peran add column if not exists wajib_mfa boolean not null default false;
update public.peran set wajib_mfa = true where kode = 'super_admin';

-- sesi saat ini sudah lolos verifikasi dua langkah?
create or replace function public.aal2()
returns boolean language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

-- izin dari peran yang wajib MFA hanya berlaku bila sesi AAL2
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

-- hanya super admin (sesi AAL2) yang mengatur peran mana yang wajib MFA
create or replace function public.atur_wajib_mfa(p_peran text, p_wajib boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.punya_peran('super_admin') then
    raise exception 'Hanya super admin (dengan verifikasi dua langkah) yang dapat mengubah ini' using errcode = '42501';
  end if;
  if p_peran in ('siswa', 'orang_tua') then
    raise exception 'Akun portal siswa/orang tua tidak memakai verifikasi dua langkah' using errcode = '22023';
  end if;
  if p_peran = 'super_admin' and not p_wajib then
    raise exception 'Verifikasi dua langkah untuk super admin tidak boleh dimatikan' using errcode = '22023';
  end if;
  update public.peran set wajib_mfa = p_wajib where kode = p_peran;
  if not found then raise exception 'Peran tidak dikenal' using errcode = '22023'; end if;
  insert into public.audit_log (user_id, tabel, aksi, record_id, data_baru)
  values (auth.uid(), 'peran', 'KEAMANAN', p_peran, jsonb_build_object('peristiwa', 'wajib_mfa', 'peran', p_peran, 'nilai', p_wajib));
end $$;
revoke all on function public.atur_wajib_mfa(text, boolean) from public, anon;
grant execute on function public.atur_wajib_mfa(text, boolean) to authenticated;

-- tabel peran hanya diubah lewat fungsi di atas
revoke insert, update, delete on public.peran from authenticated, anon;

-- ---------------------------------------------------------------------
-- B. Audit & notifikasi keamanan
-- ---------------------------------------------------------------------
create or replace function public.catat_aktivitas(nama_tabel text, aksi text, keterangan jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return; end if;
  if aksi not in ('EKSPOR', 'LOGIN', 'LOGOUT', 'CETAK', 'LIHAT') then
    raise exception 'Aksi tidak dikenal' using errcode = '22023';
  end if;
  insert into public.audit_log (user_id, tabel, aksi, record_id, data_baru)
  values (auth.uid(), left(nama_tabel, 60), aksi, '', keterangan);
end $$;

-- kirim_notif: tambah p_luar (false = hanya lonceng di aplikasi, tanpa WA/email)
drop function if exists public.kirim_notif(uuid, text, text, text, text, text);
create or replace function public.kirim_notif(p_user uuid, p_kategori text, p_judul text, p_isi text default '',
                                              p_tautan text default '', p_prioritas text default 'biasa',
                                              p_luar boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare
  nid bigint; pref public.preferensi_notifikasi; staf boolean; mail text; wa text; tunda timestamptz := now();
  jam int := extract(hour from now() at time zone 'Asia/Jakarta');
begin
  if p_user is null or not exists (select 1 from public.pengguna where user_id = p_user and aktif) then return; end if;
  begin
    insert into public.notifikasi (user_id, kategori, judul, isi, tautan, prioritas)
    values (p_user, p_kategori, left(p_judul, 150), left(coalesce(p_isi, ''), 500), left(coalesce(p_tautan, ''), 300), p_prioritas)
    returning id into nid;
    if not p_luar then return; end if;

    select * into pref from public.preferensi_notifikasi where user_id = p_user;
    -- peringatan keamanan tidak bisa dimatikan
    if p_kategori <> 'keamanan' and p_kategori = any (coalesce(pref.kategori_mati, '{}')) then return; end if;
    staf := exists (select 1 from public.pengguna_peran where user_id = p_user and peran not in ('siswa', 'orang_tua'));

    if coalesce(pref.email, true) or p_kategori = 'keamanan' then
      mail := case when staf then (select email from auth.users where id = p_user)
                   else nullif((select email from public.orang_tua where user_id = p_user limit 1), '') end;
    end if;
    if coalesce(pref.whatsapp, true) then
      wa := coalesce(nullif(pref.nomor_wa, ''),
                     public.nomor_wa_baku((select telepon from public.pegawai where user_id = p_user limit 1)),
                     public.nomor_wa_baku((select telepon from public.orang_tua where user_id = p_user limit 1)));
    end if;
    if p_prioritas <> 'penting' and (jam >= 21 or jam < 6) then
      tunda := ((now() at time zone 'Asia/Jakarta')::date + case when jam >= 21 then 1 else 0 end + time '06:00') at time zone 'Asia/Jakarta';
    end if;
    if mail is not null and mail ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and mail !~ '@portal\.sman22bdg\.sch\.id$' and not exists (
         select 1 from public.antrian_kirim where user_id = p_user and kanal = 'email' and kategori = p_kategori
         and dibuat_pada > now() - interval '10 minutes') then
      insert into public.antrian_kirim (notifikasi_id, user_id, kategori, kanal, tujuan, judul, isi, tautan, tunda_sampai)
      values (nid, p_user, p_kategori, 'email', mail, left(p_judul, 150), left(coalesce(p_isi, ''), 500), coalesce(p_tautan, ''), tunda);
    end if;
    if wa is not null and not exists (
         select 1 from public.antrian_kirim where user_id = p_user and kanal = 'whatsapp' and kategori = p_kategori
         and dibuat_pada > now() - interval '10 minutes') then
      insert into public.antrian_kirim (notifikasi_id, user_id, kategori, kanal, tujuan, judul, isi, tautan, tunda_sampai)
      values (nid, p_user, p_kategori, 'whatsapp', wa, left(p_judul, 150), left(coalesce(p_isi, ''), 500), coalesce(p_tautan, ''), tunda);
    end if;
  exception when others then
    raise warning 'kirim_notif gagal: %', sqlerrm;
  end;
end $$;
revoke all on function public.kirim_notif(uuid, text, text, text, text, text, boolean) from public, anon, authenticated;

-- teks baku peristiwa keamanan (tidak menerima teks bebas dari aplikasi)
create or replace function public._teks_keamanan(p text)
returns text[] language sql immutable set search_path = '' as $$
  select case p
    when 'sandi_diubah'   then array['Kata sandi akun Anda diubah', 'Bila bukan Anda yang mengubahnya, segera hubungi super admin sekolah.']
    when 'sandi_direset'  then array['Kata sandi akun Anda diatur ulang oleh admin', 'Kata sandi baru diberikan langsung oleh admin. Bila Anda tidak memintanya, hubungi super admin.']
    when 'sandi_lupa'     then array['Kata sandi diatur ulang lewat email', 'Bila bukan Anda, segera hubungi super admin sekolah.']
    when 'mfa_aktif'      then array['Verifikasi dua langkah diaktifkan', 'Aplikasi autentikator baru ditambahkan ke akun Anda.']
    when 'mfa_dihapus'    then array['Aplikasi autentikator dihapus', 'Satu aplikasi autentikator dilepas dari akun Anda.']
    when 'mfa_direset'    then array['Verifikasi dua langkah direset oleh admin', 'Semua aplikasi autentikator dilepas. Daftarkan ulang saat masuk berikutnya.']
    when 'keluar_semua'   then array['Keluar dari semua perangkat', 'Semua sesi login akun Anda telah diakhiri.']
    when 'tautan_reset'   then array['Tautan atur ulang sandi dikirim', 'Admin mengirim tautan atur ulang kata sandi ke email Anda.']
  end;
$$;

-- peristiwa pada akun sendiri
create or replace function public.catat_keamanan(p_peristiwa text, p_keterangan jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare t text[] := public._teks_keamanan(p_peristiwa);
begin
  if auth.uid() is null then return; end if;
  if t is null or p_peristiwa in ('sandi_direset', 'mfa_direset', 'tautan_reset') then
    raise exception 'Peristiwa tidak dikenal' using errcode = '22023';
  end if;
  insert into public.audit_log (user_id, tabel, aksi, record_id, data_baru)
  values (auth.uid(), 'auth', 'KEAMANAN', auth.uid()::text, jsonb_build_object('peristiwa', p_peristiwa) || coalesce(p_keterangan, '{}'::jsonb));
  perform public.kirim_notif(auth.uid(), 'keamanan', t[1], t[2], '/admin/keamanan', 'penting');
end $$;

-- peristiwa yang dilakukan admin terhadap akun orang lain
create or replace function public.catat_keamanan_pengguna(p_user uuid, p_peristiwa text)
returns void language plpgsql security definer set search_path = '' as $$
declare t text[] := public._teks_keamanan(p_peristiwa);
begin
  if not public.punya_izin('pengguna.kelola') then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  if p_peristiwa not in ('sandi_direset', 'mfa_direset', 'tautan_reset') then
    raise exception 'Peristiwa tidak dikenal' using errcode = '22023';
  end if;
  insert into public.audit_log (user_id, tabel, aksi, record_id, data_baru)
  values (auth.uid(), 'auth', 'KEAMANAN', p_user::text, jsonb_build_object('peristiwa', p_peristiwa, 'target', p_user));
  perform public.kirim_notif(p_user, 'keamanan', t[1], t[2], '/admin/keamanan', 'penting');
end $$;
revoke all on function public.catat_keamanan(text, jsonb), public.catat_keamanan_pengguna(uuid, text), public._teks_keamanan(text) from public, anon;
grant execute on function public.catat_keamanan(text, jsonb), public.catat_keamanan_pengguna(uuid, text) to authenticated;

-- akhiri semua sesi login seorang pengguna (HP hilang, akun dinonaktifkan). Token aktif habis ≤ 1 jam.
create or replace function public.cabut_sesi_pengguna(p_user uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.punya_izin('pengguna.kelola') then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  if exists (select 1 from public.pengguna_peran where user_id = p_user and peran = 'super_admin')
     and not public.punya_peran('super_admin') then
    raise exception 'Hanya super admin yang dapat mengakhiri sesi super admin' using errcode = '42501';
  end if;
  begin
    delete from auth.sessions where user_id = p_user;
    return true;
  exception when insufficient_privilege then
    return false;  -- proyek yang membatasi akses skema auth: sesi berakhir sendiri saat token kedaluwarsa
  end;
end $$;
revoke all on function public.cabut_sesi_pengguna(uuid) from public, anon;
grant execute on function public.cabut_sesi_pengguna(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- C. Kalender kegiatan sekolah
-- ---------------------------------------------------------------------
insert into public.izin (kode, keterangan) values
  ('kalender.kelola', 'Mengelola kalender kegiatan sekolah (akademik, ujian, rapat, libur)')
on conflict (kode) do update set keterangan = excluded.keterangan;
insert into public.peran_izin (peran, izin) values
  ('super_admin', 'kalender.kelola'), ('kurikulum', 'kalender.kelola'), ('wakasek', 'kalender.kelola'), ('humas', 'kalender.kelola')
on conflict do nothing;

create table if not exists public.kegiatan_kalender (
  id          uuid primary key default gen_random_uuid(),
  judul       text not null check (char_length(judul) between 3 and 150),
  jenis       text not null check (jenis in ('akademik', 'ujian', 'kegiatan', 'rapat', 'libur')),
  mulai       date not null,
  selesai     date not null,
  jam_mulai   time,
  jam_selesai time,
  lokasi      text not null default '' check (char_length(lokasi) <= 150),
  keterangan  text not null default '' check (char_length(keterangan) <= 1000),
  sasaran     text not null default 'umum' check (sasaran in ('umum', 'warga', 'pegawai')),
  kbm_libur   boolean not null default false,
  dibuat_oleh uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint kalender_rentang check (selesai >= mulai and selesai - mulai <= 92),
  constraint kalender_jam check (jam_selesai is null or jam_mulai is null or jam_selesai > jam_mulai)
);
create index if not exists kegiatan_kalender_tanggal on public.kegiatan_kalender (mulai, selesai) where deleted_at is null;

-- hari libur dari kalender ditandai asalnya, agar ikut terhapus/berubah
alter table public.hari_libur add column if not exists kegiatan_id uuid references public.kegiatan_kalender (id) on delete cascade;

create or replace function public.sinkron_libur_kalender()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    delete from public.hari_libur where kegiatan_id = new.id;
  end if;
  return new;
end $$;
create or replace function public.sinkron_libur_kalender_setelah()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kbm_libur and new.deleted_at is null then
    insert into public.hari_libur (tanggal, keterangan, kegiatan_id)
    select d::date, left(new.judul, 150), new.id
    from generate_series(new.mulai, new.selesai, interval '1 day') d
    where extract(isodow from d) < 7
    on conflict (tanggal) do nothing;
  end if;
  return null;
end $$;
drop trigger if exists sinkron_libur_kalender on public.kegiatan_kalender;
create trigger sinkron_libur_kalender before insert or update on public.kegiatan_kalender
  for each row execute function public.sinkron_libur_kalender();
drop trigger if exists sinkron_libur_kalender_setelah on public.kegiatan_kalender;
create trigger sinkron_libur_kalender_setelah after insert or update on public.kegiatan_kalender
  for each row execute function public.sinkron_libur_kalender_setelah();

-- staf = punya peran selain siswa/orang tua
create or replace function public.staf_aktif()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pengguna p join public.pengguna_peran pp on pp.user_id = p.user_id
                  where p.user_id = auth.uid() and p.aktif and pp.peran not in ('siswa', 'orang_tua'));
$$;
create or replace function public.warga_aktif()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pengguna p join public.pengguna_peran pp on pp.user_id = p.user_id
                  where p.user_id = auth.uid() and p.aktif);
$$;
grant execute on function public.staf_aktif(), public.warga_aktif() to authenticated;

alter table public.kegiatan_kalender enable row level security;
revoke truncate on public.kegiatan_kalender from authenticated;
revoke insert, update, delete, truncate on public.kegiatan_kalender from anon;
grant select on public.kegiatan_kalender to anon;
drop policy if exists "publik baca kalender" on public.kegiatan_kalender;
create policy "publik baca kalender" on public.kegiatan_kalender for select to anon
  using (deleted_at is null and sasaran = 'umum');
drop policy if exists "warga baca kalender" on public.kegiatan_kalender;
create policy "warga baca kalender" on public.kegiatan_kalender for select to authenticated
  using ((deleted_at is null and (sasaran = 'umum'
           or (sasaran = 'warga' and (select public.warga_aktif()))
           or (sasaran = 'pegawai' and (select public.staf_aktif()))))
         or (select public.punya_izin('kalender.kelola')));
drop policy if exists "kelola kalender" on public.kegiatan_kalender;
create policy "kelola kalender" on public.kegiatan_kalender for all to authenticated
  using ((select public.punya_izin('kalender.kelola'))) with check ((select public.punya_izin('kalender.kelola')));
drop trigger if exists audit_kegiatan_kalender on public.kegiatan_kalender;
create trigger audit_kegiatan_kalender after insert or update or delete on public.kegiatan_kalender
  for each row execute function public.catat_audit();

-- ---------------------------------------------------------------------
-- D. Pengajuan tukar jam / minta digantikan
-- ---------------------------------------------------------------------
create table if not exists public.pengajuan_tukar_jadwal (
  id               uuid primary key default gen_random_uuid(),
  pemohon_id       uuid not null references public.pegawai (id),
  jadwal_pemohon   uuid not null references public.jadwal (id) on delete cascade,
  tanggal_pemohon  date not null,
  mitra_id         uuid not null references public.pegawai (id),
  jadwal_mitra     uuid references public.jadwal (id) on delete cascade,
  tanggal_mitra    date,
  alasan           text not null check (char_length(alasan) between 5 and 300),
  status           text not null default 'menunggu_mitra'
                   check (status in ('menunggu_mitra', 'menunggu_kurikulum', 'disetujui', 'ditolak', 'dibatalkan')),
  catatan_mitra    text not null default '',
  catatan_putusan  text not null default '',
  dijawab_pada     timestamptz,
  diputus_oleh     uuid,
  diputus_pada     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint tukar_pasangan check ((jadwal_mitra is null) = (tanggal_mitra is null)),
  constraint tukar_beda_guru check (pemohon_id <> mitra_id)
);
create index if not exists pengajuan_tukar_status on public.pengajuan_tukar_jadwal (status, tanggal_pemohon);
create unique index if not exists pengajuan_tukar_unik on public.pengajuan_tukar_jadwal (jadwal_pemohon, tanggal_pemohon)
  where status in ('menunggu_mitra', 'menunggu_kurikulum');

alter table public.perubahan_jadwal add column if not exists pengajuan_id uuid references public.pengajuan_tukar_jadwal (id) on delete set null;

-- pemeriksaan satu slot: milik guru, cocok hari, bukan libur, belum ada perubahan
create or replace function public._cek_slot_tukar(p_jadwal uuid, p_tanggal date, p_guru uuid)
returns public.jadwal language plpgsql stable security definer set search_path = '' as $$
declare j public.jadwal; hari_ini date := (now() at time zone 'Asia/Jakarta')::date;
begin
  select j0.* into j from public.jadwal j0 join public.tahun_ajaran t on t.id = j0.tahun_ajaran_id and t.aktif where j0.id = p_jadwal;
  if j.id is null or j.pegawai_id is distinct from p_guru then
    raise exception 'Jam pelajaran tidak ditemukan atau bukan milik guru tersebut' using errcode = '22023';
  end if;
  if p_tanggal < hari_ini or p_tanggal > hari_ini + 30 then
    raise exception 'Tanggal harus antara hari ini dan 30 hari ke depan' using errcode = '22023';
  end if;
  if extract(isodow from p_tanggal)::smallint <> j.hari then
    raise exception 'Tanggal % bukan hari %', to_char(p_tanggal, 'DD-MM-YYYY'), public.nama_hari(j.hari) using errcode = '22023';
  end if;
  if exists (select 1 from public.hari_libur where tanggal = p_tanggal) then
    raise exception 'Tanggal % hari libur', to_char(p_tanggal, 'DD-MM-YYYY') using errcode = '22023';
  end if;
  if exists (select 1 from public.perubahan_jadwal where jadwal_id = p_jadwal and tanggal = p_tanggal) then
    raise exception 'Jam tersebut sudah punya perubahan pada tanggal itu' using errcode = '22023';
  end if;
  return j;
end $$;

create or replace function public._cek_tukar_bentrok(t public.pengajuan_tukar_jadwal)
returns void language plpgsql stable security definer set search_path = '' as $$
declare a public.jadwal; b public.jadwal; alasan text;
begin
  select * into a from public.jadwal where id = t.jadwal_pemohon;
  alasan := public.guru_sibuk(t.mitra_id, t.tanggal_pemohon, a.hari, a.jp_ke);
  if alasan is not null then
    raise exception 'Bentrok: % sedang % pada JP ke-% tanggal %', public.nama_pegawai(t.mitra_id), alasan, a.jp_ke,
      to_char(t.tanggal_pemohon, 'DD-MM-YYYY') using errcode = '23P01';
  end if;
  if t.jadwal_mitra is not null then
    select * into b from public.jadwal where id = t.jadwal_mitra;
    alasan := public.guru_sibuk(t.pemohon_id, t.tanggal_mitra, b.hari, b.jp_ke);
    -- pemohon "sibuk" di jamnya sendiri yang sedang ditukar → bukan bentrok bila slot itu yang dilepas
    if alasan is not null and not (t.tanggal_mitra = t.tanggal_pemohon and b.hari = a.hari and b.jp_ke = a.jp_ke) then
      raise exception 'Bentrok: Anda sedang % pada JP ke-% tanggal %', alasan, b.jp_ke, to_char(t.tanggal_mitra, 'DD-MM-YYYY') using errcode = '23P01';
    end if;
  end if;
end $$;
revoke all on function public._cek_slot_tukar(uuid, date, uuid), public._cek_tukar_bentrok(public.pengajuan_tukar_jadwal) from public, anon, authenticated;

create or replace function public._ringkas_slot(p_jadwal uuid, p_tanggal date)
returns text language sql stable security definer set search_path = '' as $$
  select m.nama || ' ' || k.nama || ', ' || public.nama_hari(j.hari) || ' ' || to_char(p_tanggal, 'DD-MM') || ' JP ' || j.jp_ke
  from public.jadwal j join public.kelas k on k.id = j.kelas_id
  join public.penugasan_mengajar p on p.id = j.penugasan_id join public.mapel m on m.id = p.mapel_id
  where j.id = p_jadwal;
$$;
revoke all on function public._ringkas_slot(uuid, date) from public, anon, authenticated;

create or replace function public.ajukan_tukar_jadwal(p_jadwal uuid, p_tanggal date, p_mitra uuid,
                                                      p_jadwal_mitra uuid default null, p_tanggal_mitra date default null,
                                                      p_alasan text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare saya uuid := public.pegawai_saya(); t public.pengajuan_tukar_jadwal; uid uuid;
begin
  if saya is null then raise exception 'Akun Anda belum ditautkan ke data guru' using errcode = '42501'; end if;
  if p_mitra = saya then raise exception 'Pilih guru lain' using errcode = '22023'; end if;
  select user_id into uid from public.pegawai where id = p_mitra and deleted_at is null;
  if uid is null or not exists (select 1 from public.pengguna where user_id = uid and aktif) then
    raise exception 'Guru tujuan belum punya akun aktif' using errcode = '22023';
  end if;
  perform public._cek_slot_tukar(p_jadwal, p_tanggal, saya);
  if (p_jadwal_mitra is null) <> (p_tanggal_mitra is null) then
    raise exception 'Lengkapi jam balasan dari guru tujuan' using errcode = '22023';
  end if;
  if p_jadwal_mitra is not null then perform public._cek_slot_tukar(p_jadwal_mitra, p_tanggal_mitra, p_mitra); end if;
  t := row(gen_random_uuid(), saya, p_jadwal, p_tanggal, p_mitra, p_jadwal_mitra, p_tanggal_mitra, trim(p_alasan),
           'menunggu_mitra', '', '', null, null, null, now(), now())::public.pengajuan_tukar_jadwal;
  perform public._cek_tukar_bentrok(t);
  begin
    insert into public.pengajuan_tukar_jadwal select t.*;
  exception when unique_violation then
    raise exception 'Jam ini sudah punya pengajuan yang sedang diproses' using errcode = '23505';
  end;
  perform public.kirim_notif(uid, 'jadwal',
    case when p_jadwal_mitra is null then 'Permintaan menggantikan jam' else 'Permintaan tukar jam' end,
    public.nama_pegawai(saya) || ': ' || public._ringkas_slot(p_jadwal, p_tanggal)
      || coalesce(' ⇄ ' || public._ringkas_slot(p_jadwal_mitra, p_tanggal_mitra), '') || '. Alasan: ' || left(trim(p_alasan), 120),
    '/admin/tukar-jam');
  return t.id;
end $$;

create or replace function public.jawab_tukar_jadwal(p_id uuid, p_terima boolean, p_catatan text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare t public.pengajuan_tukar_jadwal; u uuid;
begin
  select * into t from public.pengajuan_tukar_jadwal where id = p_id for update;
  if t.id is null or t.mitra_id is distinct from public.pegawai_saya() then
    raise exception 'Pengajuan tidak ditemukan' using errcode = '42501';
  end if;
  if t.status <> 'menunggu_mitra' then raise exception 'Pengajuan sudah dijawab' using errcode = '22023'; end if;
  if p_terima then perform public._cek_tukar_bentrok(t); end if;
  update public.pengajuan_tukar_jadwal
     set status = case when p_terima then 'menunggu_kurikulum' else 'ditolak' end,
         catatan_mitra = left(coalesce(trim(p_catatan), ''), 300), dijawab_pada = now(), updated_at = now()
   where id = p_id;
  perform public.kirim_notif((select user_id from public.pegawai where id = t.pemohon_id), 'jadwal',
    case when p_terima then 'Tukar jam diterima, menunggu kurikulum' else 'Tukar jam ditolak' end,
    public.nama_pegawai(t.mitra_id) || coalesce(': ' || nullif(trim(p_catatan), ''), ''), '/admin/tukar-jam');
  if p_terima then
    for u in select public.pengguna_berizin('jadwal.kelola') loop
      perform public.kirim_notif(u, 'jadwal', 'Pengajuan tukar jam menunggu persetujuan',
        public.nama_pegawai(t.pemohon_id) || ' ⇄ ' || public.nama_pegawai(t.mitra_id), '/admin/jadwal/tukar');
    end loop;
  end if;
end $$;

create or replace function public.putuskan_tukar_jadwal(p_id uuid, p_setuju boolean, p_catatan text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare t public.pengajuan_tukar_jadwal; u uuid; ket text;
begin
  if not public.punya_izin('jadwal.kelola') then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  select * into t from public.pengajuan_tukar_jadwal where id = p_id for update;
  if t.id is null then raise exception 'Pengajuan tidak ditemukan' using errcode = '22023'; end if;
  if t.status <> 'menunggu_kurikulum' then raise exception 'Pengajuan tidak sedang menunggu persetujuan' using errcode = '22023'; end if;
  if not p_setuju and char_length(trim(coalesce(p_catatan, ''))) < 3 then
    raise exception 'Tulis alasan penolakan' using errcode = '22023';
  end if;
  if p_setuju then
    -- periksa ulang: kondisi jadwal bisa berubah sejak diajukan
    perform public._cek_slot_tukar(t.jadwal_pemohon, t.tanggal_pemohon, t.pemohon_id);
    if t.jadwal_mitra is not null then perform public._cek_slot_tukar(t.jadwal_mitra, t.tanggal_mitra, t.mitra_id); end if;
    perform public._cek_tukar_bentrok(t);
    ket := case when t.jadwal_mitra is null then 'Menggantikan atas permintaan ' || public.nama_pegawai(t.pemohon_id)
                else 'Tukar jam ' || public.nama_pegawai(t.pemohon_id) || ' ⇄ ' || public.nama_pegawai(t.mitra_id) end;
    insert into public.perubahan_jadwal (jadwal_id, tanggal, jenis, pegawai_pengganti_id, catatan, pengajuan_id)
    values (t.jadwal_pemohon, t.tanggal_pemohon, 'pengganti', t.mitra_id, ket, t.id);
    if t.jadwal_mitra is not null then
      insert into public.perubahan_jadwal (jadwal_id, tanggal, jenis, pegawai_pengganti_id, catatan, pengajuan_id)
      values (t.jadwal_mitra, t.tanggal_mitra, 'pengganti', t.pemohon_id, ket, t.id);
    end if;
  end if;
  update public.pengajuan_tukar_jadwal
     set status = case when p_setuju then 'disetujui' else 'ditolak' end,
         catatan_putusan = left(coalesce(trim(p_catatan), ''), 300), diputus_oleh = auth.uid(), diputus_pada = now(), updated_at = now()
   where id = p_id;
  for u in select user_id from public.pegawai where id in (t.pemohon_id, t.mitra_id) loop
    perform public.kirim_notif(u, 'jadwal', case when p_setuju then 'Tukar jam disetujui' else 'Tukar jam tidak disetujui' end,
      public._ringkas_slot(t.jadwal_pemohon, t.tanggal_pemohon) || coalesce(' ⇄ ' || public._ringkas_slot(t.jadwal_mitra, t.tanggal_mitra), '')
        || coalesce('. ' || nullif(trim(p_catatan), ''), ''),
      '/admin/jadwal-saya', 'penting');
  end loop;
end $$;

create or replace function public.batalkan_tukar_jadwal(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.pengajuan_tukar_jadwal;
begin
  select * into t from public.pengajuan_tukar_jadwal where id = p_id for update;
  if t.id is null or t.pemohon_id is distinct from public.pegawai_saya() then
    raise exception 'Pengajuan tidak ditemukan' using errcode = '42501';
  end if;
  if t.status not in ('menunggu_mitra', 'menunggu_kurikulum') then
    raise exception 'Pengajuan sudah diputuskan' using errcode = '22023';
  end if;
  update public.pengajuan_tukar_jadwal set status = 'dibatalkan', updated_at = now() where id = p_id;
end $$;

revoke all on function public.ajukan_tukar_jadwal(uuid, date, uuid, uuid, date, text), public.jawab_tukar_jadwal(uuid, boolean, text),
  public.putuskan_tukar_jadwal(uuid, boolean, text), public.batalkan_tukar_jadwal(uuid) from public, anon;
grant execute on function public.ajukan_tukar_jadwal(uuid, date, uuid, uuid, date, text), public.jawab_tukar_jadwal(uuid, boolean, text),
  public.putuskan_tukar_jadwal(uuid, boolean, text), public.batalkan_tukar_jadwal(uuid) to authenticated;

alter table public.pengajuan_tukar_jadwal enable row level security;
revoke all on public.pengajuan_tukar_jadwal from anon;
revoke insert, update, delete, truncate on public.pengajuan_tukar_jadwal from authenticated;  -- hanya lewat fungsi
drop policy if exists "baca tukar jadwal" on public.pengajuan_tukar_jadwal;
create policy "baca tukar jadwal" on public.pengajuan_tukar_jadwal for select to authenticated
  using (pemohon_id = (select public.pegawai_saya()) or mitra_id = (select public.pegawai_saya())
         or (select public.punya_izin('jadwal.kelola')) or (select public.punya_izin('jadwal.pengganti')));
drop trigger if exists audit_pengajuan_tukar_jadwal on public.pengajuan_tukar_jadwal;
create trigger audit_pengajuan_tukar_jadwal after insert or update or delete on public.pengajuan_tukar_jadwal
  for each row execute function public.catat_audit();

-- daftar guru yang bisa diajak tukar (nama saja, tanpa data pribadi)
create or replace function public.guru_berakun()
returns table (id uuid, nama text) language sql stable security definer set search_path = '' as $$
  select g.id, g.nama from public.pegawai g join public.pengguna p on p.user_id = g.user_id and p.aktif
  where g.deleted_at is null and public.staf_aktif() and g.id is distinct from public.pegawai_saya()
  order by g.nama;
$$;
grant execute on function public.guru_berakun() to authenticated;

-- ---------------------------------------------------------------------
-- E. Notifikasi perubahan jadwal
-- ---------------------------------------------------------------------
create or replace function public.notif_pengganti() returns trigger language plpgsql security definer set search_path = '' as $$
declare j record; teks text; u uuid; hari_ini date := (now() at time zone 'Asia/Jakarta')::date;
begin
  select k.nama kelas, m.nama mapel, jd.jp_ke, jd.kelas_id, jd.pegawai_id, public.nama_pegawai(jd.pegawai_id) guru into j
    from public.jadwal jd join public.kelas k on k.id = jd.kelas_id
    join public.penugasan_mengajar p on p.id = jd.penugasan_id join public.mapel m on m.id = p.mapel_id where jd.id = new.jadwal_id;

  -- guru pengganti (bila lewat pengajuan tukar, pemberitahuan dikirim oleh putuskan_tukar_jadwal)
  if new.jenis = 'pengganti' and new.pengajuan_id is null then
    perform public.kirim_notif((select user_id from public.pegawai where id = new.pegawai_pengganti_id), 'jadwal',
      'Tugas menggantikan ' || to_char(new.tanggal, 'DD-MM-YYYY'),
      j.mapel || ' ' || j.kelas || ' JP ' || j.jp_ke || ' (menggantikan ' || coalesce(j.guru, '-') || ')' || coalesce('. ' || nullif(new.catatan, ''), ''),
      '/admin/jadwal-saya', 'penting');
  end if;

  teks := case new.jenis
    when 'pengganti'    then 'diganti ' || coalesce(public.nama_pegawai(new.pegawai_pengganti_id), 'guru lain')
    when 'tugas'        then 'tugas mandiri'
    when 'ditiadakan'   then 'ditiadakan'
    when 'pindah_ruang' then 'pindah ke ' || coalesce((select nama from public.ruang where id = new.ruang_id), 'ruang lain')
  end;

  -- guru pengampu: diberi tahu bila perubahan dibuat orang lain (bukan lewat pengajuannya sendiri)
  u := (select user_id from public.pegawai where id = j.pegawai_id);
  if u is not null and u is distinct from auth.uid() and new.pengajuan_id is null then
    perform public.kirim_notif(u, 'jadwal', 'Perubahan jam mengajar ' || to_char(new.tanggal, 'DD-MM-YYYY'),
      j.mapel || ' ' || j.kelas || ' JP ' || j.jp_ke || ': ' || teks || coalesce('. ' || nullif(new.catatan, ''), ''), '/admin/jadwal-saya');
  end if;

  -- siswa kelas: cukup di lonceng aplikasi (tanpa WA/email agar tidak membanjiri)
  if new.tanggal >= hari_ini and new.tanggal <= hari_ini + 14 then
    for u in select s.user_id from public.anggota_kelas ak join public.siswa s on s.id = ak.siswa_id
              join public.tahun_ajaran ta on ta.id = ak.tahun_ajaran_id and ta.aktif
              where ak.kelas_id = j.kelas_id and s.user_id is not null and s.deleted_at is null loop
      perform public.kirim_notif(u, 'jadwal', 'Perubahan jadwal ' || to_char(new.tanggal, 'DD-MM'),
        j.mapel || ' JP ' || j.jp_ke || ' ' || teks, '/portal/jadwal', 'biasa', false);
    end loop;
  end if;
  return null;
end $$;
drop trigger if exists notif_pengganti on public.perubahan_jadwal;
create trigger notif_pengganti after insert on public.perubahan_jadwal for each row execute function public.notif_pengganti();

-- pengumuman kalender ke warga sekolah (lonceng saja), hanya untuk kegiatan baru ≤ 60 hari ke depan
create or replace function public.notif_kalender() returns trigger language plpgsql security definer set search_path = '' as $$
declare u uuid; hari_ini date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if new.deleted_at is not null or new.mulai < hari_ini or new.mulai > hari_ini + 60 then return null; end if;
  if new.jenis not in ('libur', 'ujian') and not new.kbm_libur then return null; end if;   -- yang penting saja
  for u in select distinct p.user_id from public.pengguna p join public.pengguna_peran pp on pp.user_id = p.user_id
            where p.aktif and (new.sasaran <> 'pegawai' or pp.peran not in ('siswa', 'orang_tua')) loop
    perform public.kirim_notif(u, 'jadwal',
      case when new.kbm_libur or new.jenis = 'libur' then 'Libur: ' else 'Kalender: ' end || new.judul,
      to_char(new.mulai, 'DD-MM-YYYY') || case when new.selesai > new.mulai then ' s.d. ' || to_char(new.selesai, 'DD-MM-YYYY') else '' end,
      case when exists (select 1 from public.pengguna_peran where user_id = u and peran not in ('siswa', 'orang_tua'))
           then '/admin/kalender' else '/portal/kalender' end, 'biasa', false);
  end loop;
  return null;
end $$;
drop trigger if exists notif_kalender on public.kegiatan_kalender;
create trigger notif_kalender after insert on public.kegiatan_kalender for each row execute function public.notif_kalender();

-- ---------------------------------------------------------------------
-- F. Riwayat perubahan jadwal (untuk kurikulum/piket tanpa izin audit penuh)
-- ---------------------------------------------------------------------
create or replace function public.riwayat_jadwal(p_batas int default 50, p_lewati int default 0, p_tabel text default null)
returns table (id bigint, waktu timestamptz, pelaku text, tabel text, aksi text, data_lama jsonb, data_baru jsonb, total bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.punya_izin('jadwal.kelola') or public.punya_izin('jadwal.pengganti')) then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  return query
    select a.id, a.waktu, coalesce(nullif(p.nama, ''), p.email, 'sistem'), a.tabel, a.aksi, a.data_lama, a.data_baru, count(*) over ()
    from public.audit_log a left join public.pengguna p on p.user_id = a.user_id
    where a.tabel in ('jadwal', 'perubahan_jadwal', 'jam_pelajaran', 'penugasan_mengajar', 'pengajuan_tukar_jadwal', 'kegiatan_kalender', 'piket_guru')
      and (p_tabel is null or a.tabel = p_tabel)
    order by a.waktu desc, a.id desc
    limit least(greatest(p_batas, 1), 200) offset greatest(p_lewati, 0);
end $$;
revoke all on function public.riwayat_jadwal(int, int, text) from public, anon;
grant execute on function public.riwayat_jadwal(int, int, text) to authenticated;

notify pgrst, 'reload schema';
