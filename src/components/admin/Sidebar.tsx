"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentType } from "react";
import { ruangKerjaAktif, type RuangKerja } from "@/lib/ruang-kerja";
import {
  Award,
  BadgeCheck,
  Bell,
  BookMarked,
  BookOpen,
  BookUser,
  Building2,
  CalendarCheck,
  CalendarClock,
  ChevronRight,
  CircleUser,
  ClipboardList,
  Database,
  ExternalLink,
  Folder,
  Globe,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  Library,
  LogOut,
  Megaphone,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
  type LucideProps, Eye } from "lucide-react";
import { sekolah } from "@/content/sekolah";

export type GrupMenu = { judul?: string; item: { href: string; label: string; badge?: number }[] };

/** Urutan grup: yang dipakai harian di atas, pengaturan & arsip di bawah. Grup lain menyusul sesuai urutan asli. */
const PRIORITAS = ["Layanan saya", "Mengajar", "Perwalian", "Absensi", "Kesiswaan", "Jadwal", "Kurikulum", "Data Induk", "Website", "Bimbingan Konseling", "Ekskul & OSIS", "Perpustakaan", "Sarpras", "Laboratorium", "Humas", "Buku Tamu", "Alumni", "Mutu", "Pengaturan", "Akun saya"];
/** Satu gaya ikon (lucide, garis 1.75) per grup modul */
const IKON_GRUP: Record<string, ComponentType<LucideProps>> = {
  Absensi: CalendarCheck,
  Perwalian: UserRound,
  Kesiswaan: Award,
  Jadwal: CalendarClock,
  Pembelajaran: BookOpen,
  Mengajar: BookOpen,
  "Layanan saya": ClipboardList,
  Kurikulum: BookMarked,
  "Data Induk": Database,
  Website: Globe,
  "Bimbingan Konseling": HeartHandshake,
  "Ekskul & OSIS": Users,
  Perpustakaan: Library,
  Sarpras: Building2,
  Humas: Megaphone,
  "Buku Tamu": BookUser,
  Alumni: GraduationCap,
  Mutu: BadgeCheck,
  Pengaturan: Settings,
  "Akun saya": CircleUser,
};
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
const normal = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
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

/** Fokuskan kotak cari yang sedang terlihat (sidebar layar lebar atau laci ponsel). */
const fokusCari = () => {
  const kotak = [...document.querySelectorAll<HTMLInputElement>("input[data-cari-menu]")].find((k) => k.offsetParent);
  kotak?.focus();
  return Boolean(kotak);
};

