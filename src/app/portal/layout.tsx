import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { sekolah } from "@/content/sekolah";
import { keluar } from "../admin/actions";
import { konteksPortal } from "./data";

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
    <div className="min-h-screen bg-krem">
      <header className="bg-brand-900 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4">
          <Link href="/portal" className="flex items-center gap-3">
            <Image src={sekolah.logo} alt="" width={36} height={36} />
            <span className="leading-tight">
              <span className="block font-serif text-xl">Portal {ortu ? "Orang Tua" : "Siswa"}</span>
              <span className="block text-xs text-white/60">{sekolah.namaPendek}</span>
            </span>
          </Link>
          <Link href="/portal/notifikasi" aria-label={`Notifikasi${notif ? `, ${notif} belum dibaca` : ""}`} className="relative ml-auto rounded-full p-2 hover:bg-white/10">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0" /></svg>
            {!!notif && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-merah px-1 text-[11px] font-bold">{notif > 99 ? "99+" : notif}</span>}
          </Link>
          <form action={keluar}>
            <button className="rounded-full px-3 py-1.5 text-sm text-white/80 ring-1 ring-white/20 hover:bg-white/10">Keluar</button>
          </form>
        </div>
        <nav aria-label="Menu portal" className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-3 pb-2">
          {menu.map((m) => (
            <Link key={m.href} href={m.href} className="shrink-0 rounded-full px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10">
              {m.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-6">
        <p className="mb-4 text-sm text-black/50">Halo, {akses.nama || "Bapak/Ibu"}</p>
        {children}
      </main>
      <footer className="mx-auto max-w-3xl px-5 pb-10 text-xs text-black/40">
        Data ini bersifat pribadi. Jangan bagikan kata sandi Anda kepada siapa pun.
      </footer>
    </div>
  );
}
