/* LMS & Sarpras — label & format (browser + server) */

export const STATUS_KUMPUL: Record<string, { label: string; warna: string }> = {
  belum: { label: "Belum mengumpulkan", warna: "bg-black/5 text-black/60 ring-black/10" },
  dikumpulkan: { label: "Menunggu dinilai", warna: "bg-sky-50 text-sky-900 ring-sky-200" },
  dikembalikan: { label: "Perlu diperbaiki", warna: "bg-amber-50 text-amber-900 ring-amber-200" },
  dinilai: { label: "Dinilai", warna: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
};

/** "Sen, 3 Nov 14.00" waktu WIB */
export function waktuWIB(iso: string, panjang = false) {
  return new Date(iso).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: panjang ? "long" : "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
/** nilai untuk <input type="datetime-local"> dalam WIB */
export function keLokalWIB(iso?: string | null) {
  const d = iso ? new Date(iso) : new Date();
  return new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 16);
}
/** dari datetime-local (dianggap WIB) ke ISO */
export const dariLokalWIB = (v: string) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? new Date(`${v}:00+07:00`).toISOString() : null);

export const KONDISI: Record<string, { label: string; warna: string }> = {
  baik: { label: "Baik", warna: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  rusak_ringan: { label: "Rusak ringan", warna: "bg-amber-50 text-amber-900 ring-amber-200" },
  rusak_berat: { label: "Rusak berat", warna: "bg-red-50 text-red-800 ring-red-200" },
  hilang: { label: "Hilang", warna: "bg-black/10 text-black/70 ring-black/20" },
};
export const SUMBER_DANA = ["BOS", "BOP / APBD Provinsi", "Komite", "Hibah", "APBN / DAK", "Lainnya"];
export const STATUS_PINJAM: Record<string, { label: string; warna: string }> = {
  diajukan: { label: "Menunggu", warna: "bg-amber-50 text-amber-900 ring-amber-200" },
  disetujui: { label: "Disetujui", warna: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  dipinjam: { label: "Sedang dipinjam", warna: "bg-sky-50 text-sky-900 ring-sky-200" },
  dikembalikan: { label: "Dikembalikan", warna: "bg-black/5 text-black/60 ring-black/10" },
  ditolak: { label: "Ditolak", warna: "bg-red-50 text-red-800 ring-red-200" },
  dibatalkan: { label: "Dibatalkan", warna: "bg-black/5 text-black/50 ring-black/10" },
};
export const STATUS_RUSAK: Record<string, { label: string; warna: string }> = {
  dilaporkan: { label: "Dilaporkan", warna: "bg-amber-50 text-amber-900 ring-amber-200" },
  diproses: { label: "Diproses", warna: "bg-sky-50 text-sky-900 ring-sky-200" },
  selesai: { label: "Selesai", warna: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  ditolak: { label: "Ditolak", warna: "bg-black/5 text-black/60 ring-black/10" },
};
export const rupiah = (n: number | null | undefined) => (n == null ? "—" : "Rp" + Math.round(n).toLocaleString("id-ID"));

export function Lencana({ s, peta }: { s: string; peta: Record<string, { label: string; warna: string }> }) {
  const x = peta[s];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${x?.warna ?? ""}`}>{x?.label ?? s}</span>;
}
