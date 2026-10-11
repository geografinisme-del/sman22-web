import { NextResponse } from "next/server";
import { aksesAksi } from "@/lib/admin/auth";
import { bukuXlsx, kirimXlsx, lembarInfo, tanggalFile } from "@/lib/admin/excel";

export async function GET() {
  const ctx = await aksesAksi("data_induk.baca");
  if (!ctx) return NextResponse.json({ pesan: "Tidak berhak" }, { status: 403 });
  const semua: Record<string, string | null>[] = [];
  for (let i = 0; i < 10000; i += 1000) {
    const { data, error } = await ctx.supabase
      .from("pegawai")
      .select("nama, nip, nuptk, jenis_kelamin, jenis, jabatan, status, telepon, email")
      .is("deleted_at", null)
      .order("jenis")
      .order("nama")
      .range(i, i + 999);
    if (error) return NextResponse.json({ pesan: "Gagal mengekspor" }, { status: 500 });
    semua.push(...data);
    if (data.length < 1000) break;
  }
  await ctx.supabase.rpc("catat_aktivitas", { nama_tabel: "pegawai", aksi: "EKSPOR", keterangan: { jumlah: semua.length } });
  const guru = semua.filter((p) => p.jenis === "guru").length;
  // judul kolom sama dengan template impor, jadi file ini bisa diedit lalu diimpor ulang
  const isi = await bukuXlsx([
    {
      nama: "Data Guru & Pegawai",
      kolom: [
        { judul: "No", jenis: "angka", lebar: 5 },
        { judul: "Nama" },
        { judul: "NIP" },
        { judul: "NUPTK" },
        { judul: "Jenis kelamin (L/P)", lebar: 11 },
        { judul: "Jenis (guru/tendik)", lebar: 12 },
        { judul: "Jabatan / tugas" },
        { judul: "Status" },
        { judul: "No. HP" },
        { judul: "Email" },
      ],
      baris: semua.map((p, i) => [i + 1, p.nama, p.nip, p.nuptk, p.jenis_kelamin, p.jenis, p.jabatan, p.status, p.telepon, p.email]),
    },
    lembarInfo("Data guru & pegawai", [
      ["Jumlah", semua.length],
      ["Guru", guru],
      ["Tenaga kependidikan", semua.length - guru],
    ]),
  ]);
  return kirimXlsx(isi, `data-pegawai-${tanggalFile()}`);
}
