import type { Metadata } from "next";
import { ProgramUnggulan } from "@/components/langit/Bagian";
import { InfoCard } from "@/components/langit/Komponen";
import { PageHeader, Section } from "@/components/ui";
import { FOTO_PROGRAM } from "@/content/program";
import { programUnggulan } from "@/content/sekolah";
import { slugProgram } from "@/lib/program";
import { fotoKode } from "@/lib/foto-slot";

export const metadata: Metadata = { title: "Program dan Karakter", description: "Program dan pembiasaan karakter di SMA Negeri 22 Bandung." };

export default async function DaftarProgram() {
  // kartu 7KAIH: ilustrasi sementara berkualitas (foto_slot "program.7kaih") menggantikan foto masjid yang kecil
  const f7kaih = await fotoKode("program.7kaih", { src: FOTO_PROGRAM["7KAIH"].src, alt: FOTO_PROGRAM["7KAIH"].alt, sementara: false });
  return (
    <>
      <PageHeader judul="Program dan karakter" label="Pembelajaran" remah={[{ href: "/pembelajaran", label: "Pembelajaran" }]} deskripsi="Program dan pembiasaan karakter yang dijalani siswa SMA Negeri 22 Bandung." />
      <Section label="Lima program" judul="Pembentuk karakter siswa.">
        <ProgramUnggulan />
      </Section>
      <Section className="lgt-bagian-soft" label="Lebih dekat" judul="Kenali tiap program.">
        <div className="lgt-kisi">
          {programUnggulan.map((p) => {
            const foto = p.kode === "7KAIH" ? f7kaih : FOTO_PROGRAM[p.kode] ? { ...FOTO_PROGRAM[p.kode], sementara: false } : undefined;
            return <InfoCard key={p.kode} href={`/program/${slugProgram(p)}`} foto={foto?.src} alt={foto?.alt} sementara={foto?.sementara} label={p.kode} judul={p.nama} deskripsi={p.ringkas} />;
          })}
        </div>
      </Section>
    </>
  );
}
