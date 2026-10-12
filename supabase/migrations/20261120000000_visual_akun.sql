-- Fase 15: visual panel kiri halaman masuk/portal (gambar atau video) yang dikelola dari panel admin.
-- Bisa lebih dari satu (bergantian), masing-masing dengan keterangan & tautan ke halaman lain.
create table if not exists public.visual_akun (
  id            uuid primary key default gen_random_uuid(),
  jenis         text not null check (jenis in ('gambar', 'video')),
  berkas_url    text not null check (char_length(berkas_url) between 1 and 500),
  berkas_jalur  text not null default '' check (char_length(berkas_jalur) <= 300),
  poster_url    text not null default '' check (char_length(poster_url) <= 500),
  keterangan    text not null default '' check (char_length(keterangan) <= 120),
  judul_tautan  text not null default '' check (char_length(judul_tautan) <= 60),
  tautan        text not null default '' check (
                  tautan = '' or tautan ~ '^/([^/]|$)' or tautan ~* '^https://[^\s<>"]+$'),
  urutan        smallint not null default 0,
  aktif         boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

alter table public.visual_akun enable row level security;
revoke all on public.visual_akun from anon;
grant select on public.visual_akun to anon;
grant select, insert, update on public.visual_akun to authenticated;
revoke delete, truncate on public.visual_akun from authenticated;

drop policy if exists "publik baca visual akun" on public.visual_akun;
create policy "publik baca visual akun" on public.visual_akun for select to anon, authenticated
  using (deleted_at is null and aktif);
drop policy if exists "editor baca visual akun" on public.visual_akun;
create policy "editor baca visual akun" on public.visual_akun for select to authenticated using (public.is_editor());
drop policy if exists "editor tambah visual akun" on public.visual_akun;
create policy "editor tambah visual akun" on public.visual_akun for insert to authenticated with check (public.is_editor());
drop policy if exists "editor ubah visual akun" on public.visual_akun;
create policy "editor ubah visual akun" on public.visual_akun for update to authenticated
  using (public.is_editor()) with check (public.is_editor());

drop trigger if exists audit_visual_akun on public.visual_akun;
create trigger audit_visual_akun after insert or update or delete on public.visual_akun
  for each row execute function public.catat_audit();
drop trigger if exists updated_at_visual_akun on public.visual_akun;
create trigger updated_at_visual_akun before update on public.visual_akun
  for each row execute function public.set_updated_at();

-- Bucket video (dibuat di migrasi 16) — pastikan ada & batas 20 MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('video', 'video', true, 20971520, array['video/mp4', 'video/webm'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- editor perlu melihat daftar berkas video (memastikan unggahan selesai sebelum disimpan)
drop policy if exists "editor baca video" on storage.objects;
create policy "editor baca video" on storage.objects
  for select to authenticated using (bucket_id = 'video' and public.is_editor());
