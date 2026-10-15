"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export type Foto = { src: string; alt: string; fokus?: string };

/**
 * Foto pembuka beranda. Satu foto → gambar biasa. Lebih dari satu → ganti manual dengan tombol
 * (tanpa putar otomatis, tanpa perubahan tata letak: semua foto menumpuk di bingkai 4:3 yang sama).
 */
export function FotoPembuka({ foto }: { foto: Foto[] }) {
  const [idx, setIdx] = useState(0);
  const total = foto.length;
  const aktif = foto[idx];

  return (
    <figure aria-roledescription={total > 1 ? "carousel" : undefined} aria-label={total > 1 ? "Foto sekolah" : undefined}>
      <div className="foto pembuka-foto">
        {foto.map((f, i) => (
          <Image
            key={f.src + i}
            src={f.src}
            alt={i === idx ? f.alt : ""}
            aria-hidden={i !== idx || undefined}
            fill
            priority={i === 0}
            sizes="(min-width: 1060px) 52vw, 100vw"
            className="object-cover"
            style={{ objectPosition: f.fokus ?? "50% 50%", opacity: i === idx ? 1 : 0 }}
          />
        ))}
      </div>
      <figcaption className="slide-kontrol">
        <span className="keterangan-foto mt-0" aria-live="polite">
          {aktif.alt}
        </span>
        {total > 1 && (
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-sm tabular-nums text-[#5b6270]">
              {idx + 1}/{total}
            </span>
            <button type="button" onClick={() => setIdx((i) => (i - 1 + total) % total)} aria-label="Foto sebelumnya">
              <ArrowLeft size={18} aria-hidden />
            </button>
            <button type="button" onClick={() => setIdx((i) => (i + 1) % total)} aria-label="Foto berikutnya">
              <ArrowRight size={18} aria-hidden />
            </button>
          </span>
        )}
      </figcaption>
    </figure>
  );
}
