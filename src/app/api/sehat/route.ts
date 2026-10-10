import { NextResponse } from "next/server";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabasePublik } from "@/lib/supabase/public";

/** Pemeriksaan kesehatan sederhana (untuk pemantauan uptime) */
export const dynamic = "force-dynamic";
export async function GET() {
  const mulai = Date.now();
  let db = "tidak tersambung";
  if (supabaseAktif) {
    const { error } = await supabasePublik().from("pengaturan_situs").select("id").limit(1);
    db = error ? "galat" : "ok";
  }
  const ok = !supabaseAktif || db === "ok";
  return NextResponse.json({ status: ok ? "ok" : "galat", database: db, ms: Date.now() - mulai }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
