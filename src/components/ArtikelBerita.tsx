import Link from "next/link";
import { Gambar } from "@/components/Gambar";
import type { BeritaItem } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

/** Tampilan satu berita — dipakai halaman publik dan pratinjau admin */
export function ArtikelBerita({ b, kembali = true }: { b: BeritaItem; kembali?: boolean }) {
  return (
    <article className="lp mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      {kembali && (
        <nav aria-label="Lokasi halaman" className="remah">
          <Link href="/">Beranda</Link>
          <span aria-hidden>/</span>
          <Link href="/berita">Berita</Link>
        </nav>
      )}
      <p className="mt-6 text-sm text-[#5b6270]">
        {b.kategori} · <time dateTime={b.tanggal}>{formatTanggal(b.tanggal)}</time>
      </p>
      <h1 className="mt-2">{b.judul}</h1>
      {b.ringkasan && <p className="mt-4 text-[1.1875rem] leading-relaxed text-[#3b414b]">{b.ringkasan}</p>}
      <Gambar src={b.gambar} alt={b.judul} priority sizes="(min-width: 768px) 768px, 100vw" className="mt-8 aspect-[3/2] rounded-[10px]" />
      <div className="mt-8 space-y-4 text-[1.0625rem] leading-[1.7] text-[#1f2328]">
        {b.isi.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {kembali && (
        <Link href="/berita" className="tautan mt-10 inline-block">
          Berita lainnya
        </Link>
      )}
    </article>
  );
}
