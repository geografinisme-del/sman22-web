import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ judul, deskripsi, label }: { judul: string; deskripsi?: string; label?: string }) {
  return (
    <div className="border-b border-black/10 bg-krem pt-16 sm:pt-20">
      <div className="mx-auto max-w-7xl px-5 pb-12 pt-14 sm:px-8 sm:pb-16 sm:pt-20">
        {label && <p className="naik text-xs font-medium uppercase tracking-[0.3em] text-merah">{label}</p>}
        <h1 className="naik mt-3 font-serif text-5xl leading-none tracking-tight sm:text-7xl" style={{ animationDelay: "100ms" }}>
          {judul}
        </h1>
        {deskripsi && (
          <p className="naik mt-5 max-w-2xl text-lg text-black/60" style={{ animationDelay: "200ms" }}>
            {deskripsi}
          </p>
        )}
      </div>
    </div>
  );
}

export function Section({
  judul,
  label,
  linkSemua,
  children,
  className = "",
}: {
  judul?: string;
  label?: string;
  linkSemua?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20 ${className}`}>
      {(judul || linkSemua) && (
        <div className="mb-8 flex items-end justify-between gap-4 sm:mb-12">
          <div>
            {label && <p className="text-xs font-medium uppercase tracking-[0.3em] text-merah">{label}</p>}
            {judul && <h2 className="mt-2 font-serif text-4xl leading-none tracking-tight sm:text-6xl">{judul}</h2>}
          </div>
          {linkSemua && (
            <Link
              href={linkSemua.href}
              className="shrink-0 rounded-full border border-black/15 px-4 py-2 text-sm font-medium transition hover:bg-tinta hover:text-white"
            >
              {linkSemua.label} →
            </Link>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export function Kosong({ teks }: { teks: string }) {
  return <p className="rounded-2xl border border-dashed border-black/20 p-10 text-center text-black/50">{teks}</p>;
}
