"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import { ceritaHero } from "@/content/sekolah";
import type { Situs } from "@/lib/data";

const TRANSISI_MS = 500;

const pantauGerak = (beri: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", beri);
  return () => mq.removeEventListener("change", beri);
};
const pantauSesi = (beri: () => void) => {
  window.addEventListener("storage", beri);
  return () => window.removeEventListener("storage", beri);
};
const slideTersimpan = () => {
  try {
    return sessionStorage.getItem("hero-slide");
  } catch {
    return null;
  }
};
/** PNG/WebP dianggap potongan berlatar transparan; selain itu foto biasa yang dibingkai lengkung. */
const potongan = (src: string) => /\.(png|webp)(\?|#|$)/i.test(src);
/** Model bawaan adalah ilustrasi sintetis — diberi keterangan jujur di bawahnya. */
const sintetis = (src: string) => src.includes("/images/hero/model-sintetis");

export function Hero({ hero, info = [] }: { hero: Situs["hero"]; info?: { judul: string; isi: string }[] }) {
  const slides = hero.slide;
  const total = slides.length;
  const INTERVAL_MS = Math.min(8, Math.max(6, hero.detik || 7)) * 1000;
  const [dipilih, setDipilih] = useState<string | null>(null);
  const [jeda, setJeda] = useState(false);
  const [disorot, setDisorot] = useState(false);
  const [difokus, setDifokus] = useState(false);
  const [tersembunyi, setTersembunyi] = useState(false);
  const [pergi, setPergi] = useState(false);
  const router = useRouter();
  const navigasi = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dikurangi = useSyncExternalStore(pantauGerak, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
  const diingat = useSyncExternalStore(pantauSesi, slideTersimpan, () => null);

  const idx = Math.max(0, slides.findIndex((s) => s.id === (dipilih ?? diingat)));
  const slide = slides[idx];
  const cerita = ceritaHero[idx % ceritaHero.length];
  const berhenti = jeda || disorot || difokus || tersembunyi || dikurangi || pergi;

  const ingat = (id: string) => {
    setDipilih(id);
    try {
      sessionStorage.setItem("hero-slide", id);
    } catch {}
  };

  const visual = useRef<HTMLDivElement>(null);
  // kedalaman: lapisan visual bergeser halus mengikuti kursor (hanya mouse, tidak saat gerak dikurangi)
  useEffect(() => {
    const el = visual.current;
    if (!el || dikurangi) return;
    let frame = 0;
    const gerak = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        el.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      });
    };
    const reset = () => {
      el.style.setProperty("--mx", "0");
      el.style.setProperty("--my", "0");
    };
    const induk = el.closest("section") ?? el;
    induk.addEventListener("pointermove", gerak as EventListener);
    induk.addEventListener("pointerleave", reset);
    return () => {
      induk.removeEventListener("pointermove", gerak as EventListener);
      induk.removeEventListener("pointerleave", reset);
      cancelAnimationFrame(frame);
    };
  }, [dikurangi]);

  // berhenti saat tab tidak terlihat; pulihkan saat kembali dari halaman tujuan (tombol back)
  useEffect(() => {
    const lihat = () => setTersembunyi(document.hidden);
    const pulih = () => setPergi(false);
    document.addEventListener("visibilitychange", lihat);
    window.addEventListener("pageshow", pulih);
    return () => {
      document.removeEventListener("visibilitychange", lihat);
      window.removeEventListener("pageshow", pulih);
      if (navigasi.current) clearTimeout(navigasi.current);
    };
  }, []);

  useEffect(() => {
    if (berhenti || total < 2) return;
    const t = setTimeout(() => ingat(slides[(idx + 1) % total].id), INTERVAL_MS);
    return () => clearTimeout(t);
  }, [idx, berhenti, total, slides, INTERVAL_MS]);

  const ganti = (ke: number) => {
    if (!pergi) ingat(slides[(ke + total) % total].id);
  };

  // klik potret: transisi singkat lalu menuju halaman terkait
  const ikuti = (e: MouseEvent<HTMLAnchorElement>, tujuan: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (navigasi.current) return;
    setPergi(true);
    navigasi.current = setTimeout(() => {
      navigasi.current = null;
      router.push(tujuan);
    }, dikurangi ? 0 : TRANSISI_MS);
  };

  const kata = [hero.judulAwal, hero.judulMiring, hero.judulAkhir].filter(Boolean);
  // ukuran judul mengikuti kata terpanjang (baris boleh membungkus) agar tidak menabrak potret
  const panjang = Math.max(9, ...kata.flatMap((k) => k.split(/\s+/)).map((w) => w.length));

  return (
    <>
      <section
        className={`editorial-hero ${pergi ? "is-leaving" : ""}`}
        aria-label={`Cerita ${hero.label}`}
        aria-roledescription={total > 1 ? "carousel" : undefined}
        onMouseEnter={() => setDisorot(true)}
        onMouseLeave={() => setDisorot(false)}
        onFocusCapture={() => setDifokus(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setDifokus(false);
        }}
        style={{ "--hero-theme": cerita?.warna ?? "#284fd7" } as CSSProperties}
      >
        <div className="hero-intro">
          <p className="eyebrow">{hero.label}</p>
          <h1 style={{ "--panjang": panjang } as CSSProperties}>
            {kata.map((k, i) => (
              <span key={i} className="baris-judul">
                <span style={{ animationDelay: `${120 + i * 130}ms` }}>{i === 1 ? <em>{k}</em> : k}</span>
              </span>
            ))}
          </h1>
          <p className="hero-subtitle">{hero.teks}</p>
          <div className="hero-primary-actions">
            <Link className="btn btn-primary" href={hero.tombolUtama.href}>
              {hero.tombolUtama.label} <ArrowUpRight size={17} aria-hidden />
            </Link>
            <Link className="hero-portal-link" href={hero.tombolKedua.href}>
              {hero.tombolKedua.label} <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>

        <div className="hero-visual" ref={visual}>
          <div className="hero-petal" aria-hidden />
          <div className="hero-disc" aria-hidden />
          <div className="hero-orbit" aria-hidden />
          <span className="hero-spark" aria-hidden>
            ✳
          </span>
          {slides.map((s, i) => {
            const tujuan = s.tautan || hero.tombolUtama.href;
            const gaya = {
              "--focus": s.fokus,
              "--focus-hp": s.fokus,
              "--scale": potongan(s.gambar) ? 1.08 * (s.skala / 100) : s.skala / 100,
              "--scale-hp": potongan(s.gambarHp || s.gambar) ? 1.12 * (s.skala / 100) : s.skala / 100,
            } as CSSProperties;
            return (
              <a
                key={s.id}
                href={tujuan}
                onClick={(e) => ikuti(e, tujuan)}
                className={`hero-portrait ${i === idx ? "is-active" : ""} ${potongan(s.gambar) && !s.video ? "" : "is-foto"}`}
                inert={i !== idx}
                aria-hidden={i !== idx || undefined}
                aria-label={`${s.alt} — buka halaman terkait`}
                style={gaya}
              >
                <span className="hero-portrait-isi">
                  <Image
                    src={s.gambar}
                    alt={i === idx ? s.alt : ""}
                    fill
                    priority={i === 0}
                    sizes="(max-width: 760px) 92vw, (max-width: 1100px) 48vw, 560px"
                    quality={75}
                    className={s.gambarHp ? "hidden sm:block" : ""}
                    style={{ objectPosition: s.fokus }}
                  />
                  {s.gambarHp && (
                    <Image
                      src={s.gambarHp}
                      alt={i === idx ? s.alt : ""}
                      fill
                      priority={i === 0}
                      sizes="92vw"
                      quality={75}
                      className="sm:hidden"
                      style={{ objectPosition: s.fokus }}
                    />
                  )}
                  {s.video && !dikurangi && (
                    <video
                      src={s.video}
                      poster={s.gambar}
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
                      style={{ objectPosition: s.fokus }}
                    />
                  )}
                </span>
              </a>
            );
          })}
          <div className="hero-sticker" aria-hidden>
            <span>Hari ini belajar.</span>
            <strong>Esok, memberi arti.</strong>
            <span className="sticker-line" />
          </div>
          {slide && sintetis(slide.gambar) && <span className="hero-image-credit">Visual ilustratif · model sintetis</span>}
        </div>

        <div className="hero-aside">
          <span className="hero-edition" aria-hidden>
            RUANG TUMBUH / 22
          </span>
          <div className="hero-story" aria-live={berhenti ? "polite" : "off"} aria-atomic="true">
            <p className="eyebrow">{cerita?.label}</p>
            <h2>{cerita?.judul}</h2>
            <p>{cerita?.teks}</p>
          </div>
          <div className="hero-secondary-actions">
            <Link href="#program">
              Lihat program <ArrowUpRight size={16} aria-hidden />
            </Link>
            <Link href="/berita">
              Berita terbaru <ArrowUpRight size={16} aria-hidden />
            </Link>
          </div>
        </div>

        {total > 1 && (
          <div className="editorial-controls" role="group" aria-label="Kontrol slideshow">
            <button type="button" onClick={() => ganti(idx - 1)} aria-label="Slide sebelumnya">
              <ArrowLeft size={17} aria-hidden />
            </button>
            <span className="hero-count" aria-hidden>
              {String(idx + 1).padStart(2, "0")} <span>/ {String(total).padStart(2, "0")}</span>
            </span>
            <div className="hero-dots">
              {slides.map((s, i) => (
                <button key={s.id} type="button" aria-label={`Tampilkan slide ${i + 1}`} aria-pressed={idx === i} onClick={() => ganti(i)}>
                  <span />
                </button>
              ))}
            </div>
            <button type="button" onClick={() => ganti(idx + 1)} aria-label="Slide berikutnya">
              <ArrowRight size={17} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setJeda(!jeda)}
              aria-label={jeda ? "Putar slideshow" : "Jeda slideshow"}
              aria-pressed={jeda}
              disabled={dikurangi}
            >
              {jeda || dikurangi ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
            </button>
            <span className="sr-only" role="status">
              {dikurangi
                ? "Gerakan dikurangi. Slideshow otomatis dinonaktifkan."
                : berhenti
                  ? "Slideshow dijeda."
                  : `Slideshow berganti setiap ${INTERVAL_MS / 1000} detik.`}
            </span>
          </div>
        )}
      </section>
      <div className="editorial-hero-bottom">
        {info.length > 0 ? (
          <div className="pita-info" aria-label="Pengumuman terbaru">
            <div className="pita-jalan">
              {[0, 1].map((salinan) => (
                <span key={salinan} aria-hidden={salinan === 1 || undefined} className="pita-isi">
                  {info.map((p, i) => (
                    <span key={i}>
                      <strong>{p.judul}</strong> {p.isi}
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <span>RUANG UNTUK BELAJAR. KESEMPATAN UNTUK BERARTI.</span>
        )}
        <a href="#nilai">
          Kenali sekolah lebih dekat <ArrowDown size={14} aria-hidden />
        </a>
      </div>
    </>
  );
}
