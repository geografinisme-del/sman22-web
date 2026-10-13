import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Gambar } from "@/components/Gambar";
import { Reveal } from "@/components/Reveal";
import { Kosong, PageHeader } from "@/components/ui";
import { getProfil } from "@/lib/data";

export const metadata: Metadata = { title: "Sambutan Kepala Sekolah" };

export default async function Sambutan() {
  const p = await getProfil();
  return (
    <>
      <PageHeader label="Sambutan" judul="Sambutan Kepala Sekolah" deskripsi={p.kepalaSekolah ? `${p.kepalaSekolah}, Kepala SMA Negeri 22 Bandung` : undefined} />
      <section className="lp-wadah py-10 sm:py-14">
        <div className="grid items-start gap-10 md:grid-cols-[minmax(240px,340px)_1fr] lg:gap-16">
          <Reveal className="relative mx-auto w-full max-w-[300px] md:sticky md:top-28 md:max-w-none">
            <span aria-hidden className="absolute -inset-x-3 bottom-0 top-[22%] rounded-[45%_50%_40%_35%] bg-[#ebe5fa]" />
            <span aria-hidden className="absolute inset-x-[8%] bottom-[4%] top-[34%] rounded-full bg-[var(--tema-utama)]" />
            <Gambar
              src={p.fotoKepalaSekolah}
              alt={`Foto ${p.kepalaSekolah}`}
              sizes="340px"
              className="kartu-gambar relative aspect-[4/5] rounded-[999px_999px_28px_28px] bg-transparent shadow-[0_30px_60px_-30px_rgb(32_37_44/0.45)]"
            />
            <div className="absolute -bottom-4 left-4 right-4 rotate-[-2deg] rounded-xl border border-[#e3dfd6] bg-[#fffdf7] px-4 py-3 shadow-sm">
              <p className="font-serif text-lg leading-tight">{p.kepalaSekolah}</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#6a6154]">Kepala Sekolah</p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <blockquote className="font-serif text-[clamp(1.8rem,3.2vw,2.75rem)] italic leading-[1.12] tracking-[-0.02em]">
              “{p.sambutanKutipan || "Selamat datang di keluarga besar SMA Negeri 22 Bandung."}”
            </blockquote>
            {p.sambutanParagraf.length > 0 ? (
              <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-[#4f5763]">
                {p.sambutanParagraf.map((t, i) => (
                  <p key={i}>{t}</p>
                ))}
              </div>
            ) : (
              <div className="mt-6">
                <Kosong teks="Naskah sambutan lengkap segera diperbarui." sub="Admin dapat mengisinya di menu Profil Sekolah." />
              </div>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/profil#visi-misi" className="inline-flex items-center gap-2 rounded-full bg-[var(--tema-utama)] px-5 py-3 text-sm font-semibold text-white">
                Visi & misi sekolah <ArrowUpRight size={15} aria-hidden />
              </Link>
              <Link href="/program" className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold ring-1 ring-[var(--tema-utama)]/25">
                Program unggulan <ArrowUpRight size={15} aria-hidden />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
