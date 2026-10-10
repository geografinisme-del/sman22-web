"use client";

import type { ReactNode } from "react";

/** Kartu dengan cahaya lembut yang mengikuti kursor (hanya perangkat dengan mouse). */
export function Sorot({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`sorot ${className}`}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--sx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--sy", `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </div>
  );
}
