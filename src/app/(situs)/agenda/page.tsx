import type { Metadata } from "next";
import { Kosong, PageHeader, Section } from "@/components/ui";
import { getAgenda, getPengumuman } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

export const metadata: Metadata = { title: "Agenda & Pengumuman" };

export default async function HalamanAgenda() {
  const [listAgenda, listPengumuman] = await Promise.all([getAgenda(), getPengumuman()]);

  return (
    <>
      <PageHeader judul="Agenda & Pengumuman" deskripsi="Jadwal kegiatan dan informasi resmi sekolah." />

      <Section judul="Pengumuman">
        {listPengumuman.length === 0 ? (
          <Kosong teks="Belum ada pengumuman." />
        ) : (
          <ul className="space-y-4">
            {listPengumuman.map((p) => (
              <li
                key={p.id}
                className={`rounded-2xl bg-white p-5 ring-1 ${p.penting ? "ring-accent-500" : "ring-black/5"}`}
              >
                <p className="text-xs uppercase tracking-[0.2em] text-black/50">{formatTanggal(p.tanggal)}</p>
                <h3 className="mt-1 font-serif text-2xl">
                  {p.penting && <span className="mr-2 rounded bg-accent-400 px-2 py-0.5 text-xs text-brand-900">PENTING</span>}
                  {p.judul}
                </h3>
                {p.isi && <p className="mt-2 whitespace-pre-line text-black/70">{p.isi}</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section judul="Agenda Kegiatan" className="!pt-0">
        {listAgenda.length === 0 ? (
          <Kosong teks="Belum ada agenda." />
        ) : (
          <ul className="divide-y divide-black/10 overflow-hidden rounded-2xl bg-white ">
            {listAgenda.map((a) => (
              <li key={a.id} className="grid gap-1 p-4 sm:grid-cols-[220px_1fr]">
                <time dateTime={a.tanggal} className="font-serif text-xl text-merah">
                  {formatTanggal(a.tanggal, { weekday: "long" })}
                </time>
                <div>
                  <p className="font-semibold">{a.judul}</p>
                  {(a.waktu || a.tempat) && (
                    <p className="text-sm text-black/60">{[a.waktu, a.tempat].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
