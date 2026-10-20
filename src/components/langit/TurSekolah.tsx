import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { TitikTur } from "@/content/tur-bawaan";
import { TurPembungkus } from "./TurPembungkus";

const nomor = (i: number) => String(i).padStart(2, "0");

/**
 * Tur sekolah (beranda, id="tur", latar --haze). Dirender server sebagai DAFTAR (foto/poster + kartu berurutan),
 * sehingga terbaca tanpa JavaScript, di HP, dan saat reduced motion. Di desktop dengan gerak diizinkan,
 * TurPembungkus memuat mesin GSAP yang mengubahnya menjadi section sticky: awan pembuka (10% gulir pertama),
 * lalu media berganti crossfade per titik, kartu info kiri bawah, penanda langkah di kanan.
 * Titik pertama = pembuka ("00"); titik berikutnya bernomor 01, 02, …
 */
export function TurSekolah({ titik }: { titik: TitikTur[] }) {
  if (!titik.length) return null;
  return (
    <TurPembungkus jumlah={titik.length}>
      <div className="tur-pin">
        <ol className="tur-titik">
          {titik.map((t, i) => (
            <li key={t.id} className="tur-item" data-i={i}>
              <div className="tur-media">
                {t.media?.tipe === "video" ? (
                  <video className="tur-video" src={t.media.url} poster={t.media.poster} muted loop playsInline preload="none" aria-label={t.alt || t.judul} />
                ) : t.media ? (
                  <Image src={t.media.url} alt={t.alt} fill sizes="100vw" loading="lazy" className="tur-foto object-cover" style={{ objectPosition: `${t.fokus.x}% ${t.fokus.y}%` }} />
                ) : (
                  <div className="tur-kosong" role="img" aria-label={`${t.judul}: foto menyusul`}>
                    <span aria-hidden>22</span>
                    <p className="label-mono">Foto menyusul</p>
                  </div>
                )}
                {t.sementara && t.media && <span className="media-label">Ilustrasi sementara</span>}
              </div>
              <div className="tur-kartu">
                <p className="tur-kartu-label">
                  {nomor(i)} — {t.label}
                </p>
                <h3>{t.judul}</h3>
                {t.deskripsi && <p className="tur-kartu-desk">{t.deskripsi}</p>}
                {t.tombol && (
                  <a href={t.tombol.url} className="lgt-pil-tombol lgt-pil-lime tur-tombol">
                    {t.tombol.teks}
                    <ArrowUpRight size={17} aria-hidden />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>

        {/* awan pembuka (mode sticky: menutupi layar lalu memudar; mode daftar: judul bagian) */}
        <div className="tur-awan">
          <div className="tur-awan-isi">
            <p className="label-mono">Tur sekolah</p>
            <h2 id="judul-tur">Mari berkeliling sekolah.</h2>
            <p className="tur-awan-sub">Terus gulir untuk berkeliling.</p>
          </div>
        </div>

        <ol className="tur-penanda" aria-hidden>
          {titik.map((t, i) => (
            <li key={t.id} data-i={i}>
              <span>{nomor(i)}</span> {t.label}
            </li>
          ))}
        </ol>
        <p className="tur-kredit">Foto: dokumentasi SMAN 22 Bandung</p>
      </div>
    </TurPembungkus>
  );
}
