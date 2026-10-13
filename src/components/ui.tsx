import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { KepalaVisual } from "@/components/KepalaVisual";
import { Reveal } from "@/components/Reveal";

/** Warna aksen cakram di kepala halaman — bergantian per halaman agar tidak monoton */
const NADA = ["var(--tema-utama)", "#7564b5", "#325fb9", "#4a5fd0"];
const nadaDari = (teks: string) => NADA[[...teks].reduce((t, c) => t + c.charCodeAt(0), 0) % NADA.length];

/**
 * Kepala halaman publik: ringkas, cerah, dan bergerak — senada dengan beranda.
 * `children` untuk isi tambahan (tombol, angka ringkas, pencarian) di bawah deskripsi.
 */
export function PageHeader({
  judul,
  deskripsi,
  label,
  children,
}: {
  judul: string;
  deskripsi?: string;
  label?: string;
  children?: ReactNode;
}) {
  const monogram = judul.replace(/[^A-Za-z]/g, "").charAt(0).toUpperCase() || "22";
  return (
    <header className="lp kepala-halaman relative overflow-hidden" style={{ "--nada": nadaDari(judul) } as CSSProperties}>
      <div className="lp-wadah grid items-center gap-8 pb-10 pt-[92px] min-[761px]:pt-[110px] md:grid-cols-[1fr_300px] md:pb-12 lg:grid-cols-[1fr_380px]">
        <div className="relative z-10">
          <nav aria-label="Lokasi halaman" className="kh-muncul flex items-center gap-2 text-xs text-[#646c7a]">
            <Link href="/" className="hover:text-[var(--tema-utama)]">
              Beranda
            </Link>
            <span aria-hidden>/</span>
            <span aria-current="page" className="font-medium text-[#20252c]">
              {label ?? judul}
            </span>
          </nav>
          {label && <p className="eyebrow kh-muncul mt-6">{label}</p>}
          <h1 className={`${label ? "mt-3" : "mt-6"} font-serif text-[clamp(2.5rem,5.5vw,4.5rem)] font-normal leading-[1.02] tracking-[-0.035em]`}>
            <span className="baris-judul">
              <span style={{ animationDelay: "80ms" }}>{judul}</span>
            </span>
          </h1>
          {deskripsi && (
            <p className="kh-muncul mt-4 max-w-2xl text-[17px] leading-relaxed text-[#555f6b]" style={{ animationDelay: "250ms" }}>
              {deskripsi}
            </p>
          )}
          {children && (
            <div className="kh-muncul mt-6" style={{ animationDelay: "350ms" }}>
              {children}
            </div>
          )}
        </div>
        <KepalaVisual monogram={monogram} />
      </div>
    </header>
  );
}

/** Bagian halaman: judul bergaya beranda (eyebrow kobalt + serif), muncul saat digulir. */
export function Section({
  judul,
  miring,
  label,
  linkSemua,
  children,
  className = "",
}: {
  judul?: string;
  /** potongan judul yang dicetak miring berwarna, mis. judul="Visi" miring="& Misi" */
  miring?: string;
  label?: string;
  linkSemua?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`lp-wadah py-10 sm:py-14 ${className}`}>
      {(judul || linkSemua) && (
        <Reveal className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
          <div>
            {label && <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--tema-utama)]">{label}</p>}
            {judul && (
              <h2 className="mt-1 font-serif text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] tracking-[-0.03em]">
                {judul} {miring && <em className="text-[#544881]">{miring}</em>}
              </h2>
            )}
          </div>
          {linkSemua && (
            <Link
              href={linkSemua.href}
              className="group inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[var(--tema-utama)] ring-1 ring-[var(--tema-utama)]/25 transition hover:bg-[var(--tema-utama)] hover:text-white"
            >
              {linkSemua.label} <span className="panah">→</span>
            </Link>
          )}
        </Reveal>
      )}
      <Reveal>{children}</Reveal>
    </section>
  );
}

/** Keadaan kosong yang ramah, bukan kotak putus-putus polos. */
export function Kosong({ teks, sub }: { teks: string; sub?: string }) {
  return (
    <div className="flex items-center gap-5 rounded-2xl border border-dashed border-[#c9c3e6] bg-white/70 p-6 sm:p-8">
      <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ede8fa] font-serif text-2xl italic text-[#51419c]">
        ✳
      </span>
      <div>
        <p className="font-semibold text-[#20252c]">{teks}</p>
        <p className="mt-1 text-sm text-[#626a76]">{sub ?? "Konten resmi akan hadir setelah diterbitkan sekolah."}</p>
      </div>
    </div>
  );
}
