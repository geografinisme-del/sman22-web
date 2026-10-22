import type { NextRequest } from "next/server";
import { aksesAksi } from "@/lib/admin/auth";
import { KOLOM_SISWA } from "@/lib/admin/induk";
import { kirimTemplate } from "@/lib/admin/template-impor";

/** Template impor siswa (.xlsx atau ?format=csv). Daftar pilihan Kelas = kelas tahun ajaran aktif. */
export async function GET(req: NextRequest) {
  const ctx = await aksesAksi();
  let kelas: string[] = [];
  if (ctx) {
    const { data } = await ctx.supabase
      .from("kelas")
      .select("nama, tahun_ajaran!inner(aktif)")
      .eq("tahun_ajaran.aktif", true)
      .is("deleted_at", null)
      .order("tingkat")
      .order("nama");
    kelas = (data ?? []).map((k) => k.nama as string);
  }
  return kirimTemplate(KOLOM_SISWA, "siswa", req.nextUrl.searchParams.get("format"), kelas);
}
