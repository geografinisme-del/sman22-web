import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PengamatMuncul } from "@/components/gerak/PengamatMuncul";
import { sekolah } from "@/content/sekolah";
import "@/components/buku/buku.css";
import "./portal-digital.css";

export const metadata: Metadata = {
  title: { default: "Portal Digital 22", template: "%s | Portal Digital 22" },
  description: "Pintu masuk layanan digital SMA Negeri 22 Bandung: guru, siswa, orang tua, ruang kerja manajemen, dan E-Library.",
};

export default function LayoutPortalDigital({ children }: { children: React.ReactNode }) {
  return (
    <div className="pd">
      <a href="#isi" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2">
        Lewati ke isi
      </a>
      <header className="pd-atas">
        <div className="pd-wadah pd-atas-isi">
          <Link href="/portal-digital" className="pd-merek">
            <Image src={sekolah.logo} alt="" width={502} height={497} sizes="40px" className="h-auto w-10 shrink-0" priority />
            <span className="min-w-0">
              <strong>{sekolah.nama}</strong>
              <small>Portal Digital 22</small>
            </span>
          </Link>
          <Link href="/" className="pd-tautan">
            <ArrowLeft size={16} aria-hidden />
            <span>
              Website <span className="hidden sm:inline">sekolah</span>
            </span>
          </Link>
        </div>
      </header>
      <main id="isi" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <footer className="pd-wadah pd-kaki">
        <span>Hak akses setiap bidang diatur oleh admin sekolah. Memilih layanan tidak menambah hak akses.</span>
        <span>
          © {new Date().getFullYear()} {sekolah.nama} · Dikelola oleh Tim TIK
        </span>
      </footer>
      <PengamatMuncul />
    </div>
  );
}
