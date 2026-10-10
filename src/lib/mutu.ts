export const STATUS_KERANGKA: Record<string, { label: string; warna: string }> = {
  draf: { label: "Draf", warna: "bg-black/5 text-black/60 ring-black/10" },
  aktif: { label: "Aktif", warna: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  arsip: { label: "Arsip", warna: "bg-black/5 text-black/60 ring-black/10" },
};
export const STATUS_CAPAIAN: Record<string, { label: string; warna: string }> = {
  belum: { label: "Belum dievaluasi", warna: "bg-black/5 text-black/60 ring-black/10" },
  proses: { label: "Proses", warna: "bg-sky-50 text-sky-900 ring-sky-200" },
  tercapai: { label: "Tercapai", warna: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  tidak_tercapai: { label: "Belum tercapai", warna: "bg-amber-50 text-amber-900 ring-amber-200" },
};
export const PERSETUJUAN: Record<string, { label: string; warna: string }> = {
  draf: { label: "Draf", warna: "bg-black/5 text-black/60 ring-black/10" },
  diajukan: { label: "Menunggu tinjauan", warna: "bg-amber-50 text-amber-900 ring-amber-200" },
  disetujui: { label: "Disetujui", warna: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  revisi: { label: "Perlu revisi", warna: "bg-red-50 text-red-800 ring-red-200" },
};
export const CELAH: Record<string, string> = {
  tanpa_pemilik: "Belum ada pemilik", target_kosong: "Target belum diisi", belum_dievaluasi: "Belum dievaluasi", tanpa_bukti: "Belum ada bukti",
  tanpa_rencana_perbaikan: "Belum tercapai tanpa rencana perbaikan", belum_disetujui: "Belum disetujui",
};
export const JENIS_TEMUAN: Record<string, string> = { mayor: "Mayor", minor: "Minor", observasi: "Observasi", peluang_perbaikan: "Peluang perbaikan" };
export const SUMBER_TEMUAN: Record<string, string> = { audit_internal: "Audit internal", evaluasi_diri: "Evaluasi diri", visitasi: "Visitasi akreditasi", lainnya: "Lainnya" };
export const STATUS_TEMUAN: Record<string, { label: string; warna: string }> = {
  terbuka: { label: "Terbuka", warna: "bg-red-50 text-red-800 ring-red-200" },
  tindak_lanjut: { label: "Tindak lanjut", warna: "bg-amber-50 text-amber-900 ring-amber-200" },
  verifikasi: { label: "Verifikasi", warna: "bg-sky-50 text-sky-900 ring-sky-200" },
  ditutup: { label: "Ditutup", warna: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
};
export const STATUS_RENCANA: Record<string, string> = { rencana: "Rencana", berjalan: "Berjalan", selesai: "Selesai", batal: "Batal" };
export const SKOR: Record<string, string> = { "1": "1 — Kurang", "2": "2 — Cukup", "3": "3 — Baik", "4": "4 — Sangat baik" };

/** Bukti dari modul lain: tautan ke sumbernya (tanpa menggandakan berkas) */
export const SUMBER_MODUL: Record<string, { label: string; url: (ref: string) => string }> = {
  perangkat_ajar: { label: "Perangkat ajar", url: (r) => (/^[0-9a-f-]{36}$/.test(r) ? `/berkas/perangkat/${r}` : "/admin/perangkat-ajar/review") },
  supervisi_akademik: { label: "Supervisi akademik", url: () => "/admin/supervisi" },
  kurikulum: { label: "Struktur kurikulum & ATP", url: () => "/admin/kurikulum" },
  kokurikuler: { label: "Projek kokurikuler", url: () => "/admin/kokurikuler" },
  absensi: { label: "Rekap absensi", url: () => "/admin/absensi/rekap" },
  kesiswaan: { label: "Prestasi & pembinaan siswa", url: () => "/admin/kesiswaan" },
  sarpras: { label: "Inventaris sarpras", url: (r) => (/^[0-9a-f-]{36}$/.test(r) ? `/admin/sarpras/barang/${r}` : "/admin/sarpras") },
  perpustakaan: { label: "Laporan perpustakaan", url: () => "/admin/perpus/laporan" },
  kemitraan: { label: "Kemitraan / MoU", url: (r) => (/^[0-9a-f-]{36}$/.test(r) ? `/admin/kemitraan/${r}` : "/admin/kemitraan") },
  survei: { label: "Hasil survei", url: (r) => (/^[0-9a-f-]{36}$/.test(r) ? `/admin/survei/${r}` : "/admin/survei") },
  humas: { label: "Dasbor humas & pengaduan", url: () => "/admin/humas" },
  ekskul: { label: "Ekskul / OSIS", url: (r) => (/^[0-9a-f-]{36}$/.test(r) ? `/admin/ekskul/${r}` : "/admin/ekskul") },
  bk: { label: "Laporan BK (agregat)", url: () => "/admin/bk/laporan" },
  alumni: { label: "Statistik alumni / tracer", url: () => "/admin/alumni" },
  berita: { label: "Berita / publikasi", url: () => "/admin/berita" },
};
export const periodeAwal = () => {
  const d = new Date(); const y = d.getUTCFullYear(); const m = d.getUTCMonth();
  return m >= 6 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
};
