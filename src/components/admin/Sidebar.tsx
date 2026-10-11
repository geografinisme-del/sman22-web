"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

export type GrupMenu = { judul?: string; item: { href: string; label: string; badge?: number }[] };

/** Urutan grup: yang dipakai harian di atas, pengaturan & arsip di bawah. Grup lain menyusul sesuai urutan asli. */
const PRIORITAS = ["Absensi", "Perwalian", "Kesiswaan", "Jadwal", "Pembelajaran", "Kurikulum", "Data Induk", "Website", "Bimbingan Konseling", "Ekskul & OSIS", "Perpustakaan", "Sarpras", "Humas", "Alumni", "Mutu", "Pengaturan"];
const KUNCI_TERAKHIR = "admin-menu-terakhir";
const KUNCI_GRUP = "admin-menu-grup";

/* localStorage sebagai "toko" luar: riwayat menu & grup yang terbuka (hanya di peramban ini) */
const pendengar = new Set<() => void>();
const langgan = (f: () => void) => {
  pendengar.add(f);
  window.addEventListener("storage", f);
  return () => {
    pendengar.delete(f);
    window.removeEventListener("storage", f);
  };
};
const bacaMentah = (kunci: string) => {
  try {
    return localStorage.getItem(kunci) ?? "[]";
  } catch {
    return "[]";
  }
};
const tulis = (kunci: string, nilai: string[]) => {
  try {
    localStorage.setItem(kunci, JSON.stringify(nilai));
  } catch {}
  pendengar.forEach((f) => f());
};
function useDaftarTersimpan(kunci: string): string[] {
  const mentah = useSyncExternalStore(langgan, () => bacaMentah(kunci), () => "[]");
  return useMemo(() => {
    try {
      const v = JSON.parse(mentah);
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  }, [mentah]);
}
const normal = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
/** huruf kata kunci muncul berurutan di dalam satu kata — "pinjam" cocok dengan "peminjaman" */
const urutDalamKata = (kata: string, q: string) => {
  let j = 0;
  for (const h of kata) if (h === q[j]) j++;
  return j === q.length;
};
/** 2 = mengandung kata kunci, 1 = cocok longgar per kata, 0 = tidak cocok */
const skorCocok = (teks: string, q: string) => {
  if (teks.includes(q)) return 2;
  const bagian = q.split(/\s+/).filter(Boolean);
  const kata = teks.split(/[^a-z0-9]+/);
  return bagian.every((b) => b.length >= 3 && kata.some((k) => k.startsWith(b[0]) && urutDalamKata(k, b))) ? 1 : 0;
};

export function Sidebar({
  grup,
  nama,
  email,
  peran,
  keluar,
  notif = 0,
}: {
  grup: GrupMenu[];
  nama: string;
  email: string;
  peran: string;
  keluar: () => Promise<void>;
  notif?: number;
}) {
  const path = usePathname();
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [cari, setCari] = useState("");
  const grupBuka = useDaftarTersimpan(KUNCI_GRUP);
  const terakhir = useDaftarTersimpan(KUNCI_TERAKHIR);
  const kotakCari = useRef<HTMLInputElement>(null);

  const urut = useMemo(() => {
    const posisi = (j?: string) => (j ? (PRIORITAS.indexOf(j) + 1 || PRIORITAS.length + 1) : 0);
    return grup.map((g, i) => ({ ...g, i })).sort((a, b) => posisi(a.judul) - posisi(b.judul) || a.i - b.i);
  }, [grup]);

  // menu aktif = href terpanjang yang cocok dengan alamat sekarang
  const semua = useMemo(() => grup.flatMap((g) => g.item), [grup]);
  const cocok = semua
    .map((i) => i.href)
    .filter((h) => path === h || (h !== "/admin" && path.startsWith(h + "/")))
    .sort((a, b) => b.length - a.length)[0];
  const aktif = (h: string) => h === cocok;
  const grupAktif = urut.find((g) => g.item.some((i) => i.href === cocok))?.judul;

  // catat menu yang baru dibuka (maks 4) untuk pintasan "Terakhir dibuka"
  useEffect(() => {
    if (!cocok || cocok === "/admin") return;
    const lama = JSON.parse(bacaMentah(KUNCI_TERAKHIR)) as string[];
    if (lama[0] !== cocok) tulis(KUNCI_TERAKHIR, [cocok, ...lama.filter((h) => h !== cocok)].slice(0, 4));
  }, [cocok]);

  // tekan "/" untuk langsung mencari menu
  useEffect(() => {
    const tekan = (e: KeyboardEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      if (e.key !== "/" || e.ctrlKey || e.metaKey || el?.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      const kotak = kotakCari.current;
      // di layar lebar kotak cari sudah tampil; di HP menu dibuka dulu baru difokuskan
      if (kotak?.offsetParent) kotak.focus();
      else {
        setBuka(true);
        setTimeout(() => kotakCari.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", tekan);
    return () => window.removeEventListener("keydown", tekan);
  }, []);

  const alihGrup = (judul: string) =>
    tulis(KUNCI_GRUP, grupBuka.includes(judul) ? grupBuka.filter((j) => j !== judul) : [...grupBuka, judul]);

  const q = normal(cari.trim());
  const hasilCari = q
    ? urut
        .map((g) => ({
          ...g,
          item: g.item
            .map((m) => ({ m, skor: skorCocok(normal(`${m.label} ${g.judul ?? ""}`), q) }))
            .filter((x) => x.skor > 0)
            .sort((a, b) => b.skor - a.skor)
            .map((x) => x.m),
        }))
        .filter((g) => g.item.length)
    : null;
  const pintasan = terakhir.map((h) => semua.find((m) => m.href === h)).filter((m): m is NonNullable<typeof m> => Boolean(m));

  const tautan = (m: GrupMenu["item"][number], kecil = false) => (
    <Link
      href={m.href}
      onClick={() => {
        setBuka(false);
        setCari("");
      }}
      aria-current={aktif(m.href) ? "page" : undefined}
      className={`block rounded-xl px-4 ${kecil ? "py-1.5 text-[13px]" : "py-2 text-sm"} font-medium transition ${
        aktif(m.href) ? "bg-white text-brand-900" : "text-white/75 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate">{m.label}</span>
        {m.badge ? (
          <span className="shrink-0 rounded-full bg-accent-400 px-2 text-xs font-bold text-brand-900" aria-label={`${m.badge} perlu ditindaklanjuti`}>
            {m.badge}
          </span>
        ) : null}
      </span>
    </Link>
  );

  return (
    <aside className="border-b border-black/10 bg-brand-900 text-white print:hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:overflow-y-auto lg:border-0">
      <div className="flex h-16 items-center justify-between px-5 lg:h-20">
        <Link href="/admin" className="font-serif text-2xl">
          Admin <em className="text-accent-400">SMAN 22</em>
        </Link>
        <Link href="/admin/notifikasi" aria-label={`Notifikasi${notif ? `, ${notif} belum dibaca` : ""}`} className="relative ml-auto mr-1 rounded-full p-2 hover:bg-white/10">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0" /></svg>
          {notif > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-merah px-1 text-[11px] font-bold">{notif > 99 ? "99+" : notif}</span>}
        </Link>
        <button
          type="button"
          className="rounded-full p-2 hover:bg-white/10 lg:hidden"
          aria-expanded={buka}
          aria-label={buka ? "Tutup menu" : "Buka menu"}
          onClick={() => setBuka((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            {buka ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
          </svg>
        </button>
      </div>
      <div className={`${buka ? "block" : "hidden"} px-3 pb-5 lg:flex lg:min-h-[calc(100%-5rem)] lg:flex-col lg:pb-6`}>
        <div className="relative mb-4 px-1">
          <label htmlFor="cari-menu" className="sr-only">
            Cari menu
          </label>
          <input
            id="cari-menu"
            ref={kotakCari}
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setCari("");
              // Enter langsung membuka hasil pertama
              const pertama = hasilCari?.[0]?.item[0];
              if (e.key === "Enter" && pertama) {
                e.preventDefault();
                setCari("");
                setBuka(false);
                router.push(pertama.href);
              }
            }}
            placeholder="Cari menu…"
            autoComplete="off"
            className="w-full rounded-xl bg-white/10 py-2 pl-9 pr-9 text-sm text-white placeholder:text-white/40 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-accent-400"
          />
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          {!cari && <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded border border-white/20 px-1.5 text-[10px] text-white/50 lg:block">/</kbd>}
        </div>

        <nav aria-label="Menu admin" className="space-y-1">
          {hasilCari ? (
            hasilCari.length ? (
              hasilCari.map((g) => (
                <div key={g.i} className="pb-2">
                  {g.judul && <p className="mb-1 px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">{g.judul}</p>}
                  <ul className="space-y-0.5">{g.item.map((m) => <li key={m.href}>{tautan(m)}</li>)}</ul>
                </div>
              ))
            ) : (
              <p className="px-4 py-3 text-sm text-white/60">Tidak ada menu “{cari}”.</p>
            )
          ) : (
            <>
              {pintasan.length > 1 && (
                <div className="pb-3">
                  <p className="mb-1 px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-400/80">Terakhir dibuka</p>
                  <ul className="space-y-0.5">{pintasan.map((m) => <li key={m.href}>{tautan(m, true)}</li>)}</ul>
                </div>
              )}
              {urut.map((g) => {
                if (!g.judul) return <ul key={g.i} className="space-y-0.5 pb-2">{g.item.map((m) => <li key={m.href}>{tautan(m)}</li>)}</ul>;
                const terbuka = g.judul === grupAktif || grupBuka.includes(g.judul);
                const totalBadge = g.item.reduce((t, m) => t + (m.badge ?? 0), 0);
                const idIsi = `grup-${g.i}`;
                return (
                  <div key={g.i}>
                    <button
                      type="button"
                      onClick={() => alihGrup(g.judul!)}
                      aria-expanded={terbuka}
                      aria-controls={idIsi}
                      className="flex w-full items-center justify-between rounded-xl px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55 transition hover:bg-white/5 hover:text-white"
                    >
                      <span>{g.judul}</span>
                      <span className="flex items-center gap-2">
                        {!terbuka && totalBadge > 0 && (
                          <span className="rounded-full bg-accent-400 px-1.5 text-[10px] font-bold tracking-normal text-brand-900" aria-label={`${totalBadge} perlu ditindaklanjuti`}>
                            {totalBadge}
                          </span>
                        )}
                        <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${terbuka ? "rotate-90" : ""}`}>
                          <path d="m9 6 6 6-6 6" />
                        </svg>
                      </span>
                    </button>
                    {terbuka && (
                      <ul id={idIsi} className="space-y-0.5 pb-2">
                        {g.item.map((m) => <li key={m.href}>{tautan(m)}</li>)}
                      </ul>
                    )}
                  </div>
                );
              })}
            </>
          )}
          <a href="/" target="_blank" rel="noopener" className="mt-3 block rounded-xl px-4 py-2 text-sm text-white/60 hover:bg-white/10">
            Lihat website ↗
          </a>
        </nav>
        <div className="mt-6 border-t border-white/10 px-4 pt-5 lg:mt-auto">
          <p className="truncate text-sm font-semibold">{nama || email}</p>
          <p className="truncate text-xs text-white/50">{email}</p>
          <p className="mt-1 text-xs text-accent-400">{peran}</p>
          <form action={keluar}>
            <button type="submit" className="mt-3 text-sm text-white/70 hover:text-white hover:underline">
              Keluar
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
