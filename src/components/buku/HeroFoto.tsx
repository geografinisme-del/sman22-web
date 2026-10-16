"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export type FotoHero = { src: string; alt: string; fokus?: string; sementara?: boolean };

/**
 * Lapisan foto hero Buku Tahunan: foto bertumpuk & berganti crossfade di bingkai tetap (teks tidak bergeser).
 * Keterangan foto kecil di pojok kanan bawah + kontrol manual bila lebih dari satu foto. Foto pertama
 * dirender server (terlihat tanpa JavaScript). Video latar (opsional) hanya dipakai bila file tersedia.
 */
export function HeroFoto({ foto, video }: { foto: FotoHero[]; video?: string }) {
  const [i, setI] = useState(0);
  const total = foto.length;
  const aktif = foto[i];
  return (
    <>
      <div className="hb-foto" aria-roledescription={total > 1 ? "carousel" : undefined} aria-label={total > 1 ? "Foto sekolah" : undefined}>
        {foto.map((f, n) => (
          <Image
            key={f.src + n}
            src={f.src}
            alt={n === i ? f.alt : ""}
            aria-hidden={n !== i || undefined}
            fill
            priority={n === 0}
            sizes="100vw"
            className="object-cover"
            data-aktif={n === i || undefined}
            style={{ objectPosition: f.fokus ?? "50% 45%" }}
          />
        ))}
        {video && <video className="hb-video" src={video} poster={foto[0]?.src} muted loop playsInline autoPlay preload="metadata" aria-hidden />}
        {aktif?.sementara && <span className="media-label">Ilustrasi sementara</span>}
      </div>
      <div className="hb-keterangan">
        <span aria-live="polite">{aktif?.alt}</span>
        {total > 1 && (
          <span className="hb-kontrol">
            <span className="tabular-nums">
              {i + 1}/{total}
            </span>
            <button type="button" onClick={() => setI((x) => (x - 1 + total) % total)} aria-label="Foto sebelumnya">
              <ArrowLeft size={16} aria-hidden />
            </button>
            <button type="button" onClick={() => setI((x) => (x + 1) % total)} aria-label="Foto berikutnya">
              <ArrowRight size={16} aria-hidden />
            </button>
          </span>
        )}
      </div>
    </>
  );
}
