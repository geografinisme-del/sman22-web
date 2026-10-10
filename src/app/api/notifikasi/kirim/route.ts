import { NextResponse, type NextRequest } from "next/server";
import { prosesAntrian } from "@/lib/notif/kirim";
import { kunciAdminTersedia, supabaseLayanan } from "@/lib/supabase/admin";

/** Dipanggil penjadwal (Vercel Cron / cron-job.org) dengan header Authorization: Bearer <CRON_SECRET> */
export async function GET(req: NextRequest) {
  const rahasia = process.env.CRON_SECRET;
  if (!rahasia || req.headers.get("authorization") !== `Bearer ${rahasia}`) return new NextResponse("Tidak berhak", { status: 401 });
  // pengingat tenggat tugas (sekali per tugas per siswa) — dibuat sebelum antrian diproses
  if (kunciAdminTersedia) {
    for (const fn of ["pengingat_tugas", "pengingat_perpus", "rapikan_reservasi", "pengingat_kemitraan", "pengingat_bk", "musnahkan_retensi_bk", "pengingat_mutu"]) {
      const { error } = await supabaseLayanan().rpc(fn);
      if (error) console.error(`[cron] ${fn}:`, error.message);
    }
  }
  const hasil = await prosesAntrian(50);
  return NextResponse.json(hasil, { headers: { "Cache-Control": "no-store" } });
}
