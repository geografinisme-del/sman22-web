import type { Metadata } from "next";
import { TabelPrestasi } from "@/components/langit/Bagian";
import { StatCard } from "@/components/langit/Komponen";
import { Kosong, PageHeader, Section } from "@/components/ui";
import { getPrestasi, getProfil } from "@/lib/data";

export const metadata: Metadata = { title: "Prestasi", description: "Capaian siswa SMA Negeri 22 Bandung di tingkat kota, provinsi, dan nasional." };

export default async function HalamanPrestasi() {
  const [prestasi, profil] = await Promise.all([getPrestasi(200), getProfil()]);
  const alumni = profil.alumniPtn;
  return (
    <>
      <PageHeader judul="Prestasi siswa" label="Kehidupan siswa" deskripsi="Capaian siswa dari berbagai lomba, disaring menurut tingkat." />
      <Section>
        {prestasi.length === 0 ? (
          <Kosong teks="Belum ada prestasi yang diterbitkan." />
        ) : (
          <div className={alumni.jumlah ? "lgt-prestasi" : ""}>
            <TabelPrestasi prestasi={prestasi} />
            {alumni.jumlah && <StatCard warna="lime" label={`Lulusan${alumni.tahun ? ` ${alumni.tahun}` : ""}`} angka={alumni.jumlah} keterangan="alumni diterima di perguruan tinggi negeri." />}
          </div>
        )}
      </Section>
    </>
  );
}
