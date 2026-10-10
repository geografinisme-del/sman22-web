export const VERSI_PRIVASI = "2026-10";
export const STATUS_KEGIATAN: Record<string, string> = {
  belum_diisi: "Belum diisi", kuliah: "Kuliah", bekerja: "Bekerja", wirausaha: "Wirausaha", kuliah_bekerja: "Kuliah sambil bekerja", mencari_kerja: "Mencari kerja", lainnya: "Lainnya",
};
export const FIELD_DIREKTORI: Record<string, string> = {
  jurusan: "Jurusan SMA", kota: "Kota domisili", status_kegiatan: "Kegiatan saat ini", institusi: "Kampus / tempat kerja", bidang: "Prodi / bidang",
  jabatan: "Jabatan", tautan_profesional: "Tautan profesional (LinkedIn dll.)", bio: "Bio singkat", email: "Email", telepon: "No. HP",
};
export const JENIS_PELUANG: Record<string, string> = { beasiswa: "Beasiswa", kuliah: "Info kuliah", lowongan: "Lowongan kerja", magang: "Magang", lomba: "Lomba", pelatihan: "Pelatihan", lainnya: "Lainnya" };
export const SASARAN_PELUANG: Record<string, string> = { siswa: "Siswa", alumni: "Alumni", keduanya: "Siswa & alumni" };
export const JENIS_KONTRIBUSI: Record<string, string> = { donasi: "Donasi", beasiswa: "Beasiswa", narasumber: "Narasumber / guru tamu", mentoring: "Mentoring", barang: "Barang / fasilitas", lainnya: "Lainnya" };
export const STATUS_MODERASI: Record<string, { label: string; warna: string }> = {
  menunggu: { label: "Menunggu", warna: "bg-amber-50 text-amber-900 ring-amber-200" },
  diajukan: { label: "Diajukan", warna: "bg-amber-50 text-amber-900 ring-amber-200" },
  tayang: { label: "Tayang", warna: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  disetujui: { label: "Disetujui", warna: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  diterima: { label: "Diterima", warna: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  selesai: { label: "Selesai", warna: "bg-sky-50 text-sky-900 ring-sky-200" },
  ditolak: { label: "Ditolak", warna: "bg-black/5 text-black/60 ring-black/10" },
  arsip: { label: "Arsip", warna: "bg-black/5 text-black/60 ring-black/10" },
};
export const KEBIJAKAN_PRIVASI = [
  "Data Anda dipakai sekolah untuk verifikasi alumni, tracer study (laporan dalam bentuk angka gabungan), dan informasi kegiatan alumni.",
  "Data pribadi tidak dipublikasikan. Di direktori alumni (hanya untuk alumni terverifikasi), Anda memilih sendiri kolom apa yang ditampilkan — bawaannya tidak ada.",
  "Cerita & kontribusi hanya tampil di website bila Anda mengizinkan dan setelah ditinjau sekolah.",
  "Anda dapat mengubah pilihan tampil kapan saja, dan dapat meminta penghapusan akun melalui sekolah.",
];
