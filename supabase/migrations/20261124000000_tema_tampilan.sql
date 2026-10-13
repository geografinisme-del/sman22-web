-- Fase 17: tema & tampilan (warna, teks beranda sinematik, kartu bento, halaman masuk) dapat
-- diubah dari Admin → Tema & Tampilan tanpa mengubah kode. Isi diperiksa ulang di aplikasi (lib/tema.ts).
alter table public.pengaturan_situs
  add column if not exists tema jsonb not null default '{}'::jsonb
  check (jsonb_typeof(tema) = 'object' and pg_column_size(tema) < 32768);
