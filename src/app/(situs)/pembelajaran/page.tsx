import type { Metadata } from "next";
import { ProgramUnggulan } from "@/components/langit/Bagian";
import { InfoCard } from "@/components/langit/Komponen";
import { PageHeader, Section } from "@/components/ui";
import { tautanELearning } from "@/content/menu";
import { getSitus } from "@/lib/data";
import { fotoKode } from "@/lib/foto-slot";

export const metadata: Metadata = { title: "Pembelajaran" };

export default async function Pembelajaran() {
  const [situs, fElearning, fKalender] = await Promise.all([
    getSitus(),
    fotoKode("kartu-pembelajaran.e-learning", { src: "/media/placeholder/galeri-3.webp", alt: "", sementara: true }),
    fotoKode("kartu-pembelajaran.kalender", { src: "/images/upacara-pagi.jpg", alt: "", sementara: false }),
  ]);
  const eLearning = tautanELearning(situs.layanan);
  const kartu = [
    { href: "/program", judul: "Program dan karakter", deskripsi: "7KAIH, Gerbang Pancawaluya, dan kokurikuler tematik.", foto: "/images/apel-lapangan.jpg", sementara: false },
    { href: eLearning, judul: "E-Learning", deskripsi: "Kelas digital, materi, dan tugas daring.", foto: fElearning.src, sementara: fElearning.sementara },
    { href: "/pembelajaran/kalender", judul: "Kalender akademik", deskripsi: "Tanggal ujian, libur, dan kegiatan akademik.", foto: fKalender.src, sementara: fKalender.sementara },
    { href: "/pembelajaran/kurikulum", judul: "Kurikulum", deskripsi: "Struktur dan pelaksanaan kurikulum sekolah.", foto: "/images/kegiatan-aula.jpg", sementara: false },
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
