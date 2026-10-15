"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import type { FotoItem } from "@/lib/data";

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
      <ul className="galeri-kisi grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3" data-muncul="kelompok">
        {foto.map((f, i) => (
          <li key={f.id}>
            <figure>
              <button type="button" onClick={() => setBuka(i)} className="foto relative block aspect-[4/3] w-full" aria-label={`Perbesar foto: ${f.judul}`}>
                {f.gambar && <Image src={f.gambar} alt={f.judul} fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover" />}
              </button>
              <figcaption className="keterangan-foto">{f.judul}</figcaption>
            </figure>
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
              <p key={aktif.id} className="galeri-teks truncate text-sm">
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
              <Image key={aktif.id} src={aktif.gambar} alt={aktif.judul} fill sizes="100vw" className="galeri-foto object-contain" />
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
