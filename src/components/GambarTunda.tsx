"use client";

import { getImageProps } from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * Foto beranda di bawah hero yang pemuatannya DITUNDA: berkas baru diminta setelah elemen terbesar (LCP) dilukis
 * DAN foto mendekati layar (±400px). Lazy-load bawaan peramban HP mulai mengunduh ±1.250px di bawah layar, sehingga
 * foto kabar/galeri/tur ikut berebut jaringan dengan foto kartu utama (LCP).
 * Elemen <img> yang sama dirender sejak awal (hanya src/srcset yang dipasang kemudian): mesin tur memegang
 * referensi elemen `.tur-foto`, sehingga animasinya tidak berubah. Tanpa JS: <noscript> berisi foto biasa.
 */
let sinyalLcp: Promise<void> | null = null;
function setelahLcp() {
  if (sinyalLcp) return sinyalLcp;
  sinyalLcp = new Promise<void>((selesai) => {
    let po: PerformanceObserver | undefined;
    const beres = () => {
      po?.disconnect();
      selesai();
    };
    // cadangan: peramban tanpa LCP API (Safari) → setelah load
    const cadangan = () => window.setTimeout(beres, 300);
    try {
      po = new PerformanceObserver((d) => d.getEntries().length && beres());
      po.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      /* tanpa LCP API */
    }
    if (document.readyState === "complete") cadangan();
    else window.addEventListener("load", cadangan, { once: true });
  });
  return sinyalLcp;
}

export function GambarTunda({ src, alt, sizes, className, style, draggable }: { src: string; alt: string; sizes: string; className: string; style?: CSSProperties; draggable?: boolean }) {
  const ref = useRef<HTMLImageElement>(null);
  const [siap, setSiap] = useState(false);
  const { props } = getImageProps({ src, alt, fill: true, sizes, loading: "lazy", className, style, draggable });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let io: IntersectionObserver | undefined;
    let batal = false;
    void setelahLcp().then(() => {
      if (batal) return;
      io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && (setSiap(true), io?.disconnect()), { rootMargin: "400px 0px" });
      io.observe(el);
    });
    return () => {
      batal = true;
      io?.disconnect();
    };
  }, []);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- props dari getImageProps (alt ikut) */}
      <img ref={ref} {...props} src={siap ? props.src : undefined} srcSet={siap ? props.srcSet : undefined} data-tunda={siap ? undefined : ""} />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img {...props} />
      </noscript>
    </>
  );
}
