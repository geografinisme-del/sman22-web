"use client";

import { useEffect, useRef } from "react";
import { kurangiGerak, useGulir } from "./gulir";

/** Kalimat besar yang "menyala" kata demi kata mengikuti scroll. Tanpa JS, teks tampil penuh. */
export function TeksSorot({ teks, className = "" }: { teks: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const kata = teks.split(/\s+/).filter(Boolean);

  useEffect(() => {
    if (kurangiGerak()) return;
    ref.current?.querySelectorAll<HTMLElement>("[data-kata]").forEach((k) => (k.style.opacity = "0.18"));
  }, [teks]);

  useGulir(ref, (p, el) => {
    // menyala antara 20%–60% perjalanan elemen melewati layar
    const maju = Math.min(1, Math.max(0, (p - 0.2) / 0.4));
    const semua = el.querySelectorAll<HTMLElement>("[data-kata]");
    const batas = maju * semua.length;
    semua.forEach((k, i) => {
      const t = Math.min(1, Math.max(0, batas - i));
      k.style.opacity = String(0.18 + 0.82 * t);
    });
  });

  return (
    <p ref={ref} className={className}>
      {kata.map((k, i) => (
        <span key={i} data-kata className="transition-opacity duration-200">
          {k}
          {i < kata.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}
