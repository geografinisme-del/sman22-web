import { NextResponse, type NextRequest } from "next/server";
import { getAkses } from "@/lib/admin/auth";
import { bukuXlsx, kirimXlsx, lembarInfo } from "@/lib/admin/excel";
import { pilihKerangka, type BarisAnalisis } from "@/lib/admin/mutu-data";
import { CELAH, PERSETUJUAN, STATUS_CAPAIAN, STATUS_TEMUAN, SUMBER_MODUL } from "@/lib/mutu";

/** Paket laporan mutu: indikator + evaluasi, daftar bukti (dengan hash), temuan & rencana */
export async function GET(req: NextRequest) {
  const { supabase, akses } = await getAkses();
  if (!supabase || !akses) return NextResponse.redirect(new URL("/admin/login", req.url));
  const u = req.nextUrl.searchParams;
  const { kini, periode } = await pilihKerangka(supabase, u.get("k") ?? undefined, u.get("periode") ?? undefined);
  if (!kini) return new NextResponse("Kerangka tidak ditemukan", { status: 404 });
  const [{ data: an }, { data: ev }, { data: bk }, { data: tm }] = await Promise.all([
    supabase.rpc("analisis_mutu", { p_kerangka: kini.id, p_periode: periode }),
    supabase.from("evaluasi_indikator").select("indikator_id, evaluasi_diri, disetujui_pada").eq("periode", periode),
    supabase.from("tautan_bukti_mutu").select("periode, indikator_mutu!inner(kode, standar_mutu!inner(kerangka_id)), bukti_mutu(judul, jenis, tautan, sumber_modul, sumber_ref, nama_berkas, hash_sha256, versi, tanggal_dokumen, created_at, digantikan)")
      .eq("periode", periode).eq("indikator_mutu.standar_mutu.kerangka_id", kini.id),
    supabase.from("temuan_mutu").select("jenis, uraian, status, tenggat, indikator_mutu(kode), rencana_perbaikan(kegiatan, status, tenggat, hasil)").eq("kerangka_id", kini.id).eq("periode", periode),
  ]);
  const baris = (an ?? []) as BarisAnalisis[];
  if (!baris.length) return new NextResponse("Tidak berhak atau belum ada indikator", { status: 403 });
  const evMap = new Map((ev ?? []).map((e) => [e.indikator_id, e]));
  const situs = req.nextUrl.origin;
  type BK = { periode: string; indikator_mutu: { kode: string }; bukti_mutu: { judul: string; jenis: string; tautan: string; sumber_modul: string; sumber_ref: string; nama_berkas: string; hash_sha256: string; versi: number; tanggal_dokumen: string | null; created_at: string; digantikan: boolean } };
  type TM = { jenis: string; uraian: string; status: string; tenggat: string | null; indikator_mutu: { kode: string } | null; rencana_perbaikan: { kegiatan: string; status: string; tenggat: string | null; hasil: string }[] };
  const bukti = (bk ?? []) as unknown as BK[];
  const temuan = (tm ?? []) as unknown as TM[];
  const isi = await bukuXlsx([
    {
      nama: "Indikator",
      kolom: [
        { judul: "Kode standar", lebar: 9 },
        { judul: "Standar", lebar: 28 },
        { judul: "Kode indikator", lebar: 10 },
        { judul: "Indikator", lebar: 50 },
        { judul: "Pemilik", lebar: 22 },
        { judul: "Target", lebar: 22 },
        { judul: "Capaian", lebar: 22 },
        { judul: "Skor", jenis: "angka", lebar: 7 },
        { judul: "Status capaian", lebar: 14 },
        { judul: "Persetujuan", lebar: 16 },
        { judul: "Disetujui pada", jenis: "tanggal" },
        { judul: "Jumlah bukti", jenis: "angka", lebar: 9 },
        { judul: "Temuan terbuka", jenis: "angka", lebar: 9 },
        { judul: "Penanda kelengkapan", lebar: 40 },
        { judul: "Evaluasi diri", lebar: 60 },
      ],
      baris: baris.map((b) => [
        b.standar_kode, b.standar, b.kode, b.nama, b.pemilik, b.target, b.capaian, b.skor || null,
        STATUS_CAPAIAN[b.status]?.label, PERSETUJUAN[b.persetujuan]?.label, evMap.get(b.indikator_id)?.disetujui_pada?.slice(0, 10),
        b.jumlah_bukti, b.temuan_terbuka, b.celah.map((c) => CELAH[c]).join("; "), evMap.get(b.indikator_id)?.evaluasi_diri,
      ]),
    },
    {
      nama: "Bukti",
      kolom: [
        { judul: "Kode indikator", lebar: 10 },
        { judul: "Judul bukti", lebar: 40 },
        { judul: "Jenis", lebar: 9 },
        { judul: "Versi", jenis: "angka", lebar: 6 },
        { judul: "Masih berlaku", lebar: 9 },
        { judul: "Sumber / tautan", lebar: 50 },
        { judul: "Nama berkas", lebar: 25 },
        { judul: "SHA-256", lebar: 66 },
        { judul: "Tanggal dokumen", jenis: "tanggal" },
        { judul: "Diunggah", jenis: "tanggal" },
      ],
      baris: bukti.map((x) => {
        const b = x.bukti_mutu;
        const sumber = b.jenis === "tautan" ? b.tautan : b.jenis === "modul" ? `${SUMBER_MODUL[b.sumber_modul]?.label ?? b.sumber_modul}: ${situs}${SUMBER_MODUL[b.sumber_modul]?.url(b.sumber_ref) ?? ""}` : "Berkas di sistem";
        return [x.indikator_mutu.kode, b.judul, b.jenis, b.versi, b.digantikan ? "Tidak" : "Ya", sumber, b.nama_berkas, b.hash_sha256, b.tanggal_dokumen, b.created_at.slice(0, 10)];
      }),
    },
    {
      nama: "Temuan",
      kolom: [
        { judul: "Kode indikator", lebar: 10 },
        { judul: "Jenis", lebar: 12 },
        { judul: "Uraian temuan", lebar: 60 },
        { judul: "Status", lebar: 14 },
        { judul: "Tenggat", jenis: "tanggal" },
        { judul: "Rencana perbaikan", lebar: 70 },
      ],
      baris: temuan.map((x) => [
        x.indikator_mutu?.kode ?? "Umum", x.jenis, x.uraian, STATUS_TEMUAN[x.status]?.label, x.tenggat,
        x.rencana_perbaikan.map((r) => `${r.kegiatan} (${r.status}${r.tenggat ? `, ${r.tenggat}` : ""})${r.hasil ? `: ${r.hasil}` : ""}`).join(" | "),
      ]),
    },
    lembarInfo("Paket laporan mutu", [
      ["Kerangka", `${kini.nama} — ${kini.kode} versi ${kini.versi}`],
      ["Periode", periode],
      ["Jumlah indikator", baris.length],
      ["Jumlah bukti", bukti.length],
      ["Jumlah temuan", temuan.length],
      ["Catatan", "Angka & penanda kelengkapan dihasilkan sistem untuk membantu pengumpulan bukti; bukan pernyataan kepatuhan. Penilaian mutu dilakukan tim & asesor."],
    ]),
  ]);
  await supabase.rpc("catat_aktivitas", { nama_tabel: "evaluasi_indikator", aksi: "EKSPOR", keterangan: { kerangka: kini.kode, versi: kini.versi, periode } });
  return kirimXlsx(isi, `paket-mutu-${kini.kode}-${periode.replace("/", "-")}`);
}
