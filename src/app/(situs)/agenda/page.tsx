import type { Metadata } from "next";
import Link from "next/link";
import { TanggalBesar } from "@/components/langit/Bagian";
import { Kosong, PageHeader, Section } from "@/components/ui";
import { getAgenda } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

export const metadata: Metadata = { title: "Agenda", description: "Jadwal kegiatan SMA Negeri 22 Bandung." };

export default async function HalamanAgenda() {
  const agenda = await getAgenda();
  // kelompokkan agenda per bulan
  const perBulan = new Map<string, typeof agenda>();
  for (const a of agenda) {
    const kunci = formatTanggal(a.tanggal, { day: undefined, month: "long", year: "numeric" });
    perBulan.set(kunci, [...(perBulan.get(kunci) ?? []), a]);
  }

  return (
    <>
      <PageHeader judul="Agenda kegiatan" label="Kabar & agenda" deskripsi="Jadwal kegiatan sekolah yang terbuka untuk umum.">
        <a href="/kalender.ics" className="lgt-pil-tombol lgt-pil-lime">
          Tambahkan ke aplikasi kalender
        </a>
        <Link href="/pembelajaran/kalender">Kalender akademik →</Link>
      </PageHeader>
      <Section>
        {agenda.length === 0 ? (
          <Kosong teks="Belum ada agenda terjadwal." sub="Lihat juga kalender akademik sekolah." />
        ) : (
          <div className="grid max-w-[860px] gap-10">
            {[...perBulan].map(([bulan, isi]) => (
              <section key={bulan} aria-label={bulan}>
                <h2 className="label-mono lgt-label-titik">{bulan}</h2>
                <ul className="lgt-daftar-tgl mt-4">
                  {isi.map((a) => (
                    <li key={a.id}>
                      <TanggalBesar tanggal={a.tanggal} />
                      <div className="min-w-0">
                        <p className="lgt-daftar-judul">{a.judul}</p>
                        <p className="lgt-daftar-isi">
                          <time dateTime={a.tanggal}>{formatTanggal(a.tanggal, { weekday: "long" })}</time>
                          {[a.waktu, a.tempat].filter(Boolean).map((x) => ` · ${x}`)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
