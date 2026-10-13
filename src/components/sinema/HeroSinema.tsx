"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import { ceritaHero } from "@/content/sekolah";
import type { Situs, VisualAkunItem } from "@/lib/data";

export type StatSinema = { nilai: string; label: string };

const pantau = (q: string) => (beri: () => void) => {
  const mq = window.matchMedia(q);
  mq.addEventListener("change", beri);
  return () => mq.removeEventListener("change", beri);
};
const GERAK = "(prefers-reduced-motion: reduce)";
const LEBAR = "(min-width: 761px)";
const pantauGerak = pantau(GERAK);
const pantauLebar = pantau(LEBAR);
const jepit = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
/** 0 → 1 secara halus antara a dan b */
const naik = (p: number, a: number, b: number) => {
  const t = jepit((p - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** PNG/WebP dianggap potongan berlatar transparan; selain itu foto biasa yang dibingkai. */
const potongan = (src: string) => /\.(png|webp)(\?|#|$)/i.test(src);
const sintetis = (src: string) => src.includes("/images/hero/model-sintetis");

/** Latar bawaan bila admin belum mengunggah visual beranda: kamera "berjalan" masuk ke sekolah. */
const LATAR_BAWAAN = [
  { src: "/images/gedung.jpg", alt: "Gedung SMA Negeri 22 Bandung" },
  { src: "/images/upacara-pagi.jpg", alt: "Upacara pagi di lapangan sekolah" },
  { src: "/images/keluarga-besar.jpg", alt: "Keluarga besar SMA Negeri 22 Bandung" },
];

export type TeksSinema = {
  efekGulir: boolean;
  teksRaksasa: string;
  babak2: { label: string; judul: string; miring: string };
  babak3: { label: string; judul: string; miring: string };
};

/**
 * Hero sinematik:
 * - latar: video/gambar dari Visual sinematik (Beranda) yang bergerak mengikuti gulir; bila kosong, foto sekolah;
 * - kanan: foto pembuka (Tampilan Website → Foto pembuka) yang berganti otomatis & bisa diklik ke halamannya;
 * - teks berganti tiga babak saat digulir (isi babak 2 & 3 diatur di Tema & Tampilan).
 */
export function HeroSinema({
  hero,
  visual,
  program,
  stat,
  teks,
}: {
  hero: Situs["hero"];
  visual: VisualAkunItem[];
  program: string[];
  stat: StatSinema[];
  teks: TeksSinema;
}) {
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dikurangi = useSyncExternalStore(pantauGerak, () => window.matchMedia(GERAK).matches, () => false);
  const lebar = useSyncExternalStore(pantauLebar, () => window.matchMedia(LEBAR).matches, () => true);
  const gulir = teks.efekGulir && !dikurangi;

  /* ---------- latar ---------- */
  const video = visual.find((v) => v.jenis === "video");
  const gambarLatar = visual.filter((v) => v.jenis === "gambar").map((v) => ({ src: v.berkas, alt: v.keterangan || "Visual SMAN 22 Bandung" }));
  const latar = gambarLatar.length ? gambarLatar : video?.poster ? [{ src: video.poster, alt: video.keterangan }] : LATAR_BAWAAN;
  const sumberVisual = video ?? visual[0];

  /* ---------- foto pembuka (slideshow) ---------- */
  const slides = hero.slide;
  const total = slides.length;
  const [idx, setIdx] = useState(0);
  const [jeda, setJeda] = useState(false);
  const [disorot, setDisorot] = useState(false);
  const slide = slides[idx % Math.max(1, total)];
  const cerita = ceritaHero[idx % ceritaHero.length];
  const INTERVAL = Math.min(8, Math.max(6, hero.detik || 7)) * 1000;
  useEffect(() => {
    if (total < 2 || jeda || disorot || dikurangi) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % total), INTERVAL);
    return () => clearTimeout(t);
  }, [idx, total, jeda, disorot, dikurangi, INTERVAL]);
  const ganti = (ke: number) => setIdx(((ke % total) + total) % total);

  /* ---------- efek gulir ---------- */
  useEffect(() => {
    const el = ref.current;
    if (!el || !gulir) return;
    const v = videoRef.current;
    let target = 0;
    let kini = 0;
    let frame = 0;
    let jalan = true;
    const latarEl = Array.from(el.querySelectorAll<HTMLElement>("[data-latar]"));

    const hitung = () => {
      const r = el.getBoundingClientRect();
      const jarak = el.offsetHeight - window.innerHeight;
      target = jarak > 0 ? jepit(-r.top / jarak) : 0;
    };
    const lukis = () => {
      frame = 0;
      kini += (target - kini) * 0.12; // pelembut: kamera tidak "melompat"
      if (Math.abs(target - kini) < 0.0005) kini = target;
      const p = kini;
      const f = [1 - naik(p, 0.18, 0.3), naik(p, 0.32, 0.42) * (1 - naik(p, 0.6, 0.7)), naik(p, 0.7, 0.8)];
      el.style.setProperty("--p", p.toFixed(4));
      f.forEach((x, i) => el.style.setProperty(`--f${i}`, x.toFixed(3)));
      // hanya babak yang tampak yang bisa diklik (babak lain tidak "menangkap" ketukan)
      el.dataset.babak = String(f.indexOf(Math.max(...f)));
      const n = latarEl.length;
      latarEl.forEach((a, i) => {
        const t = p * n - i;
        a.style.opacity = i === 0 ? "1" : jepit((t + 0.15) / 0.3).toFixed(3);
        a.style.transform = `scale(${(1.04 + 0.22 * jepit(t, 0, 1.15)).toFixed(4)})`;
      });
      if (v && v.duration && !v.seeking) {
        const waktu = p * (v.duration - 0.05);
        if (Math.abs(v.currentTime - waktu) > 0.02) v.currentTime = waktu;
      }
      if (jalan && kini !== target) frame = requestAnimationFrame(lukis);
    };
    const saatGulir = () => {
      hitung();
      if (!frame) frame = requestAnimationFrame(lukis);
    };
    hitung();
    kini = target;
    lukis();
    window.addEventListener("scroll", saatGulir, { passive: true });
    window.addEventListener("resize", saatGulir);
    v?.addEventListener("loadedmetadata", saatGulir);
    return () => {
      jalan = false;
      window.removeEventListener("scroll", saatGulir);
      window.removeEventListener("resize", saatGulir);
      v?.removeEventListener("loadedmetadata", saatGulir);
      cancelAnimationFrame(frame);
    };
  }, [gulir, lebar]);

  const tautanSlide = slide?.tautan || hero.tombolUtama.href;

  return (
    <section ref={ref} aria-label="Pembuka" data-babak="0" className={`sinema ${gulir ? "" : "sinema-diam"}`}>
      <div className="sinema-panggung">
        {/* latar */}
        <div className="sinema-media" aria-hidden>
          {latar.map((a, i) => (
            <div key={a.src + i} data-latar className="sinema-adegan" style={i ? { opacity: 0 } : undefined}>
              <Image src={a.src} alt="" fill priority={i === 0} sizes="100vw" quality={75} className="object-cover" />
            </div>
          ))}
          {video && lebar && gulir && <video ref={videoRef} src={video.berkas} poster={video.poster} muted playsInline preload="auto" className="sinema-video" />}
        </div>
        <div className="sinema-tint" aria-hidden />

        {teks.teksRaksasa && (
          <p className="sinema-raksasa" aria-hidden>
            {teks.teksRaksasa}
          </p>
        )}

        {/* foto pembuka berganti (kanan) */}
        {total > 0 && (
          <div className="sinema-sorot" onMouseEnter={() => setDisorot(true)} onMouseLeave={() => setDisorot(false)}>
            {slides.map((s, i) => {
              const aktif = i === idx % total;
              const tujuan = s.tautan || hero.tombolUtama.href;
              return (
                <Link
                  key={s.id}
                  href={tujuan}
                  className={`sinema-potret ${aktif ? "aktif" : ""} ${potongan(s.gambar) && !s.video ? "potongan" : "foto"}`}
                  tabIndex={aktif ? undefined : -1}
                  aria-hidden={!aktif || undefined}
                  aria-label={`${s.alt} — buka halaman terkait`}
                  style={{ "--fokus": s.fokus, "--skala": s.skala / 100 } as CSSProperties}
                >
                  <Image
                    src={s.gambarHp && !lebar ? s.gambarHp : s.gambar}
                    alt={aktif ? s.alt : ""}
                    fill
                    priority={i === 0}
                    sizes="(min-width: 761px) 40vw, 70vw"
                    quality={80}
                    style={{ objectPosition: s.fokus }}
                  />
                  {s.video && aktif && !dikurangi && lebar && (
                    <video src={s.video} poster={s.gambar} autoPlay muted loop playsInline aria-hidden style={{ objectPosition: s.fokus }} />
                  )}
                </Link>
              );
            })}
            {cerita && (
              <div className="sinema-cerita" aria-live="polite">
                <span>{cerita.label}</span>
                <strong>{cerita.judul}</strong>
              </div>
            )}
          </div>
        )}

        {/* babak 1 */}
        <div className="sinema-babak sinema-babak-0 lp-wadah">
          <p className="sinema-pil">
            <span className="titik" aria-hidden /> {hero.label}
          </p>
          <h1>
            {hero.judulAwal} <em>{hero.judulMiring}</em> {hero.judulAkhir}
          </h1>
          <p className="sinema-teks">{hero.teks}</p>
          <div className="sinema-aksi">
            <Link href={hero.tombolUtama.href} className="sinema-tombol">
              {hero.tombolUtama.label} <ArrowUpRight size={16} aria-hidden />
            </Link>
            <Link href={hero.tombolKedua.href} className="sinema-tombol sinema-tombol-kaca">
              {hero.tombolKedua.label}
            </Link>
          </div>
        </div>

        {/* babak 2 */}
        {gulir && (
          <div className="sinema-babak sinema-babak-1 lp-wadah">
            <p className="sinema-label">{teks.babak2.label}</p>
            <p className="sinema-judul">
              {teks.babak2.judul}
              <br />
              <em>{teks.babak2.miring}</em>
            </p>
            <ul className="sinema-chip">
              {program.slice(0, 5).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <div className="sinema-aksi">
              <Link href="/program" className="sinema-tombol sinema-tombol-kaca">
                Lihat semua program <ArrowUpRight size={16} aria-hidden />
              </Link>
            </div>
          </div>
        )}

        {/* babak 3 */}
        {gulir && (
          <div className="sinema-babak sinema-babak-2 lp-wadah">
            <p className="sinema-label">{teks.babak3.label}</p>
            <p className="sinema-judul">
              {teks.babak3.judul} <em>{teks.babak3.miring}</em>
            </p>
            <ul className="sinema-stat">
              {stat.slice(0, 4).map((s) => (
                <li key={s.label}>
                  <strong>{s.nilai}</strong>
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
            <div className="sinema-aksi">
              <Link href="/spmb" className="sinema-tombol">
                Informasi SPMB <ArrowUpRight size={16} aria-hidden />
              </Link>
              <Link href="/masuk" className="sinema-tombol sinema-tombol-kaca">
                Masuk portal
              </Link>
            </div>
          </div>
        )}

        {/* kaki: tautan slide, kontrol, keterangan */}
        <div className="sinema-kaki">
          <div className="sinema-kaki-kiri">
            {total > 0 && (
              <Link href={tautanSlide} className="sinema-tautan">
                Lihat selengkapnya <ArrowUpRight size={14} aria-hidden />
              </Link>
            )}
            {sumberVisual?.tautan && (
              <Link href={sumberVisual.tautan} className="sinema-tautan sinema-tautan-kaca">
                {sumberVisual.judulTautan || "Selengkapnya"} <ArrowUpRight size={14} aria-hidden />
              </Link>
            )}
            {gulir && (
              <span className="sinema-gulir" aria-hidden>
                <ArrowDown size={14} /> Gulir
              </span>
            )}
          </div>
          {total > 1 && (
            <div className="sinema-kontrol" role="group" aria-label="Kontrol foto pembuka">
              <button type="button" onClick={() => ganti(idx - 1)} aria-label="Foto sebelumnya">
                <ArrowLeft size={15} aria-hidden />
              </button>
              {slides.map((s, i) => (
                <button key={s.id} type="button" className="titik" aria-label={`Tampilkan foto ${i + 1}`} aria-pressed={i === idx % total} onClick={() => ganti(i)} />
              ))}
              <button type="button" onClick={() => ganti(idx + 1)} aria-label="Foto berikutnya">
                <ArrowRight size={15} aria-hidden />
              </button>
              <button type="button" onClick={() => setJeda((j) => !j)} aria-label={jeda ? "Putar foto pembuka" : "Jeda foto pembuka"} aria-pressed={jeda}>
                {jeda ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
              </button>
            </div>
          )}
          <span className="sinema-ket">
            {[slide && sintetis(slide.gambar) ? "Visual ilustratif · model sintetis" : "", sumberVisual?.keterangan ?? ""].filter(Boolean).join(" · ") || "SMA Negeri 22 Bandung"}
          </span>
        </div>
      </div>
    </section>
  );
}
