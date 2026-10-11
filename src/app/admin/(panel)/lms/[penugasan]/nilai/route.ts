import { NextResponse, type NextRequest } from "next/server";
import { getAkses } from "@/lib/admin/auth";
import { bukuXlsx, kirimXlsx, lembarInfo, tanggalFile } from "@/lib/admin/excel";
import { penugasanSaya } from "@/lib/admin/lms-data";

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
  const urut = [...siswa].sort((a, b) => a[1].localeCompare(b[1], "id"));
  const isi = await bukuXlsx([
    {
      nama: `Nilai ${p.kelas}`,
      kolom: [
        { judul: "No", jenis: "angka", lebar: 5 },
        { judul: "Nama siswa", lebar: 32 },
        ...kolom.map((c) => ({ judul: c.judul, jenis: "angka" as const, lebar: Math.min(28, Math.max(12, c.judul.length + 2)) })),
        { judul: "Rata-rata", jenis: "angka", lebar: 11 },
      ],
      baris: urut.map(([id, nama], i) => {
        const nilaiSiswa = kolom.map((c) => nilai.get(c.id)?.get(id) ?? null);
        const ada = nilaiSiswa.filter((x): x is number => x != null).map(Number);
        const rata = ada.length ? Math.round((ada.reduce((a, b) => a + b, 0) / ada.length) * 100) / 100 : null;
        return [i + 1, nama, ...nilaiSiswa, rata];
      }),
    },
    lembarInfo("Rekap nilai kelas digital", [
      ["Mata pelajaran", p.mapel],
      ["Kelas", p.kelas],
      ["Jumlah siswa", urut.length],
      ["Jumlah penilaian", `${(tugas ?? []).length} tugas, ${(kuis ?? []).length} kuis`],
      ["Keterangan", "Sel kosong = belum mengumpulkan / belum dinilai. Rata-rata dari nilai yang ada."],
    ]),
  ]);
  await supabase.rpc("catat_aktivitas", { nama_tabel: "pengumpulan_tugas", aksi: "EKSPOR", keterangan: { kelas: p.kelas, mapel: p.mapel } });
  return kirimXlsx(isi, `nilai-${p.mapel}-${p.kelas}-${tanggalFile()}`);
}
