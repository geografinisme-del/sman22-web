import type { Metadata } from "next";
import { MediaSlot } from "@/components/MediaSlot";
import { Prose } from "@/components/langit/Komponen";
import { PageHeader } from "@/components/ui";
import { sekolah } from "@/content/sekolah";
import { getProfil } from "@/lib/data";
import { fotoKode } from "@/lib/foto-slot";

export const metadata: Metadata = { title: "Sejarah" };

export default async function Sejarah() {
  const [p, foto] = await Promise.all([
    getProfil(),
    fotoKode("profil.sejarah", { src: "/images/gedung.jpg", alt: "Gedung utama SMA Negeri 22 Bandung", sementara: false }),
  ]);
  return (
    <>
      <PageHeader judul="Sejarah" label="Profil" remah={[{ href: "/profil", label: "Profil" }]} deskripsi={`Perjalanan ${sekolah.nama} sejak ${sekolah.tahunBerdiri}.`} />
      <section className="lgt-bagian">
        <div className="lgt-wadah">
          <Prose>
            <figure>
              <MediaSlot src={foto.src} alt={foto.alt} isPlaceholder={foto.sementara} focus={foto.fokus} ratio="16/9" priority sizes="(min-width: 900px) 760px, 100vw" className="rounded-[18px]" />
              {/* keterangan "Gedung utama" hanya untuk foto asli sekolah, bukan ilustrasi sementara */}
              {!foto.sementara && <figcaption>Gedung utama {sekolah.nama}.</figcaption>}
            </figure>
            {p.sejarah.length > 0 ? p.sejarah.map((t, i) => <p key={i}>{t}</p>) : <p>Sekolah berdiri pada {sekolah.tahunBerdiri}. Uraian sejarah lengkap sedang dilengkapi.</p>}
          </Prose>
        </div>
      </section>
    </>
  );
}
