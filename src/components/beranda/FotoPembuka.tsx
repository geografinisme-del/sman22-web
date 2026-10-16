"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";

export type Foto = { src: string; alt: string; fokus?: string };

const kueriKurangi = "(prefers-reduced-motion: reduce)";
const langgananKurangi = (cb: () => void) => {
  const mq = window.matchMedia(kueriKurangi);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/**
 * Foto pembuka beranda. Semua foto menumpuk di bingkai yang sama dan berganti dengan crossfade ±520ms
 * (beranda.css), sehingga teks pembuka tidak bergeser.
 * - Bawaan: ganti manual dengan tombol sebelumnya/berikutnya + penghitung.
 * - Otomatis (opsional dari tema): jeda ≥ 7 detik, ada tombol jeda/putar, berhenti permanen setelah
 *   pengunjung menekan kontrol, dan tidak berjalan saat reduced motion atau tab tidak terlihat.
 * - tata "penuh": foto mengisi latar bagian pembuka (tema Modern), kontrol di sudut bawah.
 */
export function FotoPembuka({ foto, tata = "berdampingan", otomatis = false, detik = 8 }: { foto: Foto[]; tata?: string; otomatis?: boolean; detik?: number }) {
  const [idx, setIdx] = useState(0);
  const [jeda, setJeda] = useState(false);
  const [berhenti, setBerhenti] = useState(false);
  const kurangiGerak = useSyncExternalStore(langgananKurangi, () => window.matchMedia(kueriKurangi).matches, () => true);
  const total = foto.length;
  const aktif = foto[Math.min(idx, total - 1)];
  const putar = otomatis && total > 1 && !kurangiGerak && !berhenti;

  useEffect(() => {
    if (!putar || jeda) return;
    const t = window.setInterval(() => {
      if (!document.hidden) setIdx((i) => (i + 1) % total);
    }, Math.max(7, detik) * 1000);
    return () => window.clearInterval(t);
  }, [putar, jeda, total, detik]);

  const geser = (arah: 1 | -1) => {
    setBerhenti(true); // interaksi pengguna menghentikan putar otomatis
    setIdx((i) => (i + arah + total) % total);
  };
  const penuh = tata === "penuh" || tata === "panel";

  return (
    <figure
      className={`pembuka-figur ${tata === "penuh" ? "pembuka-figur-penuh" : tata === "panel" ? "pembuka-figur-panel" : ""}`}
      aria-roledescription={total > 1 ? "carousel" : undefined}
      aria-label={total > 1 ? "Foto sekolah" : undefined}
    >
      <div className="foto pembuka-foto">
        {foto.map((f, i) => (
          <Image
            key={f.src + i}
            src={f.src}
            alt={i === idx ? f.alt : ""}
            aria-hidden={i !== idx || undefined}
            fill
            priority={i === 0}
            sizes={penuh ? "100vw" : "(min-width: 1060px) 52vw, 100vw"}
            className="object-cover"
            data-aktif={i === idx || undefined}
            style={{ objectPosition: f.fokus ?? "50% 50%" }}
          />
        ))}
      </div>
      <figcaption className="slide-kontrol">
        <span className="keterangan-foto mt-0" aria-live={putar && !jeda ? "off" : "polite"}>
          {aktif.alt}
        </span>
        {total > 1 && (
          <span className="flex shrink-0 items-center gap-2">
            <span className="slide-hitung text-sm tabular-nums">
              {idx + 1}/{total}
            </span>
            {putar && (
              <button type="button" onClick={() => setJeda((j) => !j)} aria-pressed={jeda} aria-label={jeda ? "Putar slideshow" : "Jeda slideshow"}>
                {jeda ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
              </button>
            )}
            <button type="button" onClick={() => geser(-1)} aria-label="Foto sebelumnya">
              <ArrowLeft size={18} aria-hidden />
            </button>
            <button type="button" onClick={() => geser(1)} aria-label="Foto berikutnya">
              <ArrowRight size={18} aria-hidden />
            </button>
          </span>
        )}
      </figcaption>
    </figure>
  );
}
