import type { NextRequest } from "next/server";
import { KOLOM_PEGAWAI } from "@/lib/admin/induk";
import { kirimTemplate } from "@/lib/admin/template-impor";

export function GET(req: NextRequest) {
  return kirimTemplate(KOLOM_PEGAWAI, "pegawai", req.nextUrl.searchParams.get("format"));
}
