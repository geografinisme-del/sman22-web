import Image from "next/image";

export type RasioMedia = "3/2" | "16/9" | "3/1" | "1/1" | "4/3";

/**
 * Satu-satunya komponen foto/video situs publik.
 * - `src` ada  → foto asli (atau ilustrasi bila `isPlaceholder`, diberi label "Ilustrasi sementara").
 * - `src` kosong → blok krem gelap bermotif garis emas tipis & angka "22" samar (BUKAN kotak abu/ikon rusak).
 *   Untuk berita tanpa foto, pemanggil sebaiknya TIDAK merender MediaSlot sama sekali.
 * - `video` (opsional) hanya dipakai bila file ada; muted, loop, playsinline, dengan poster wajib (`src`).
 * Rasio dikunci lewat aspect-ratio sehingga tidak ada layout shift.
 */
export function MediaSlot({
  src,
  alt,
  caption,
  ratio = "3/2",
  isPlaceholder = false,
  sizes = "100vw",
  priority,
  video,
  className = "",
  fokus,
  isi,
}: {
  src?: string;
  alt: string;
  caption?: string;
  ratio?: RasioMedia | "isi";
  isPlaceholder?: boolean;
  sizes?: string;
  priority?: boolean;
  video?: string;
  className?: string;
  /** object-position, mis. "50% 40%" */
  fokus?: string;
  /** "isi" = mengisi wadah induk (untuk hero/mozaik) alih-alih rasio tetap */
  isi?: boolean;
}) {
  const kotak = (
    <div className={`media-slot ${isi || ratio === "isi" ? "media-isi" : ""}`} style={isi || ratio === "isi" ? undefined : { aspectRatio: ratio }}>
      {src ? (
        <>
          <Image src={src} alt={alt} fill sizes={sizes} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} className="object-cover" style={fokus ? { objectPosition: fokus } : undefined} />
          {video && (
            <video className="media-video" src={video} poster={src} muted loop playsInline autoPlay preload="none" aria-hidden data-video-latar>
              {/* video hanya hiasan; isi utama tetap foto poster + teks */}
            </video>
          )}
        </>
      ) : (
        <div className="media-kosong" role="img" aria-label={alt}>
          <span aria-hidden>22</span>
        </div>
      )}
      {isPlaceholder && src && <span className="media-label">Ilustrasi sementara</span>}
    </div>
  );
  if (!caption) return <div className={className}>{kotak}</div>;
  return (
    <figure className={className}>
      {kotak}
      <figcaption className="media-keterangan">{caption}</figcaption>
    </figure>
  );
}
