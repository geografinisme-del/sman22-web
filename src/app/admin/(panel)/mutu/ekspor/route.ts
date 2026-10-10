import writeXlsxFile from "write-excel-file/node";
import { NextResponse, type NextRequest } from "next/server";
import { getAkses } from "@/lib/admin/auth";
import { pilihKerangka, type BarisAnalisis } from "@/lib/admin/mutu-data";
import { CELAH, PERSETUJUAN, STATUS_CAPAIAN, STATUS_TEMUAN, SUMBER_MODUL } from "@/lib/mutu";

const tebal = (v: string) => ({ value: v, fontWeight: "bold" as const, backgroundColor: "#EEF0F7" });
const t = (v: unknown) => ({ value: v == null ? "" : String(v) });

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
  const s1 = [["Standar", "Kode", "Indikator", "Pemilik", "Target", "Capaian", "Skor", "Status", "Persetujuan", "Disetujui pada", "Jumlah bukti", "Temuan terbuka", "Penanda kelengkapan", "Evaluasi diri"].map(tebal),
    ...baris.map((b) => [t(`${b.standar_kode}. ${b.standar}`), t(b.kode), t(b.nama), t(b.pemilik), t(b.target), t(b.capaian), b.skor ? { value: b.skor, type: Number } : t(""),
      t(STATUS_CAPAIAN[b.status]?.label), t(PERSETUJUAN[b.persetujuan]?.label), t(evMap.get(b.indikator_id)?.disetujui_pada?.slice(0, 10)), { value: b.jumlah_bukti, type: Number },
      { value: b.temuan_terbuka, type: Number }, t(b.celah.map((c) => CELAH[c]).join("; ")), t(evMap.get(b.indikator_id)?.evaluasi_diri)])];
  type BK = { periode: string; indikator_mutu: { kode: string }; bukti_mutu: { judul: string; jenis: string; tautan: string; sumber_modul: string; sumber_ref: string; nama_berkas: string; hash_sha256: string; versi: number; tanggal_dokumen: string | null; created_at: string; digantikan: boolean } };
  const s2 = [["Indikator", "Judul bukti", "Jenis", "Versi", "Masih berlaku", "Sumber / tautan", "Nama berkas", "SHA-256", "Tanggal dokumen", "Diunggah"].map(tebal),
    ...((bk ?? []) as unknown as BK[]).map((x) => { const b = x.bukti_mutu; return [t(x.indikator_mutu.kode), t(b.judul), t(b.jenis), { value: b.versi, type: Number }, t(b.digantikan ? "tidak" : "ya"),
      t(b.jenis === "tautan" ? b.tautan : b.jenis === "modul" ? `${SUMBER_MODUL[b.sumber_modul]?.label ?? b.sumber_modul}: ${situs}${SUMBER_MODUL[b.sumber_modul]?.url(b.sumber_ref) ?? ""}` : "berkas di sistem"),
      t(b.nama_berkas), t(b.hash_sha256), t(b.tanggal_dokumen), t(b.created_at.slice(0, 10))]; })];
  type TM = { jenis: string; uraian: string; status: string; tenggat: string | null; indikator_mutu: { kode: string } | null; rencana_perbaikan: { kegiatan: string; status: string; tenggat: string | null; hasil: string }[] };
  const s3 = [["Indikator", "Jenis", "Uraian temuan", "Status", "Tenggat", "Rencana perbaikan"].map(tebal),
    ...((tm ?? []) as unknown as TM[]).map((x) => [t(x.indikator_mutu?.kode ?? "umum"), t(x.jenis), t(x.uraian), t(STATUS_TEMUAN[x.status]?.label), t(x.tenggat),
      t(x.rencana_perbaikan.map((r) => `${r.kegiatan} (${r.status}${r.tenggat ? `, ${r.tenggat}` : ""})${r.hasil ? `: ${r.hasil}` : ""}`).join(" | "))])];
  const s0 = [[tebal("Paket laporan mutu")], [t(`${kini.nama} — ${kini.kode} versi ${kini.versi}`)], [t(`Periode: ${periode}`)], [t(`Diunduh: ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`)],
    [t("Catatan: angka & penanda kelengkapan dihasilkan sistem untuk membantu pengumpulan bukti; bukan pernyataan kepatuhan. Penilaian mutu dilakukan tim & asesor.")]];
  const buffer = await writeXlsxFile([s0, s1, s2, s3] as never, {
    sheets: ["Ringkasan", "Indikator", "Bukti", "Temuan"], buffer: true,
    columns: [[{ width: 90 }], [{ width: 28 }, { width: 8 }, { width: 50 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 6 }, { width: 14 }, { width: 16 }, { width: 12 }, { width: 8 }, { width: 8 }, { width: 40 }, { width: 60 }],
      [{ width: 10 }, { width: 40 }, { width: 8 }, { width: 6 }, { width: 8 }, { width: 50 }, { width: 25 }, { width: 66 }, { width: 12 }, { width: 12 }], [{ width: 10 }, { width: 12 }, { width: 60 }, { width: 14 }, { width: 12 }, { width: 70 }]],
  } as never);
  await supabase.rpc("catat_aktivitas", { nama_tabel: "evaluasi_indikator", aksi: "EKSPOR", keterangan: { kerangka: kini.kode, versi: kini.versi, periode } });
  return new NextResponse(new Uint8Array(buffer as unknown as ArrayBuffer), {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="paket-mutu-${kini.kode}-${periode.replace("/", "-")}.xlsx"`, "Cache-Control": "no-store" },
  });
}
