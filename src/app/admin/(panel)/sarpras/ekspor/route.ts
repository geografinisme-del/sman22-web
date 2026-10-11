import { NextResponse, type NextRequest } from "next/server";
import { getAkses, punya } from "@/lib/admin/auth";
import { bukuXlsx, kirimXlsx, lembarInfo, tanggalFile } from "@/lib/admin/excel";
import { KONDISI } from "@/lib/lms";

/** Daftar inventaris (KIB sederhana) untuk dilaporkan / dicetak */
export async function GET(req: NextRequest) {
  const { supabase, akses } = await getAkses();
  if (!supabase || !akses) return NextResponse.redirect(new URL("/admin/login", req.url));
  if (!punya(akses, "sarpras.kelola") && !punya(akses, "sarpras.lihat")) return new NextResponse("Tidak berhak", { status: 403 });
  const { data } = await supabase.from("barang").select("kode, nama, merk, spesifikasi, jumlah, satuan, kondisi, sumber_dana, tahun_perolehan, harga, keterangan, kategori_barang(nama), ruang(nama)").is("deleted_at", null).order("kode").limit(20000);
  type B = { kode: string; nama: string; merk: string; spesifikasi: string; jumlah: number; satuan: string; kondisi: string; sumber_dana: string; tahun_perolehan: number | null; harga: number | null; keterangan: string; kategori_barang: { nama: string } | null; ruang: { nama: string } | null };
  const barang = (data ?? []) as unknown as B[];
  const nilaiTotal = barang.reduce((t, b) => t + (b.harga != null ? Number(b.harga) * b.jumlah : 0), 0);
  const isi = await bukuXlsx([
    {
      nama: "Inventaris",
      kolom: [
        { judul: "No", jenis: "angka", lebar: 5 },
        { judul: "Kode" },
        { judul: "Nama barang", lebar: 30 },
        { judul: "Kategori" },
        { judul: "Merk / tipe" },
        { judul: "Spesifikasi", lebar: 32 },
        { judul: "Lokasi" },
        { judul: "Jumlah", jenis: "angka", lebar: 8 },
        { judul: "Satuan", lebar: 8 },
        { judul: "Kondisi", lebar: 13 },
        { judul: "Sumber dana" },
        { judul: "Tahun perolehan", jenis: "angka", lebar: 10 },
        { judul: "Harga satuan", jenis: "uang" },
        { judul: "Nilai (jumlah × harga)", jenis: "uang", lebar: 18 },
        { judul: "Keterangan", lebar: 28 },
      ],
      baris: barang.map((b, i) => [
        i + 1, b.kode, b.nama, b.kategori_barang?.nama, b.merk, b.spesifikasi, b.ruang?.nama ?? "Gudang", b.jumlah, b.satuan,
        KONDISI[b.kondisi]?.label ?? b.kondisi, b.sumber_dana, b.tahun_perolehan, b.harga, b.harga != null ? Number(b.harga) * b.jumlah : null, b.keterangan,
      ]),
    },
    lembarInfo("Daftar inventaris sarana & prasarana", [
      ["Jumlah jenis barang", barang.length],
      ["Total nilai aset (Rp)", nilaiTotal.toLocaleString("id-ID")],
    ]),
  ]);
  await supabase.rpc("catat_aktivitas", { nama_tabel: "barang", aksi: "EKSPOR", keterangan: { jumlah: barang.length } });
  return kirimXlsx(isi, `inventaris-sarpras-${tanggalFile()}`);
}
