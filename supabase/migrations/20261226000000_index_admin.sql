-- Disetujui pemilik 22 Okt 2026 (dijalankan di produksi via psql): index tambahan untuk filter badge menu & halaman admin.
-- Hanya MENAMBAH index (tanpa DROP/ALTER data). Tabel saat ini kecil sehingga dampaknya baru terasa saat data tumbuh
-- (mis. ribuan pinjaman/buku tamu per tahun). Index yang sudah ada tidak diubah.
--
-- Diperiksa 22 Okt 2026 dari query yang dijalankan layout admin & halaman Data Induk/Ekskul/Perpustakaan/Sarpras/Alumni:
--   pembina_organisasi(pegawai_id)        — badge "Organisasi Binaan" (index lama berurutan organisasi_id, pegawai_id)
--   pinjaman_buku(pegawai_id)             — "Pinjaman Saya" guru di Perpustakaan
--   supervisi_akademik(supervisor_id)     — badge "Supervisi Akademik"
--   pojok_baca(penanggung_jawab_id)       — menu "Pojok Baca Saya"
--   buku_tamu(masuk) tamu belum keluar     — badge "Buku Tamu" hari ini
--   prestasi_siswa(status) 'diajukan'     — badge "Prestasi & Poin"
--   rujukan_bk(status) 'baru'             — badge "Rujukan BK"

create index if not exists pembina_organisasi_pegawai_idx on public.pembina_organisasi (pegawai_id);
create index if not exists pinjaman_buku_pegawai_idx on public.pinjaman_buku (pegawai_id, pinjam_pada desc) where pegawai_id is not null;
create index if not exists supervisi_akademik_supervisor_idx on public.supervisi_akademik (supervisor_id, status);
create index if not exists pojok_baca_pj_idx on public.pojok_baca (penanggung_jawab_id) where deleted_at is null;
create index if not exists buku_tamu_aktif_idx on public.buku_tamu (masuk) where keluar is null;
create index if not exists prestasi_siswa_diajukan_idx on public.prestasi_siswa (diajukan_pada) where status = 'diajukan';
create index if not exists rujukan_bk_baru_idx on public.rujukan_bk (dirujuk_pada) where status = 'baru';
