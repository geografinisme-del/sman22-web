import type { NextRequest } from "next/server";
import { KOLOM_SISWA } from "@/lib/admin/induk";
import { kirimTemplate } from "@/lib/admin/template-impor";

export function GET(req: NextRequest) {
  return kirimTemplate(KOLOM_SISWA, "siswa", req.nextUrl.searchParams.get("format"));
}
