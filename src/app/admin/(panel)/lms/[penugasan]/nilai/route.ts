import writeXlsxFile from "write-excel-file/node";
import { NextResponse, type NextRequest } from "next/server";
import { getAkses } from "@/lib/admin/auth";
import { penugasanSaya } from "@/lib/admin/lms-data";

type Sel = { value?: string | number; fontWeight?: "bold"; backgroundColor?: string; type?: NumberConstructor } | null;

/** Rekap nilai tugas & kuis satu kelas–mapel (untuk bahan rapor) */
export async function GET(req: NextRequest, { params }: { params: Promise<{ penugasan: string }> }) {
  const { penugasan } = await params;
  const { supabase, akses } = await getAkses();
  if (!supabase || !akses) return NextResponse.redirect(new URL("/admin/login", req.url));
  const { saya, list } = await penugasanSaya(supabase);
  const p = list.find((x) => x.id === penugasan);
  if (!saya || !p) return new NextResponse("Tidak ditemukan", { status: 404 });
  const [{ data: tugas }, { data: kuis }] = await Promise.all([
    supabase.from("tugas").select("id, judul, tenggat, nilai_maks, tugas_kelas!inner(kelas_id)").eq("pegawai_id", saya).eq("mapel_id", p.mapel_id).eq("tugas_kelas.kelas_id", p.kelas_id).eq("terbit", true).is("deleted_at", null).order("tenggat"),
    supabase.from("kuis").select("id, judul, mulai, kuis_kelas!inner(kelas_id)").eq("pegawai_id", saya).eq("mapel_id", p.mapel_id).eq("kuis_kelas.kelas_id", p.kelas_id).eq("terbit", true).is("deleted_at", null).order("mulai"),
  ]);
  const kolom = [
    ...(tugas ?? []).map((t) => ({ jenis: "tugas" as const, id: t.id as string, judul: `Tugas: ${t.judul}` })),
    ...(kuis ?? []).map((k) => ({ jenis: "kuis" as const, id: k.id as string, judul: `Kuis: ${k.judul}` })),
  ];
  const nilai = new Map<string, Map<string, number | null>>();
  const siswa = new Map<string, string>();
  for (const c of kolom) {
    const { data } = c.jenis === "tugas" ? await supabase.rpc("rekap_tugas", { p_tugas: c.id }) : await supabase.rpc("rekap_kuis", { p_kuis: c.id });
    const m = new Map<string, number | null>();
    for (const r of (data ?? []) as { siswa_id: string; nama: string; kelas: string; nilai?: number | null; skor?: number | null }[]) {
      if (r.kelas !== p.kelas) continue;
      siswa.set(r.siswa_id, r.nama);
      m.set(r.siswa_id, (c.jenis === "tugas" ? r.nilai : r.skor) ?? null);
    }
    nilai.set(c.id, m);
  }
  const kepala: Sel[] = [{ value: "No", fontWeight: "bold", backgroundColor: "#EEF0F7" }, { value: "Nama", fontWeight: "bold", backgroundColor: "#EEF0F7" },
    ...kolom.map((c): Sel => ({ value: c.judul, fontWeight: "bold", backgroundColor: "#EEF0F7" })), { value: "Rata-rata", fontWeight: "bold", backgroundColor: "#EEF0F7" }];
  const baris = [...siswa].sort((a, b) => a[1].localeCompare(b[1])).map(([id, nama], i): Sel[] => {
    const isi = kolom.map((c) => nilai.get(c.id)?.get(id) ?? null);
    const ada = isi.filter((x): x is number => x != null).map(Number);
    return [{ value: i + 1, type: Number }, { value: nama }, ...isi.map((v): Sel => (v == null ? null : { value: Number(v), type: Number })),
      ada.length ? { value: Math.round((ada.reduce((a, b) => a + b, 0) / ada.length) * 100) / 100, type: Number } : null];
  });
  const data = [[{ value: `Rekap nilai ${p.mapel} kelas ${p.kelas}`, fontWeight: "bold" }] as Sel[], [] as Sel[], kepala, ...baris];
  const buffer = await writeXlsxFile(data as never, { columns: [{ width: 5 }, { width: 32 }, ...kolom.map(() => ({ width: 18 })), { width: 12 }], buffer: true });
  await supabase.rpc("catat_aktivitas", { nama_tabel: "pengumpulan_tugas", aksi: "EKSPOR", keterangan: { kelas: p.kelas, mapel: p.mapel } });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${`nilai-${p.mapel}-${p.kelas}`.replace(/[^\w-]+/g, "-")}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
