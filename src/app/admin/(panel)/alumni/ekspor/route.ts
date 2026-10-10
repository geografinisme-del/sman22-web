import writeXlsxFile from "write-excel-file/node";
import { NextResponse, type NextRequest } from "next/server";
import { getAkses, punya } from "@/lib/admin/auth";

/** Statistik alumni per angkatan — hanya angka agregat, sel < 3 disamarkan */
export async function GET(req: NextRequest) {
  const { supabase, akses } = await getAkses();
  if (!supabase || !akses) return NextResponse.redirect(new URL("/admin/login", req.url));
  if (!punya(akses, "alumni.kelola") && !punya(akses, "alumni.lihat")) return new NextResponse("Tidak berhak", { status: 403 });
  const { data } = await supabase.rpc("statistik_alumni");
  const kolom = ["tahun_lulus", "total", "berakun", "mengisi", "kuliah", "bekerja", "wirausaha", "kuliah_bekerja", "mencari_kerja", "lainnya"] as const;
  const kepala = ["Angkatan", "Profil", "Berakun", "Mengisi tracer", "Kuliah", "Bekerja", "Wirausaha", "Kuliah+kerja", "Mencari kerja", "Lainnya"]
    .map((v) => ({ value: v, fontWeight: "bold" as const, backgroundColor: "#EEF0F7" }));
  const baris = ((data ?? []) as Record<string, number | null>[]).map((r) => kolom.map((k) => (r[k] == null ? { value: "< 3" } : { value: Number(r[k]), type: Number })));
  const buffer = await writeXlsxFile([kepala, ...baris, [{ value: "Kelompok < 3 orang disamarkan untuk melindungi privasi." }]] as never, { buffer: true, columns: kolom.map(() => ({ width: 14 })) });
  await supabase.rpc("catat_aktivitas", { nama_tabel: "profil_alumni", aksi: "EKSPOR", keterangan: { jenis: "statistik agregat" } });
  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="statistik-alumni.xlsx"', "Cache-Control": "no-store" },
  });
}
