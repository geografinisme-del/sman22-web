"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * Galeri "Kehidupan Siswa": mozaik di layar lebar, slider Embla di bawah 1024px.
 * Tanpa JavaScript, layar sempit memakai gulir-geser CSS (scroll-snap) sehingga semua foto tetap dapat dilihat;
 * Embla mengambil alih setelah aktif (kelas `.geser-aktif`). `children` = <li> foto dari server.
 */
export function GeserGaleri({ jumlah, children }: { jumlah: number; children: ReactNode }) {
  // Embla baru diaktifkan saat galeri mendekati layar (tidak membebani pemuatan awal)
  const bingkai = useRef<HTMLDivElement>(null);
  const [dekat, setDekat] = useState(false);
  useEffect(() => {
    const el = bingkai.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && (setDekat(true), io.disconnect()), { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const [emblaRef, embla] = useEmblaCarousel({ active: dekat, align: "start", containScroll: "trimSnaps", breakpoints: { "(min-width: 1024px)": { active: false } } });
  const [aktif, setAktif] = useState(false);
  const [i, setI] = useState(0);
  const [snap, setSnap] = useState(jumlah);

  useEffect(() => {
    if (!embla || !dekat) return;
    const segar = () => {
      // Embla nonaktif di layar lebar → mozaik biasa; sebelum aktif, gulir-geser CSS tetap berlaku
      const hidup = window.matchMedia("(max-width: 1023px)").matches;
      setAktif(hidup);
      setSnap(embla.scrollSnapList().length);
      setI(embla.selectedScrollSnap());
    };
    segar();
    embla.on("select", segar).on("reInit", segar);
    return () => void embla.off("select", segar).off("reInit", segar);
  }, [embla, dekat]);

  const geser = (arah: 1 | -1) => {
    if (!embla) return;
    const instan = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    embla.scrollTo(Math.min(Math.max(i + arah, 0), snap - 1), instan);
  };

  return (
    <div className="bk-geser" ref={bingkai}>
      <div className={`bk-geser-viewport ${aktif ? "geser-aktif" : ""}`} ref={emblaRef}>
        <ul className={`bk-mozaik bk-mozaik-${jumlah}`}>{children}</ul>
      </div>
      {aktif && snap > 1 && (
        <div className="bk-geser-kontrol">
          <span className="tabular-nums">
            {i + 1}/{snap}
          </span>
          <button type="button" onClick={() => geser(-1)} disabled={i === 0} aria-label="Foto sebelumnya">
            <ArrowLeft size={16} aria-hidden />
          </button>
          <button type="button" onClick={() => geser(1)} disabled={i >= snap - 1} aria-label="Foto berikutnya">
            <ArrowRight size={16} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
