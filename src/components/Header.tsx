"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { ArrowUpRight, Menu } from "lucide-react";
import { menu } from "@/content/menu";
import { sekolah } from "@/content/sekolah";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Beranda SMAN 22 Bandung">
      <Image src={sekolah.logo} alt="" width={502} height={497} sizes="48px" priority className="brand-logo" />
      <span>
        <strong>{sekolah.namaPendek}</strong>
        <small>SEJAK {sekolah.tahunBerdiri} · KOTA BANDUNG</small>
      </span>
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const menuHp = useRef<HTMLDetailsElement>(null);
  const aktif = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const tutup = () => menuHp.current?.removeAttribute("open");
  const tautan = menu.filter((m) => m.href !== "/");

  return (
    <header className="lp lp-header">
      <div className="lp-wadah lp-header-isi">
        <Brand />
        <nav className="nav-links" aria-label="Menu utama">
          {tautan.map((m) => (
            <Link key={m.href} href={m.href} aria-current={aktif(m.href) ? "page" : undefined}>
              {m.label}
            </Link>
          ))}
        </nav>
        <Link className="btn btn-primary" href="/masuk">
          Masuk portal <ArrowUpRight size={15} aria-hidden />
        </Link>
        <details className="menu-hp" ref={menuHp}>
          <summary>
            Menu <Menu size={18} aria-hidden />
          </summary>
          <nav aria-label="Menu ponsel">
            {tautan.map((m) => (
              <Link key={m.href} href={m.href} onClick={tutup} aria-current={aktif(m.href) ? "page" : undefined}>
                {m.label}
              </Link>
            ))}
            <Link href="/masuk" onClick={tutup} className="font-semibold text-[#284fd7]">
              Masuk portal ↗
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
