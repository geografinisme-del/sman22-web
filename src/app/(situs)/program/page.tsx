import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { FOTO_PROGRAM } from "@/content/program";
import { programUnggulan } from "@/content/sekolah";
import { slugProgram } from "@/lib/program";

export const metadata: Metadata = { title: "Program Sekolah", description: "Program dan pembiasaan karakter di SMA Negeri 22 Bandung." };

export default function DaftarProgram() {
  return (
    <>
      <PageHeader judul="Program Sekolah" deskripsi="Program dan pembiasaan karakter yang dijalani siswa SMA Negeri 22 Bandung." />
      <section className="bagian">
        <ul className="lp-wadah divide-y divide-[#e5e1da] border-y border-[#e5e1da]">
          {programUnggulan.map((p) => {
            const foto = FOTO_PROGRAM[p.kode];
            return (
              <li key={p.kode}>
                <Link href={`/program/${slugProgram(p)}`} className="group grid items-center gap-5 py-6 sm:grid-cols-[200px_1fr]">
                  {foto ? (
                    <div className="foto relative aspect-[3/2]">
                      <Image src={foto.src} alt={foto.alt} fill sizes="200px" className="object-cover" />
                    </div>
                  ) : (
                    <div className="hidden aspect-[3/2] items-center justify-center rounded-[10px] bg-[#f3efe9] text-[1.375rem] font-bold text-[#5b6270] sm:flex">{p.kode}</div>
                  )}
                  <div>
                    <h2 className="text-[1.375rem] group-hover:text-[var(--tema-utama)] group-hover:underline">{p.nama}</h2>
                    <p className="mt-1 max-w-[60ch] text-[#3b414b]">{p.ringkas}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
