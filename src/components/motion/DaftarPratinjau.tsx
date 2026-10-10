"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Gambar } from "@/components/Gambar";

export type ItemPratinjau = { href: string; judul: string; meta: string; gambar: string };

/**
 * Daftar judul besar; saat kursor melintas, foto melayang mengikuti kursor (layar lebar dengan mouse).
 * Di HP, foto tampil sebagai gambar kecil di samping judul.
 */
export function DaftarPratinjau({ item }: { item: ItemPratinjau[] }) {
  const [aktif, setAktif] = useState<number | null>(null);
  const melayang = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });

  // foto bergerak dengan sedikit "tertinggal" agar terasa luwes
  useEffect(() => {
    if (aktif === null) return;
    const el = melayang.current;
    if (!el) return;
    const pos = { ...target.current };
    let frame = 0;
    const langkah = () => {
      pos.x += (target.current.x - pos.x) * 0.16;
      pos.y += (target.current.y - pos.y) * 0.16;
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) rotate(${((target.current.x - pos.x) * 0.05).toFixed(2)}deg)`;
      frame = requestAnimationFrame(langkah);
    };
    frame = requestAnimationFrame(langkah);
    return () => cancelAnimationFrame(frame);
  }, [aktif]);

  return (
    <div
      className="relative"
      onPointerMove={(e) => {
        target.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerLeave={() => setAktif(null)}
    >
      <ul className="border-t border-current/15">
        {item.map((b, i) => (
          <li key={b.href} className="border-b border-current/15">
            <Link
              href={b.href}
              onPointerEnter={(e) => {
                if (e.pointerType !== "mouse") return;
                target.current = { x: e.clientX, y: e.clientY };
                setAktif(i);
              }}
              onFocus={() => setAktif(null)}
              className="group grid grid-cols-[1fr_88px] items-center gap-5 py-6 sm:grid-cols-[150px_1fr_auto] sm:gap-10 sm:py-9 lg:grid-cols-[180px_1fr_auto]"
            >
              <span className="order-2 col-span-2 text-xs uppercase tracking-[0.2em] opacity-55 sm:order-none sm:col-span-1">{b.meta}</span>
              <span className="font-display text-2xl font-medium leading-[1.1] tracking-[-0.02em] transition duration-500 group-hover:translate-x-2 sm:text-4xl lg:text-[2.75rem]">
                {b.judul}
              </span>
              <Gambar src={b.gambar} alt="" sizes="88px" className="aspect-square rounded-xl sm:hidden" />
              <span
                aria-hidden
                className="hidden h-12 w-12 place-items-center rounded-full border border-current/25 transition duration-500 group-hover:-rotate-45 group-hover:bg-tinta group-hover:text-white sm:grid"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div
        ref={melayang}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-30 hidden h-60 w-80 lg:block"
      >
        {item.map((b, i) => (
          <div
            key={b.href}
            className={`pratinjau absolute inset-0 overflow-hidden rounded-2xl shadow-2xl ${aktif === i ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
          >
            <Gambar src={b.gambar} alt="" sizes="320px" className="h-full w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
