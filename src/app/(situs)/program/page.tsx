import type { Metadata } from "next";
import { ProgramUnggulan } from "@/components/langit/Bagian";
import { InfoCard } from "@/components/langit/Komponen";
import { PageHeader, Section } from "@/components/ui";
import { FOTO_PROGRAM } from "@/content/program";
import { programUnggulan } from "@/content/sekolah";
import { slugProgram } from "@/lib/program";

export const metadata: Metadata = { title: "Program dan Karakter", description: "Program dan pembiasaan karakter di SMA Negeri 22 Bandung." };

export default function DaftarProgram() {
  return (
    <>
      <PageHeader judul="Program dan karakter" label="Pembelajaran" remah={[{ href: "/pembelajaran", label: "Pembelajaran" }]} deskripsi="Program dan pembiasaan karakter yang dijalani siswa SMA Negeri 22 Bandung." />
      <Section label="Lima program" judul="Pembentuk karakter siswa.">
        <ProgramUnggulan />
      </Section>
      <Section className="lgt-bagian-soft" label="Lebih dekat" judul="Kenali tiap program.">
        <div className="lgt-kisi">
          {programUnggulan.map((p) => {
            const foto = FOTO_PROGRAM[p.kode];
            return <InfoCard key={p.kode} href={`/program/${slugProgram(p)}`} foto={foto?.src} alt={foto?.alt} label={p.kode} judul={p.nama} deskripsi={p.ringkas} />;
          })}
        </div>
      </Section>
    </>
  );
}
