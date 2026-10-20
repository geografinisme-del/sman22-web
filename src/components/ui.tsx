/**
 * Komponen halaman publik lama yang kini memakai desain "Langit cerah" (lihat components/langit/Komponen.tsx).
 * API dipertahankan agar semua halaman langsung memakai PageHero/SectionHeading yang sama.
 */
import type { ReactNode } from "react";
import { Kosong as KosongLangit, PageHero, SectionHeading, type Remah } from "@/components/langit/Komponen";

export function PageHeader(props: { judul: string; deskripsi?: string; label?: string; remah?: Remah[]; foto?: { src: string; alt: string }; children?: ReactNode }) {
  return <PageHero {...props} />;
}

/** Bagian halaman dengan judul bersama (label mono • judul • tautan). */
export function Section({
  judul,
  miring,
  label,
  teks,
  linkSemua,
  children,
  className = "",
}: {
  judul?: string;
  miring?: string;
  label?: string;
  teks?: string;
  linkSemua?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`lgt-bagian ${className}`}>
      <div className="lgt-wadah">
        {judul && <SectionHeading label={label} judul={[judul, miring].filter(Boolean).join(" ")} teks={teks} aksi={linkSemua} />}
        <div className={judul ? "mt-8" : ""}>{children}</div>
      </div>
    </section>
  );
}

export const Kosong = KosongLangit;
