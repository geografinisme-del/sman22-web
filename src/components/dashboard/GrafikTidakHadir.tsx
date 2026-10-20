/**
 * Kolom harian "% siswa tidak hadir (S/I/A)". Satu seri → tanpa legenda (judul menamai),
 * kolom ≤24px dengan ujung membulat 4px di atas, garis dasar 0, label hanya pada hari terakhir,
 * tooltip saat disorot/difokus, dan tabel untuk pembaca layar.
 */
export type TitikHarian = { tanggal: string; label: string; persen: number; tidakHadir: number; total: number };

export function GrafikTidakHadir({ data }: { data: TitikHarian[] }) {
  if (!data.length) return <p className="text-sm text-black/50">Belum ada data hari sekolah.</p>;
  const maks = Math.max(10, Math.ceil(Math.max(...data.map((d) => d.persen)) / 5) * 5);
  const ticks = [0, maks / 2, maks];
  const tinggi = 140;
  return (
    <figure>
      <figcaption className="mb-3 text-sm font-semibold">Siswa tidak hadir (sakit, izin, alpa) per hari</figcaption>
      <div className="flex gap-2">
        <div className="relative w-8 shrink-0 text-right text-[11px] tabular-nums text-black/50" style={{ height: tinggi }} aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: tinggi - (t / maks) * tinggi }}>{t}%</span>
          ))}
        </div>
        <div className="relative flex-1">
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-black/10" style={{ top: tinggi - (t / maks) * tinggi }} aria-hidden />
          ))}
          <ol className="relative flex items-end justify-around gap-0.5" style={{ height: tinggi }} aria-hidden>
            {data.map((d, i) => {
              const h = Math.max(2, (d.persen / maks) * tinggi);
              const akhir = i === data.length - 1;
              return (
                <li key={d.tanggal} tabIndex={0} className="group relative flex h-full flex-1 items-end justify-center outline-none">
                  <span className="block w-full max-w-6 rounded-t transition-opacity group-hover:opacity-80 group-focus:opacity-80" style={{ height: h, backgroundColor: "var(--muted)" }} />
                  {akhir && <span className="absolute text-[11px] font-semibold tabular-nums text-black/70" style={{ bottom: h + 4 }}>{d.persen.toFixed(1)}%</span>}
                  <span className="pointer-events-none absolute z-10 hidden w-max rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block group-focus:block" style={{ bottom: h + 22 }}>
                    {d.label}: <strong>{d.persen.toFixed(1)}%</strong> ({d.tidakHadir} dari {d.total})
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="mt-1 flex justify-around gap-0.5 text-[10px] text-black/50" aria-hidden>
            {data.map((d) => <span key={d.tanggal} className="flex-1 text-center">{d.label.split(" ")[0]}</span>)}
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>Persentase siswa tidak hadir per hari</caption>
        <thead><tr><th>Tanggal</th><th>Tidak hadir</th><th>Persen</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.tanggal}><td>{d.label}</td><td>{d.tidakHadir} dari {d.total}</td><td>{d.persen.toFixed(1)}%</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
