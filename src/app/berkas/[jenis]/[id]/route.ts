import { createHash } from "node:crypto";
import { adaCookiePratinjau } from "@/lib/pratinjau";
import { PESAN_PRATINJAU } from "@/lib/pratinjau-umum";
import { NextResponse, type NextRequest } from "next/server";
import { getAkses } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { kunciAdminTersedia, supabaseAdminStorage } from "@/lib/supabase/admin";

/**
 * Membuka berkas privat (bukti / swafoto). Hak akses diperiksa dengan MEMBACA catatannya
 * memakai sesi pengguna (tunduk RLS). Bila catatan terbaca, dibuat tautan sementara 60 detik.
 */
const SUMBER = {
  koreksi: { tabel: "pengajuan_koreksi", kolom: "bukti_path", bucket: "bukti" },
  "izin-ortu": { tabel: "izin_ortu", kolom: "bukti_path", bucket: "bukti" },
  "izin-pegawai": { tabel: "pengajuan_izin_pegawai", kolom: "bukti_path", bucket: "bukti" },
  pelanggaran: { tabel: "pelanggaran_siswa", kolom: "bukti_path", bucket: "bukti" },
  prestasi: { tabel: "prestasi_siswa", kolom: "bukti_path", bucket: "bukti" },
  "swafoto-masuk": { tabel: "absensi_pegawai", kolom: "foto_masuk", bucket: "presensi" },
  "swafoto-pulang": { tabel: "absensi_pegawai", kolom: "foto_pulang", bucket: "presensi" },
  perangkat: { tabel: "perangkat_ajar", kolom: "berkas_path", bucket: "perangkat" },
  tugas: { tabel: "pengumpulan_tugas", kolom: "berkas_path", bucket: "tugas" },
  kerusakan: { tabel: "laporan_kerusakan", kolom: "foto_path", bucket: "sarpras" },
  barang: { tabel: "barang", kolom: "foto_path", bucket: "sarpras" },
} as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ jenis: string; id: string }> }) {
  // "Lihat sebagai…": unduhan berkas privat memakai kunci service-role (melewati RLS) → selalu ditolak saat pratinjau
  if (await adaCookiePratinjau()) return new NextResponse(PESAN_PRATINJAU, { status: 403 });
  const { jenis, id } = await params;
  if (jenis === "mutu") return bukaBuktiMutu(req, id);
  const s = SUMBER[jenis as keyof typeof SUMBER];
  if (!s || !uuid.safeParse(id).success) return new NextResponse("Tidak ditemukan", { status: 404 });
  const { supabase, akses } = await getAkses();
  if (!supabase || !akses) return NextResponse.redirect(new URL("/admin/login", req.url));
  const { data } = await supabase.from(s.tabel).select(s.kolom).eq("id", id).maybeSingle();
  const path = (data as Record<string, string> | null)?.[s.kolom];
  if (!path) return new NextResponse("Berkas tidak ditemukan atau Anda tidak berhak melihatnya", { status: 404 });
  if (!kunciAdminTersedia) return new NextResponse("Kunci rahasia Supabase belum diatur di server", { status: 503 });
  const { data: url, error } = await supabaseAdminStorage().from(s.bucket).createSignedUrl(path, 60);
  if (error || !url) return new NextResponse("Gagal membuka berkas", { status: 500 });
  await supabase.rpc("catat_aktivitas", { nama_tabel: s.tabel, aksi: "LIHAT", keterangan: { berkas: jenis, id } });
  return NextResponse.redirect(url.signedUrl, { headers: { "Cache-Control": "no-store" } });
}

/** Bukti mutu: periksa integritas (SHA-256 saat diunggah vs isi sekarang) dan catat setiap akses */
async function bukaBuktiMutu(req: NextRequest, id: string) {
  if (!uuid.safeParse(id).success) return new NextResponse("Tidak ditemukan", { status: 404 });
  const { supabase, akses } = await getAkses();
  if (!supabase || !akses) return NextResponse.redirect(new URL("/admin/login", req.url));
  const { data } = await supabase.from("bukti_mutu").select("berkas_path, hash_sha256").eq("id", id).maybeSingle();
  if (!data?.berkas_path) return new NextResponse("Berkas tidak ditemukan atau Anda tidak berhak melihatnya", { status: 404 });
  if (!kunciAdminTersedia) return new NextResponse("Kunci rahasia Supabase belum diatur di server", { status: 503 });
  const st = supabaseAdminStorage().from("mutu");
  const { data: isi, error } = await st.download(data.berkas_path);
  if (error || !isi) return new NextResponse("Gagal membuka berkas", { status: 500 });
  const hash = createHash("sha256").update(Buffer.from(await isi.arrayBuffer())).digest("hex");
  const ok = hash === data.hash_sha256;
  await supabase.rpc("catat_akses_bukti", { p_id: id, p_ok: ok });
  if (!ok) return new NextResponse("Peringatan: isi berkas tidak sama dengan saat diunggah (hash SHA-256 berbeda). Laporkan ke tim penjaminan mutu.", { status: 409 });
  const { data: url } = await st.createSignedUrl(data.berkas_path, 60);
  if (!url) return new NextResponse("Gagal membuka berkas", { status: 500 });
  return NextResponse.redirect(url.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
