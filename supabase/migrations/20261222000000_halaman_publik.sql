-- "Langit cerah" Tahap C: isi CMS untuk halaman publik baru. Tiga tabel BARU; tidak mengubah/menghapus tabel lama.
--   staf_publik  → /profil/guru-staf  (daftar guru & staf yang BOLEH tampil publik; diisi admin, tanpa data contoh)
--   fasilitas    → /profil/fasilitas
--   halaman_cms  → /pembelajaran/kurikulum (dan halaman teks sederhana lain berdasarkan slug)
-- Publik hanya membaca baris aktif/terbit; menulis hanya pengelola konten (izin konten.kelola). Hapus permanen ditolak.
-- Tidak ada isi awal (data resmi diisi sekolah lewat CMS).

/* ---------------- staf_publik ---------------- */
create table if not exists public.staf_publik (
  id             uuid primary key default gen_random_uuid(),
  urutan         smallint not null default 0,
  aktif          boolean not null default true,
  nama           text not null check (char_length(nama) between 2 and 120),
  jabatan        text not null default '' check (char_length(jabatan) <= 120),
  -- bidang/mapel untuk saringan, mis. "Matematika", "Tata usaha"
  bidang         text not null default '' check (char_length(bidang) <= 60),
  foto_url       text not null default '' check (foto_url = '' or foto_url ~ '^(https://|/[^/]|http://(localhost|127\.0\.0\.1)[:/])'),
  is_placeholder boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists staf_publik_urutan on public.staf_publik (urutan) where aktif;

/* ---------------- fasilitas ---------------- */
create table if not exists public.fasilitas (
  id             uuid primary key default gen_random_uuid(),
  urutan         smallint not null default 0,
  aktif          boolean not null default true,
  nama           text not null check (char_length(nama) between 2 and 80),
  deskripsi      text not null default '' check (char_length(deskripsi) <= 280),
  foto_url       text not null default '' check (foto_url = '' or foto_url ~ '^(https://|/[^/]|http://(localhost|127\.0\.0\.1)[:/])'),
  is_placeholder boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists fasilitas_urutan on public.fasilitas (urutan) where aktif;

/* ---------------- halaman_cms ---------------- */
create table if not exists public.halaman_cms (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  judul       text not null check (char_length(judul) between 2 and 120),
  ringkasan   text not null default '' check (char_length(ringkasan) <= 240),
  -- isi teks: paragraf dipisah baris kosong; baris "## " = subjudul; baris "- " = butir daftar
  isi         text not null default '' check (char_length(isi) <= 40000),
  terbit      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

/* ---------------- RLS ---------------- */
do $$
declare t text;
begin
  foreach t in array array['staf_publik', 'fasilitas', 'halaman_cms'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
    execute format('revoke delete, truncate on public.%I from authenticated', t);
    execute format('drop policy if exists "pengelola baca semua" on public.%I', t);
    execute format('create policy "pengelola baca semua" on public.%I for select to authenticated using ((select public.punya_izin(''konten.kelola'')))', t);
    execute format('drop policy if exists "pengelola tulis" on public.%I', t);
    execute format('create policy "pengelola tulis" on public.%I for insert to authenticated with check ((select public.punya_izin(''konten.kelola'')))', t);
    execute format('drop policy if exists "pengelola ubah" on public.%I', t);
    execute format('create policy "pengelola ubah" on public.%I for update to authenticated using ((select public.punya_izin(''konten.kelola''))) with check ((select public.punya_izin(''konten.kelola'')))', t);
  end loop;
end $$;

drop policy if exists "publik baca staf aktif" on public.staf_publik;
create policy "publik baca staf aktif" on public.staf_publik for select to anon, authenticated using (aktif);
drop policy if exists "publik baca fasilitas aktif" on public.fasilitas;
create policy "publik baca fasilitas aktif" on public.fasilitas for select to anon, authenticated using (aktif);
drop policy if exists "publik baca halaman terbit" on public.halaman_cms;
create policy "publik baca halaman terbit" on public.halaman_cms for select to anon, authenticated using (terbit);
