import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Kosong, PageHeader, Section } from "@/components/ui";
import { GRUP_LANGIT } from "@/content/menu-langit";
import { getAgenda, getBerita, getPengumuman } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

export const metadata: Metadata = { title: "Cari", robots: { index: false, follow: true } };

type Hasil = { href: string; judul: string; jenis: string; keterangan?: string };
const normal = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

/** Pencarian situs: berita, pengumuman, agenda, dan halaman menu (sederhana, di server, tanpa indeks eksternal). */
export default async function Cari({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: mentah } = await searchParams;
  const q = typeof mentah === "string" ? mentah.trim().slice(0, 80) : "";
  const kata = normal(q).split(/\s+/).filter((k) => k.length > 1);
  const cocok = (...t: (string | undefined)[]) => kata.length > 0 && kata.every((k) => normal(t.filter(Boolean).join(" ")).includes(k));

  let hasil: Hasil[] = [];
  if (kata.length) {
    const [berita, pengumuman, agenda] = await Promise.all([getBerita(), getPengumuman(), getAgenda()]);
    const halaman: Hasil[] = GRUP_LANGIT.flatMap((g) => g.anak.map((t) => ({ href: t.href, judul: t.label, jenis: "Halaman", keterangan: g.label })));
    hasil = [
      ...halaman.filter((h) => cocok(h.judul, h.keterangan)),
      ...berita.filter((b) => cocok(b.judul, b.ringkasan, b.kategori, b.isi.join(" "))).map((b) => ({ href: `/berita/${b.slug}`, judul: b.judul, jenis: b.kategori || "Berita", keterangan: formatTanggal(b.tanggal) })),
      ...pengumuman.filter((p) => cocok(p.judul, p.isi)).map((p) => ({ href: `/pengumuman#pengumuman-${p.id}`, judul: p.judul, jenis: "Pengumuman", keterangan: formatTanggal(p.tanggal) })),
      ...agenda.filter((a) => cocok(a.judul, a.tempat)).map((a) => ({ href: "/agenda", judul: a.judul, jenis: "Agenda", keterangan: [formatTanggal(a.tanggal), a.tempat].filter(Boolean).join(" · ") })),
    ].slice(0, 60);
  }

  return (
    <>
      <PageHeader judul="Cari" label="Pencarian" deskripsi="Temukan berita, pengumuman, agenda, dan halaman di situs sekolah." />
      <Section>
        <form action="/cari" role="search" className="perpus-cari perpus-cari-besar">
          <label htmlFor="cari-q" className="sr-only">
            Kata kunci
          </label>
          <Search size={20} aria-hidden className="perpus-cari-ikon" />
          <input id="cari-q" name="q" type="search" defaultValue={q} maxLength={80} placeholder="Mis. SPMB, ujian, ekskul…" />
          <button type="submit" className="btn btn-primary">
            Cari
          </button>
        </form>
        <div className="mt-8 max-w-[860px]" aria-live="polite">
          {!q ? null : hasil.length === 0 ? (
            <Kosong teks={`Tidak ada hasil untuk “${q}”.`} sub="Coba kata kunci lain yang lebih umum." />
          ) : (
            <>
              <p className="label-mono text-[var(--muted)]">
                {hasil.length} hasil untuk “{q}”
              </p>
              <ul className="lgt-akses mt-3">
                {hasil.map((h, i) => (
                  <li key={`${h.href}-${i}`}>
                    <Link href={h.href} className="!items-start">
                      <span className="min-w-0 flex-1">
                        <span className="lgt-kartu-label">{[h.jenis, h.keterangan].filter(Boolean).join(" · ")}</span>
                        <span className="block text-[1.0625rem]">{h.judul}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Section>
    </>
  );
}
