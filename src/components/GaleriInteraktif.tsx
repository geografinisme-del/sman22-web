"use client";

import { MediaSlot } from "@/components/MediaSlot";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import type { FotoItem } from "@/lib/data";

/** Rasio bergiliran agar kisi kolom (masonry) tampak alami tanpa data ukuran foto. */
const RASIO = ["4/5", "4/3", "1/1", "3/4", "16/10"] as const;

/** Galeri masonry + lightbox (dialog bawaan: Esc menutup, panah kiri/kanan berpindah). */
/** lebar tampil kolom kisi galeri (halaman.css): 2 kolom < 900px, 3 kolom di desktop (wadah maks. ±1240px) */
const UKURAN_KISI = "(min-width: 1280px) 400px, (min-width: 900px) 33vw, 50vw";

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
      <ul className="galeri-kisi">
        {foto.map((f, i) => (
          <li key={f.id}>
            <figure>
              <button type="button" onClick={() => setBuka(i)} className="block w-full" aria-label={`Perbesar foto: ${f.judul}${f.sementara ? ` (${f.label ?? "Ilustrasi sementara"})` : ""}`}>
                <MediaSlot src={f.gambar} alt="" ratio={RASIO[i % RASIO.length]} isPlaceholder={f.sementara} label={f.label} labelDiNamaInduk sizes={UKURAN_KISI} priority={i < 6} />
              </button>
              <figcaption className="keterangan-foto">
                {f.judul}
                {f.asli && (
                  <>
                    {" · "}
                    <a href={f.asli} target="_blank" rel="noopener" className="tautan-foto-asli">
                      Lihat foto asli
                    </a>
                  </>
                )}
              </figcaption>
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
                {aktif.asli && (
                  <a href={aktif.asli} target="_blank" rel="noopener" className="ml-3 underline underline-offset-2">
                    Lihat foto asli
                  </a>
                )}
              </p>
              <button type="button" onClick={() => setBuka(null)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Tutup">
                <X size={20} aria-hidden />
              </button>
            </div>
            <div className="relative flex-1">
              <MediaSlot key={aktif.id} src={aktif.gambar} alt={aktif.judul} ratio="isi" fit="contain" sizes="100vw" className="absolute inset-0" kelasMedia="galeri-foto" isPlaceholder={aktif.sementara} label={aktif.label} />
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
