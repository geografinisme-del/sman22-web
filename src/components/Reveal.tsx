"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Membungkus konten agar muncul halus saat di-scroll ke layar. */
export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
  efek = "naik",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li" | "section" | "figure";
  /** "naik" = muncul dari bawah; "tirai" = terbuka seperti tirai (cocok untuk foto) */
  efek?: "naik" | "tirai";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("tampil");
            obs.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement & HTMLLIElement>}
      className={`${efek === "tirai" ? "tirai" : "reveal"} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
