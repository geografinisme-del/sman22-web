"use client";

import { useRef, type ReactNode } from "react";
import { useGulir } from "./gulir";

/** Latar yang bergerak lebih lambat dari halaman saat di-scroll (kedalaman). */
export function Parallax({ children, kekuatan = 18, className = "" }: { children: ReactNode; kekuatan?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGulir(ref, (p, el) => {
    el.style.transform = `translate3d(0, ${((p - 0.5) * kekuatan).toFixed(2)}%, 0) scale(1.15)`;
  });
  return (
    <div ref={ref} className={`will-change-transform ${className}`}>
      {children}
    </div>
  );
}
