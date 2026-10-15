import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { sekolah } from "@/content/sekolah";
import { keluar } from "../admin/actions";
import { konteksPortal } from "./data";
import { NavPortal } from "./NavPortal";

export const metadata: Metadata = { title: { default: "Portal", template: "%s | Portal SMAN 22" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { akses, ortu, supabase } = await konteksPortal();
  const { count: notif } = await supabase.from("notifikasi").select("id", { count: "exact", head: true }).is("dibaca_pada", null);
  const menu = [
    { href: "/portal", label: "Beranda" },
    { href: "/portal/jadwal", label: "Jadwal" },
    { href: "/portal/kalender", label: "Kalender" },
    { href: "/portal/kelas", label: "Tugas" },
    { href: "/portal/materi", label: "Materi" },
    { href: "/portal/karakter", label: "Prestasi" },
    { href: "/portal/perpus", label: "Perpustakaan" },
    ...(ortu ? [{ href: "/portal/izin", label: "Izin / Sakit" }] : []),
    { href: "/portal/ekskul", label: "Ekskul" },
    { href: "/portal/bk", label: "Layanan BK" },
    { href: "/portal/alumni", label: "Alumni & Peluang" },
    { href: "/portal/pengaduan", label: "Pengaduan" },
    { href: "/portal/akun", label: "Akun" },
  ];
  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <header className="sticky top-0 z-30 border-b border-[#e5e1da] bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 pt-3">
          <Link href="/portal" className="flex min-w-0 items-center gap-3">
            <Image src={sekolah.logo} alt="" width={40} height={40} />
            <span className="min-w-0 leading-tight">
              <span className="block text-[1.0625rem] font-bold text-[#1f2328]">Portal {ortu ? "Orang Tua" : "Siswa"}</span>
              <span className="block text-[0.8125rem] text-[#5b6270]">{sekolah.nama}</span>
            </span>
          </Link>
          <Link
            href="/portal/notifikasi"
            aria-label={`Notifikasi${notif ? `, ${notif} belum dibaca` : ""}`}
            className="relative ml-auto grid h-10 w-10 place-items-center rounded-lg text-[#3b414b] transition-colors duration-150 hover:bg-[#f4f5f7]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0" /></svg>
            {!!notif && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--tema-utama)] px-1 text-[11px] font-bold text-white">{notif > 99 ? "99+" : notif}</span>}
          </Link>
          <form action={keluar}>
            <button className="min-h-10 rounded-lg border border-[#d9dce1] px-3 text-sm font-semibold text-[#1f2328] transition-colors duration-150 hover:border-[#9aa1ab]">Keluar</button>
          </form>
        </div>
        <NavPortal menu={menu} />
      </header>
      <main className="mx-auto max-w-3xl px-5 py-6">
        <p className="mb-4 text-sm text-[#5b6270]">Halo, {akses.nama || "Bapak/Ibu"}</p>
        {children}
      </main>
      <footer className="mx-auto max-w-3xl px-5 pb-10 text-xs text-[#5b6270]">
        Data ini bersifat pribadi. Jangan bagikan kata sandi Anda kepada siapa pun.
      </footer>
    </div>
  );
}
