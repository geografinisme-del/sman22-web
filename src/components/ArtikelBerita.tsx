import { MediaSlot } from "@/components/MediaSlot";
import { InfoCard, PageHero, Prose, SectionHeading } from "@/components/langit/Komponen";
import type { BeritaItem } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

/** Tampilan satu berita (PageHero + Prose + berita terkait) — dipakai halaman publik dan pratinjau admin. */
export function ArtikelBerita({ b, terkait = [] }: { b: BeritaItem; terkait?: BeritaItem[] }) {
  return (
    <article className="lp">
      <PageHero judul={b.judul} label={[b.kategori, formatTanggal(b.tanggal)].filter(Boolean).join(" · ")} remah={[{ href: "/berita", label: "Berita" }]} deskripsi={b.ringkasan || undefined} />
      <section className="lgt-bagian">
        <div className="lgt-wadah">
          <Prose className="mx-auto">
            {b.gambar && (
              <figure>
                <MediaSlot src={b.gambar} alt={b.judul} ratio="3/2" priority isPlaceholder={b.gambarSementara} sizes="(min-width: 900px) 760px, 100vw" className="rounded-[18px]" />
              </figure>
            )}
            <p className="sr-only">
              Diterbitkan <time dateTime={b.tanggal}>{formatTanggal(b.tanggal)}</time>
            </p>
            {b.isi.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </Prose>
        </div>
      </section>
      {terkait.length > 0 && (
        <section className="lgt-bagian lgt-bagian-soft" aria-labelledby="judul-terkait">
          <div className="lgt-wadah">
            <SectionHeading id="judul-terkait" label="Berita terkait" judul="Baca juga." aksi={{ href: "/berita", label: "Semua berita" }} />
            <div className="lgt-kisi mt-8">
              {terkait.map((t) => (
                <InfoCard key={t.slug} href={`/berita/${t.slug}`} foto={t.gambar} alt={t.judul} sementara={t.gambarSementara} label={[t.kategori, formatTanggal(t.tanggal)].filter(Boolean).join(" · ")} judul={t.judul} deskripsi={t.ringkasan} aksi="Baca" />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
