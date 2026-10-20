import { notFound } from "next/navigation";
import { InfoCard, PageHero, SectionHeading, StatCard } from "@/components/langit/Komponen";

export const metadata = { title: "Spesimen desain", robots: { index: false, follow: false } };

const WARNA = [
  ["--sky-1", "Langit 1", "Gradien hero, tombol utama"],
  ["--sky-2", "Langit 2", "Gradien hero"],
  ["--sky-3", "Langit 3", "Gradien hero, awan"],
  ["--haze", "Kabut", "Latar lembut biru"],
  ["--blue", "Biru", "Elemen grafis, teks ≥ 18px"],
  ["--blue-teks", "Biru teks", "Label & tautan kecil (5,6:1)"],
  ["--lime", "Lime", "Tombol aksen, kartu bento"],
  ["--ink", "Tinta", "Teks utama, tombol gelap"],
  ["--muted", "Abu", "Keterangan, metadata"],
  ["--soft", "Lembut", "Latar bagian selang-seling"],
  ["--line", "Garis", "Pemisah 1px, tepi formulir"],
] as const;

/** Spesimen token "Langit cerah" (styles/tokens.css). Hanya di lingkungan pengembangan; 404 di produksi. */
export default function Spesimen() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <>
      <PageHero judul="Spesimen desain" label="Token" deskripsi="Plus Jakarta Sans 400–800 · JetBrains Mono 500/700 · judul 500, −0.035em." />
      <section className="lgt-bagian">
        <div className="lgt-wadah">
          <SectionHeading label="Warna" judul="Nama berdasarkan peran." />
          <ul className="nilai-daftar mt-8">
            {WARNA.map(([token, nama, peran]) => (
              <li key={token} className="list-none">
                <span className="block h-16 rounded-[14px] border border-[var(--line)]" style={{ background: `var(${token})` }} aria-hidden />
                <strong className="mt-3 block">{nama}</strong>
                <code className="label-mono text-[var(--blue-teks)]">{token}</code>
                <p className="text-sm text-[var(--muted)]">{peran}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="lgt-bagian lgt-bagian-soft">
        <div className="lgt-wadah lgt-kisi">
          <InfoCard href="/profil" foto="/images/gedung.jpg" label="Profil" judul="InfoCard" deskripsi="Kartu yang sama dengan kartu putar beranda." />
          <InfoCard label="Tanpa foto" judul="Blok langit 22" deskripsi="Dipakai bila CMS belum punya foto." />
          <StatCard warna="lime" label="StatCard" angka="22" keterangan="Kartu bento lime." />
        </div>
      </section>
    </>
  );
}
