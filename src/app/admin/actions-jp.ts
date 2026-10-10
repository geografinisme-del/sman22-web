"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { z } from "zod";
import { aksesAksi } from "@/lib/admin/auth";
import { tanggalValid } from "@/lib/admin/absensi";
import type { HasilAksi } from "./actions";

const uuid = z.string().uuid();
const STATUS = ["S", "I", "A", "T", "D"] as const;

export async function simpanAbsensiJp(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi();
  if (!ctx) return { ok: false, pesan: "Sesi berakhir. Silakan masuk ulang." };
  const jadwal = uuid.safeParse(String(form.get("jadwal_id")));
  const tanggal = String(form.get("tanggal") ?? "");
  if (!jadwal.success || !tanggalValid(tanggal)) return { ok: false, pesan: "Data tidak valid. Muat ulang halaman." };
  const isi: { siswa_id: string; status: string; keterangan: string }[] = [];
  for (const [k, v] of form.entries()) {
    if (!k.startsWith("st_")) continue;
    const sid = k.slice(3);
    const st = String(v);
    if (!uuid.safeParse(sid).success) continue;
    if ((STATUS as readonly string[]).includes(st)) isi.push({ siswa_id: sid, status: st, keterangan: String(form.get(`ket_${sid}`) ?? "").slice(0, 200) });
  }
  const materi = String(form.get("materi") ?? "").trim().slice(0, 1000);
  const catatan = String(form.get("catatan") ?? "").trim().slice(0, 500);
  const { data, error } = await ctx.supabase.rpc("simpan_absensi_jp", { p_jadwal: jadwal.data, p_tgl: tanggal, p_isi: isi, p_materi: materi, p_catatan: catatan });
  if (error) {
    console.error("[jp]", error.code, error.message);
    return { ok: false, pesan: ["42501", "22023"].includes(error.code ?? "") ? error.message : "Gagal menyimpan. Coba lagi." };
  }
  revalidatePath("/admin/jadwal-saya");
  revalidatePath("/admin/absensi/jp");
  return { ok: true, pesan: `Tersimpan: ${data} siswa hadir, ${isi.length} catatan.${materi ? "" : " Jangan lupa isi materi/jurnal."}` };
}

/** QR berputar untuk satu JP. Hak akses diperiksa database (hanya pengajar jam ini). */
export async function buatQr(jadwalId: string): Promise<{ ok: true; svg: string; url: string } | { ok: false; pesan: string }> {
  const ctx = await aksesAksi();
  if (!ctx || !uuid.safeParse(jadwalId).success) return { ok: false, pesan: "Tidak berhak" };
  const { data: token, error } = await ctx.supabase.rpc("token_qr", { p_jadwal: jadwalId });
  if (error || !token) return { ok: false, pesan: error?.message ?? "Gagal membuat QR" };
  const h = await headers();
  const asal = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const url = `${asal}/portal/scan?t=${encodeURIComponent(token as string)}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  return { ok: true, svg, url };
}

export async function daftarScan(jadwalId: string, tanggal: string): Promise<Record<string, string>> {
  const ctx = await aksesAksi();
  if (!ctx || !uuid.safeParse(jadwalId).success || !tanggalValid(tanggal)) return {};
  const { data } = await ctx.supabase.from("scan_qr").select("siswa_id, waktu").eq("jadwal_id", jadwalId).eq("tanggal", tanggal);
  return Object.fromEntries((data ?? []).map((d) => [d.siswa_id, new Date(d.waktu).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" })]));
}

/** Dipanggil siswa dari portal setelah memindai QR */
export async function catatScan(token: string): Promise<HasilAksi> {
  const ctx = await aksesAksi();
  if (!ctx) return { ok: false, pesan: "Silakan masuk dengan akun siswa terlebih dahulu." };
  const { data, error } = await ctx.supabase.rpc("scan_qr", { p_token: token.slice(0, 120) });
  if (error) return { ok: false, pesan: ["42501", "22023"].includes(error.code ?? "") ? error.message : "Gagal mencatat. Coba pindai ulang." };
  const d = data as { baru: boolean; kelas: string; mapel: string; jp: number; waktu: string };
  return { ok: true, pesan: d.baru ? `Hadir tercatat pukul ${d.waktu} — ${d.mapel}, ${d.kelas} JP ${d.jp}.` : `Anda sudah tercatat sebelumnya di ${d.mapel} JP ${d.jp}.` };
}
