-- Portal Digital 22 — halaman masuk per peran (gtk | siswa | orang_tua): foto khusus peran yang bisa diganti admin,
-- dan pengaturan opsional "tautan aplikasi guru lama". Objek BARU; tidak mengubah/menghapus data lama.
--   portal_login            → foto, caption, alt, titik fokus, is_placeholder per peran (kosong = foto bawaan di kode)
--   bucket "portal"         → berkas foto unggahan admin (publik baca; tulis hanya pengelola konten)
--   portal_pengaturan (id=1)→ tautan aplikasi guru lama (judul + URL https, bawaan kosong)
-- Publik membaca; menulis hanya pengelola konten (izin konten.kelola). Hapus permanen baris ditolak. Tanpa isi awal.

create table if not exists public.portal_login (
  peran          text primary key check (peran in ('gtk', 'siswa', 'orang_tua')),
  foto_url       text not null default '' check (foto_url = '' or foto_url ~ '^(https://|/[^/]|http://(localhost|127\.0\.0\.1)[:/])'),
  caption        text not null default '' check (char_length(caption) <= 80),
  alt_text       text not null default '' check (char_length(alt_text) <= 160),
  fokus_x        smallint not null default 50 check (fokus_x between 0 and 100),
  fokus_y        smallint not null default 50 check (fokus_y between 0 and 100),
  is_placeholder boolean not null default false,
  updated_at     timestamptz not null default now(),
  -- foto wajib punya teks alternatif
  constraint portal_login_alt check (foto_url = '' or char_length(alt_text) >= 3)
);

create table if not exists public.portal_pengaturan (
  id                   smallint primary key default 1 check (id = 1),
  guru_lama_judul      text not null default '' check (char_length(guru_lama_judul) <= 60),
  guru_lama_url        text not null default '' check (guru_lama_url = '' or (guru_lama_url ~ '^https://' and char_length(guru_lama_url) <= 300)),
  updated_at           timestamptz not null default now(),
  constraint portal_guru_lama_lengkap check ((guru_lama_url = '') = (guru_lama_judul = ''))
);

do $$
declare t text;
begin
  foreach t in array array['portal_login', 'portal_pengaturan'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
    execute format('revoke delete, truncate on public.%I from authenticated', t);
    execute format('drop policy if exists "publik baca" on public.%I', t);
    execute format('create policy "publik baca" on public.%I for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists "pengelola tulis" on public.%I', t);
    execute format('create policy "pengelola tulis" on public.%I for insert to authenticated with check ((select public.punya_izin(''konten.kelola'')))', t);
    execute format('drop policy if exists "pengelola ubah" on public.%I', t);
    execute format('create policy "pengelola ubah" on public.%I for update to authenticated using ((select public.punya_izin(''konten.kelola''))) with check ((select public.punya_izin(''konten.kelola'')))', t);
  end loop;
end $$;

-- bucket foto halaman masuk (publik baca; maks 5 MB; hanya gambar)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portal', 'portal', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "pengelola unggah portal" on storage.objects;
create policy "pengelola unggah portal" on storage.objects for insert to authenticated
  with check (bucket_id = 'portal' and (select public.punya_izin('konten.kelola')));
drop policy if exists "pengelola ubah portal" on storage.objects;
create policy "pengelola ubah portal" on storage.objects for update to authenticated
  using (bucket_id = 'portal' and (select public.punya_izin('konten.kelola')));
drop policy if exists "pengelola lihat portal" on storage.objects;
create policy "pengelola lihat portal" on storage.objects for select to authenticated
  using (bucket_id = 'portal' and (select public.punya_izin('konten.kelola')));
