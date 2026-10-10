import { supabasePublik } from "@/lib/supabase/public";
import { supabaseAktif } from "@/lib/supabase/config";
import { sekolah } from "@/content/sekolah";

/** Kalender kegiatan UMUM sekolah dalam format iCal — bisa dilanggan dari Google Calendar / kalender HP */
export const revalidate = 3600;

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** lipat baris > 75 oktet sesuai RFC 5545 */
function lipat(baris: string) {
  const out: string[] = [];
  let sisa = baris;
  while (Buffer.byteLength(sisa) > 75) {
    let n = 75;
    while (Buffer.byteLength(sisa.slice(0, n)) > 75) n--;
    out.push(sisa.slice(0, n));
    sisa = " " + sisa.slice(n);
  }
  out.push(sisa);
  return out.join("\r\n");
}
const tglIcs = (t: string) => t.replace(/-/g, "");
function besok(t: string) {
  const d = new Date(t + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
/** tanggal + jam WIB → UTC (YYYYMMDDTHHMMSSZ) */
const utc = (t: string, jam: string) => new Date(`${t}T${jam.slice(0, 5)}:00+07:00`).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export async function GET() {
  const baris = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SMAN 22 Bandung//Kalender Sekolah//ID", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(`Kalender ${sekolah.namaPendek}`)}`, "X-WR-TIMEZONE:Asia/Jakarta"];
  if (supabaseAktif) {
    const batas = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
    const { data } = await supabasePublik()
      .from("kegiatan_kalender")
      .select("id, judul, jenis, mulai, selesai, jam_mulai, jam_selesai, lokasi, keterangan, updated_at")
      .is("deleted_at", null)
      .eq("sasaran", "umum")
      .gte("selesai", batas)
      .order("mulai")
      .limit(500);
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    for (const k of data ?? []) {
      baris.push("BEGIN:VEVENT", `UID:${k.id}@sman22bdg`, `DTSTAMP:${stamp}`);
      if (k.jam_mulai && k.mulai === k.selesai) {
        baris.push(`DTSTART:${utc(k.mulai, k.jam_mulai)}`, `DTEND:${utc(k.mulai, k.jam_selesai ?? k.jam_mulai)}`);
      } else {
        baris.push(`DTSTART;VALUE=DATE:${tglIcs(k.mulai)}`, `DTEND;VALUE=DATE:${tglIcs(besok(k.selesai))}`);
      }
      baris.push(`SUMMARY:${esc(k.judul)}`, `CATEGORIES:${esc(k.jenis)}`);
      if (k.lokasi) baris.push(`LOCATION:${esc(k.lokasi)}`);
      if (k.keterangan) baris.push(`DESCRIPTION:${esc(k.keterangan)}`);
      baris.push("END:VEVENT");
    }
  }
  baris.push("END:VCALENDAR");
  return new Response(baris.map(lipat).join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="kalender-sman22.ics"' },
  });
}
