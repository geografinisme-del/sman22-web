import Link from "next/link";
import { MediaSlot } from "@/components/MediaSlot";
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
        {/* awan pembuka lebih dulu di DOM: urutan judul h2 → h3 tetap benar */}
        <div className="tur-awan">
          <div className="tur-awan-isi">
            <p className="label-mono">Tur sekolah</p>
            <h2 id="judul-tur">Mari berkeliling sekolah.</h2>
            <p className="tur-awan-sub">Terus gulir untuk berkeliling.</p>
          </div>
        </div>
        <ol className="tur-titik">
          {titik.map((t, i) => (
            <li key={t.id} className="tur-item" data-i={i}>
              <MediaSlot
                src={t.media?.tipe === "foto" ? t.media.url : undefined}
                video={t.media?.tipe === "video" ? { src: t.media.url, poster: t.media.poster, label: t.alt || t.judul } : undefined}
                alt={t.alt}
                ratio="isi"
                focus={t.fokus}
                isPlaceholder={t.sementara}
                // ≥900px: mode sticky selebar layar; 700–899px: daftar 2 kolom; HP: 1 kolom
                sizes="(min-width: 900px) 100vw, (min-width: 700px) 50vw, 100vw"
                className="tur-media"
                kelasMedia={t.media?.tipe === "video" ? "tur-video" : "tur-foto"}
                kosong={
                  <span className="tur-kosong" role="img" aria-label={`${t.judul}: foto menyusul`}>
                    <span aria-hidden>22</span>
                    <span className="label-mono">Foto menyusul</span>
                  </span>
                }
              />
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

        <ol className="tur-penanda" aria-hidden>
          {titik.map((t, i) => (
            <li key={t.id} data-i={i}>
              <span>{nomor(i)}</span> {t.label}
            </li>
          ))}
        </ol>
        {/* kredit jujur: sebutkan ilustrasi sementara bila ada titik yang memakai foto stok */}
        <p className="tur-kredit">
          {titik.some((t) => t.sementara) ? (
            <>
              Foto: dokumentasi SMAN 22 Bandung dan ilustrasi sementara (<Link href="/kredit-foto">kredit foto</Link>)
            </>
          ) : (
            "Foto: dokumentasi SMAN 22 Bandung"
          )}
        </p>
      </div>
    </TurPembungkus>
  );
}
