-- Fase 16: visual sinematik juga untuk beranda (animasi bergulir). Satu pengelola di
-- Tampilan Website → Visual sinematik, dibedakan lewat kolom lokasi.
alter table public.visual_akun
  add column if not exists lokasi text not null default 'akun' check (lokasi in ('akun', 'beranda'));
create index if not exists visual_akun_lokasi_idx on public.visual_akun (lokasi, urutan) where deleted_at is null;
