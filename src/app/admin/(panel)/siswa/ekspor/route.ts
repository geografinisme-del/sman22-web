import { NextResponse, type NextRequest } from "next/server";
import { aksesAksi } from "@/lib/admin/auth";
import { keCsv, STATUS_SISWA } from "@/lib/admin/induk";

export async function GET(req: NextRequest) {
  const ctx = await aksesAksi("data_induk.baca");
  if (!ctx) return NextResponse.json({ pesan: "Tidak berhak" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const kelas = sp.get("kelas");
  const tingkat = sp.get("tingkat");
  const q = (sp.get("q") ?? "").replace(/[%_,()*\\]/g, " ").trim().slice(0, 80);

  type Baris = Record<string, string | number | null>;
  const semua: Baris[] = [];
  for (let i = 0; i < 20000; i += 1000) {
    let query = ctx.supabase
      .from("siswa_kelas_aktif")
      .select("id, nisn, nis, nama, jenis_kelamin, kelas, status, tahun_masuk")
      .is("deleted_at", null)
      .order("kelas", { nullsFirst: false })
      .order("nama")
      .range(i, i + 999);
    if (status && status !== "semua" && (STATUS_SISWA as readonly string[]).includes(status)) query = query.eq("status", status);
    if (kelas === "tanpa") query = query.is("kelas_id", null);
    else if (kelas && /^[0-9a-f-]{36}$/.test(kelas)) query = query.eq("kelas_id", kelas);
    if (tingkat && ["X", "XI", "XII"].includes(tingkat)) query = query.eq("tingkat", tingkat);
    if (q) query = /^\d+$/.test(q) ? query.ilike("nisn", `${q}%`) : query.ilike("nama", `%${q}%`);
    const { data, error } = await query;
    if (error) return NextResponse.json({ pesan: "Gagal mengekspor" }, { status: 500 });
    semua.push(...(data as Baris[]));
    if (data.length < 1000) break;
  }

  // detail tambahan (tanggal lahir, alamat, dll.)
  const detail = new Map<string, Baris>();
  const ids = semua.map((s) => s.id as string);
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await ctx.supabase
      .from("siswa")
      .select("id, tempat_lahir, tanggal_lahir, agama, alamat, telepon")
      .in("id", ids.slice(i, i + 300));
    for (const d of (data ?? []) as Baris[]) detail.set(d.id as string, d);
  }

  const csv = keCsv(
    ["NISN", "NIS", "Nama", "JK", "Tempat Lahir", "Tanggal Lahir", "Agama", "Kelas", "Status", "Tahun Masuk", "Alamat", "No HP"],
    semua.map((s) => {
      const d = detail.get(s.id as string) ?? {};
      return [s.nisn, s.nis, s.nama, s.jenis_kelamin, d.tempat_lahir, d.tanggal_lahir, d.agama, s.kelas, s.status, s.tahun_masuk, d.alamat, d.telepon];
    }),
  );
  await ctx.supabase.rpc("catat_aktivitas", {
    nama_tabel: "siswa",
    aksi: "EKSPOR",
    keterangan: { jumlah: semua.length, filter: { status, kelas, tingkat, q } },
  });
  const tgl = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="data-siswa-${tgl}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
