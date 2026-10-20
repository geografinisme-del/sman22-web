import type { Metadata } from "next";
import Image from "next/image";
import { CtaBand, Prose } from "@/components/langit/Komponen";
import { PageHeader } from "@/components/ui";
import { getProfil } from "@/lib/data";

export const metadata: Metadata = { title: "Sambutan Kepala Sekolah" };

export default async function Sambutan() {
  const p = await getProfil();
  const ada = Boolean(p.sambutanKutipan || p.sambutanParagraf.length);
  return (
    <>
      <PageHeader judul="Sambutan kepala sekolah" label="Profil" remah={[{ href: "/profil", label: "Profil" }]} deskripsi={p.kepalaSekolah ? `${p.kepalaSekolah}, ${p.jabatanKepala || "Kepala SMA Negeri 22 Bandung"}.` : undefined} />
      <section className="lgt-bagian">
        <div className="lgt-wadah grid items-start gap-10 md:grid-cols-[280px_minmax(0,1fr)] lg:gap-16">
          <figure className="max-w-[280px]">
            <span className="relative block aspect-[425/600] overflow-hidden rounded-[var(--radius-kartu-besar)] bg-[var(--soft)]">
              <Image src={p.fotoKepalaSekolah} alt={`Foto ${p.kepalaSekolah}`} fill loading="eager" sizes="280px" className="object-cover object-top" />
            </span>
            <figcaption className="mt-3">
              <span className="block font-bold">{p.kepalaSekolah}</span>
              <span className="label-mono text-[var(--blue-teks)]">Kepala sekolah</span>
            </figcaption>
          </figure>
          <Prose>
            {ada ? (
              <>
                {p.sambutanKutipan && <blockquote>{p.sambutanKutipan}</blockquote>}
                {p.sambutanParagraf.map((t, i) => (
                  <p key={i}>{t}</p>
                ))}
              </>
            ) : (
              <p>Naskah sambutan kepala sekolah sedang dilengkapi.</p>
            )}
          </Prose>
        </div>
      </section>
      <CtaBand label="Profil" judul="Kenali arah sekolah." lanjutan="Visi, misi, dan nilai kami." tombol={{ href: "/profil/visi-misi", teks: "Visi dan misi" }} />
    </>
  );
}
