import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import type { KartuBeranda } from "@/content/kartu-beranda";
import { KartuPutar } from "./KartuPutar";
import { MasukBertahap } from "./MasukBertahap";

/**
 * Hero beranda "Langit cerah": gradien sky-1 → sky-2 → sky-3 → haze (menyatu dengan section tur di bawahnya),
 * dua lapis awan SVG putih buram yang bergeser pelan, teks tengah, dan kartu putar 3D.
 * `adaTur` = section #tur tersedia (Tahap B); tanpa itu tombol "Tur sekolah" tidak ditampilkan.
 */
export function HeroLangit({ kartu, adaTur }: { kartu: KartuBeranda[]; adaTur: boolean }) {
  return (
    <section className="lgt-hero" data-hero-langit aria-labelledby="judul-hero">
      <Awan />
      <div className="lgt-wadah lgt-hero-teks">
        <MasukBertahap>
          <h1 id="judul-hero" data-masuk>
            <span>Tempat tumbuh yang berakhlak,</span> <span className="lgt-hero-baris2">berprestasi, dan berwawasan</span>
          </h1>
          <p className="lgt-hero-sub" data-masuk>
            SMA Negeri 22 Bandung — Sekolah Ramah Anak di Kota Bandung sejak 1989.
          </p>
          <div className="lgt-hero-aksi" data-masuk>
            {adaTur && (
              <a href="#tur" className="lgt-pil-tombol lgt-pil-kaca">
                Tur sekolah <ArrowDown size={17} aria-hidden />
              </a>
            )}
            <Link href="/spmb" className="lgt-pil-tombol lgt-pil-lime">
              Info SPMB
              <span className="lgt-pil-bulat" aria-hidden>
                <ArrowUpRight size={16} />
              </span>
            </Link>
          </div>
        </MasukBertahap>
      </div>
      {kartu.length > 0 && <KartuPutar kartu={kartu} />}
    </section>
  );
}

/** Dua lapis awan (SVG inline, dekoratif) di bagian bawah hero; animasi CSS bolak-balik 40 s & 55 s. */
function Awan() {
  const bentuk = "M0 120 C 60 60 140 60 190 95 C 230 40 330 40 370 95 C 420 55 520 60 560 110 C 620 70 720 80 760 120 Z";
  return (
    <div className="lgt-awan" aria-hidden>
      <svg className="lgt-awan-1" viewBox="0 0 760 140" preserveAspectRatio="none">
        <path d={bentuk} />
      </svg>
      <svg className="lgt-awan-2" viewBox="0 0 760 140" preserveAspectRatio="none">
        <path d={bentuk} />
      </svg>
    </div>
  );
}
