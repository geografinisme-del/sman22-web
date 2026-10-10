-- =====================================================================
--  Fase 7b — Notifikasi (Modul 24)
--  Notifikasi di aplikasi + antrian WhatsApp & email (opsional), preferensi
--  per pengguna, jam tenang 21.00–06.00, anti-spam, dan pemicu dari setiap modul.
--  Jalankan SETELAH 20261022000000_kesiswaan.sql. Idempotent.
-- =====================================================================

create table if not exists public.notifikasi (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  kategori    text not null,
  judul       text not null check (char_length(judul) <= 150),
  isi         text not null default '' check (char_length(isi) <= 500),
  tautan      text not null default '' check (char_length(tautan) <= 300),
  prioritas   text not null default 'biasa' check (prioritas in ('biasa', 'penting')),
  dibaca_pada timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notifikasi_user_idx on public.notifikasi (user_id, created_at desc);
create index if not exists notifikasi_belum_idx on public.notifikasi (user_id) where dibaca_pada is null;

create table if not exists public.preferensi_notifikasi (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  email         boolean not null default true,
  whatsapp      boolean not null default true,
  nomor_wa      text not null default '' check (nomor_wa = '' or nomor_wa ~ '^62\d{8,13}$'),
  kategori_mati text[] not null default '{}',
  updated_at    timestamptz not null default now()
);

create table if not exists public.antrian_kirim (
  id            bigint generated always as identity primary key,
  notifikasi_id bigint references public.notifikasi (id) on delete cascade,
  user_id       uuid,
  kategori      text not null default '',
  kanal         text not null check (kanal in ('email', 'whatsapp')),
  tujuan        text not null,
  judul         text not null,
  isi           text not null,
  tautan        text not null default '',
  status        text not null default 'menunggu' check (status in ('menunggu', 'diproses', 'terkirim', 'gagal', 'dilewati')),
  percobaan     smallint not null default 0,
  galat         text not null default '',
  tunda_sampai  timestamptz not null default now(),
  dibuat_pada   timestamptz not null default now(),
  dikirim_pada  timestamptz
);
create index if not exists antrian_menunggu_idx on public.antrian_kirim (tunda_sampai) where status = 'menunggu';

-- ---------------------------------------------------------------------
-- 1. Inti: buat notifikasi + antrian kanal luar
-- ---------------------------------------------------------------------
create or replace function public.nomor_wa_baku(n text)
returns text language sql immutable set search_path = '' as $$
  select case
    when d ~ '^62\d{8,13}$' then d
    when d ~ '^0\d{8,13}$' then '62' || substr(d, 2)
    when d ~ '^8\d{8,12}$' then '62' || d
    else null end
  from (select regexp_replace(coalesce(n, ''), '\D', '', 'g') d) x;
$$;

create or replace function public.kirim_notif(p_user uuid, p_kategori text, p_judul text, p_isi text default '',
                                              p_tautan text default '', p_prioritas text default 'biasa')
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

    select * into pref from public.preferensi_notifikasi where user_id = p_user;
    if p_kategori = any (coalesce(pref.kategori_mati, '{}')) then return; end if;
    staf := exists (select 1 from public.pengguna_peran where user_id = p_user and peran not in ('siswa', 'orang_tua'));

    -- email: staf memakai email akun; orang tua memakai email di data orang tua; siswa tidak dikirimi email
    if coalesce(pref.email, true) then
      mail := case when staf then (select email from auth.users where id = p_user)
                   else nullif((select email from public.orang_tua where user_id = p_user limit 1), '') end;
    end if;
    -- WhatsApp: nomor pilihan sendiri, lalu nomor di data pegawai / orang tua
    if coalesce(pref.whatsapp, true) then
      wa := coalesce(nullif(pref.nomor_wa, ''),
                     public.nomor_wa_baku((select telepon from public.pegawai where user_id = p_user limit 1)),
                     public.nomor_wa_baku((select telepon from public.orang_tua where user_id = p_user limit 1)));
    end if;
    -- jam tenang 21.00–06.00 WIB (kecuali penting)
    if p_prioritas <> 'penting' and (jam >= 21 or jam < 6) then
      tunda := ((now() at time zone 'Asia/Jakarta')::date + case when jam >= 21 then 1 else 0 end + time '06:00') at time zone 'Asia/Jakarta';
    end if;
    -- anti-spam: satu pesan per kanal per kategori per 10 menit untuk orang yang sama
    if mail is not null and mail ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and not exists (
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
    raise warning 'kirim_notif gagal: %', sqlerrm;  -- notifikasi tidak boleh menggagalkan transaksi utama
  end;
end $$;
revoke all on function public.kirim_notif(uuid, text, text, text, text, text) from public, anon, authenticated;

create or replace function public.pengguna_berizin(p_izin text)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select distinct pp.user_id from public.pengguna_peran pp
  join public.peran_izin pi on pi.peran = pp.peran
  join public.pengguna p on p.user_id = pp.user_id and p.aktif
  where pi.izin = p_izin;
$$;
create or replace function public.user_wali_siswa(sid uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select g.user_id from public.anggota_kelas ak
  join public.kelas k on k.id = ak.kelas_id join public.tahun_ajaran t on t.id = k.tahun_ajaran_id and t.aktif
  join public.pegawai g on g.id = k.wali_kelas_id
  where ak.siswa_id = sid limit 1;
$$;
create or replace function public.user_ortu_siswa(sid uuid)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select o.user_id from public.siswa_orang_tua so join public.orang_tua o on o.id = so.orang_tua_id
  where so.siswa_id = sid and o.user_id is not null;
$$;
revoke all on function public.pengguna_berizin(text), public.user_wali_siswa(uuid), public.user_ortu_siswa(uuid) from public, anon, authenticated;

create or replace function public.nama_siswa(sid uuid) returns text language sql stable security definer set search_path = '' as $$
  select nama from public.siswa where id = sid;
$$;
revoke all on function public.nama_siswa(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Pemicu dari modul-modul
-- ---------------------------------------------------------------------
create or replace function public.notif_izin_ortu() returns trigger language plpgsql security definer set search_path = '' as $$
declare jenis text := case new.jenis when 'S' then 'Sakit' else 'Izin' end;
begin
  if tg_op = 'INSERT' then
    perform public.kirim_notif(public.user_wali_siswa(new.siswa_id), 'izin', 'Pemberitahuan ' || lower(jenis) || ': ' || public.nama_siswa(new.siswa_id),
      to_char(new.tanggal_mulai, 'DD-MM-YYYY') || ' — ' || left(new.alasan, 120), '/admin/izin-ortu');
  elsif old.status = 'menunggu' and new.status in ('diterima', 'ditolak') then
    perform public.kirim_notif(new.diajukan_oleh, 'izin', jenis || ' ' || public.nama_siswa(new.siswa_id) || ' ' || new.status,
      coalesce(nullif(new.catatan, ''), 'Lihat status di portal.'), '/portal/izin');
  end if;
  return null;
end $$;
drop trigger if exists notif_izin_ortu on public.izin_ortu;
create trigger notif_izin_ortu after insert or update of status on public.izin_ortu for each row execute function public.notif_izin_ortu();

create or replace function public.notif_berita() returns trigger language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  if new.status = 'diajukan' and (tg_op = 'INSERT' or old.status is distinct from 'diajukan') then
    for u in select public.pengguna_berizin('konten.terbitkan') loop
      perform public.kirim_notif(u, 'konten', 'Berita menunggu persetujuan', new.judul, '/admin/persetujuan');
    end loop;
  elsif tg_op = 'UPDATE' and old.status = 'diajukan' and new.status in ('terbit', 'ditolak') then
    perform public.kirim_notif(new.diajukan_oleh, 'konten',
      case when new.status = 'terbit' then 'Berita disetujui' else 'Berita dikembalikan' end,
      new.judul || coalesce(' — ' || nullif(new.catatan_review, ''), ''), '/admin/berita/' || new.id);
  end if;
  return null;
end $$;
drop trigger if exists notif_berita on public.berita;
create trigger notif_berita after insert or update of status on public.berita for each row execute function public.notif_berita();

create or replace function public.notif_izin_pegawai() returns trigger language plpgsql security definer set search_path = '' as $$
declare u uuid; nama text := (select nama from public.pegawai where id = new.pegawai_id);
  jenis text := case new.jenis when 'S' then 'sakit' when 'I' then 'izin' when 'DL' then 'dinas luar' else 'cuti' end;
begin
  if tg_op = 'INSERT' then
    for u in select public.pengguna_berizin('izin_pegawai.setujui') loop
      continue when u = new.diajukan_oleh;
      perform public.kirim_notif(u, 'kepegawaian', 'Pengajuan ' || jenis || ': ' || nama,
        to_char(new.tanggal_mulai, 'DD-MM-YYYY') || ' — ' || left(new.alasan, 120), '/admin/izin-pegawai');
    end loop;
  elsif old.status = 'menunggu' and new.status in ('disetujui', 'ditolak') then
    perform public.kirim_notif((select user_id from public.pegawai where id = new.pegawai_id), 'kepegawaian',
      'Pengajuan ' || jenis || ' ' || new.status, coalesce(nullif(new.catatan, ''), to_char(new.tanggal_mulai, 'DD-MM-YYYY')), '/admin/presensi#izin');
  end if;
  return null;
end $$;
drop trigger if exists notif_izin_pegawai on public.pengajuan_izin_pegawai;
create trigger notif_izin_pegawai after insert or update of status on public.pengajuan_izin_pegawai for each row execute function public.notif_izin_pegawai();

create or replace function public.notif_pengganti() returns trigger language plpgsql security definer set search_path = '' as $$
declare j record;
begin
  if new.jenis = 'pengganti' then
    select k.nama kelas, m.nama mapel, jd.jp_ke, public.nama_pegawai(jd.pegawai_id) guru into j
      from public.jadwal jd join public.kelas k on k.id = jd.kelas_id
      join public.penugasan_mengajar p on p.id = jd.penugasan_id join public.mapel m on m.id = p.mapel_id where jd.id = new.jadwal_id;
    perform public.kirim_notif((select user_id from public.pegawai where id = new.pegawai_pengganti_id), 'jadwal',
      'Tugas menggantikan ' || to_char(new.tanggal, 'DD-MM-YYYY'),
      j.mapel || ' ' || j.kelas || ' JP ' || j.jp_ke || ' (menggantikan ' || coalesce(j.guru, '-') || ')' || coalesce('. ' || nullif(new.catatan, ''), ''),
      '/admin/jadwal-saya', 'penting');
  end if;
  return null;
end $$;
drop trigger if exists notif_pengganti on public.perubahan_jadwal;
create trigger notif_pengganti after insert on public.perubahan_jadwal for each row execute function public.notif_pengganti();

create or replace function public.notif_koreksi() returns trigger language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  if tg_op = 'INSERT' then
    for u in select public.pengguna_berizin('absensi.kelola') loop
      perform public.kirim_notif(u, 'absensi', 'Pengajuan koreksi absensi', public.nama_siswa(new.siswa_id) || ', ' || to_char(new.tanggal, 'DD-MM-YYYY'), '/admin/absensi/pengajuan');
    end loop;
  elsif old.status = 'menunggu' and new.status <> 'menunggu' then
    perform public.kirim_notif(new.diajukan_oleh, 'absensi', 'Koreksi absensi ' || new.status, public.nama_siswa(new.siswa_id), '/admin/absensi/pengajuan?lihat=riwayat');
  end if;
  return null;
end $$;
drop trigger if exists notif_koreksi on public.pengajuan_koreksi;
create trigger notif_koreksi after insert or update of status on public.pengajuan_koreksi for each row execute function public.notif_koreksi();

create or replace function public.notif_pelanggaran() returns trigger language plpgsql security definer set search_path = '' as $$
declare u uuid; nama text := public.nama_siswa(new.siswa_id); total int; a record;
begin
  if tg_op = 'INSERT' then
    for u in select public.pengguna_berizin('kesiswaan.kelola') loop
      perform public.kirim_notif(u, 'kesiswaan', 'Laporan pelanggaran menunggu verifikasi', nama || ' — ' || new.nama_pelanggaran, '/admin/kesiswaan');
    end loop;
  elsif old.status = 'dilaporkan' and new.status = 'terverifikasi' then
    -- orang tua & siswa: tanpa rincian (privasi), detail dibaca di portal
    for u in select public.user_ortu_siswa(new.siswa_id) union select user_id from public.siswa where id = new.siswa_id and user_id is not null loop
      perform public.kirim_notif(u, 'kesiswaan', 'Catatan kedisiplinan baru', 'Ada catatan baru untuk Ananda ' || nama || '. Silakan lihat di portal.', '/portal/karakter');
    end loop;
    perform public.kirim_notif(public.user_wali_siswa(new.siswa_id), 'kesiswaan', 'Pelanggaran terverifikasi: ' || nama, new.nama_pelanggaran, '/admin/kesiswaan/siswa/' || new.siswa_id);
    select poin_bersih into total from public.rekap_poin() where siswa_id = new.siswa_id;
    for a in select ambang, tindakan from public.aturan_tindakan_poin where ambang <= coalesce(total, 0) and ambang > coalesce(total, 0) - new.poin loop
      for u in select public.pengguna_berizin('kesiswaan.kelola') union select public.user_wali_siswa(new.siswa_id) loop
        perform public.kirim_notif(u, 'disiplin', nama || ' mencapai ' || a.ambang || ' poin', 'Tindak lanjut: ' || a.tindakan, '/admin/kesiswaan/siswa/' || new.siswa_id, 'penting');
      end loop;
    end loop;
  end if;
  return null;
end $$;
drop trigger if exists notif_pelanggaran on public.pelanggaran_siswa;
create trigger notif_pelanggaran after insert or update of status on public.pelanggaran_siswa for each row execute function public.notif_pelanggaran();

create or replace function public.notif_prestasi() returns trigger language plpgsql security definer set search_path = '' as $$
declare u uuid; nama text := public.nama_siswa(new.siswa_id);
begin
  if tg_op = 'INSERT' then
    for u in select public.pengguna_berizin('kesiswaan.kelola') loop
      perform public.kirim_notif(u, 'prestasi', 'Prestasi menunggu verifikasi', nama || ' — ' || new.nama_kegiatan, '/admin/kesiswaan');
    end loop;
  elsif old.status = 'diajukan' and new.status = 'terverifikasi' then
    for u in select public.user_ortu_siswa(new.siswa_id) union select user_id from public.siswa where id = new.siswa_id and user_id is not null
             union select public.user_wali_siswa(new.siswa_id) loop
      perform public.kirim_notif(u, 'prestasi', 'Selamat! Prestasi ' || nama || ' tercatat', new.nama_kegiatan,
        case when u = public.user_wali_siswa(new.siswa_id) then '/admin/kesiswaan/siswa/' || new.siswa_id else '/portal/karakter' end);
    end loop;
  elsif old.status = 'diajukan' and new.status = 'ditolak' then
    perform public.kirim_notif(new.diajukan_oleh, 'prestasi', 'Pengajuan prestasi belum dapat diverifikasi', coalesce(nullif(new.catatan_verifikasi, ''), new.nama_kegiatan), '');
  end if;
  return null;
end $$;
drop trigger if exists notif_prestasi on public.prestasi_siswa;
create trigger notif_prestasi after insert or update of status on public.prestasi_siswa for each row execute function public.notif_prestasi();

create or replace function public.notif_rujukan() returns trigger language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  if tg_op = 'INSERT' then
    for u in select public.pengguna_berizin('bk.rujukan') loop
      perform public.kirim_notif(u, 'bk', 'Rujukan baru ke BK', public.nama_siswa(new.siswa_id), '/admin/rujukan-bk', 'penting');
    end loop;
  elsif old.status is distinct from new.status then
    perform public.kirim_notif(new.dirujuk_oleh, 'bk', 'Rujukan BK: ' || new.status, public.nama_siswa(new.siswa_id), '/admin/kesiswaan/siswa/' || new.siswa_id);
  end if;
  return null;
end $$;
drop trigger if exists notif_rujukan on public.rujukan_bk;
create trigger notif_rujukan after insert or update of status on public.rujukan_bk for each row execute function public.notif_rujukan();

-- Alpa / terlambat mencapai ambang SP / panggilan orang tua
create or replace function public.notif_ambang_absensi() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_jenis text := case new.status when 'A' then 'alpa' else 'terlambat' end; n int; r record; u uuid; nama text;
begin
  if new.status not in ('A', 'T') or (tg_op = 'UPDATE' and old.status is not distinct from new.status) then return null; end if;
  select count(*) into n from public.absensi_siswa a, public.tahun_ajaran t
   where t.aktif and a.siswa_id = new.siswa_id and a.status = new.status
     and a.tanggal >= coalesce(t.mulai_hitung_absensi, t.tanggal_mulai, '1900-01-01')
     and not exists (select 1 from public.hari_libur h where h.tanggal = a.tanggal);
  select * into r from public.aturan_disiplin d where d.jenis = v_jenis and d.ambang = n;
  if r.label is null then return null; end if;
  nama := public.nama_siswa(new.siswa_id);
  for u in select public.pengguna_berizin('disiplin.kelola') union select public.user_wali_siswa(new.siswa_id) loop
    perform public.kirim_notif(u, 'disiplin', nama || ': ' || r.label, n || '× ' || v_jenis || ' tahun ini — perlu tindak lanjut', '/admin/absensi/disiplin', 'penting');
  end loop;
  for u in select public.user_ortu_siswa(new.siswa_id) loop
    perform public.kirim_notif(u, 'disiplin', 'Perhatian: kehadiran Ananda ' || nama,
      'Ananda tercatat ' || n || '× ' || v_jenis || ' tahun ini. Sekolah akan menghubungi Bapak/Ibu.', '/portal', 'penting');
  end loop;
  return null;
end $$;
drop trigger if exists notif_ambang_absensi on public.absensi_siswa;
create trigger notif_ambang_absensi after insert or update of status on public.absensi_siswa for each row execute function public.notif_ambang_absensi();

-- ---------------------------------------------------------------------
-- 3. Untuk aplikasi
-- ---------------------------------------------------------------------
create or replace function public.tandai_dibaca(p_id bigint default null)
returns void language sql security definer set search_path = '' as $$
  update public.notifikasi set dibaca_pada = now()
   where user_id = auth.uid() and dibaca_pada is null and (p_id is null or id = p_id);
$$;
revoke all on function public.tandai_dibaca(bigint) from public, anon;
grant execute on function public.tandai_dibaca(bigint) to authenticated;

-- Pekerja pengirim (hanya kunci rahasia server): ambil batch & kunci agar tidak terkirim ganda
create or replace function public.ambil_antrian(p_jumlah int default 20)
returns setof public.antrian_kirim language sql security definer set search_path = '' as $$
  update public.antrian_kirim a set status = 'diproses', percobaan = a.percobaan + 1
   where a.id in (select id from public.antrian_kirim where status = 'menunggu' and tunda_sampai <= now()
                  order by tunda_sampai limit least(p_jumlah, 100) for update skip locked)
  returning a.*;
$$;
revoke all on function public.ambil_antrian(int) from public, anon, authenticated;
grant execute on function public.ambil_antrian(int) to service_role;

-- Tes kirim untuk diri sendiri (dari halaman pengaturan notifikasi)
create or replace function public.notif_tes()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.kirim_notif(auth.uid(), 'sistem', 'Tes notifikasi SMAN 22', 'Jika pesan ini sampai, notifikasi Anda sudah berjalan.', '/admin/notifikasi', 'penting');
end $$;
revoke all on function public.notif_tes() from public, anon;
grant execute on function public.notif_tes() to authenticated;

alter table public.notifikasi enable row level security;
alter table public.preferensi_notifikasi enable row level security;
alter table public.antrian_kirim enable row level security;
revoke all on public.notifikasi, public.preferensi_notifikasi, public.antrian_kirim from anon;
revoke insert, update, delete, truncate on public.notifikasi from authenticated;
revoke insert, update, delete, truncate on public.antrian_kirim from authenticated;
revoke truncate on public.preferensi_notifikasi from authenticated;

drop policy if exists "notifikasi saya" on public.notifikasi;
create policy "notifikasi saya" on public.notifikasi for select to authenticated using (user_id = auth.uid());
drop policy if exists "preferensi saya" on public.preferensi_notifikasi;
create policy "preferensi saya" on public.preferensi_notifikasi for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "admin lihat antrian" on public.antrian_kirim;
create policy "admin lihat antrian" on public.antrian_kirim for select to authenticated using ((select public.punya_izin('pengguna.kelola')));

notify pgrst, 'reload schema';
