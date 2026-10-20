import type { Metadata } from "next";
import Image from "next/image";
import { Prose } from "@/components/langit/Komponen";
import { PageHeader } from "@/components/ui";
import { sekolah } from "@/content/sekolah";
import { getProfil } from "@/lib/data";

export const metadata: Metadata = { title: "Sejarah" };

export default async function Sejarah() {
  const p = await getProfil();
  return (
    <>
      <PageHeader judul="Sejarah" label="Profil" remah={[{ href: "/profil", label: "Profil" }]} deskripsi={`Perjalanan ${sekolah.nama} sejak ${sekolah.tahunBerdiri}.`} />
      <section className="lgt-bagian">
        <div className="lgt-wadah">
          <Prose>
            <figure>
              <span className="relative block aspect-[16/9] overflow-hidden rounded-[18px] bg-[var(--soft)]">
                <Image src="/images/gedung.jpg" alt="Gedung utama SMA Negeri 22 Bandung" fill sizes="(min-width: 900px) 760px, 100vw" className="object-cover" />
              </span>
              <figcaption>Gedung utama {sekolah.nama}.</figcaption>
            </figure>
            {p.sejarah.length > 0 ? p.sejarah.map((t, i) => <p key={i}>{t}</p>) : <p>Sekolah berdiri pada {sekolah.tahunBerdiri}. Uraian sejarah lengkap sedang dilengkapi.</p>}
          </Prose>
        </div>
      </section>
    </>
  );
}
