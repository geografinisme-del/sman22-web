"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { KataMuncul } from "@/components/motion/JudulMuncul";
import { LencanaPutar } from "@/components/motion/LencanaPutar";
import type { Situs } from "@/lib/data";

export function Hero({ hero, kabar }: { hero: Situs["hero"]; kabar?: { judul: string; href: string } }) {
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

  // kedalaman: bingkai mengecil saat scroll, latar mengikuti kursor, teks memudar
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

  const berikut = foto[(idx + 1) % total];
  const mulaiMiring = 150 + hero.judulAwal.split(/\s+/).length * 80;
  const mulaiAkhir = mulaiMiring + hero.judulMiring.split(/\s+/).length * 80;

  return (
    <section ref={ref} aria-label="Pembuka" className="p-2 sm:p-3">
      <div className="hero-kartu grain relative flex min-h-[calc(100svh-1rem)] flex-col overflow-hidden bg-brand-900 text-white sm:min-h-[calc(100svh-1.5rem)]">
        {/* Foto latar dengan crossfade + zoom pelan */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="hero-latar absolute inset-0">
            {foto.map((f, i) => (
              <div
                key={f.id}
                aria-hidden={i !== idx}
                className={`absolute inset-0 transition-opacity duration-[1600ms] ease-in-out ${i === idx ? "opacity-100" : "opacity-0"}`}
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
          {/* gradasi hangat (bukan hitam pekat) agar teks terbaca tapi foto tetap hidup */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e1430] via-[#0e1430]/35 to-[#0e1430]/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0e1430]/70 via-transparent to-transparent" />
          <div className="absolute -bottom-1/3 -left-1/4 h-[70%] w-[70%] rounded-full bg-kobalt/30 blur-[120px]" />
        </div>

        <div className="hero-isi relative z-[2] mx-auto flex w-full max-w-[90rem] flex-1 flex-col justify-end px-5 pb-6 pt-28 sm:px-10 sm:pb-8">
          {kabar && (
            <Link
              href={kabar.href}
              className="naik mb-7 inline-flex max-w-full items-center gap-3 self-start rounded-full bg-white/10 py-1.5 pl-1.5 pr-4 text-sm ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20"
            >
              <span className="rounded-full bg-mentega px-2.5 py-0.5 text-xs font-semibold text-tinta">Terbaru</span>
              <span className="truncate">{kabar.judul}</span>
              <span className="panah shrink-0">→</span>
            </Link>
          )}

          <div className="flex items-end justify-between gap-10">
            <h1 className="max-w-6xl font-display text-[3.1rem] font-semibold leading-[0.92] tracking-[-0.045em] sm:text-7xl lg:text-[7.4rem]">
              <KataMuncul teks={hero.judulAwal} mulai={150} jeda={80} />{" "}
              <span className="relative inline-block">
                <em className="font-serif text-[1.12em] font-normal italic tracking-[-0.02em] text-mentega">
                  <KataMuncul teks={hero.judulMiring} mulai={mulaiMiring} jeda={80} />
                </em>
                <svg aria-hidden viewBox="0 0 300 24" preserveAspectRatio="none" className="coretan absolute -bottom-[0.06em] left-0 h-[0.18em] w-full text-mentega">
                  <path d="M3 17 C 60 6, 130 4, 190 10 S 280 18, 297 8" pathLength={1} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>{" "}
              <KataMuncul teks={hero.judulAkhir} mulai={mulaiAkhir} jeda={80} />
            </h1>
            <div className="naik hidden shrink-0 xl:block" style={{ animationDelay: "900ms" }}>
              <LencanaPutar teks={`${hero.label} · `} className="h-36 w-36 text-white/80">
                <Image src="/images/logo.png" alt="" width={52} height={52} className="h-13 w-13" />
              </LencanaPutar>
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-10">
              <p className="naik max-w-md text-base leading-relaxed text-white/80 sm:text-lg" style={{ animationDelay: "700ms" }}>
                {hero.teks}
              </p>
              <div className="naik flex flex-wrap gap-3" style={{ animationDelay: "850ms" }}>
                <Link
                  href={hero.tombolUtama.href}
                  className="group inline-flex items-center gap-3 rounded-full bg-white py-2 pl-6 pr-2 text-sm font-semibold text-brand-900 transition hover:bg-mentega"
                >
                  {hero.tombolUtama.label}
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-900 text-white transition duration-500 group-hover:-rotate-45">→</span>
                </Link>
                <Link
                  href={hero.tombolKedua.href}
                  className="rounded-full px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/35 backdrop-blur transition hover:bg-white/10"
                >
                  {hero.tombolKedua.label}
                </Link>
              </div>
            </div>

            {total > 1 && berikut && (
              <button
                type="button"
                onClick={() => setIdx((i) => (i + 1) % total)}
                className="naik group hidden items-center gap-4 rounded-2xl bg-white/10 p-2 pr-5 text-left ring-1 ring-white/15 backdrop-blur-md transition hover:bg-white/15 lg:flex"
                style={{ animationDelay: "1000ms" }}
                aria-label={`Foto berikutnya: ${berikut.alt}`}
              >
                <span className="relative h-16 w-24 overflow-hidden rounded-xl">
                  <Image src={berikut.gambar} alt="" fill sizes="96px" className="object-cover transition duration-700 group-hover:scale-110" />
                </span>
                <span className="text-xs leading-snug">
                  <span className="block uppercase tracking-[0.2em] text-white/50">Berikutnya</span>
                  <span className="mt-1 block max-w-[12rem] text-sm text-white/90">{berikut.alt}</span>
                </span>
              </button>
            )}
          </div>

          {total > 1 && (
            <div className="mt-8 flex items-center gap-4 border-t border-white/15 pt-4 text-xs text-white/70">
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
      </div>
    </section>
  );
}
