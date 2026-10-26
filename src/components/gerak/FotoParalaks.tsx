"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Parallax sangat ringan untuk SATU foto: isi bergeser total ±`jarak`px saat foto melintasi layar (HP: setengahnya).
 * Lapisan dalam dilebihkan 12px atas-bawah agar tepi foto tidak pernah terlihat kosong.
 * Mati hanya saat prefers-reduced-motion. Hanya transform (tanpa perubahan layout).
 */
export function FotoParalaks({ children, jarak = 20 }: { children: ReactNode; jarak?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const hitung = () => {
      frame = 0;
      if (kurangiGerak.matches) {
        el.style.transform = "";
        return;
      }
      const r = el.getBoundingClientRect();
      const tinggi = window.innerHeight;
      if (r.bottom < 0 || r.top > tinggi) return;
      // -1 (foto di bawah layar) … 1 (foto di atas layar)
      const t = Math.max(-1, Math.min(1, (tinggi / 2 - (r.top + r.height / 2)) / (tinggi / 2 + r.height / 2)));
      const j = window.innerWidth < 900 ? jarak / 2 : jarak;
      el.style.transform = `translate3d(0, ${(t * j) / 2}px, 0)`;
    };
    const jadwal = () => {
      if (!frame) frame = requestAnimationFrame(hitung);
    };
    hitung();
    window.addEventListener("scroll", jadwal, { passive: true });
    window.addEventListener("resize", jadwal);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", jadwal);
      window.removeEventListener("resize", jadwal);
    };
  }, [jarak]);

  return (
    <div ref={ref} className="absolute inset-x-0 -inset-y-3 will-change-transform">
      {children}
    </div>
  );
}
