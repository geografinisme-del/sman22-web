"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import type { Situs, VisualAkunItem } from "@/lib/data";

export type StatSinema = { nilai: string; label: string };

const pantauGerak = (beri: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", beri);
  return () => mq.removeEventListener("change", beri);
};
const pantauLebar = (beri: () => void) => {
  const mq = window.matchMedia("(min-width: 761px)");
  mq.addEventListener("change", beri);
  return () => mq.removeEventListener("change", beri);
};
const jepit = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
/** 0 → 1 secara halus antara a dan b */
const naik = (p: number, a: number, b: number) => {
  const t = jepit((p - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Adegan bawaan bila admin belum mengunggah visual beranda: kamera "berjalan" masuk ke sekolah. */
const ADEGAN_BAWAAN = [
  { src: "/images/gedung.jpg", alt: "Gedung SMA Negeri 22 Bandung" },
  { src: "/images/upacara-pagi.jpg", alt: "Upacara pagi di lapangan sekolah" },
  { src: "/images/keluarga-besar.jpg", alt: "Keluarga besar SMA Negeri 22 Bandung" },
];

/**
 * Hero sinematik: panggung lengket setinggi layar; saat digulir, kamera mendorong masuk
 * (atau video diputar maju-mundur mengikuti scroll) dan teks berganti dalam tiga babak.
 */
export function HeroSinema({
  hero,
  visual,
  program,
  stat,
}: {
  hero: Situs["hero"];
  visual: VisualAkunItem[];
  program: string[];
  stat: StatSinema[];
}) {
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dikurangi = useSyncExternalStore(pantauGerak, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
  // video hanya di layar lebar (HP memakai gambar sampul agar hemat kuota)
  const lebar = useSyncExternalStore(pantauLebar, () => window.matchMedia("(min-width: 761px)").matches, () => false);

  const video = visual.find((v) => v.jenis === "video");
  const gambarCms = visual.filter((v) => v.jenis === "gambar").map((v) => ({ src: v.berkas, alt: v.keterangan || "Visual SMAN 22 Bandung" }));
  const adegan = gambarCms.length ? gambarCms : video?.poster ? [{ src: video.poster, alt: video.keterangan }] : ADEGAN_BAWAAN;
  const pakaiBawaan = !visual.length;
  const keterangan = video?.keterangan || visual[0]?.keterangan || "";
  const tautanVisual = (video ?? visual[0])?.tautan;
  const judulTautan = (video ?? visual[0])?.judulTautan;

  useEffect(() => {
    const el = ref.current;
    if (!el || dikurangi) return;
    const v = videoRef.current;
    let target = 0;
    let kini = 0;
    let frame = 0;
    let jalan = true;
    const adeganEl = Array.from(el.querySelectorAll<HTMLElement>("[data-adegan]"));

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
      el.style.setProperty("--p", p.toFixed(4));
      el.style.setProperty("--f0", (1 - naik(p, 0.16, 0.3)).toFixed(3));
      el.style.setProperty("--f1", (naik(p, 0.3, 0.42) * (1 - naik(p, 0.6, 0.7))).toFixed(3));
      el.style.setProperty("--f2", naik(p, 0.68, 0.8).toFixed(3));
      // adegan foto: tiap foto mendapat jatah gulir; foto berikut memudar masuk di atasnya
      const n = adeganEl.length;
      adeganEl.forEach((a, i) => {
        const t = p * n - i;
        a.style.opacity = i === 0 ? "1" : jepit((t + 0.15) / 0.3).toFixed(3);
        a.style.transform = `scale(${(1.04 + 0.22 * jepit(t, 0, 1.15)).toFixed(4)})`;
      });
      // video: diputar maju-mundur mengikuti gulir
      if (v && v.duration && !v.seeking) {
        const waktu = p * (v.duration - 0.05);
        if (Math.abs(v.currentTime - waktu) > 0.02) v.currentTime = waktu;
      }
      if (jalan && kini !== target) frame = requestAnimationFrame(lukis);
    };
    const gulir = () => {
      hitung();
      if (!frame) frame = requestAnimationFrame(lukis);
    };
    hitung();
    kini = target;
    lukis();
    window.addEventListener("scroll", gulir, { passive: true });
    window.addEventListener("resize", gulir);
    v?.addEventListener("loadedmetadata", gulir);
    return () => {
      jalan = false;
      window.removeEventListener("scroll", gulir);
      window.removeEventListener("resize", gulir);
      v?.removeEventListener("loadedmetadata", gulir);
      cancelAnimationFrame(frame);
    };
  }, [dikurangi, lebar]);

  return (
    <section ref={ref} aria-label="Pembuka" className={`sinema ${dikurangi ? "sinema-diam" : ""}`}>
      <div className="sinema-panggung">
        <div className="sinema-media" aria-hidden>
          {adegan.map((a, i) => (
            <div key={a.src + i} data-adegan className="sinema-adegan" style={i ? { opacity: 0 } : undefined}>
              <Image src={a.src} alt="" fill priority={i === 0} sizes="100vw" quality={80} className="object-cover" />
            </div>
          ))}
          {video && lebar && !dikurangi && (
            <video
              ref={videoRef}
              src={video.berkas}
              poster={video.poster}
              muted
              playsInline
              preload="auto"
              className="sinema-video"
            />
          )}
        </div>
        <div className="sinema-tint" aria-hidden />

        {pakaiBawaan && (
          <div className="sinema-model" aria-hidden>
            <Image src="/images/hero/model-sintetis.png" alt="" fill priority sizes="(min-width: 761px) 34vw, 0px" className="object-contain object-bottom" />
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
        <div className="sinema-babak sinema-babak-1 lp-wadah">
          <p className="sinema-label">Nilai kami</p>
          <p className="sinema-judul">
            Belajar dengan tujuan.
            <br />
            <em>Tumbuh bersama.</em>
          </p>
          <ul className="sinema-chip">
            {program.slice(0, 5).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>

        {/* babak 3 */}
        <div className="sinema-babak sinema-babak-2 lp-wadah">
          <p className="sinema-label">Satu keluarga, satu pintu</p>
          <p className="sinema-judul">
            Siap tumbuh <em>bersama kami?</em>
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

        <p className="sinema-raksasa" aria-hidden>
          SMAN&nbsp;22
        </p>

        <div className="sinema-kaki">
          {tautanVisual ? (
            <Link href={tautanVisual} className="sinema-tautan">
              {judulTautan || "Selengkapnya"} <ArrowUpRight size={14} aria-hidden />
            </Link>
          ) : (
            <span className="sinema-gulir" aria-hidden>
              <ArrowDown size={14} /> Gulir untuk menjelajah
            </span>
          )}
          {(keterangan || pakaiBawaan) && <span className="sinema-ket">{keterangan || "Visual ilustratif · model sintetis"}</span>}
        </div>
      </div>
    </section>
  );
}
