import { useId, type ReactNode } from "react";

/** Lencana bundar dengan teks melingkar yang berputar pelan; isi tengah bebas (panah, logo, dll). */
export function LencanaPutar({ teks, children, className = "" }: { teks: string; children?: ReactNode; className?: string }) {
  const id = useId();
  return (
    <span className={`relative inline-grid place-items-center ${className}`}>
      <svg viewBox="0 0 200 200" aria-hidden className="putar absolute inset-0 h-full w-full">
        <defs>
          <path id={id} d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <text className="fill-current text-[17px] font-medium uppercase tracking-[0.32em]">
          <textPath href={`#${id}`}>{teks}</textPath>
        </text>
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}
