import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { getProfil } from "@/lib/data";

export const metadata: Metadata = { title: "Sambutan Kepala Sekolah" };

export default async function Sambutan() {
  const p = await getProfil();
  const ada = Boolean(p.sambutanKutipan || p.sambutanParagraf.length);
  return (
    <>
      <PageHeader judul="Sambutan Kepala Sekolah" deskripsi={p.kepalaSekolah ? `${p.kepalaSekolah}, Kepala SMA Negeri 22 Bandung` : undefined} />
      <section className="bagian">
        <div className="lp-wadah grid items-start gap-8 sm:grid-cols-[200px_1fr] md:grid-cols-[260px_1fr] lg:gap-12">
          <figure className="max-w-[260px]">
            <div className="foto relative aspect-[425/600] border border-[#e5e1da] bg-white">
              <Image src={p.fotoKepalaSekolah} alt={`Foto ${p.kepalaSekolah}`} fill priority sizes="260px" className="object-cover object-top" />
            </div>
            <figcaption className="mt-2">
              <span className="block font-semibold">{p.kepalaSekolah}</span>
              <span className="text-sm text-[#5b6270]">Kepala Sekolah</span>
            </figcaption>
          </figure>
          <div className="bacaan">
            {ada ? (
              <>
                {p.sambutanKutipan && <p className="border-l-4 border-[var(--tema-utama)] pl-4 text-[1.25rem] font-semibold leading-relaxed">{p.sambutanKutipan}</p>}
                <div className="mt-5 space-y-4 text-[1.0625rem] leading-relaxed text-[#3b414b]">
                  {p.sambutanParagraf.map((t, i) => (
                    <p key={i}>{t}</p>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[#3b414b]">Naskah sambutan kepala sekolah sedang dilengkapi.</p>
            )}
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
              <Link href="/profil#visi-misi" className="tautan">
                Visi & misi sekolah
              </Link>
              <Link href="/program" className="tautan">
                Program sekolah
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
