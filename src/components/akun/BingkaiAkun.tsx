import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { PanggungVisual } from "@/components/akun/PanggungVisual";
import { Ikon } from "@/components/Ikon";
import { VisualAkun } from "@/components/akun/VisualAkun";
import { sekolah } from "@/content/sekolah";
import { getSitus, getVisualAkun } from "@/lib/data";
import "@/components/beranda/beranda.css";

/**
 * Bingkai halaman akun (masuk, lupa sandi, verifikasi dua langkah, sandi baru) bergaya sinematik:
 * visual unggahan admin (Tampilan Website → Visual sinematik → Halaman masuk) memenuhi layar,
 * formulir berada di kartu kaca. Tanpa visual → latar gelap dengan ilustrasi bawaan.
 */
export async function BingkaiAkun({
  judul,
  deskripsi,
  children,
  bawah,
}: {
  judul: string;
  deskripsi?: ReactNode;
  children: ReactNode;
  /** tautan kecil di bawah kartu, mis. "Kembali ke website" */
  bawah?: ReactNode;
}) {
  const [visual, { tema }] = await Promise.all([getVisualAkun("akun"), getSitus()]);
  const teks = tema.masuk;
  const adaVisual = visual.length > 0;
  return (
    <main className="lp akun-halaman akun-sinema relative min-h-screen overflow-hidden">
      {/* latar penuh */}
      <div className="akun-latar" aria-hidden={!adaVisual}>
        {adaVisual && <PanggungVisual item={visual} penuh />}
      </div>

      <div className="pointer-events-none relative z-10 grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
        <section aria-label={`Portal ${sekolah.namaPendek}`} className="akun-kiri flex flex-col px-5 pt-6 sm:px-10 lg:px-12 lg:pt-8 xl:px-16">
          <Link href="/" className="brand">
            <Image src={sekolah.logo} alt="" width={502} height={497} sizes="48px" className="brand-logo" />
            <span>
              <strong>{sekolah.namaPendek}</strong>
              <small>SEJAK {sekolah.tahunBerdiri} · KOTA BANDUNG</small>
            </span>
          </Link>
          <div className="hidden lg:block">
            <p className="akun-pil kh-muncul mt-10">
              <span aria-hidden /> Portal 22
            </p>
            <h2 className="mt-4 max-w-lg text-[clamp(2.4rem,4vw,4rem)] font-bold leading-[0.98] tracking-[-0.045em]">
              <span className="baris-judul">
                <span style={{ animationDelay: "100ms" }}>
                  {teks.judul} <em className="akun-miring">{teks.miring}</em>
                </span>
              </span>
            </h2>
            <ul className="kh-muncul mt-6 flex flex-wrap gap-2" style={{ animationDelay: "450ms" }}>
              {teks.fitur.map((f) => (
                <li key={f.teks} className="akun-chip">
                  <Ikon nama={f.ikon} size={15} /> {f.teks}
                </li>
              ))}
            </ul>
          </div>
          {/* ilustrasi bawaan di bawah teks (tidak tertutup tulisan) bila admin belum mengunggah visual */}
          {!adaVisual && (
            <div className="relative mt-6 hidden min-h-[320px] flex-1 lg:block">
              <VisualAkun />
              <p className="absolute bottom-4 left-0 text-[10px] text-white/60">Visual ilustratif · model sintetis</p>
            </div>
          )}
        </section>

        <section className="akun-isi pointer-events-auto flex flex-col px-5 py-8 sm:px-10">
          <div className="flex flex-1 items-center justify-center py-8 lg:py-10">
            <div className="akun-kartu kh-muncul w-full max-w-[440px]">
              <h1 className="font-serif text-[2.4rem] leading-[1.05] tracking-[-0.03em]">{judul}</h1>
              {(deskripsi ?? teks.deskripsi) && <div className="mt-2 text-[15px] leading-relaxed text-[#555f6b]">{deskripsi ?? teks.deskripsi}</div>}
              {children}
            </div>
          </div>
          {bawah && <div className="akun-bawah mx-auto w-full max-w-[440px] text-sm">{bawah}</div>}
        </section>
      </div>
    </main>
  );
}
