export const KATEGORI_ADUAN = {
  layanan: "Layanan administrasi",
  akademik: "Akademik / pembelajaran",
  fasilitas: "Sarana & fasilitas",
  keuangan: "Keuangan / pungutan",
  perundungan: "Perundungan (bullying)",
  kekerasan: "Kekerasan / pelecehan",
  saran: "Saran & aspirasi",
  informasi: "Permohonan informasi publik",
  lainnya: "Lainnya",
} as const;
export const RAHASIA = ["perundungan", "kekerasan"];
export const STATUS_ADUAN: Record<string, { label: string; warna: string }> = {
  baru: { label: "Baru", warna: "bg-amber-50 text-amber-900 ring-amber-200" },
  diproses: { label: "Diproses", warna: "bg-sky-50 text-sky-900 ring-sky-200" },
  selesai: { label: "Selesai", warna: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  ditolak: { label: "Ditolak / tidak dapat ditindaklanjuti", warna: "bg-black/5 text-black/60 ring-black/10" },
};
export const JENIS_MITRA = { pendidikan: "Pendidikan / kampus", industri: "Dunia usaha & industri", pemerintah: "Pemerintah", komunitas: "Komunitas / LSM", alumni: "Alumni", lainnya: "Lainnya" } as const;
export const JENIS_MEDIA = { cetak: "Media cetak", online: "Media online", televisi: "Televisi", radio: "Radio", humas_pemerintah: "Humas pemerintah", lainnya: "Lainnya" } as const;
export const SASARAN_SURVEI = { publik: "Umum (tanpa login)", warga: "Semua warga sekolah (login)", siswa: "Siswa", ortu: "Orang tua", pegawai: "Guru & Tendik", alumni: "Alumni (tracer study)" } as const;
export type Pertanyaan = { id: string; jenis: "skala" | "pilihan" | "teks"; teks: string; pilihan?: string[]; wajib?: boolean };

/** Format penyusun survei — satu pertanyaan per baris:
 *  "S: Seberapa puas…"                → skala 1–5
 *  "P: Layanan apa? | Legalisir | Mutasi" → pilihan
 *  "T: Saran Anda"                     → isian bebas (tambahkan "?" di akhir prefiks, mis. "T?:", agar opsional)
 */
export function uraiPertanyaan(teks: string): { ok: true; data: Pertanyaan[] } | { ok: false; pesan: string } {
  const baris = teks.split(/\r?\n/).map((b) => b.trim()).filter(Boolean);
  if (!baris.length) return { ok: false, pesan: "Tulis minimal satu pertanyaan" };
  if (baris.length > 40) return { ok: false, pesan: "Maksimal 40 pertanyaan" };
  const out: Pertanyaan[] = [];
  for (const [i, b] of baris.entries()) {
    const m = b.match(/^([SPT])(\?)?\s*:\s*(.+)$/i);
    if (!m) return { ok: false, pesan: `Baris ${i + 1}: awali dengan S:, P:, atau T:` };
    const jenis = ({ S: "skala", P: "pilihan", T: "teks" } as const)[m[1].toUpperCase() as "S" | "P" | "T"];
    const bagian = m[3].split("|").map((x) => x.trim()).filter(Boolean);
    const q: Pertanyaan = { id: `q${i + 1}`, jenis, teks: bagian[0].slice(0, 300), wajib: !m[2] };
    if (jenis === "pilihan") {
      q.pilihan = [...new Set(bagian.slice(1).map((x) => x.slice(0, 100)))];
      if (q.pilihan.length < 2) return { ok: false, pesan: `Baris ${i + 1}: pilihan minimal 2, pisahkan dengan |` };
    }
    out.push(q);
  }
  return { ok: true, data: out };
}
export function tulisPertanyaan(q: Pertanyaan[]) {
  return q.map((x) => `${{ skala: "S", pilihan: "P", teks: "T" }[x.jenis]}${x.wajib === false ? "?" : ""}: ${[x.teks, ...(x.pilihan ?? [])].join(" | ")}`).join("\n");
}
