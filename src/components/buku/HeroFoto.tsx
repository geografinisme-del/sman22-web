"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export type FotoHero = { src: string; alt: string; fokus?: string; sementara?: boolean };

/**
 * Lapisan foto hero Buku Tahunan (slider Embla). Struktur: `.hb-lapisan` (lapisan parallax, digerakkan GSAP)
 * → `.hb-embla` (viewport) → `.hb-embla-isi` (baris slide). Tanpa JavaScript, slide pertama tampil utuh
 * (baris flex dengan overflow tersembunyi). Keterangan foto & kontrol di pojok kanan bawah, tidak ikut bergerak.
 * Video latar (opsional) hanya dipakai bila file tersedia; disembunyikan saat prefers-reduced-motion.
 */
export function HeroFoto({ foto, video }: { foto: FotoHero[]; video?: string }) {
  const total = foto.length;
  // satu foto → Embla tidak diaktifkan (tidak ada kerja inisialisasi di perangkat lambat)
  const [emblaRef, embla] = useEmblaCarousel({ active: total > 1, loop: total > 1, duration: 32 });
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!embla) return;
    const pilih = () => setI(embla.selectedScrollSnap());
    embla.on("select", pilih);
    return () => void embla.off("select", pilih);
  }, [embla]);

  const geser = useCallback(
    (arah: 1 | -1) => {
      if (!embla) return;
      const instan = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      embla.scrollTo((embla.selectedScrollSnap() + arah + total) % total, instan);
    },
    [embla, total],
  );

  const aktif = foto[i];
  return (
    <>
      <div className="hb-lapisan">
        <div className="hb-embla" ref={emblaRef} aria-roledescription={total > 1 ? "carousel" : undefined} aria-label={total > 1 ? "Foto sekolah" : undefined}>
          <div className="hb-embla-isi">
            {foto.map((f, n) => (
              <div className="hb-slide" key={f.src + n} aria-hidden={n !== i || undefined} role={total > 1 ? "group" : undefined} aria-roledescription={total > 1 ? "slide" : undefined}>
                <Image src={f.src} alt={f.alt} fill loading={n === 0 ? "eager" : "lazy"} fetchPriority={n === 0 ? "high" : undefined} sizes="100vw" className="object-cover" style={{ objectPosition: f.fokus ?? "50% 45%" }} />
              </div>
            ))}
          </div>
        </div>
        {video && <video className="hb-video" src={video} poster={foto[0]?.src} muted loop playsInline autoPlay preload="metadata" aria-hidden />}
      </div>
      {aktif?.sementara && <span className="media-label hb-label">Ilustrasi sementara</span>}
      <div className="hb-keterangan">
        <span aria-live="polite">{aktif?.alt}</span>
        {total > 1 && (
          <span className="hb-kontrol">
            <span className="tabular-nums">
              {i + 1}/{total}
            </span>
            <button type="button" onClick={() => geser(-1)} aria-label="Foto sebelumnya">
              <ArrowLeft size={16} aria-hidden />
            </button>
            <button type="button" onClick={() => geser(1)} aria-label="Foto berikutnya">
              <ArrowRight size={16} aria-hidden />
            </button>
          </span>
        )}
      </div>
    </>
  );
}
