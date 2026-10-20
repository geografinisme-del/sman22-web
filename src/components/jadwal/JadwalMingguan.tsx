import { JENIS_JAM, jamPendek, namaHari, type Entri, type Jam } from "@/lib/admin/jadwal";

type Mode = "kelas" | "guru" | "ruang";

function baris2(e: Entri, mode: Mode) {
  if (mode === "kelas") return [e.guru ?? "Guru belum ditentukan", e.ruang].filter(Boolean).join(" · ");
  if (mode === "guru") return [e.kelas, e.ruang].filter(Boolean).join(" · ");
  return [e.kelas, e.guru].filter(Boolean).join(" · ");
}

/**
 * Jadwal satu minggu: tabel (layar lebar) dan daftar per hari (HP).
 * `catatan` = keterangan perubahan per jadwal_id (mis. guru pengganti hari ini).
 */
export function JadwalMingguan({
  jam,
  entri,
  mode,
  hariIni,
  catatan = {},
}: {
  jam: Jam[];
  entri: Entri[];
  mode: Mode;
  hariIni?: number;
  catatan?: Record<string, string>;
}) {
  const hariAda = [...new Set(jam.filter((j) => j.jenis === "pelajaran").map((j) => j.hari))].sort();
  if (!hariAda.length) return <p className="rounded-2xl bg-white p-6 text-black/60 ring-1 ring-black/5">Jam pelajaran belum diatur.</p>;
  const maksJp = Math.max(...jam.map((j) => j.jp_ke ?? 0));
  const peta = new Map(entri.map((e) => [`${e.hari}-${e.jp_ke}`, e]));
  const waktu = new Map(jam.filter((j) => j.jp_ke).map((j) => [`${j.hari}-${j.jp_ke}`, `${jamPendek(j.jam_mulai)}–${jamPendek(j.jam_selesai)}`]));
  const totalJp = entri.length;

  return (
    <>
      <p className="mb-3 text-sm text-black/50 print:hidden">{totalJp} JP per minggu</p>
      {/* Tabel: tablet & komputer, juga saat dicetak */}
      <div className="hidden overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5 md:block print:block print:ring-0">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-xs">
          <thead>
            <tr>
              <th className="w-14 border-b border-black/10 bg-soft px-2 py-2 text-center font-semibold text-black/50">JP</th>
              {hariAda.map((h) => (
                <th key={h} className={`border-b border-black/10 px-2 py-2 text-sm font-semibold ${h === hariIni ? "bg-ink text-white print:bg-soft print:text-black" : "bg-soft"}`}>
                  {namaHari(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maksJp }, (_, i) => i + 1).map((jp) => (
              <tr key={jp}>
                <td className="border-b border-r border-black/5 px-2 py-2 text-center text-lg text-black/40">{jp}</td>
                {hariAda.map((h) => {
                  const e = peta.get(`${h}-${jp}`);
                  const w = waktu.get(`${h}-${jp}`);
                  const c = e ? catatan[e.id] : undefined;
                  return (
                    <td key={h} className={`h-16 border-b border-r border-black/5 px-2 py-1.5 align-top ${!w ? "bg-black/[0.03]" : ""} ${c ? "bg-amber-50" : ""}`}>
                      {w && <p className="text-[10px] text-black/40">{w}</p>}
                      {e ? (
                        <>
                          <p className="font-semibold leading-tight" title={e.mapel}>{e.mapel}</p>
                          <p className="truncate text-black/60">{baris2(e, mode)}</p>
                          {c && <p className="mt-0.5 font-semibold text-amber-800">{c}</p>}
                        </>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Daftar per hari: HP */}
      <div className="space-y-4 md:hidden print:hidden">
        {hariAda.map((h) => (
          <details
            key={h}
            open={h === (hariAda.includes(hariIni ?? 0) ? hariIni : hariAda[0])}
            className={`group overflow-hidden rounded-2xl bg-white ring-1 ${h === hariIni ? "ring-2 ring-blue" : "ring-black/5"}`}
          >
            <summary className={`flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold ${h === hariIni ? "bg-ink text-white" : "bg-soft"}`}>
              <span>
                {namaHari(h)} {h === hariIni && <span className="text-xs font-normal">· hari ini</span>}
                <span className="ml-2 text-xs font-normal opacity-60">{entri.filter((e) => e.hari === h).length} JP</span>
              </span>
              <span aria-hidden className="transition group-open:rotate-180">▾</span>
            </summary>
            <ol className="divide-y divide-black/5">
              {jam
                .filter((j) => j.hari === h)
                .map((j) => {
                  const e = j.jp_ke ? peta.get(`${h}-${j.jp_ke}`) : undefined;
                  const c = e ? catatan[e.id] : undefined;
                  if (j.jenis !== "pelajaran")
                    return (
                      <li key={j.urutan} className="flex gap-3 bg-black/[0.02] px-4 py-1.5 text-xs text-black/50">
                        <span className="w-24 shrink-0">{jamPendek(j.jam_mulai)}–{jamPendek(j.jam_selesai)}</span>
                        <span>{j.label || JENIS_JAM[j.jenis]}</span>
                      </li>
                    );
                  return (
                    <li key={j.urutan} className={`flex gap-3 px-4 py-2.5 ${c ? "bg-amber-50" : ""}`}>
                      <span className="w-24 shrink-0 text-xs text-black/50">
                        JP {j.jp_ke}
                        <br />
                        {jamPendek(j.jam_mulai)}–{jamPendek(j.jam_selesai)}
                      </span>
                      {e ? (
                        <span className="min-w-0 text-sm">
                          <span className="block font-semibold">{e.mapel}</span>
                          <span className="block text-black/60">{baris2(e, mode)}</span>
                          {c && <span className="block font-semibold text-amber-800">{c}</span>}
                        </span>
                      ) : (
                        <span className="text-sm text-black/30">—</span>
                      )}
                    </li>
                  );
                })}
            </ol>
          </details>
        ))}
      </div>
    </>
  );
}

/** Satu hari, semua kelas: baris = JP, kolom = kelas */
export function JadwalSatuHari({ jam, entri, kelas, catatan = {} }: { jam: Jam[]; entri: Entri[]; kelas: { id: string; nama: string }[]; catatan?: Record<string, string> }) {
  const slot = jam.filter((j) => j.jp_ke);
  if (!slot.length) return <p className="rounded-2xl bg-white p-6 text-black/60 ring-1 ring-black/5">Tidak ada jam pelajaran pada hari ini.</p>;
  const peta = new Map(entri.map((e) => [`${e.kelas_id}-${e.jp_ke}`, e]));
  return (
    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5 print:ring-0">
      <table className="border-collapse text-left text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-20 border-b border-black/10 bg-soft px-2 py-2">JP</th>
            {kelas.map((k) => (
              <th key={k.id} className="min-w-28 border-b border-black/10 bg-soft px-2 py-2 text-sm font-semibold">{k.nama}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slot.map((j) => (
            <tr key={j.jp_ke}>
              <td className="sticky left-0 z-10 border-b border-r border-black/5 bg-white px-2 py-1.5">
                <span className="text-lg text-black/40">{j.jp_ke}</span>
                <span className="block text-[10px] text-black/40">{jamPendek(j.jam_mulai)}</span>
              </td>
              {kelas.map((k) => {
                const e = peta.get(`${k.id}-${j.jp_ke}`);
                const c = e ? catatan[e.id] : undefined;
                return (
                  <td key={k.id} className={`border-b border-r border-black/5 px-2 py-1.5 align-top ${c ? "bg-amber-50" : ""}`}>
                    {e && (
                      <>
                        <p className="font-semibold leading-tight">{e.kode_mapel || e.mapel}</p>
                        <p className="max-w-36 truncate text-black/60">{e.guru ?? "—"}</p>
                        {c && <p className="font-semibold text-amber-800">{c}</p>}
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
