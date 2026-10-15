import type { Metadata } from "next";
import { Kosong, PageHeader } from "@/components/ui";
import { getAgenda, getPengumuman } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

export const metadata: Metadata = { title: "Agenda & Pengumuman" };

export default async function HalamanAgenda() {
  const [listAgenda, listPengumuman] = await Promise.all([getAgenda(), getPengumuman()]);
  // kelompokkan agenda per bulan
  const perBulan = new Map<string, typeof listAgenda>();
  for (const a of listAgenda) {
    const kunci = formatTanggal(a.tanggal, { day: undefined, month: "long", year: "numeric" });
    perBulan.set(kunci, [...(perBulan.get(kunci) ?? []), a]);
  }
  const urutPengumuman = [...listPengumuman].sort((a, b) => Number(b.prioritas || b.penting) - Number(a.prioritas || a.penting));

  return (
    <>
      <PageHeader judul="Agenda & Pengumuman" deskripsi="Jadwal kegiatan dan informasi resmi sekolah.">
        <a href="/kalender.ics" className="tautan">
          Tambahkan kalender sekolah ke aplikasi kalender Anda
        </a>
      </PageHeader>

      <div className="lp-wadah grid items-start gap-10 py-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section aria-labelledby="judul-pengumuman">
          <h2 id="judul-pengumuman">Pengumuman</h2>
          {urutPengumuman.length === 0 ? (
            <div className="mt-4">
              <Kosong teks="Belum ada pengumuman." />
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {urutPengumuman.map((p) => (
                <li key={p.id} id={`pengumuman-${p.id}`} className={`target-sorot scroll-mt-24 ${p.penting || p.prioritas ? "blok-pengumuman" : "kartu p-5"}`}>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-[#5b6270]">
                    {(p.penting || p.prioritas) && <span className="label-status">Penting</span>}
                    <time dateTime={p.tanggal}>{formatTanggal(p.tanggal)}</time>
                  </p>
                  <h3 className="mt-1">{p.judul}</h3>
                  {p.isi && <p className="mt-1 whitespace-pre-line text-[#3b414b]">{p.isi}</p>}
                  {p.poster && (
                    <a href={p.poster.url} target="_blank" rel="noopener noreferrer" className="mt-3 block max-w-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element -- poster utuh dari CMS */}
                      <img src={p.poster.url} alt={p.poster.alt} loading="lazy" className="max-h-[420px] w-full rounded-lg border border-[#e5e1da] bg-[#faf8f5] object-contain" />
                      <span className="sr-only">(buka poster ukuran penuh di tab baru)</span>
                    </a>
                  )}
                  {p.tautan && (
                    <a href={p.tautan.url} className="btn btn-primary mt-3" {...(p.tautan.url.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                      {p.tautan.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="judul-agenda">
          <h2 id="judul-agenda">Agenda kegiatan</h2>
          {listAgenda.length === 0 ? (
            <div className="mt-4">
              <Kosong teks="Belum ada agenda terjadwal." />
            </div>
          ) : (
            <div className="mt-4 space-y-6">
              {[...perBulan].map(([bulan, isi]) => (
                <div key={bulan}>
                  <h3 className="text-base text-[#5b6270]">{bulan}</h3>
                  <ul className="mt-2 divide-y divide-[#e5e1da] border-y border-[#e5e1da]">
                    {isi.map((a) => (
                      <li key={a.id} className="flex gap-4 py-3">
                        <time dateTime={a.tanggal} className="w-16 shrink-0">
                          <span className="block text-[1.5rem] font-bold leading-none tabular-nums">{formatTanggal(a.tanggal, { day: "numeric", month: undefined, year: undefined })}</span>
                          <span className="text-sm text-[#5b6270]">{formatTanggal(a.tanggal, { day: undefined, weekday: "long", month: undefined, year: undefined })}</span>
                        </time>
                        <div className="min-w-0">
                          <p className="font-semibold">{a.judul}</p>
                          {(a.waktu || a.tempat) && <p className="text-[0.9375rem] text-[#5b6270]">{[a.waktu, a.tempat].filter(Boolean).join(" · ")}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
