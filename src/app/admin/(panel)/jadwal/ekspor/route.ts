import writeXlsxFile from "write-excel-file/node";
import { NextResponse, type NextRequest } from "next/server";
import { getAkses } from "@/lib/admin/auth";
import { jamPendek, namaHari } from "@/lib/admin/jadwal";
import { muatEntri, muatJam } from "@/lib/admin/jadwal-data";

type Sel = { value?: string; fontWeight?: "bold"; wrap?: boolean; backgroundColor?: string; align?: "center"; alignVertical?: "top" | "center" } | null;

export async function GET(req: NextRequest) {
  const { supabase, akses } = await getAkses();
  if (!supabase || !akses) return NextResponse.redirect(new URL("/admin/login", req.url));
  const lihat = req.nextUrl.searchParams.get("lihat") === "guru" ? "guru" : req.nextUrl.searchParams.get("lihat") === "ruang" ? "ruang" : "kelas";
  const [jam, entri] = await Promise.all([muatJam(supabase), muatEntri(supabase)]);
  const hari = [...new Set(jam.filter((j) => j.jenis === "pelajaran").map((j) => j.hari))].sort();
  const maksJp = Math.max(0, ...jam.map((j) => j.jp_ke ?? 0));
  const waktu = new Map(jam.filter((j) => j.jp_ke).map((j) => [`${j.hari}-${j.jp_ke}`, `${jamPendek(j.jam_mulai)}-${jamPendek(j.jam_selesai)}`]));

  const kunci = lihat === "kelas" ? "kelas_id" : lihat === "guru" ? "pegawai_id" : "ruang_id";
  const namaDari = (e: (typeof entri)[number]) => (lihat === "kelas" ? e.kelas : lihat === "guru" ? e.guru ?? "Tanpa guru" : e.ruang ?? "");
  const kelompok = new Map<string, { nama: string; isi: typeof entri }>();
  for (const e of entri) {
    const k = e[kunci];
    if (!k) continue;
    if (!kelompok.has(k)) kelompok.set(k, { nama: namaDari(e), isi: [] });
    kelompok.get(k)!.isi.push(e);
  }
  const daftar = [...kelompok.values()].sort((a, b) => a.nama.localeCompare(b.nama, "id", { numeric: true }));
  if (!daftar.length) return new NextResponse("Belum ada jadwal untuk diunduh.", { status: 404 });

  const lembar: Sel[][][] = daftar.map(({ nama, isi }) => {
    const peta = new Map(isi.map((e) => [`${e.hari}-${e.jp_ke}`, e]));
    const judul: Sel[] = [{ value: `Jadwal ${nama}`, fontWeight: "bold" }];
    const kepala: Sel[] = [{ value: "JP", fontWeight: "bold", backgroundColor: "#EEF0F7", align: "center" }, ...hari.map((h): Sel => ({ value: namaHari(h), fontWeight: "bold", backgroundColor: "#EEF0F7" }))];
    const baris = Array.from({ length: maksJp }, (_, i) => i + 1).map((jp): Sel[] => [
      { value: String(jp), align: "center", alignVertical: "center" },
      ...hari.map((h): Sel => {
        const e = peta.get(`${h}-${jp}`);
        const w = waktu.get(`${h}-${jp}`);
        if (!w) return null;
        const lain = lihat === "kelas" ? e?.guru : lihat === "guru" ? e?.kelas : `${e?.kelas ?? ""} ${e?.guru ?? ""}`;
        return { value: e ? `${w}\n${e.mapel}\n${lain ?? ""}${e.ruang && lihat !== "ruang" ? ` · ${e.ruang}` : ""}` : w, wrap: true, alignVertical: "top" };
      }),
    ]);
    return [judul, [], kepala, ...baris];
  });
  const namaLembar = new Set<string>();
  const sheets = daftar.map(({ nama }) => {
    let n = nama.replace(/[\\/*?:[\]]/g, " ").slice(0, 28) || "Jadwal";
    while (namaLembar.has(n)) n = n.slice(0, 26) + "_" + namaLembar.size;
    namaLembar.add(n);
    return n;
  });
  const columns = daftar.map(() => [{ width: 5 }, ...hari.map(() => ({ width: 24 }))]);
  const buffer = await writeXlsxFile(lembar as never, { sheets, columns, buffer: true });
  await supabase.rpc("catat_aktivitas", { nama_tabel: "jadwal", aksi: "EKSPOR", keterangan: { lihat, lembar: daftar.length } });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="jadwal-per-${lihat}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
