import type { Metadata } from "next";
import { ProgramUnggulan } from "@/components/langit/Bagian";
import { InfoCard } from "@/components/langit/Komponen";
import { PageHeader, Section } from "@/components/ui";
import { tautanELearning } from "@/content/menu";
import { getSitus } from "@/lib/data";

export const metadata: Metadata = { title: "Pembelajaran" };

export default async function Pembelajaran() {
  const eLearning = tautanELearning((await getSitus()).layanan);
  const kartu = [
    { href: "/program", judul: "Program dan karakter", deskripsi: "7KAIH, Gerbang Pancawaluya, dan kokurikuler tematik.", foto: "/images/apel-lapangan.jpg" },
    { href: eLearning, judul: "E-Learning", deskripsi: "Kelas digital, materi, dan tugas daring.", foto: "/media/placeholder/galeri-3.webp", sementara: true },
    { href: "/pembelajaran/kalender", judul: "Kalender akademik", deskripsi: "Tanggal ujian, libur, dan kegiatan akademik.", foto: "/images/upacara-pagi.jpg" },
    { href: "/pembelajaran/kurikulum", judul: "Kurikulum", deskripsi: "Struktur dan pelaksanaan kurikulum sekolah.", foto: "/images/kegiatan-aula.jpg" },
  ];
  return (
    <>
      <PageHeader judul="Pembelajaran" label="Pembelajaran" deskripsi="Kurikulum, program karakter, dan layanan belajar digital SMA Negeri 22 Bandung." />
      <Section>
        <div className="lgt-kisi">
          {kartu.map((k) => (
            <InfoCard key={k.judul} href={k.href} foto={k.foto} sementara={k.sementara} label="Pembelajaran" judul={k.judul} deskripsi={k.deskripsi} />
          ))}
        </div>
      </Section>
      <Section className="lgt-bagian-soft" label="Program unggulan" judul="Lima program pembentuk karakter." linkSemua={{ href: "/program", label: "Semua program" }}>
        <ProgramUnggulan />
      </Section>
    </>
  );
}
