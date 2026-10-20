/**
 * Komponen bersama "Langit cerah" untuk SEMUA halaman (server; terbaca tanpa JavaScript).
 * PageHero · SectionHeading · InfoCard · StatCard · Prose · CtaBand · Kosong.
 * Satu desain kartu dengan kartu putar beranda (foto atas, label mono biru, judul, deskripsi, "Buka →").
 */
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { uraiTeksCms } from "@/lib/teks-cms";

export type Remah = { href?: string; label: string };

/**
 * Hero halaman: gradien langit + satu lapis awan, remah roti mono, label mono, judul besar putih, satu kalimat
 * pengantar. Opsional foto latar (luminosity). `data-hero-langit` membuat header transparan di atasnya.
 */
export function PageHero({
  judul,
  deskripsi,
  label,
  remah,
  foto,
  children,
}: {
  judul: string;
  deskripsi?: string;
  label?: string;
  /** jejak di antara "Beranda" dan judul, mis. [{ href: "/profil", label: "Profil" }] */
  remah?: Remah[];
  foto?: { src: string; alt: string };
  children?: ReactNode;
}) {
  const jejak: Remah[] = [{ href: "/", label: "Beranda" }, ...(remah ?? []), { label: judul }];
  return (
    <header className="lgt-phero" data-hero-langit>
      {foto && <Image src={foto.src} alt="" fill priority sizes="100vw" className="lgt-phero-foto" />}
      <svg className="lgt-phero-awan" viewBox="0 0 760 140" preserveAspectRatio="none" aria-hidden>
        <path d="M0 120 C 60 60 140 60 190 95 C 230 40 330 40 370 95 C 420 55 520 60 560 110 C 620 70 720 80 760 120 Z" />
      </svg>
      <div className="lgt-wadah lgt-phero-isi">
        <nav aria-label="Lokasi halaman" className="lgt-remah">
          <ol>
            {jejak.map((r, i) => (
              <li key={i}>
                {r.href && i < jejak.length - 1 ? (
                  <Link href={r.href}>{r.label}</Link>
                ) : (
                  <span aria-current={i === jejak.length - 1 ? "page" : undefined}>{r.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        {label && <p className="label-mono lgt-phero-label">{label}</p>}
        <h1>{judul}</h1>
        {deskripsi && <p className="lgt-phero-desk">{deskripsi}</p>}
        {children && <div className="lgt-phero-aksi">{children}</div>}
      </div>
      {foto && <p className="sr-only">Foto latar: {foto.alt}</p>}
    </header>
  );
}

/** Judul bagian: label mono "• …", judul weight 500 −0.035em, teks pendamping abu, tautan opsional. */
export function SectionHeading({ label, judul, teks, id, aksi, terang }: { label?: string; judul: string; teks?: string; id?: string; aksi?: { href: string; label: string }; terang?: boolean }) {
  return (
    <div className={`lgt-shead ${terang ? "lgt-shead-terang" : ""}`}>
      <div>
        {label && <p className="label-mono lgt-label-titik">{label}</p>}
        <h2 id={id} className="lgt-judul-bagian">
          {judul}
        </h2>
        {teks && <p className="lgt-shead-teks">{teks}</p>}
      </div>
      {aksi && (
        <Link href={aksi.href} className="lgt-tautan-panah">
          {aksi.label} <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}

/** Kartu informasi — desain SAMA dengan kartu putar beranda. Tanpa foto: blok langit dengan "22". */
export function InfoCard({
  href,
  foto,
  alt = "",
  label,
  judul,
  deskripsi,
  sementara,
  aksi = "Buka",
  rasio = "kartu",
  children,
}: {
  href?: string;
  foto?: string;
  alt?: string;
  label?: string;
  judul: string;
  deskripsi?: string;
  sementara?: boolean;
  aksi?: string | null;
  /** "kartu" = foto 150px; "lebar" = foto 16:10 (kartu besar) */
  rasio?: "kartu" | "lebar";
  children?: ReactNode;
}) {
  const isi = (
    <>
      <span className={`lgt-ikartu-foto ${rasio === "lebar" ? "lgt-ikartu-foto-lebar" : ""}`}>
        {foto ? <Image src={foto} alt={alt} fill sizes={rasio === "lebar" ? "(min-width: 900px) 50vw, 100vw" : "(min-width: 900px) 33vw, 100vw"} className="object-cover" /> : <span className="lgt-kartu-22" aria-hidden>22</span>}
        {sementara && foto && <span className="media-label">Ilustrasi sementara</span>}
      </span>
      <span className="lgt-kartu-isi">
        {label && <span className="lgt-kartu-label">{label}</span>}
        <span className="lgt-kartu-judul">{judul}</span>
        {deskripsi && <span className="lgt-kartu-desk">{deskripsi}</span>}
        {children}
        {href && aksi && (
          <span className="lgt-kartu-buka" aria-hidden>
            {aksi} →
          </span>
        )}
      </span>
    </>
  );
  return href ? (
    /^https?:\/\//.test(href) ? (
      <a href={href} className="lgt-kartu lgt-ikartu" target="_blank" rel="noopener noreferrer">
        {isi}
      </a>
    ) : (
      <Link href={href} className="lgt-kartu lgt-ikartu">
        {isi}
      </Link>
    )
  ) : (
    <div className="lgt-kartu lgt-ikartu">{isi}</div>
  );
}

/** Kartu bento (biru, abu, lime, ink) seperti "SMAN 22 dalam angka". */
export function StatCard({ warna, label, angka, keterangan, children }: { warna: "biru" | "abu" | "lime" | "ink"; label?: string; angka?: string; keterangan?: string; children?: ReactNode }) {
  return (
    <div className={`lgt-bento-kartu lgt-bento-${warna}`}>
      {label && <p className="label-mono">{label}</p>}
      {angka && <strong className="lgt-bento-angka">{angka}</strong>}
      {keterangan && <span>{keterangan}</span>}
      {children}
    </div>
  );
}

/** Artikel 68ch, 17–18px, line-height 1.7; gambar radius 18px dengan caption. */
export function Prose({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`lgt-prose ${className}`}>{children}</div>;
}

/** Kotak ajakan gradien langit radius 32px + tombol lime. */
export function CtaBand({ label, judul, lanjutan, tombol }: { label?: string; judul: string; lanjutan?: string; tombol: { href: string; teks: string } }) {
  return (
    <section className="lgt-bagian lgt-bagian-rapat">
      <div className="lgt-wadah">
        <div className="lgt-cta">
          {label && <p className="label-mono">{label}</p>}
          <h2>
            {judul} {lanjutan && <span>{lanjutan}</span>}
          </h2>
          <Link href={tombol.href} className="lgt-pil-tombol lgt-pil-lime">
            {tombol.teks}
            <span className="lgt-pil-bulat" aria-hidden>
              <ArrowUpRight size={16} />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Keadaan kosong yang ringkas & jujur. */
export function Kosong({ teks, sub }: { teks: string; sub?: string }) {
  return (
    <div className="lgt-kosong">
      <p>{teks}</p>
      {sub && <p className="lgt-kosong-sub">{sub}</p>}
    </div>
  );
}

/** Isi teks CMS (halaman_cms) sebagai Prose: subjudul, paragraf, daftar — tanpa HTML mentah. */
export function TeksCms({ isi }: { isi: string }) {
  return (
    <Prose>
      {uraiTeksCms(isi).map((b, i) =>
        b.jenis === "judul" ? (
          <h2 key={i}>{b.teks}</h2>
        ) : b.jenis === "daftar" ? (
          <ul key={i}>
            {b.butir.map((x, j) => (
              <li key={j}>{x}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b.teks}</p>
        ),
      )}
    </Prose>
  );
}
