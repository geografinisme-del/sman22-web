-- ROLLBACK foto sementara (migrasi 20261227000000_foto_slot.sql + data/20261227_foto_sementara.sql).
-- HANYA dijalankan dengan izin pemilik. Mengembalikan foto lama ke baris CMS (bila foto stok masih terpasang),
-- menonaktifkan/mengosongkan baris CMS yang dibuat skrip data, lalu menghapus tabel foto_slot.
-- Berkas foto asli tidak pernah dihapus (tetap di /images/*), jadi tidak ada berkas yang perlu dipulihkan.

begin;

-- 1) kembalikan foto lama di baris CMS yang masih memakai foto stok dari skrip data
update public.kartu_beranda k set foto_url = f.url_asli, is_placeholder = f.asli_sementara, updated_at = now()
from public.foto_slot f where f.tabel = 'kartu_beranda' and f.baris_id = k.id::text and k.foto_url = f.url_aktif and f.url_asli is not null;
update public.tur_sekolah t set media_url = coalesce(f.url_asli, ''), is_placeholder = true, updated_at = now()
from public.foto_slot f where f.tabel = 'tur_sekolah' and f.baris_id = t.id::text and t.media_url = f.url_aktif;
update public.galeri g set gambar_url = f.url_asli, is_placeholder = f.asli_sementara, updated_at = now()
from public.foto_slot f where f.tabel = 'galeri' and f.baris_id = g.id::text and g.gambar_url = f.url_aktif and f.url_asli is not null;

-- 2) baris CMS yang DIBUAT skrip data: halaman masuk → foto kosong (kembali ke foto bawaan kode);
--    kartu sorotan mega menu → nonaktif (kembali ke kartu bawaan kode). Hanya yang masih sama dengan isian skrip.
update public.portal_login p set foto_url = '', alt_text = '', is_placeholder = false, updated_at = now()
from public.foto_slot f where f.tabel = 'portal_login' and f.baris_id = p.peran and p.foto_url = f.url_aktif;
update public.menu_sorotan set aktif = false, updated_at = now()
where foto_url in ('/media/stok/koridor-terang.webp', '/media/stok/bendera-awan.webp', '/media/stok/laboratorium.webp',
                   '/media/placeholder/hero-1.webp', '/images/kegiatan-aula.jpg', '/media/stok/ruang-kelas.webp',
                   '/images/apel-lapangan.jpg', '/images/keluarga-besar.jpg', '/media/stok/pengibaran-bendera.webp')
  and created_at >= timestamptz '2026-10-23';

-- 3) label tur seperti semula (semua titik bawaan bertanda sementara)
update public.tur_sekolah set is_placeholder = true, updated_at = now()
where media_url in ('/images/keluarga-besar.jpg', '/images/gedung.jpg') and not is_placeholder;

-- 4) tabel baru
drop table if exists public.foto_slot;

commit;
