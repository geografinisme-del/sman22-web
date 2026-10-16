import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Kepala halaman publik: remah roti, judul, deskripsi singkat, dan (opsional) satu foto relevan.
 * `children` untuk isi tambahan (tombol, saringan, ringkasan) di bawah deskripsi.
 */
export function PageHeader({
  judul,
  deskripsi,
  label,
  foto,
  children,
}: {
  judul: string;
  deskripsi?: string;
  label?: string;
  /** foto asli sekolah yang relevan dengan halaman (tanpa foto → kepala teks saja) */
  foto?: { src: string; alt: string };
  children?: ReactNode;
}) {
  return (
    <header className="lp kepala-halaman">
      <div className={`lp-wadah grid items-center gap-8 py-8 sm:py-10 ${foto ? "md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" : ""}`}>
        <div className="min-w-0">
          <nav aria-label="Lokasi halaman" className="remah">
            <Link href="/">Beranda</Link>
            <span aria-hidden>/</span>
            <span aria-current="page" className="text-[#1f2328]">
              {judul}
            </span>
          </nav>
          {label && <p className="eyebrow mt-5">{label}</p>}
          <h1 className={label ? "mt-2" : "mt-4"}>{judul}</h1>
          {deskripsi && <p className="deskripsi mt-3">{deskripsi}</p>}
          {children && <div className="mt-5">{children}</div>}
        </div>
        {foto && (
          <div className="foto relative hidden aspect-[16/10] md:block">
            <Image src={foto.src} alt={foto.alt} fill sizes="(min-width: 768px) 40vw, 1px" className="object-cover" />
          </div>
        )}
      </div>
    </header>
  );
}

/** Bagian halaman: judul jelas, tanpa ornamen; judul & isi muncul sekali saat digulir (lihat PengamatMuncul). */
export function Section({
  judul,
  miring,
  label,
  linkSemua,
  children,
  className = "",
}: {
  judul?: string;
  /** lanjutan judul (dulu dicetak miring) — kini ditulis biasa */
  miring?: string;
  label?: string;
  linkSemua?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`lp-wadah py-10 sm:py-12 ${className}`}>
      {(judul || linkSemua) && (
        <div data-muncul className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            {label && <p className="eyebrow">{label}</p>}
            {judul && <h2 className={label ? "mt-1" : ""}>{[judul, miring].filter(Boolean).join(" ")}</h2>}
          </div>
          {linkSemua && (
            <Link href={linkSemua.href} className="tautan">
              {linkSemua.label}
            </Link>
          )}
        </div>
      )}
      <div data-muncul>{children}</div>
    </section>
  );
}

/** Keadaan kosong yang ringkas & jujur. */
export function Kosong({ teks, sub }: { teks: string; sub?: string }) {
  return (
    <div className="rounded-[10px] border border-dashed border-[#cfc8bd] bg-white px-5 py-4">
      <p className="font-semibold text-[#1f2328]">{teks}</p>
      {sub && <p className="mt-1 text-[0.9375rem] text-[#5b6270]">{sub}</p>}
    </div>
  );
}
