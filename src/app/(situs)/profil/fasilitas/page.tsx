import type { Metadata } from "next";
import { InfoCard, Kosong } from "@/components/langit/Komponen";
import { PageHeader, Section } from "@/components/ui";
import { getFasilitas, getGaleri } from "@/lib/data";
import { GaleriInteraktif } from "@/components/GaleriInteraktif";

export const metadata: Metadata = { title: "Fasilitas" };

export default async function Fasilitas() {
  const [fasilitas, galeri] = await Promise.all([getFasilitas(), getGaleri()]);
  return (
    <>
      <PageHeader judul="Fasilitas" label="Profil" remah={[{ href: "/profil", label: "Profil" }]} deskripsi="Ruang belajar, laboratorium, dan sarana pendukung kegiatan siswa." />
      <Section>
        {fasilitas.length === 0 ? (
          <Kosong teks="Daftar fasilitas sedang disiapkan." sub="Sementara itu, lihat dokumentasi kegiatan di galeri." />
        ) : (
          <div className="lgt-kisi">
            {fasilitas.map((f) => (
              <InfoCard key={f.id} foto={f.foto} alt={f.nama} sementara={f.sementara} label="Fasilitas" judul={f.nama} deskripsi={f.deskripsi} />
            ))}
          </div>
        )}
      </Section>
      {galeri.length > 0 && (
        <Section className="lgt-bagian-soft" label="Galeri" judul="Suasana sekolah." linkSemua={{ href: "/galeri", label: "Galeri kegiatan" }}>
          <GaleriInteraktif foto={galeri.filter((g) => g.gambar).slice(0, 9)} />
        </Section>
      )}
    </>
  );
}
