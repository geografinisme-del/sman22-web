"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { KataMuncul } from "@/components/motion/JudulMuncul";
import type { Situs } from "@/lib/data";

export function Hero({ hero }: { hero: Situs["hero"] }) {
  const [idx, setIdx] = useState(0);
  const [jeda, setJeda] = useState(false);
  const foto = hero.slide;
  const total = foto.length;
  const INTERVAL_MS = Math.min(8, Math.max(6, hero.detik)) * 1000;
  const ref = useRef<HTMLElement>(null);
  // video hanya diputar bila animasi tidak dikurangi & bukan mode hemat data
  const bolehVideo = useSyncExternalStore(
    () => () => {},
    () =>
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
    () => false,
  );

  // kedalaman: latar bergeser saat scroll & mengikuti kursor; teks memudar saat digulir
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const gulir = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const p = Math.min(1, Math.max(0, window.scrollY / el.offsetHeight));
        el.style.setProperty("--p", p.toFixed(3));
      });
    };
    const kursor = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      el.style.setProperty("--mx", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
      el.style.setProperty("--my", ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
    };
    window.addEventListener("scroll", gulir, { passive: true });
    el.addEventListener("pointermove", kursor);
    gulir();
    return () => {
      window.removeEventListener("scroll", gulir);
      el.removeEventListener("pointermove", kursor);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches || jeda || total < 2) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % total), INTERVAL_MS);
    return () => clearTimeout(t);
  }, [idx, jeda, total, INTERVAL_MS]);

  return (
    <section
      ref={ref}
      aria-label="Pembuka"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-brand-900 text-white"
    >
      {/* Foto latar dengan efek crossfade + zoom pelan */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
       <div className="hero-latar absolute inset-0">
        {foto.map((f, i) => (
          <div
            key={f.id}
            aria-hidden={i !== idx}
            className={`absolute inset-0 transition-opacity duration-[1600ms] ease-in-out ${
              i === idx ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="absolute inset-0" style={{ transform: `scale(${f.skala / 100})` }}>
              <Image
                src={f.gambar}
                alt={f.alt}
                fill
                priority={i === 0}
                sizes="100vw"
                quality={80}
                style={{ objectPosition: f.fokus }}
                className={`object-cover ${f.gambarHp ? "hidden sm:block" : ""} ${i === idx ? "kenburns" : ""}`}
                key={i === idx ? `aktif-${idx}` : f.id}
              />
              {f.gambarHp && (
                <Image
                  src={f.gambarHp}
                  alt={f.alt}
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  quality={80}
                  style={{ objectPosition: f.fokus }}
                  className={`object-cover sm:hidden ${i === idx ? "kenburns" : ""}`}
                  key={i === idx ? `hp-aktif-${idx}` : `hp-${f.id}`}
                />
              )}
              {f.video && bolehVideo && (
                <video
                  src={f.video}
                  poster={f.gambar}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload={i === 0 ? "auto" : "none"}
                  aria-hidden
                  ref={(v) => {
                    if (!v) return;
                    if (i === idx) void v.play().catch(() => {});
                    else v.pause();
                  }}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ objectPosition: f.fokus }}
                />
              )}
            </div>
          </div>
        ))}
       </div>
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/60 via-brand-900/30 to-brand-900/95" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-900/90 via-brand-900/55 to-brand-900/0" />
        <div className="absolute inset-0 bg-brand-900/25 sm:hidden" />
      </div>

      <div className="hero-isi mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-5 pb-16 pt-32 sm:px-8 sm:pb-20">
        <p className="naik text-xs font-medium uppercase tracking-[0.3em] text-white/80 sm:text-sm">{hero.label}</p>
        <h1 className="mt-5 max-w-5xl font-serif text-[3.2rem] leading-[0.95] tracking-tight sm:text-7xl lg:text-[7.5rem]">
          <KataMuncul teks={hero.judulAwal} mulai={150} />{" "}
          <em className="text-accent-400">
            <KataMuncul teks={hero.judulMiring} mulai={150 + hero.judulAwal.split(/\s+/).length * 70} />
          </em>{" "}
          <KataMuncul teks={hero.judulAkhir} mulai={150 + (hero.judulAwal + " " + hero.judulMiring).split(/\s+/).length * 70} />
        </h1>
        <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <p className="naik max-w-md text-base text-white/80 sm:text-lg" style={{ animationDelay: "600ms" }}>
            {hero.teks}
          </p>
          <div className="naik flex flex-wrap gap-3" style={{ animationDelay: "750ms" }}>
            <Link
              href={hero.tombolUtama.href}
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-900 transition hover:bg-accent-400"
            >
              {hero.tombolUtama.label}
            </Link>
            <Link
              href={hero.tombolKedua.href}
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              {hero.tombolKedua.label}
            </Link>
          </div>
        </div>

        {total > 1 && (
          <div className="mt-12 flex items-center gap-4 border-t border-white/15 pt-5 text-xs text-white/70">
            {foto[idx]?.tautan && (
              <Link href={foto[idx].tautan!} className="rounded-full border border-white/30 px-3 py-1 hover:bg-white/10">
                Lihat selengkapnya →
              </Link>
            )}
            <span className="tabular-nums">
              {String(idx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
            <div className="flex flex-1 gap-2">
              {foto.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`Tampilkan foto ${i + 1}: ${f.alt}`}
                  aria-current={i === idx}
                  className="group relative h-6 flex-1"
                >
                  <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/25" />
                  {i < idx && <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white" />}
                  {i === idx && (
                    <span
                      key={`bar-${idx}`}
                      className="isi-bar absolute left-0 top-1/2 h-px -translate-y-1/2 bg-white"
                      style={{ animationDuration: `${INTERVAL_MS}ms`, animationPlayState: jeda ? "paused" : "running" }}
                    />
                  )}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setJeda((j) => !j)}
              className="rounded-full border border-white/30 px-3 py-1 hover:bg-white/10"
              aria-label={jeda ? "Putar slideshow" : "Jeda slideshow"}
            >
              {jeda ? "Putar" : "Jeda"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
