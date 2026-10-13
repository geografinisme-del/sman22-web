import Link from "next/link";
import { Gambar } from "@/components/Gambar";
import type { BeritaItem } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

/** Tampilan satu berita — dipakai halaman publik dan pratinjau admin */
export function ArtikelBerita({ b, kembali = true }: { b: BeritaItem; kembali?: boolean }) {
  return (
    <article className="mx-auto max-w-3xl px-5 pb-16 pt-28 sm:pt-36">
      {kembali && (
        <Link href="/berita" className="text-sm font-medium underline-offset-4 hover:underline">
          ← Kembali ke berita
        </Link>
      )}
      <p className="mt-8 text-xs uppercase tracking-[0.25em] text-[var(--tema-utama)]">
        {b.kategori} · <time dateTime={b.tanggal}>{formatTanggal(b.tanggal)}</time>
      </p>
      <h1 className="mt-3 font-serif text-5xl leading-[1.02] tracking-tight sm:text-6xl">{b.judul}</h1>
      {b.ringkasan && <p className="mt-5 text-xl leading-relaxed text-black/60">{b.ringkasan}</p>}
      <Gambar src={b.gambar} alt={b.judul} priority sizes="(min-width: 768px) 768px, 100vw" className="mt-10 aspect-video rounded-[1.5rem]" />
      <div className="mt-8 space-y-4 text-lg leading-relaxed text-black/75">
        {b.isi.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </article>
  );
}
