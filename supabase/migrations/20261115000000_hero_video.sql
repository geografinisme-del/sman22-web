-- Fase 14: video latar opsional untuk foto pembuka (beranda).
-- Foto tetap wajib: dipakai sebagai poster, di HP hemat data, dan untuk pengunjung yang mematikan animasi.
alter table public.hero_slide
  add column if not exists video_url text not null default ''
  check (video_url = '' or (char_length(video_url) <= 500 and video_url ~* '^https://[^\s<>"]+\.(mp4|webm)(\?[^\s<>"]*)?$'));

-- Bucket publik khusus video latar (unggah lewat Supabase → Storage; maks 20 MB, MP4/WebM)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('video', 'video', true, 20971520, array['video/mp4', 'video/webm'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "editor unggah video" on storage.objects;
create policy "editor unggah video" on storage.objects
  for insert to authenticated with check (bucket_id = 'video' and public.is_editor());
drop policy if exists "editor ubah video" on storage.objects;
create policy "editor ubah video" on storage.objects
  for update to authenticated using (bucket_id = 'video' and public.is_editor());
