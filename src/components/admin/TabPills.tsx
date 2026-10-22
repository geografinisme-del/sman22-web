"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import "./tab-pills.css";

export type ItemTab = { href: string; label: string; jumlah?: number };

/**
 * Tab berbentuk pil untuk semua halaman admin (satu komponen, satu gaya).
 * - role="tablist"/"tab" + aria-selected; panah kiri/kanan, Home/End memindah fokus, Enter/Spasi memilih.
 * - Tab yang diklik langsung tampak aktif (optimistis) sebelum halaman berikutnya selesai dimuat.
 * - Di layar sempit bisa digeser horizontal (tidak turun ke baris baru).
 * Tab aktif: `aktif` (href) bila diberikan (mis. tab berbasis ?query), selain itu dari alamat sekarang
 * (`cocok="awalan"`: href terpanjang yang menjadi awalan alamat, untuk sub-halaman).
 */
export function TabPills({ label, item, aktif, cocok = "persis", rapat = false }: { label: string; item: ItemTab[]; aktif?: string; cocok?: "persis" | "awalan"; rapat?: boolean }) {
  const path = usePathname();
  const sp = useSearchParams();
  const alamat = sp.toString() ? `${path}?${sp.toString()}` : path;
  const dariAlamat =
    cocok === "awalan"
      ? item
          .map((i) => i.href)
          .filter((h) => path === h.split("?")[0] || path.startsWith(h.split("?")[0] + "/"))
          .sort((a, b) => b.length - a.length)[0]
      : item.find((i) => i.href === alamat || i.href === path)?.href;
  const sekarang = aktif ?? dariAlamat;
  // klik terakhir disimpan bersama "kunci" alamat saat diklik: setelah halaman berpindah (kunci berubah) keadaan
  // optimistis otomatis tidak berlaku lagi dan tab aktif kembali mengikuti alamat/prop
  const kunci = `${alamat}|${aktif ?? ""}`;
  const [diklik, setDiklik] = useState<{ href: string; kunci: string } | null>(null);
  const daftar = useRef<HTMLDivElement>(null);
  const terpilih = diklik && diklik.kunci === kunci ? diklik.href : sekarang;

  // tab terpilih digulir ke dalam pandangan (di HP)
  useEffect(() => {
    const el = daftar.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [terpilih]);

  function tekan(e: KeyboardEvent<HTMLDivElement>) {
    const tab = [...(daftar.current?.querySelectorAll<HTMLAnchorElement>('[role="tab"]') ?? [])];
    const i = tab.indexOf(document.activeElement as HTMLAnchorElement);
    if (i < 0) return;
    const ke = (j: number) => {
      e.preventDefault();
      tab[(j + tab.length) % tab.length]?.focus();
    };
    if (e.key === "ArrowRight") ke(i + 1);
    else if (e.key === "ArrowLeft") ke(i - 1);
    else if (e.key === "Home") ke(0);
    else if (e.key === "End") ke(tab.length - 1);
    else if (e.key === " ") {
      e.preventDefault();
      tab[i].click();
    }
  }

  if (item.length < 2) return null;
  return (
    <div ref={daftar} role="tablist" aria-label={label} aria-orientation="horizontal" className="tab-pills" data-rapat={rapat ? "" : undefined} onKeyDown={tekan}>
      {item.map((t) => {
        const pilih = t.href === terpilih;
        return (
          <Link
            key={t.href}
            href={t.href}
            role="tab"
            aria-selected={pilih}
            tabIndex={pilih || (!terpilih && t === item[0]) ? 0 : -1}
            className="tab-pill"
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) setDiklik({ href: t.href, kunci });
            }}
            scroll={false}
          >
            {t.label}
            {t.jumlah != null && <span className="tab-pill-jumlah">{t.jumlah}</span>}
          </Link>
        );
      })}
    </div>
  );
}
