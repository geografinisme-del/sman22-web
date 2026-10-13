import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { Kosong, PageHeader, Section } from "@/components/ui";
import { programUnggulan } from "@/content/sekolah";
import { getBerita } from "@/lib/data";
import { formatTanggal } from "@/lib/format";
import { cariProgram, slugProgram } from "@/lib/program";

export function generateStaticParams() {
  return programUnggulan.map((p) => ({ slug: slugProgram(p) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = cariProgram((await params).slug);
  return p ? { title: p.nama, description: p.ringkas } : { title: "Program tidak ditemukan" };
}

export default async function DetailProgram({ params }: { params: Promise<{ slug: string }> }) {
  const p = cariProgram((await params).slug);
  if (!p) notFound();
  const kunci = [p.nama.toLowerCase(), p.kode.toLowerCase()];
  const semua = await getBerita(60);
  const terkait = semua.filter((b) => kunci.some((k) => `${b.judul} ${b.ringkasan} ${b.kategori}`.toLowerCase().includes(k))).slice(0, 6);
  const lain = programUnggulan.filter((x) => x.kode !== p.kode);

  return (
    <>
      <PageHeader label="Program sekolah" judul={p.nama} deskripsi={p.ringkas}>
        <Link href="/program" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--tema-utama)] hover:underline">
          <ArrowLeft size={15} aria-hidden /> Semua program
        </Link>
      </PageHeader>

      <Section judul="Kabar" miring="program ini" label="Berita & kegiatan terkait">
        {terkait.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {terkait.map((b, i) => (
              <Reveal key={b.slug} delay={(i % 3) * 100}>
                <Link href={`/berita/${b.slug}`} className="kartu group block h-full p-5 transition hover:-translate-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--tema-utama)]">{b.kategori || "Berita"}</p>
                  <p className="mt-1 text-xs text-[#646c7a]">{formatTanggal(b.tanggal)}</p>
                  <h3 className="mt-2 font-semibold group-hover:text-[var(--tema-utama)]">{b.judul}</h3>
                  <p className="mt-2 text-sm text-[#5e6074]">{b.ringkasan}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        ) : (
          <Kosong teks="Belum ada berita untuk program ini." sub={`Tulis berita dengan menyebut "${p.nama}" di judul atau ringkasannya agar tampil di sini.`} />
        )}
      </Section>

      <Section judul="Program" miring="lainnya" label="Jelajahi">
        <div className="flex flex-wrap gap-3">
          {lain.map((x) => (
            <Link key={x.kode} href={`/program/${slugProgram(x)}`} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-[var(--tema-utama)]/25 transition hover:bg-[var(--tema-utama)] hover:text-white">
              {x.nama} <ArrowUpRight size={14} aria-hidden />
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
