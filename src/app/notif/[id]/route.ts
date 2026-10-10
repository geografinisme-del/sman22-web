import { NextResponse, type NextRequest } from "next/server";
import { getAkses } from "@/lib/admin/auth";

/** Buka notifikasi: tandai dibaca lalu menuju tautannya (hanya tautan internal) */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, akses } = await getAkses();
  if (!supabase || !akses) return NextResponse.redirect(new URL("/admin/login", req.url));
  if (!/^\d{1,18}$/.test(id)) return NextResponse.redirect(new URL("/admin/notifikasi", req.url));
  const { data } = await supabase.from("notifikasi").select("tautan").eq("id", id).maybeSingle();
  await supabase.rpc("tandai_dibaca", { p_id: Number(id) });
  const tujuan = data?.tautan && /^\/(?!\/)/.test(data.tautan) ? data.tautan : akses.peran.every((p) => p === "siswa" || p === "orang_tua") ? "/portal/notifikasi" : "/admin/notifikasi";
  return NextResponse.redirect(new URL(tujuan, req.url));
}
