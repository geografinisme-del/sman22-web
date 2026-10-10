export const JENIS_ORG: Record<string, string> = { ekskul: "Ekstrakurikuler", osis: "OSIS", mpk: "MPK", komunitas: "Komunitas" };
export const BIDANG_ORG: Record<string, string> = { olahraga: "Olahraga", seni: "Seni & budaya", akademik: "Akademik & sains", keagamaan: "Keagamaan", teknologi: "Teknologi & media", organisasi: "Organisasi & kepemimpinan", lainnya: "Lainnya" };
export const JABATAN: Record<string, string> = { ketua: "Ketua", wakil_ketua: "Wakil ketua", sekretaris: "Sekretaris", bendahara: "Bendahara", koordinator: "Koordinator bidang", anggota: "Anggota" };
export const HAK_JABATAN: Record<string, string> = {
  ketua: "kegiatan, presensi, program kerja, pengajuan kegiatan", wakil_ketua: "kegiatan, presensi, program kerja, pengajuan kegiatan",
  sekretaris: "kegiatan, presensi, pengajuan & LPJ", bendahara: "anggaran pengajuan & LPJ", koordinator: "kegiatan", anggota: "melihat",
};
export const STATUS_DAFTAR: Record<string, { label: string; warna: string }> = {
  menunggu: { label: "Menunggu", warna: "bg-amber-50 text-amber-900 ring-amber-200" },
  diterima: { label: "Diterima", warna: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  daftar_tunggu: { label: "Daftar tunggu", warna: "bg-sky-50 text-sky-900 ring-sky-200" },
  ditolak: { label: "Belum diterima", warna: "bg-black/5 text-black/60 ring-black/10" },
  mundur: { label: "Mundur", warna: "bg-black/5 text-black/60 ring-black/10" },
};
export const STATUS_PENGAJUAN: Record<string, { label: string; warna: string }> = {
  draf: { label: "Draf", warna: "bg-black/5 text-black/60 ring-black/10" },
  diajukan: { label: "Menunggu pembina", warna: "bg-amber-50 text-amber-900 ring-amber-200" },
  disetujui_pembina: { label: "Menunggu kesiswaan", warna: "bg-amber-50 text-amber-900 ring-amber-200" },
  disetujui: { label: "Disetujui", warna: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  revisi: { label: "Perlu revisi", warna: "bg-red-50 text-red-800 ring-red-200" },
  ditolak: { label: "Ditolak", warna: "bg-black/5 text-black/60 ring-black/10" },
  lpj_diajukan: { label: "LPJ diperiksa", warna: "bg-sky-50 text-sky-900 ring-sky-200" },
  selesai: { label: "Selesai (LPJ diterima)", warna: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
};
export const JENIS_KEGIATAN: Record<string, string> = { latihan: "Latihan", rapat: "Rapat", acara: "Acara", lomba: "Lomba", lainnya: "Lainnya" };
export const JENIS_SERTIF: Record<string, string> = { keanggotaan: "Keanggotaan", kepengurusan: "Kepengurusan", penghargaan: "Penghargaan", panitia: "Kepanitiaan", peserta: "Peserta kegiatan" };
export const STATUS_PROKER: Record<string, string> = { rencana: "Rencana", berjalan: "Berjalan", selesai: "Selesai", batal: "Batal" };

export type IsianTambahan = { id: string; label: string; jenis: "teks" | "pilihan"; pilihan?: string[]; wajib?: boolean };
export type ItemAnggaran = { uraian: string; volume: number; satuan: string; harga: number };

/** Format isian tambahan, satu per baris:  "T*: Ukuran kaos"  /  "P: Punya laptop? | Ya | Tidak"  (* = wajib) */
export function uraiIsian(teks: string): { ok: true; data: IsianTambahan[] } | { ok: false; pesan: string } {
  const baris = teks.split(/\r?\n/).map((b) => b.trim()).filter(Boolean);
  if (baris.length > 10) return { ok: false, pesan: "Maksimal 10 isian tambahan" };
  const out: IsianTambahan[] = [];
  for (const [i, b] of baris.entries()) {
    const m = b.match(/^([TP])(\*)?\s*:\s*(.+)$/i);
    if (!m) return { ok: false, pesan: `Baris ${i + 1}: awali dengan T: atau P:` };
    const bag = m[3].split("|").map((x) => x.trim()).filter(Boolean);
    if (bag[0].length < 2) return { ok: false, pesan: `Baris ${i + 1}: label terlalu pendek` };
    const f: IsianTambahan = { id: `f${i + 1}`, label: bag[0].slice(0, 120), jenis: m[1].toUpperCase() === "P" ? "pilihan" : "teks", wajib: Boolean(m[2]) };
    if (f.jenis === "pilihan") {
      f.pilihan = [...new Set(bag.slice(1).map((x) => x.slice(0, 60)))];
      if (f.pilihan.length < 2) return { ok: false, pesan: `Baris ${i + 1}: minimal 2 pilihan, pisahkan dengan |` };
    }
    out.push(f);
  }
  return { ok: true, data: out };
}
export const tulisIsian = (f: IsianTambahan[]) => f.map((x) => `${x.jenis === "pilihan" ? "P" : "T"}${x.wajib ? "*" : ""}: ${[x.label, ...(x.pilihan ?? [])].join(" | ")}`).join("\n");

/** Rincian anggaran, satu per baris: "Cetak foto; 20; lembar; 15000" */
export function uraiAnggaran(teks: string): { ok: true; data: ItemAnggaran[] } | { ok: false; pesan: string } {
  const baris = teks.split(/\r?\n/).map((b) => b.trim()).filter(Boolean);
  if (baris.length > 50) return { ok: false, pesan: "Maksimal 50 baris anggaran" };
  const out: ItemAnggaran[] = [];
  for (const [i, b] of baris.entries()) {
    const [uraian, vol, satuan, harga] = b.split(";").map((x) => x.trim());
    const v = Number((vol ?? "").replace(",", ".")), h = Number((harga ?? "").replace(/[.\s]/g, "").replace(",", "."));
    if (!uraian || uraian.length < 2 || !(v >= 0) || !(h >= 0) || Number.isNaN(v) || Number.isNaN(h))
      return { ok: false, pesan: `Baris ${i + 1}: format "uraian; volume; satuan; harga satuan"` };
    out.push({ uraian: uraian.slice(0, 150), volume: v, satuan: (satuan ?? "").slice(0, 30), harga: h });
  }
  return { ok: true, data: out };
}
export const tulisAnggaran = (a: ItemAnggaran[]) => a.map((x) => `${x.uraian}; ${x.volume}; ${x.satuan}; ${x.harga}`).join("\n");
export const totalAnggaran = (a: ItemAnggaran[]) => a.reduce((t, x) => t + x.volume * x.harga, 0);
