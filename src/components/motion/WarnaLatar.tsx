"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Warna latar halaman berganti halus mengikuti bagian yang sedang berada di tengah layar.
 * Bagian ditandai dengan `{...latar("#hex")}` (lihat latar.ts); saat JS aktif, latar bagian dibuat transparan
 * dan pembungkus inilah yang berganti warna — terasa mengalir, bukan kotak-kotak kaku.
 */
export function WarnaLatar({ awal, children }: { awal: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const bagian = el.querySelectorAll<HTMLElement>("[data-latar]");
    el.classList.add("latar-hidup");
    const obs = new IntersectionObserver(
      (entri) => {
        for (const e of entri) {
          if (e.isIntersecting) el.style.backgroundColor = (e.target as HTMLElement).dataset.latar ?? awal;
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    bagian.forEach((b) => obs.observe(b));
    return () => {
      obs.disconnect();
      el.classList.remove("latar-hidup");
    };
  }, [awal]);

  return (
    <div ref={ref} className="transition-colors duration-700 ease-out" style={{ backgroundColor: awal }}>
      {children}
    </div>
  );
}
