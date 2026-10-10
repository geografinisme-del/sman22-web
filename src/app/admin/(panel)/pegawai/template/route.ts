import { KOLOM_PEGAWAI, keCsv } from "@/lib/admin/induk";

export function GET() {
  return new Response(keCsv(KOLOM_PEGAWAI.map((k) => k.label), [KOLOM_PEGAWAI.map((k) => k.contoh)]), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="template-impor-pegawai.csv"' },
  });
}
