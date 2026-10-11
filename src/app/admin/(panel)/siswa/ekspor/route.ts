import { NextResponse, type NextRequest } from "next/server";
import { aksesAksi } from "@/lib/admin/auth";
import { bukuXlsx, kirimXlsx, lembarInfo, tanggalFile } from "@/lib/admin/excel";
import { STATUS_SISWA } from "@/lib/admin/induk";

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
      .select("id, nisn, nis, nama, jenis_kelamin, kelas, tingkat, status, tahun_masuk")
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

  // judul kolom sama dengan template impor, jadi file ini bisa diedit lalu diimpor ulang
  const isi = await bukuXlsx([
    {
      nama: "Data Siswa",
      kolom: [
        { judul: "No", jenis: "angka", lebar: 5 },
        { judul: "Nama" },
        { judul: "NISN" },
        { judul: "NIS / NIPD" },
        { judul: "Jenis kelamin (L/P)", lebar: 11 },
        { judul: "Tempat lahir" },
        { judul: "Tanggal lahir", jenis: "tanggal" },
        { judul: "Agama" },
        { judul: "Tingkat", lebar: 8 },
        { judul: "Kelas / Rombel" },
        { judul: "Status" },
        { judul: "Tahun masuk", jenis: "angka", lebar: 9 },
        { judul: "Alamat", lebar: 40 },
        { judul: "No. HP siswa" },
      ],
      baris: semua.map((s, i) => {
        const d = detail.get(s.id as string) ?? {};
        return [i + 1, s.nama, s.nisn, s.nis, s.jenis_kelamin, d.tempat_lahir, d.tanggal_lahir, d.agama, s.tingkat, s.kelas, s.status, s.tahun_masuk, d.alamat, d.telepon];
      }),
    },
    lembarInfo("Data induk siswa", [
      ["Jumlah siswa", semua.length],
      ["Filter status", status && status !== "semua" ? status : "Semua status"],
      ["Filter tingkat", tingkat || "Semua tingkat"],
      ["Filter kelas", kelas === "tanpa" ? "Belum punya kelas" : kelas ? "Kelas terpilih" : "Semua kelas"],
      ["Pencarian", q || "—"],
    ]),
  ]);
  await ctx.supabase.rpc("catat_aktivitas", {
    nama_tabel: "siswa",
    aksi: "EKSPOR",
    keterangan: { jumlah: semua.length, filter: { status, kelas, tingkat, q } },
  });
  return kirimXlsx(isi, `data-siswa-${tanggalFile()}`);
}
