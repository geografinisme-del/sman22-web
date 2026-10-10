"use client";

import { useEffect, useRef, useState } from "react";
import { kurangiGerak } from "./gulir";

/** Angka yang menghitung naik saat terlihat. "1.250+" → 0 … 1.250+. Teks non-angka ditampilkan apa adanya. */
export function Angka({ nilai, className = "" }: { nilai: string | number; className?: string }) {
  const teks = String(nilai);
  const cocok = teks.match(/^(\D*)([\d.,]+)(.*)$/);
  const target = cocok ? Number(cocok[2].replace(/[.,](?=\d{3}(\D|$))/g, "").replace(",", ".")) : NaN;
  const [tampil, setTampil] = useState(teks);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !cocok || !Number.isFinite(target) || /,\d{1,2}$/.test(cocok[2]) || kurangiGerak()) return;
    const tahun = /^\d{4}$/.test(cocok[2]); // tahun tidak diberi pemisah ribuan
    const format = (n: number) => `${cocok[1]}${tahun ? Math.round(n) : Math.round(n).toLocaleString("id-ID")}${cocok[3]}`;
    const awal = tahun ? target - 30 : 0;
    setTampil(format(awal));
    let frame = 0;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const mulai = performance.now();
      const durasi = 1600;
      const langkah = (t: number) => {
        const x = Math.min(1, (t - mulai) / durasi);
        const halus = 1 - Math.pow(1 - x, 4);
        setTampil(format(awal + (target - awal) * halus));
        if (x < 1) frame = requestAnimationFrame(langkah);
        else setTampil(teks);
      };
      frame = requestAnimationFrame(langkah);
    }, { rootMargin: "0px 0px -10% 0px" });
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teks]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      <span className="sr-only">{teks}</span>
      <span aria-hidden>{tampil}</span>
    </span>
  );
}
