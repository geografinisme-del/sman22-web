import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { FOTO_PROGRAM, KEBIASAAN_7KAIH, PANCAWALUYA } from "@/content/program";
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
  const foto = FOTO_PROGRAM[p.kode];

  return (
    <>
      <PageHeader judul={p.nama} deskripsi={p.ringkas} foto={foto ? { src: foto.src, alt: foto.alt } : undefined}>
        <Link href="/program" className="tautan">
          Semua program
        </Link>
      </PageHeader>

      {p.kode === "7KAIH" && (
        <section className="bagian bagian-putih">
          <div className="lp-wadah">
            <h2>Tujuh kebiasaan</h2>
            <ol className="kebiasaan mt-4 max-w-2xl">
              {KEBIASAAN_7KAIH.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ol>
          </div>
        </section>
      )}
      {p.kode === "GP" && (
        <section className="bagian bagian-putih">
          <div className="lp-wadah">
            <h2>Lima nilai Pancawaluya</h2>
            <dl className="nilai-daftar mt-4">
              {PANCAWALUYA.map((n) => (
                <div key={n.nilai}>
                  <dt>{n.nilai}</dt>
                  <dd>{n.arti}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      <section className="bagian">
        <div className="lp-wadah">
          <h2>Berita dan kegiatan terkait</h2>
          {terkait.length ? (
            <ul className="mt-4 divide-y divide-[#e5e1da] border-y border-[#e5e1da]">
              {terkait.map((b) => (
                <li key={b.slug}>
                  <Link href={`/berita/${b.slug}`} className="group block py-3">
                    <span className="text-sm text-[#5b6270]">
                      {b.kategori || "Berita"} · {formatTanggal(b.tanggal)}
                    </span>
                    <span className="mt-0.5 block font-semibold group-hover:text-[var(--tema-utama)] group-hover:underline">{b.judul}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[#3b414b]">Belum ada berita yang diterbitkan untuk program ini.</p>
          )}

          <h2 className="mt-12">Program lainnya</h2>
          <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">
            {lain.map((x) => (
              <li key={x.kode} className="border-b border-[#e5e1da]">
                <Link href={`/program/${slugProgram(x)}`} className="block py-3 font-semibold hover:text-[var(--tema-utama)] hover:underline">
                  {x.nama}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
