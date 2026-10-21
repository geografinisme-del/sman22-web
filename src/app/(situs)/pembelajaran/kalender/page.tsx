import type { Metadata } from "next";
import { TanggalBesar, hariIniWib } from "@/components/langit/Bagian";
import { Kosong, PageHeader, Section } from "@/components/ui";
import { getKalenderUmum } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

export const metadata: Metadata = { title: "Kalender Akademik", description: "Kalender akademik SMA Negeri 22 Bandung: ujian, libur, dan kegiatan sekolah." };

const JENIS: Record<string, string> = { akademik: "Akademik", ujian: "Ujian", kegiatan: "Kegiatan", rapat: "Rapat", libur: "Libur" };

/** Tahun ajaran berjalan (Juli–Juni) menurut tanggal WIB. */
function tahunAjaran(hari: string) {
  const [t, b] = hari.split("-").map(Number);
  const awal = b >= 7 ? t : t - 1;
  return { label: `${awal}/${awal + 1}`, dari: `${awal}-07-01`, sampai: `${awal + 1}-06-30` };
}

export default async function KalenderAkademik() {
  const ta = tahunAjaran(hariIniWib());
  const kegiatan = await getKalenderUmum(ta.dari, ta.sampai);
  const perBulan = new Map<string, typeof kegiatan>();
  for (const k of kegiatan) {
    const kunci = formatTanggal(k.mulai, { day: undefined, month: "long", year: "numeric" });
    perBulan.set(kunci, [...(perBulan.get(kunci) ?? []), k]);
  }
  return (
    <>
      <PageHeader judul="Kalender akademik" label="Pembelajaran" remah={[{ href: "/pembelajaran", label: "Pembelajaran" }]} deskripsi={`Tanggal penting tahun ajaran ${ta.label}.`}>
        <a href="/kalender.ics" className="lgt-pil-tombol lgt-pil-lime">
          Tambahkan ke aplikasi kalender
        </a>
      </PageHeader>
      <Section>
        {kegiatan.length === 0 ? (
          <Kosong teks="Kalender akademik sedang disiapkan." />
        ) : (
          <div className="grid max-w-[860px] gap-10">
            {[...perBulan].map(([bulan, isi]) => (
              <section key={bulan} aria-label={bulan}>
                <h2 className="label-mono lgt-label-titik">{bulan}</h2>
                <ul className="lgt-daftar-tgl mt-4">
                  {isi.map((k) => (
                    <li key={k.id}>
                      <TanggalBesar tanggal={k.mulai} />
                      <div className="min-w-0">
                        <p className="lgt-daftar-judul">
                          {k.judul} <span className="lgt-pil-tingkat ml-1 align-middle">{JENIS[k.jenis] ?? k.jenis}</span>
                        </p>
                        <p className="lgt-daftar-isi">
                          {k.selesai !== k.mulai ? `${formatTanggal(k.mulai)} – ${formatTanggal(k.selesai)}` : formatTanggal(k.mulai, { weekday: "long" })}
                          {k.jamMulai && ` · ${k.jamMulai}${k.jamSelesai ? `–${k.jamSelesai}` : ""}`}
                          {k.lokasi && ` · ${k.lokasi}`}
                        </p>
                        {k.keterangan && <p className="lgt-daftar-isi">{k.keterangan}</p>}
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
