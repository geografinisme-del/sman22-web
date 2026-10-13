import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { PageHeader, Section } from "@/components/ui";
import { programUnggulan } from "@/content/sekolah";
import { slugProgram } from "@/lib/program";

export const metadata: Metadata = { title: "Program Sekolah", description: "Program unggulan SMA Negeri 22 Bandung." };

const NADA = ["#ebe5fa", "#e6ecff", "#f9f3e9", "#e7f6ef", "#fdeaf0"];

export default function DaftarProgram() {
  return (
    <>
      <PageHeader label="Program sekolah" judul="Program Unggulan" deskripsi="Kebiasaan baik dan pengalaman belajar yang membentuk karakter warga SMAN 22 Bandung." />
      <Section>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {programUnggulan.map((p, i) => (
            <Reveal key={p.kode} delay={(i % 3) * 100}>
              <Link href={`/program/${slugProgram(p)}`} className="kartu group flex h-full flex-col overflow-hidden transition hover:-translate-y-1">
                <div className="flex h-36 items-end justify-between p-5" style={{ background: NADA[i % NADA.length] }}>
                  <span className="font-serif text-5xl leading-none text-[var(--tema-utama)]">{p.kode}</span>
                  <span className="font-serif text-lg italic text-[#73698f]">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-lg font-semibold">{p.nama}</h2>
                  <p className="mt-2 flex-1 text-sm text-[#5e6074]">{p.ringkas}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--tema-utama)]">
                    Selengkapnya <ArrowUpRight size={15} aria-hidden className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
