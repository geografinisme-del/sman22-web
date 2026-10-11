import { NextResponse, type NextRequest } from "next/server";
import { getAkses, punya } from "@/lib/admin/auth";
import { bukuXlsx, kirimXlsx, lembarInfo, tanggalFile } from "@/lib/admin/excel";

/** Statistik alumni per angkatan — hanya angka agregat, sel < 3 disamarkan */
export async function GET(req: NextRequest) {
  const { supabase, akses } = await getAkses();
  if (!supabase || !akses) return NextResponse.redirect(new URL("/admin/login", req.url));
  if (!punya(akses, "alumni.kelola") && !punya(akses, "alumni.lihat")) return new NextResponse("Tidak berhak", { status: 403 });
  const { data } = await supabase.rpc("statistik_alumni");
  const kolom = ["tahun_lulus", "total", "berakun", "mengisi", "kuliah", "bekerja", "wirausaha", "kuliah_bekerja", "mencari_kerja", "lainnya"] as const;
  const judul = ["Angkatan", "Profil", "Berakun", "Mengisi tracer", "Kuliah", "Bekerja", "Wirausaha", "Kuliah + kerja", "Mencari kerja", "Lainnya"];
  const isi = await bukuXlsx([
    {
      nama: "Statistik per angkatan",
      // kelompok < 3 orang ditulis "< 3" (teks) agar tidak bisa dikenali
      kolom: judul.map((j, i) => ({ judul: j, jenis: "angka" as const, lebar: i === 0 ? 10 : 13 })),
      baris: ((data ?? []) as Record<string, number | null>[]).map((r) => kolom.map((k) => (r[k] == null ? "< 3" : Number(r[k])))),
    },
    lembarInfo("Statistik alumni & tracer study", [["Privasi", "Hanya angka agregat. Kelompok kurang dari 3 orang disamarkan (< 3)."]]),
  ]);
  await supabase.rpc("catat_aktivitas", { nama_tabel: "profil_alumni", aksi: "EKSPOR", keterangan: { jenis: "statistik agregat" } });
  return kirimXlsx(isi, `statistik-alumni-${tanggalFile()}`);
}
