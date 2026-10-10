export function formatTanggal(iso: string, opsi?: Intl.DateTimeFormatOptions) {
  const d = new Date(`${iso}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
    ...opsi,
  }).format(d);
}

export function urutTerbaru<T extends { tanggal: string }>(list: T[]) {
  return [...list].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
}

export function urutTerdekat<T extends { tanggal: string }>(list: T[]) {
  return [...list].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

export const isPlaceholder = (s: string) => s.startsWith("[ISI");

/** timestamptz → nilai input datetime-local dalam WIB ("YYYY-MM-DDTHH:MM"), kosong bila null */
export function keInputWaktu(iso?: string | null) {
  if (!iso) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** timestamptz → "Senin, 12 Okt 2026 07.30 WIB" */
export function formatWaktu(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " WIB";
}
