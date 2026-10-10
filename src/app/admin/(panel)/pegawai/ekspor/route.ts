import { NextResponse } from "next/server";
import { aksesAksi } from "@/lib/admin/auth";
import { keCsv } from "@/lib/admin/induk";

export async function GET() {
  const ctx = await aksesAksi("data_induk.baca");
  if (!ctx) return NextResponse.json({ pesan: "Tidak berhak" }, { status: 403 });
  const semua: Record<string, string | null>[] = [];
  for (let i = 0; i < 10000; i += 1000) {
    const { data, error } = await ctx.supabase
      .from("pegawai")
      .select("nama, nip, nuptk, jenis_kelamin, jenis, jabatan, status, telepon, email")
      .is("deleted_at", null)
      .order("nama")
      .range(i, i + 999);
    if (error) return NextResponse.json({ pesan: "Gagal mengekspor" }, { status: 500 });
    semua.push(...data);
    if (data.length < 1000) break;
  }
  await ctx.supabase.rpc("catat_aktivitas", { nama_tabel: "pegawai", aksi: "EKSPOR", keterangan: { jumlah: semua.length } });
  const csv = keCsv(
    ["Nama", "NIP", "NUPTK", "JK", "Jenis", "Jabatan", "Status", "No HP", "Email"],
    semua.map((p) => [p.nama, p.nip, p.nuptk, p.jenis_kelamin, p.jenis, p.jabatan, p.status, p.telepon, p.email]),
  );
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="data-pegawai.csv"', "Cache-Control": "no-store" },
  });
}
