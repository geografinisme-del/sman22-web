import { NextResponse, type NextRequest } from "next/server";
import { getAkses } from "@/lib/admin/auth";
import { keCsv } from "@/lib/admin/induk";

export async function GET(req: NextRequest) {
  const { supabase, akses } = await getAkses();
  if (!supabase || !akses) return NextResponse.json({ pesan: "Tidak berhak" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const kelas = sp.get("kelas") ?? "";
  const dari = sp.get("dari") ?? "";
  const sampai = sp.get("sampai") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(kelas) || !/^\d{4}-\d{2}-\d{2}$/.test(dari) || !/^\d{4}-\d{2}-\d{2}$/.test(sampai)) {
    return NextResponse.json({ pesan: "Parameter tidak valid" }, { status: 400 });
  }
  // RLS memastikan wali kelas hanya mendapat data kelasnya; tanpa akses hasilnya kosong
  const { data: k } = await supabase.from("kelas").select("nama").eq("id", kelas).maybeSingle();
  const { data, error } = await supabase.rpc("rekap_absensi_kelas", { p_kelas: kelas, p_dari: dari, p_sampai: sampai });
  if (error || !k) return NextResponse.json({ pesan: "Gagal" }, { status: 403 });
  const rows = (data ?? []) as Record<string, string | number | null>[];
  if (!rows.length) return NextResponse.json({ pesan: "Tidak ada data yang bisa Anda akses" }, { status: 403 });
  await supabase.rpc("catat_aktivitas", { nama_tabel: "absensi_siswa", aksi: "EKSPOR", keterangan: { kelas: k.nama, dari, sampai, jumlah: rows.length } });
  const csv = keCsv(
    ["No", "NISN", "Nama", "Sakit", "Izin", "Alpa", "Terlambat", "Pulang Cepat", "Hari Efektif", "% Hadir"],
    rows.map((r, i) => [i + 1, r.nisn, r.nama, r.sakit, r.izin, r.alpa, r.terlambat, r.pulang_cepat, r.hari_efektif, r.persen_hadir]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rekap-absensi-${String(k.nama).replace(/[^A-Za-z0-9-]/g, "_")}-${dari}_${sampai}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
