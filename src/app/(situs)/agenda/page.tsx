import type { Metadata } from "next";
import { CalendarPlus, Clock, MapPin } from "lucide-react";
import { Reveal } from "@/components/Reveal";
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
  const penting = listPengumuman.filter((p) => p.penting).length;

  return (
    <>
      <PageHeader judul="Agenda & Pengumuman" deskripsi="Jadwal kegiatan dan informasi resmi sekolah.">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-baseline gap-2 rounded-full bg-[#f3f0fc] px-4 py-2">
            <strong className="font-serif text-xl font-medium text-[var(--tema-utama)]">{listAgenda.length}</strong>
            <span className="text-xs text-[#5e6074]">agenda</span>
          </span>
          <span className="inline-flex items-baseline gap-2 rounded-full bg-[#f3f0fc] px-4 py-2">
            <strong className="font-serif text-xl font-medium text-[var(--tema-utama)]">{listPengumuman.length}</strong>
            <span className="text-xs text-[#5e6074]">pengumuman{penting ? ` · ${penting} penting` : ""}</span>
          </span>
          <a href="/kalender.ics" className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[var(--tema-utama)] ring-1 ring-[var(--tema-utama)]/25 transition hover:bg-[var(--tema-utama)] hover:text-white">
            <CalendarPlus size={16} aria-hidden /> Tambahkan ke kalender
          </a>
        </div>
      </PageHeader>

      <div className="lp-wadah grid items-start gap-8 py-10 sm:py-12 lg:grid-cols-[1fr_1.1fr]">
        <section aria-labelledby="judul-pengumuman">
          <Reveal>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--tema-utama)]">Informasi resmi</p>
            <h2 id="judul-pengumuman" className="mt-1 font-serif text-[clamp(1.8rem,3vw,2.5rem)] tracking-[-0.02em]">
              Pengumuman
            </h2>
          </Reveal>
          {listPengumuman.length === 0 ? (
            <div className="mt-5">
              <Kosong teks="Belum ada pengumuman." />
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {listPengumuman.map((p, i) => (
                <Reveal
                  as="li"
                  key={p.id}
                  delay={Math.min(i, 5) * 90}
                  className={`kartu kartu-hidup relative overflow-hidden p-5 ${p.penting ? "border-[#e3ab2a]/60 bg-[#fffaf0]" : ""}`}
                >
                  {p.penting && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-[#e3ab2a]" />}
                  <p className="flex items-center gap-2 text-xs text-[#646c7a]">
                    {p.penting && <span className="rounded-full bg-[#f2c14e] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#121831]">Penting</span>}
                    <time dateTime={p.tanggal}>{formatTanggal(p.tanggal)}</time>
                  </p>
                  <h3 className="mt-2 font-serif text-[1.35rem] leading-tight">{p.judul}</h3>
                  {p.isi && <p className="mt-2 whitespace-pre-line text-[15px] text-[#4f5763]">{p.isi}</p>}
                </Reveal>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="judul-agenda" className="lg:sticky lg:top-24">
          <Reveal>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--tema-utama)]">Kalender kegiatan</p>
            <h2 id="judul-agenda" className="mt-1 font-serif text-[clamp(1.8rem,3vw,2.5rem)] tracking-[-0.02em]">
              Agenda <em className="text-[#544881]">mendatang</em>
            </h2>
          </Reveal>
          {listAgenda.length === 0 ? (
            <div className="mt-5">
              <Kosong teks="Belum ada agenda." />
            </div>
          ) : (
            <div className="mt-5 space-y-6">
              {[...perBulan].map(([bulan, isi]) => (
                <div key={bulan}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#73698f]">{bulan}</p>
                  <ul className="space-y-2">
                    {isi.map((a, i) => (
                      <Reveal as="li" key={a.id} delay={Math.min(i, 5) * 80} className="kartu kartu-hidup group flex items-center gap-4 p-3 pr-5">
                        <time dateTime={a.tanggal} className="grid h-16 w-16 shrink-0 place-content-center rounded-xl bg-[var(--tema-utama)] text-center text-white transition group-hover:bg-[#51419c]">
                          <span className="font-serif text-2xl leading-none">{formatTanggal(a.tanggal, { day: "numeric", month: undefined, year: undefined })}</span>
                          <span className="mt-1 text-[10px] uppercase tracking-wider text-white/75">{formatTanggal(a.tanggal, { day: undefined, weekday: "short", month: undefined, year: undefined })}</span>
                        </time>
                        <div className="min-w-0">
                          <p className="font-semibold leading-snug">{a.judul}</p>
                          {(a.waktu || a.tempat) && (
                            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#626a76]">
                              {a.waktu && (
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock size={13} aria-hidden /> {a.waktu}
                                </span>
                              )}
                              {a.tempat && (
                                <span className="inline-flex items-center gap-1.5">
                                  <MapPin size={13} aria-hidden /> {a.tempat}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </Reveal>
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
