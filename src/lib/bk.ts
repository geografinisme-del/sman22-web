export const PRIORITAS_BK: Record<string, { label: string; warna: string }> = {
  rendah: { label: "Rendah", warna: "bg-black/5 text-black/60 ring-black/10" },
  sedang: { label: "Sedang", warna: "bg-sky-50 text-sky-900 ring-sky-200" },
  tinggi: { label: "Tinggi", warna: "bg-amber-50 text-amber-900 ring-amber-200" },
  darurat: { label: "Darurat", warna: "bg-red-50 text-red-800 ring-red-200" },
};
export const STATUS_KASUS: Record<string, { label: string; warna: string }> = {
  aktif: { label: "Aktif", warna: "bg-sky-50 text-sky-900 ring-sky-200" },
  pemantauan: { label: "Pemantauan", warna: "bg-amber-50 text-amber-900 ring-amber-200" },
  selesai: { label: "Selesai", warna: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  dirujuk_luar: { label: "Dirujuk ke luar", warna: "bg-violet-50 text-violet-900 ring-violet-200" },
};
export const STATUS_PERMINTAAN: Record<string, { label: string; warna: string }> = {
  baru: { label: "Baru", warna: "bg-amber-50 text-amber-900 ring-amber-200" },
  diterima: { label: "Diterima", warna: "bg-sky-50 text-sky-900 ring-sky-200" },
  dijadwalkan: { label: "Dijadwalkan", warna: "bg-sky-50 text-sky-900 ring-sky-200" },
  selesai: { label: "Selesai", warna: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  ditolak: { label: "Tidak dapat dilayani", warna: "bg-black/5 text-black/60 ring-black/10" },
};
export const STATUS_SESI: Record<string, string> = { terjadwal: "Terjadwal", selesai: "Selesai", batal: "Batal", tidak_hadir: "Tidak hadir" };
export const JENIS_SESI: Record<string, string> = { individu: "Konseling individu", kelompok: "Konseling kelompok", konsultasi_ortu: "Konsultasi orang tua", kunjungan_rumah: "Kunjungan rumah" };
export const MODE_SESI: Record<string, string> = { tatap_muka: "Tatap muka", daring: "Daring", telepon: "Telepon" };
export const RISIKO: Record<string, string> = { rendah: "Rendah", sedang: "Sedang", tinggi: "Tinggi" };
export const ASAL_KASUS: Record<string, string> = { permintaan: "Permintaan siswa/ortu", rujukan_guru: "Rujukan guru/wali", pengaduan: "Pengaduan", inisiatif_bk: "Inisiatif BK" };
export const JENIS_RUJUKAN_LUAR: Record<string, string> = { psikolog: "Psikolog", puskesmas: "Puskesmas", rumah_sakit: "Rumah sakit", uptd_ppa: "UPTD PPA", kepolisian: "Kepolisian", lainnya: "Lainnya" };
export const STATUS_TL: Record<string, string> = { rencana: "Rencana", berjalan: "Berjalan", selesai: "Selesai", batal: "Batal" };
