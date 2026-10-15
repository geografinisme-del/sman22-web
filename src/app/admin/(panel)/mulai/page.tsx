import { redirect } from "next/navigation";
import { wajibLogin } from "@/lib/admin/auth";
import { tujuanAwal } from "@/lib/ruang-kerja";

export const dynamic = "force-dynamic";

/**
 * Titik awal setelah masuk/MFA: satu penugasan → langsung ke ruang kerjanya, selain itu Ringkasan.
 * Berada di dalam layout panel sehingga pemeriksaan MFA & akses tetap berjalan lebih dulu.
 */
export default async function Mulai() {
  const { akses } = await wajibLogin();
  redirect(tujuanAwal(akses));
}
