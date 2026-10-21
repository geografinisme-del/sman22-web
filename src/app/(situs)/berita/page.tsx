import type { Metadata } from "next";
import Link from "next/link";
import { InfoCard } from "@/components/langit/Komponen";
import { Kosong, PageHeader, Section } from "@/components/ui";
import { getBerita } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

export const metadata: Metadata = { title: "Berita", description: "Berita dan kegiatan terbaru sekolah." };

export default async function DaftarBerita({ searchParams }: { searchParams: Promise<{ kategori?: string; q?: string }> }) {
  const { kategori, q: qMentah } = await searchParams;
  const q = typeof qMentah === "string" ? qMentah.trim().slice(0, 80).toLowerCase() : "";
  const semua = await getBerita();
  const daftarKategori = [...new Set(semua.map((b) => b.kategori).filter(Boolean))];
  const list = semua
    .filter((b) => !kategori || b.kategori === kategori)
    .filter((b) => !q || [b.judul, b.ringkasan, b.kategori].some((t) => (t ?? "").toLowerCase().includes(q)));
  const [utama, ...lain] = list;
  const label = (b: (typeof semua)[number]) => [b.kategori, formatTanggal(b.tanggal)].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader judul="Berita" label="Kabar & agenda" deskripsi="Kabar kegiatan, prestasi, dan program sekolah." />
      <Section>
        {daftarKategori.length > 1 && (
          <nav aria-label="Saring kategori" className="lgt-saringan mb-8">
            <Link href="/berita" scroll={false} className="lgt-chip" aria-current={!kategori ? "page" : undefined}>
              Semua ({semua.length})
            </Link>
            {daftarKategori.map((k) => (
              <Link key={k} href={`/berita?kategori=${encodeURIComponent(k)}`} scroll={false} className="lgt-chip" aria-current={kategori === k ? "page" : undefined}>
                {k}
              </Link>
            ))}
          </nav>
        )}
        {!utama ? (
          <Kosong teks={q ? `Tidak ada berita yang cocok dengan “${q}”.` : kategori ? `Belum ada berita kategori ${kategori}.` : "Belum ada berita yang diterbitkan."} />
        ) : (
          <div className="grid gap-6">
            <div className="lgt-berita-utama">
            <InfoCard href={`/berita/${utama.slug}`} foto={utama.gambar} alt={utama.judul} sementara={utama.gambarSementara} label={label(utama)} judul={utama.judul} deskripsi={utama.ringkasan} aksi="Baca" rasio="lebar" />
            </div>
            {lain.length > 0 && (
              <div className="lgt-kisi">
                {lain.map((b) => (
                  <InfoCard key={b.slug} href={`/berita/${b.slug}`} foto={b.gambar} alt={b.judul} sementara={b.gambarSementara} label={label(b)} judul={b.judul} deskripsi={b.ringkasan} aksi="Baca" />
                ))}
              </div>
            )}
          </div>
        )}
      </Section>
    </>
  );
}
