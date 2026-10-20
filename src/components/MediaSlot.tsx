import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

/** next/image hanya untuk berkas situs & Storage Supabase; URL luar lain (mis. sampul katalog) dimuat apa adanya. */
const STORAGE = process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/` : null;
const lewatNextImage = (src: string) => (src.startsWith("/") && !src.startsWith("//")) || Boolean(STORAGE && src.startsWith(STORAGE));

/** Rasio tetap (mis. "3/2", "4/5") atau "isi" = mengisi wadah induk yang sudah berukuran. */
export type RasioMedia = `${number}/${number}` | "isi";

/**
 * SATU komponen foto/video untuk semua halaman publik (kartu, mozaik, galeri, artikel, tur, hero halaman…).
 * - `src` ada → foto asli; `isPlaceholder` → label kecil "Ilustrasi sementara" (foto stok/contoh).
 * - `video` ada → <video> muted, loop, playsinline, poster wajib (pemutaran diatur pemanggil, mis. MesinTur).
 * - tanpa `src`/`video` → blok langit dengan "22" samar (atau `kosong` khusus), bukan kotak abu/ikon rusak.
 * - `ratio` mengunci aspect-ratio sehingga tidak ada layout shift; "isi" untuk wadah yang sudah diberi ukuran.
 * - `focus` = titik fokus foto (object-position), mis. { x: 50, y: 40 } atau "50% 40%".
 * Berkas situs & Storage Supabase lewat next/image (WebP/AVIF, ukuran responsif, lazy kecuali `priority`).
 * Elemen dasar <span> (display:block lewat CSS) agar sah di dalam <a> dan <button>. Gaya di langit/halaman.css.
 */
export function MediaSlot({
  src,
  alt,
  caption,
  ratio = "3/2",
  isPlaceholder = false,
  focus,
  sizes = "100vw",
  priority = false,
  fit = "cover",
  video,
  className = "",
  kelasMedia = "",
  kosong,
  draggable,
  style,
  labelDiNamaInduk = false,
}: {
  src?: string;
  alt: string;
  caption?: ReactNode;
  ratio?: RasioMedia;
  isPlaceholder?: boolean;
  focus?: { x: number; y: number } | string;
  sizes?: string;
  /** foto LCP (hero/di atas lipatan): dimuat segera dengan prioritas tinggi */
  priority?: boolean;
  fit?: "cover" | "contain";
  video?: { src: string; poster?: string; label?: string };
  /** kelas tambahan pada wadah */
  className?: string;
  /** kelas tambahan pada <img>/<video> (dipakai mesin gerak, mis. "tur-foto") */
  kelasMedia?: string;
  /** isi pengganti saat media belum ada */
  kosong?: ReactNode;
  draggable?: boolean;
  style?: CSSProperties;
  /** label "Ilustrasi sementara" disembunyikan dari pembaca layar — pakai bila info itu sudah ada di nama tombol/tautan induk */
  labelDiNamaInduk?: boolean;
}) {
  const posisi = typeof focus === "string" ? focus : focus ? `${focus.x}% ${focus.y}%` : undefined;
  const kotak = (
    <span
      className={`media-slot ${ratio === "isi" ? "media-isi" : ""} ${fit === "contain" ? "media-muat" : ""} ${className}`}
      style={{ ...(ratio === "isi" ? {} : { aspectRatio: ratio }), ...style }}
    >
      {video ? (
        <video className={`media-video ${kelasMedia}`} src={video.src} poster={video.poster} muted loop playsInline preload="none" aria-label={video.label ?? alt} />
      ) : src && !lewatNextImage(src) ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL luar dari CMS (domain beragam, tidak diproksikan)
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          referrerPolicy="no-referrer"
          draggable={draggable}
          className={`media-gambar media-luar ${kelasMedia}`}
          style={posisi ? { objectPosition: posisi } : undefined}
        />
      ) : src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          draggable={draggable}
          className={`media-gambar ${kelasMedia}`}
          style={posisi ? { objectPosition: posisi } : undefined}
        />
      ) : (
        (kosong ?? (
          <span className="media-kosong" role={alt ? "img" : undefined} aria-label={alt ? `${alt} (foto menyusul)` : undefined} aria-hidden={alt ? undefined : true}>
            <span aria-hidden>22</span>
          </span>
        ))
      )}
      {isPlaceholder && (src || video) && (
        <span className="media-label" aria-hidden={labelDiNamaInduk || undefined}>
          Ilustrasi sementara
        </span>
      )}
    </span>
  );
  if (!caption) return kotak;
  return (
    <figure className="media-figur">
      {kotak}
      <figcaption className="media-keterangan">{caption}</figcaption>
    </figure>
  );
}
