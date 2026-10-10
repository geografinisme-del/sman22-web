"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Bagian yang "tertahan" di layar sementara isinya bergeser ke samping mengikuti scroll (layar lebar).
 * Di HP atau bila animasi dikurangi: deretan kartu biasa yang bisa digeser dengan jari.
 */
export function GeserSamping({ kepala, children }: { kepala: ReactNode; children: ReactNode }) {
  const luar = useRef<HTMLDivElement>(null);
  const jalur = useRef<HTMLDivElement>(null);
  const [aktif, setAktif] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)");
    const atur = () => setAktif(mq.matches);
    atur();
    mq.addEventListener("change", atur);
    return () => mq.removeEventListener("change", atur);
  }, []);

  useEffect(() => {
    const l = luar.current;
    const j = jalur.current;
    if (!aktif || !l || !j) return;
    let jarak = 0;
    let frame = 0;
    const hitung = () => {
      frame = 0;
      const p = Math.min(1, Math.max(0, -l.getBoundingClientRect().top / Math.max(1, jarak)));
      j.style.transform = `translate3d(${(-p * jarak).toFixed(1)}px, 0, 0)`;
      l.style.setProperty("--geser", p.toFixed(3));
    };
    const jadwal = () => {
      if (!frame) frame = requestAnimationFrame(hitung);
    };
    const ukur = () => {
      jarak = Math.max(0, j.scrollWidth - window.innerWidth);
      l.style.height = `${window.innerHeight + jarak}px`;
      hitung();
    };
    ukur();
    const ro = new ResizeObserver(ukur);
    ro.observe(j);
    window.addEventListener("scroll", jadwal, { passive: true });
    window.addEventListener("resize", ukur);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", jadwal);
      window.removeEventListener("resize", ukur);
      cancelAnimationFrame(frame);
      l.style.height = "";
      j.style.transform = "";
    };
  }, [aktif]);

  return (
    <div ref={luar} className="relative">
      <div className={aktif ? "sticky top-0 flex h-screen flex-col justify-center overflow-hidden pt-16" : "py-16 sm:py-24"}>
        {kepala}
        <div
          ref={jalur}
          className={
            aktif
              ? "mt-10 flex w-max gap-6 px-10 will-change-transform"
              : "mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:px-8 [scrollbar-width:none]"
          }
        >
          {children}
        </div>
        {aktif && (
          <div className="mx-10 mt-14 h-px bg-current/15">
            <div className="h-px origin-left bg-current" style={{ transform: "scaleX(var(--geser, 0))" }} />
          </div>
        )}
      </div>
    </div>
  );
}
