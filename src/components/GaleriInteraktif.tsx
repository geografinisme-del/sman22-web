"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Expand, X } from "lucide-react";
import type { FotoItem } from "@/lib/data";

/** Pola ukuran kotak agar grid terasa seperti majalah, bukan deretan kotak seragam */
const POLA = ["md:col-span-2 md:row-span-2", "", "", "md:row-span-2", "", "md:col-span-2", "", ""];

export function GaleriInteraktif({ foto }: { foto: FotoItem[] }) {
  const [buka, setBuka] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const total = foto.length;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (buka === null) {
      if (d.open) d.close();
    } else if (!d.open) d.showModal();
  }, [buka]);

  useEffect(() => {
    if (buka === null) return;
    const tekan = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setBuka((i) => (i === null ? i : (i + 1) % total));
      if (e.key === "ArrowLeft") setBuka((i) => (i === null ? i : (i - 1 + total) % total));
    };
    window.addEventListener("keydown", tekan);
    return () => window.removeEventListener("keydown", tekan);
  }, [buka, total]);

  const aktif = buka === null ? null : foto[buka];

  return (
    <>
      <ul className="grid grid-flow-dense auto-rows-[180px] grid-cols-2 gap-3 md:auto-rows-[200px] md:grid-cols-4">
        {foto.map((f, i) => (
          <li key={f.id} className={`galeri-kotak ${POLA[i % POLA.length]}`} style={{ animationDelay: `${Math.min(i, 12) * 60}ms` }}>
            <button
              type="button"
              onClick={() => setBuka(i)}
              className="group relative block h-full w-full overflow-hidden rounded-2xl bg-[#ede8fa] text-left"
              aria-label={`Perbesar foto: ${f.judul}`}
            >
              {f.gambar && (
                <Image
                  src={f.gambar}
                  alt={f.judul}
                  fill
                  sizes="(min-width: 768px) 50vw, 50vw"
                  className="object-cover transition duration-700 ease-out group-hover:scale-[1.07]"
                />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-[#1a1f3a]/80 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100 group-focus-visible:opacity-100" />
              <span className="absolute inset-x-0 bottom-0 flex translate-y-3 items-end justify-between gap-3 p-4 text-white opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                <span className="text-sm font-medium leading-snug">{f.judul}</span>
                <Expand size={16} aria-hidden className="shrink-0" />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        onClose={() => setBuka(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setBuka(null);
        }}
        className="galeri-dialog"
        aria-label="Tampilan foto"
      >
        {aktif && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-4 px-4 py-3 text-white">
              <p className="truncate text-sm">
                <span className="mr-3 tabular-nums text-white/60">
                  {String((buka ?? 0) + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                </span>
                {aktif.judul}
              </p>
              <button type="button" onClick={() => setBuka(null)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Tutup">
                <X size={20} aria-hidden />
              </button>
            </div>
            <div className="relative flex-1">
              <Image key={aktif.id} src={aktif.gambar} alt={aktif.judul} fill sizes="100vw" className="galeri-besar object-contain" />
              {total > 1 && (
                <>
                  <button type="button" onClick={() => setBuka(((buka ?? 0) - 1 + total) % total)} className="galeri-panah left-3" aria-label="Foto sebelumnya">
                    <ArrowLeft size={20} aria-hidden />
                  </button>
                  <button type="button" onClick={() => setBuka(((buka ?? 0) + 1) % total)} className="galeri-panah right-3" aria-label="Foto berikutnya">
                    <ArrowRight size={20} aria-hidden />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
