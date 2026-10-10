import { Fragment, type ReactNode } from "react";

/** Judul yang muncul kata demi kata dari balik "tirai" (animasi CSS, tanpa JS). */
export function KataMuncul({ teks, mulai = 0, jeda = 70, className = "" }: { teks: string; mulai?: number; jeda?: number; className?: string }) {
  const kata = teks.split(/\s+/).filter(Boolean);
  return (
    <>
      {kata.map((k, i) => (
        <Fragment key={i}>
          <span className="kata-bungkus">
            <span className={`kata ${className}`} style={{ animationDelay: `${mulai + i * jeda}ms` }}>
              {k}
            </span>
          </span>
          {i < kata.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}

export function Miring({ children }: { children: ReactNode }) {
  return <em className="text-accent-400">{children}</em>;
}
