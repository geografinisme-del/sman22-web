import writeXlsxFile from "write-excel-file/node";
import { NextResponse, type NextRequest } from "next/server";
import { getAkses, punya } from "@/lib/admin/auth";
import { KONDISI } from "@/lib/lms";

/** Daftar inventaris (KIB sederhana) untuk dilaporkan / dicetak */
export async function GET(req: NextRequest) {
  const { supabase, akses } = await getAkses();
  if (!supabase || !akses) return NextResponse.redirect(new URL("/admin/login", req.url));
  if (!punya(akses, "sarpras.kelola") && !punya(akses, "sarpras.lihat")) return new NextResponse("Tidak berhak", { status: 403 });
  const { data } = await supabase.from("barang").select("kode, nama, merk, spesifikasi, jumlah, satuan, kondisi, sumber_dana, tahun_perolehan, harga, keterangan, kategori_barang(nama), ruang(nama)").is("deleted_at", null).order("kode").limit(20000);
  type B = { kode: string; nama: string; merk: string; spesifikasi: string; jumlah: number; satuan: string; kondisi: string; sumber_dana: string; tahun_perolehan: number | null; harga: number | null; keterangan: string; kategori_barang: { nama: string } | null; ruang: { nama: string } | null };
  const kepala = ["No", "Kode", "Nama", "Kategori", "Merk/tipe", "Spesifikasi", "Lokasi", "Jumlah", "Satuan", "Kondisi", "Sumber dana", "Tahun", "Harga satuan", "Nilai", "Keterangan"]
    .map((v) => ({ value: v, fontWeight: "bold" as const, backgroundColor: "#EEF0F7" }));
  const baris = ((data ?? []) as unknown as B[]).map((b, i) => [
    { value: i + 1, type: Number }, { value: b.kode }, { value: b.nama }, { value: b.kategori_barang?.nama ?? "" }, { value: b.merk }, { value: b.spesifikasi },
    { value: b.ruang?.nama ?? "Gudang" }, { value: b.jumlah, type: Number }, { value: b.satuan }, { value: KONDISI[b.kondisi]?.label ?? b.kondisi }, { value: b.sumber_dana },
    b.tahun_perolehan ? { value: b.tahun_perolehan, type: Number } : null, b.harga != null ? { value: Number(b.harga), type: Number, format: "#,##0" } : null,
    b.harga != null ? { value: Number(b.harga) * b.jumlah, type: Number, format: "#,##0" } : null, { value: b.keterangan },
  ]);
  const buffer = await writeXlsxFile([kepala, ...baris] as never, {
    columns: [{ width: 5 }, { width: 24 }, { width: 30 }, { width: 18 }, { width: 18 }, { width: 30 }, { width: 18 }, { width: 8 }, { width: 8 }, { width: 13 }, { width: 14 }, { width: 7 }, { width: 14 }, { width: 15 }, { width: 24 }],
    buffer: true,
  });
  await supabase.rpc("catat_aktivitas", { nama_tabel: "barang", aksi: "EKSPOR", keterangan: { jumlah: baris.length } });
  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="inventaris-sarpras.xlsx"', "Cache-Control": "no-store" },
  });
}
