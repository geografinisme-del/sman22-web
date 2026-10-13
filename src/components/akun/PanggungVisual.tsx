"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowUpRight } from "lucide-react";
import type { VisualAkunItem } from "@/lib/data";

const DURASI_GAMBAR = 7000;
const BATAS_VIDEO = 20000;

const tanpaLangganan = () => () => {};
const pantauLebar = (beri: () => void) => {
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener("change", beri);
  return () => mq.removeEventListener("change", beri);
};
/** Video hanya diputar bila pengunjung tidak meminta animasi dikurangi & tidak mode hemat data. */
function useBolehPutar() {
  return useSyncExternalStore(
    tanpaLangganan,
    () =>
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
    () => false,
  );
}

/**
 * Panggung visual panel kiri halaman masuk: gambar/video yang diunggah admin di
 * Tampilan Website → Visual halaman masuk. Lebih dari satu → bergantian otomatis.
 */
export function PanggungVisual({ item, penuh = false }: { item: VisualAkunItem[]; /** memenuhi layar (latar halaman masuk) */ penuh?: boolean }) {
  const [idx, setIdx] = useState(0);
  const boleh = useBolehPutar();
  // video hanya dimuat di layar lebar; HP memakai gambar sampul agar halaman masuk tetap ringan
  const lebar = useSyncExternalStore(pantauLebar, () => window.matchMedia("(min-width: 1024px)").matches, () => false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const total = item.length;
  const aktif = item[idx % total];

  // ganti otomatis: gambar setelah 7 detik; video setelah selesai diputar (maks. 20 detik)
  useEffect(() => {
    if (total < 2 || !boleh) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % total), aktif.jenis === "video" ? BATAS_VIDEO : DURASI_GAMBAR);
    return () => clearTimeout(t);
  }, [idx, total, boleh, aktif.jenis]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (boleh) void v.play().catch(() => {});
    else v.pause();
  }, [idx, boleh]);

  return (
    <div className={penuh ? "absolute inset-0" : "absolute inset-x-10 bottom-12 top-6 xl:inset-x-14"}>
      <figure
        className={`panggung-akun relative h-full w-full overflow-hidden bg-[var(--tema-gelap)] ${
          penuh ? "panggung-penuh" : "rounded-[28px] shadow-[0_40px_80px_-40px_rgb(40_79_215/0.55)] ring-1 ring-white/60"
        }`}
      >
        {item.map((v, i) => {
          const tampil = i === idx % total;
          return (
            <div
              key={v.id}
              aria-hidden={!tampil}
              className={`absolute inset-0 transition-opacity duration-1000 ease-out ${tampil ? "opacity-100" : "opacity-0"}`}
            >
              {v.jenis === "video" && !lebar ? (
                v.poster && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.poster} alt="" className="h-full w-full object-cover" />
                )
              ) : v.jenis === "video" ? (
                tampil && (
                  <video
                    ref={videoRef}
                    key={v.id}
                    src={v.berkas}
                    poster={v.poster}
                    muted
                    playsInline
                    autoPlay={boleh}
                    loop={total < 2}
                    preload="metadata"
                    onEnded={() => total > 1 && setIdx((n) => (n + 1) % total)}
                    className="h-full w-full object-cover"
                  />
                )
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.berkas} alt="" loading={i === 0 ? "eager" : "lazy"} className={`h-full w-full object-cover ${tampil && boleh ? "panggung-zoom" : ""}`} />
              )}
            </div>
          );
        })}
        <div className={`pointer-events-none absolute inset-0 ${penuh ? "panggung-tint" : "bg-gradient-to-t from-black/60 via-black/0 to-black/0"}`} />

        <figcaption
          className={
            penuh
              ? "absolute bottom-8 left-12 z-20 hidden max-w-[46%] flex-wrap items-center gap-3 lg:flex xl:left-16"
              : "absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5"
          }
        >
          {aktif.tautan ? (
            <Link
              href={aktif.tautan}
              className="group inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#1d2147] shadow-lg backdrop-blur transition hover:bg-white"
            >
              {aktif.judulTautan || "Selengkapnya"}
              <ArrowUpRight size={16} aria-hidden className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <span />
          )}
          {aktif.keterangan && <span className="rounded-full bg-black/35 px-3 py-1 text-[11px] text-white/90 backdrop-blur">{aktif.keterangan}</span>}
        </figcaption>

        {total > 1 && (
          <div className={penuh ? "absolute bottom-20 left-12 z-20 hidden gap-1.5 lg:flex xl:left-16" : "absolute right-5 top-5 flex gap-1.5"}>
            {item.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Tampilkan visual ${i + 1}`}
                aria-current={i === idx % total}
                className={`h-1.5 rounded-full transition-all ${i === idx % total ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"}`}
              />
            ))}
          </div>
        )}
      </figure>
    </div>
  );
}
