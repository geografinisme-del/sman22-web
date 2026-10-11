import { NextResponse, type NextRequest } from "next/server";
import { getAkses } from "@/lib/admin/auth";
import { bukuXlsx, kirimXlsx, lembarInfo } from "@/lib/admin/excel";

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
  const isi = await bukuXlsx([
    {
      nama: `Rekap ${k.nama}`,
      kolom: [
        { judul: "No", jenis: "angka", lebar: 5 },
        { judul: "NISN" },
        { judul: "Nama" },
        { judul: "Sakit", jenis: "angka", lebar: 8 },
        { judul: "Izin", jenis: "angka", lebar: 8 },
        { judul: "Alpa", jenis: "angka", lebar: 8 },
        { judul: "Terlambat", jenis: "angka", lebar: 10 },
        { judul: "Pulang cepat", jenis: "angka", lebar: 10 },
        { judul: "Hari efektif", jenis: "angka", lebar: 10 },
        { judul: "% Hadir", jenis: "persen", lebar: 9 },
      ],
      baris: rows.map((r, i) => [i + 1, r.nisn, r.nama, r.sakit, r.izin, r.alpa, r.terlambat, r.pulang_cepat, r.hari_efektif, r.persen_hadir]),
    },
    lembarInfo("Rekap absensi siswa", [
      ["Kelas", k.nama],
      ["Periode", `${dari} s.d. ${sampai}`],
      ["Jumlah siswa", rows.length],
      ["Keterangan", "S = sakit, I = izin, A = alpa. % hadir dihitung dari hari efektif."],
    ]),
  ]);
  return kirimXlsx(isi, `rekap-absensi-${k.nama}-${dari}_${sampai}`);
}