export function Sidebar({
  grup,
  nama,
  email,
  peran,
  keluar,
  notif = 0,
  ruang = [],
  lihatSebagai = false,
}: {
  grup: GrupMenu[];
  /** ruang kerja yang boleh dibuka (turunan izin; berpindah ruang kerja tidak menambah kewenangan) */
  ruang?: RuangKerja[];
  nama: string;
  email: string;
  peran: string;
  keluar: () => Promise<void>;
  notif?: number;
  /** super admin AAL2 (bukan sedang pratinjau): tampilkan "Lihat sebagai…" */
  lihatSebagai?: boolean;
}) {
  const path = usePathname();
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [cari, setCari] = useState("");
  const grupBuka = useDaftarTersimpan(KUNCI_GRUP);
  const terakhir = useDaftarTersimpan(KUNCI_TERAKHIR);
  const tombolMenu = useRef<HTMLButtonElement>(null);
  const laci = useRef<HTMLDivElement>(null);

  const urut = useMemo(() => {
    const posisi = (j?: string) => (j ? (PRIORITAS.indexOf(j) + 1 || PRIORITAS.length + 1) : 0);
    return grup.map((g, i) => ({ ...g, i })).sort((a, b) => posisi(a.judul) - posisi(b.judul) || a.i - b.i);
  }, [grup]);

  // menu aktif = href terpanjang yang cocok dengan alamat sekarang
  const semua = useMemo(() => grup.flatMap((g) => g.item), [grup]);
  const dariAlamat = semua
    .map((i) => i.href)
    .filter((h) => path === h || (h !== "/admin" && path.startsWith(h + "/")))
    .sort((a, b) => b.length - a.length)[0];
  // optimistis: menu yang diklik langsung tampak aktif (& ditandai "memuat") sebelum halaman berikutnya tiba;
  // begitu alamat berubah, aktif kembali mengikuti alamat
  const [diklik, setDiklik] = useState<{ href: string; dari: string } | null>(null);
  const menunggu = diklik && diklik.dari === path && diklik.href !== dariAlamat ? diklik.href : null;
  const cocok = menunggu ?? dariAlamat;
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
      // di layar lebar kotak cari sudah tampil; di HP laci dibuka dulu (fokus dipindah oleh efek laci)
      if (!fokusCari()) setBuka(true);
    };
    window.addEventListener("keydown", tekan);
    return () => window.removeEventListener("keydown", tekan);
  }, []);

  // laci ponsel: fokus ke kotak cari saat dibuka; Esc menutup & mengembalikan fokus ke tombol Menu; Tab tetap di dalam laci
  useEffect(() => {
    if (!buka) return;
    const t = setTimeout(fokusCari, 0);
    const tekan = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setBuka(false);
        tombolMenu.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !laci.current) return;
      const f = laci.current.querySelectorAll<HTMLElement>("a[href], button:not([tabindex='-1']), input, summary");
      const pertama = f[0];
      const akhir = f[f.length - 1];
      if (e.shiftKey && document.activeElement === pertama) {
        e.preventDefault();
        akhir?.focus();
      } else if (!e.shiftKey && document.activeElement === akhir) {
        e.preventDefault();
        pertama?.focus();
      }
    };
    document.addEventListener("keydown", tekan);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", tekan);
    };
  }, [buka]);

  const tutupLaci = (kembalikanFokus = true) => {
    setBuka(false);
    if (kembalikanFokus) tombolMenu.current?.focus();
  };

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
      onClick={(e) => {
        setCari("");
        tutupLaci(false);
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) setDiklik({ href: m.href, dari: path });
      }}
      aria-current={aktif(m.href) ? "page" : undefined}
      data-memuat={menunggu === m.href ? "1" : undefined}
      className={`relative flex items-center justify-between gap-2 rounded-md py-2 pl-9 pr-3 transition-colors duration-150 ${kecil ? "text-[13.5px]" : "text-sm"} ${
        aktif(m.href)
          ? "bg-[color-mix(in_srgb,var(--tema-utama)_8%,#fff)] font-semibold text-[var(--ink)] before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-[var(--tema-utama)]"
          : "text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--ink)]"
      }`}
    >
      <span className="truncate">{m.label}</span>
      {m.badge ? (
        <span className="shrink-0 rounded-md bg-[#fdf1d6] px-1.5 text-xs font-semibold tabular-nums text-[#7a5300]" aria-label={`${m.badge} perlu ditindaklanjuti`}>
          {m.badge}
        </span>
      ) : null}
    </Link>
  );

  const ruangAktif = ruangKerjaAktif(path, ruang);
  const pemilihRuang = (asal: "sisi" | "laci") =>
    ruang.length >= 2 ? (
      <div className="px-3 pb-3">
        <label htmlFor={`ruang-kerja-${asal}`} className="mb-1 block px-1 text-xs font-semibold text-[var(--muted)]">
          Ruang kerja
        </label>
        <select
          id={`ruang-kerja-${asal}`}
          value={ruangAktif?.kunci ?? ""}
          onChange={(e) => {
            const r = ruang.find((x) => x.kunci === e.target.value);
            tutupLaci(false);
            router.push(r ? r.href : "/admin");
          }}
          className="w-full rounded-md border border-[var(--line)] bg-white px-2.5 py-2 text-sm font-semibold text-[var(--ink)] focus:border-[var(--tema-utama)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--tema-utama)_20%,transparent)]"
        >
          <option value="">Ringkasan (semua tugas)</option>
          {ruang.map((r) => (
            <option key={r.kunci} value={r.kunci}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
    ) : ruang.length === 1 ? (
      <p className="px-4 pb-3 text-xs text-[var(--muted)]">
        Ruang kerja:{" "}
        <Link href={ruang[0].href} onClick={() => tutupLaci(false)} className="font-semibold text-[var(--ink)] underline underline-offset-2">
          {ruang[0].label}
        </Link>
      </p>
    ) : null;

  const isiNavigasi = (asal: "sisi" | "laci") => (
    <>
      {pemilihRuang(asal)}
      <div className="relative px-3 pb-3">
        <label htmlFor={`cari-menu-${asal}`} className="sr-only">
          Cari menu
        </label>
        <input
          id={`cari-menu-${asal}`}
          data-cari-menu
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
              tutupLaci(false);
              router.push(pertama.href);
            }
          }}
          placeholder="Cari menu"
          autoComplete="off"
          className="w-full rounded-md border border-[var(--line)] bg-white py-2 pl-9 pr-9 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--tema-utama)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--tema-utama)_20%,transparent)]"
        />
        <Search size={16} aria-hidden className="pointer-events-none absolute left-6 top-[18px] -translate-y-1/2 text-[var(--muted)]" />
        {!cari && <kbd className="pointer-events-none absolute right-6 top-[18px] hidden -translate-y-1/2 rounded border border-[var(--line)] px-1.5 text-[11px] text-[var(--muted)] lg:block">/</kbd>}
      </div>

      <nav aria-label="Menu admin" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {hasilCari ? (
          hasilCari.length ? (
            hasilCari.map((g) => (
              <div key={g.i} className="pb-2">
                {g.judul && <p className="px-3 pb-1 pt-2 text-xs font-semibold text-[var(--muted)]">{g.judul}</p>}
                <ul className="space-y-0.5">
                  {g.item.map((m) => (
                    <li key={m.href}>{tautan(m)}</li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="px-3 py-3 text-sm text-[var(--muted)]">Tidak ada menu “{cari}”.</p>
          )
        ) : (
          <>
            {pintasan.length > 1 && (
              <div className="mb-2 border-b border-[var(--line)] pb-2">
                <p className="px-3 pb-1 pt-1 text-xs font-semibold text-[var(--muted)]">Terakhir dibuka</p>
                <ul className="space-y-0.5">
                  {pintasan.map((m) => (
                    <li key={m.href}>{tautan(m, true)}</li>
                  ))}
                </ul>
              </div>
            )}
            <ul className="space-y-0.5">
              {urut.map((g) => {
                if (!g.judul)
                  return g.item.map((m) => (
                    <li key={m.href} className="relative">
                      <LayoutDashboard size={17} strokeWidth={1.75} aria-hidden className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--muted)]" />
                      {tautan(m)}
                    </li>
                  ));
                const terbuka = g.judul === grupAktif || grupBuka.includes(g.judul);
                const totalBadge = g.item.reduce((t, m) => t + (m.badge ?? 0), 0);
                const idIsi = `grup-${asal}-${g.i}`;
                const IkonGrup = IKON_GRUP[g.judul] ?? Folder;
                return (
                  <li key={g.i}>
                    <button
                      type="button"
                      onClick={() => alihGrup(g.judul!)}
                      aria-expanded={terbuka}
                      aria-controls={idIsi}
                      className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-semibold transition-colors duration-150 hover:bg-[var(--soft)] ${
                        g.judul === grupAktif ? "text-[var(--ink)]" : "text-[var(--muted)]"
                      }`}
                    >
                      <IkonGrup size={17} strokeWidth={1.75} aria-hidden className="shrink-0 text-[var(--muted)]" />
                      <span className="flex-1">{g.judul}</span>
                      {!terbuka && totalBadge > 0 && (
                        <span className="rounded-md bg-[#fdf1d6] px-1.5 text-xs font-semibold tabular-nums text-[#7a5300]" aria-label={`${totalBadge} perlu ditindaklanjuti`}>
                          {totalBadge}
                        </span>
                      )}
                      <ChevronRight size={15} aria-hidden className={`shrink-0 text-[var(--muted)] transition-transform duration-150 ${terbuka ? "rotate-90" : ""}`} />
                    </button>
                    {terbuka && (
                      <ul id={idIsi} className="mb-1 space-y-0.5">
                        {g.item.map((m) => (
                          <li key={m.href}>{tautan(m)}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </nav>

      <div className="border-t border-[var(--line)] p-3">
        <details className="group/akun relative">
          <summary className="flex cursor-pointer list-none items-center gap-3 rounded-md px-2 py-2 hover:bg-[var(--soft)] [&::-webkit-details-marker]:hidden">
            <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--line)] text-sm font-semibold text-[var(--muted)]">
              {(nama || email).trim().charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[var(--ink)]">{nama || email}</span>
              <span className="block truncate text-xs text-[var(--muted)]">{peran}</span>
            </span>
            <ChevronRight size={15} aria-hidden className="shrink-0 -rotate-90 text-[var(--muted)] transition-transform duration-150 group-open/akun:rotate-90" />
            <span className="sr-only">Menu akun</span>
          </summary>
          <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-[var(--line)] bg-white p-1.5 shadow-[0_12px_28px_-12px_rgb(31_35_40/0.35)]">
            <p className="truncate px-2.5 py-1.5 text-xs text-[var(--muted)]">{email}</p>
            <Link href="/admin/keamanan" onClick={() => tutupLaci(false)} className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-[var(--soft)]">
              <ShieldCheck size={16} aria-hidden /> Keamanan akun
            </Link>
            {lihatSebagai && (
              <a href="/lihat-sebagai" className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-[var(--soft)]">
                <Eye size={16} aria-hidden /> Lihat sebagai…
              </a>
            )}
            <a href="/" target="_blank" rel="noopener" className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-[var(--soft)]">
              <ExternalLink size={16} aria-hidden /> Lihat website
            </a>
            <form data-keluar-akun="" action={keluar}>
              <button type="submit" className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-blue-teks hover:bg-[var(--soft)]">
                <LogOut size={16} aria-hidden /> Keluar
              </button>
            </form>
          </div>
        </details>
      </div>
    </>
  );

  const merek = (
    <Link href="/admin" className="flex min-w-0 items-center gap-2.5" onClick={() => tutupLaci(false)}>
      <Image src={sekolah.logo} alt="" width={502} height={497} sizes="36px" className="h-auto w-9 shrink-0" />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-bold text-[var(--ink)]">{sekolah.namaPendek}</span>
        <span className="block text-xs text-[var(--muted)]">Portal Sekolah</span>
      </span>
    </Link>
  );
  const lonceng = (
    <Link
      href="/admin/notifikasi"
      onClick={() => tutupLaci(false)}
      aria-label={`Notifikasi${notif ? `, ${notif} belum dibaca` : ""}`}
      className="relative ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--soft)]"
    >
      <Bell size={19} strokeWidth={1.75} aria-hidden />
      {notif > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-blue-teks px-1 text-[11px] font-bold text-white">
          {notif > 99 ? "99+" : notif}
        </span>
      )}
    </Link>
  );

  return (
    <>
      {/* bilah atas ponsel */}
      <div data-pita-geser className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--line)] bg-white px-4 print:hidden lg:hidden">
        <button
          ref={tombolMenu}
          type="button"
          onClick={() => setBuka(true)}
          aria-expanded={buka}
          aria-controls="laci-menu"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[var(--line)] text-[var(--ink)]"
        >
          <Menu size={20} aria-hidden />
          <span className="sr-only">Buka menu</span>
        </button>
        {merek}
        {lonceng}
      </div>

      {/* laci ponsel */}
      {buka && (
        <div className="fixed inset-0 z-40 print:hidden lg:hidden">
          <button type="button" aria-label="Tutup menu" tabIndex={-1} onClick={() => tutupLaci()} className="absolute inset-0 bg-black/30" />
          <div ref={laci} id="laci-menu" role="dialog" aria-modal="true" aria-label="Menu admin" className="absolute inset-y-0 left-0 flex w-[min(320px,88vw)] flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center gap-2 border-b border-[var(--line)] px-4">
              {merek}
              <button type="button" onClick={() => tutupLaci()} className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-md hover:bg-[var(--soft)]">
                <X size={20} aria-hidden />
                <span className="sr-only">Tutup menu</span>
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col pt-3">{isiNavigasi("laci")}</div>
          </div>
        </div>
      )}

      {/* sidebar layar lebar dengan area gulir sendiri */}
      <aside data-pita-geser className="hidden border-r border-[var(--line)] bg-white print:hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[260px] lg:flex-col">
        <div className="flex h-16 shrink-0 items-center gap-2 px-4">
          {merek}
          {lonceng}
        </div>
        {isiNavigasi("sisi")}
      </aside>
    </>
  );
}
