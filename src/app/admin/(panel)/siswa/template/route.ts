import { KOLOM_SISWA, keCsv } from "@/lib/admin/induk";

export function GET() {
  const csv = keCsv(KOLOM_SISWA.map((k) => k.label), [KOLOM_SISWA.map((k) => k.contoh)]);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="template-impor-siswa.csv"',
    },
  });
}
