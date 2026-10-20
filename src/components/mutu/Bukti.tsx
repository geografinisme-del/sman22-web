import { SUMBER_MODUL } from "@/lib/mutu";

export type B = { id: string; judul: string; jenis: string; tautan: string; sumber_modul: string; sumber_ref: string; nama_berkas: string; ukuran: number | null; hash_sha256: string; versi: number; digantikan: boolean; tanggal_dokumen: string | null; created_at: string; versi_dari: string | null };

export function TautanBukti({ b }: { b: B }) {
  if (b.jenis === "berkas") return <a href={`/berkas/mutu/${b.id}`} target="_blank" className="text-blue-teks underline">{b.nama_berkas || "buka berkas"}</a>;
  if (b.jenis === "tautan") return <a href={b.tautan} target="_blank" rel="noreferrer" className="text-blue-teks underline">buka tautan ↗</a>;
  const m = SUMBER_MODUL[b.sumber_modul];
  return <a href={m ? m.url(b.sumber_ref) : "#"} className="text-blue-teks underline">{m?.label ?? b.sumber_modul} ↗</a>;
}

