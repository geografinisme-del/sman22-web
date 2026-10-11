import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarCheck, ClipboardList, LayoutDashboard } from "lucide-react";
import { VisualAkun } from "@/components/akun/VisualAkun";
import { sekolah } from "@/content/sekolah";
import "@/components/beranda/beranda.css";

const FITUR = [
  { Ikon: LayoutDashboard, teks: "Dashboard sesuai peran" },
  { Ikon: CalendarCheck, teks: "Absensi & jadwal" },
  { Ikon: ClipboardList, teks: "Tugas, nilai & layanan" },
];

/**
 * Bingkai halaman akun (masuk, lupa sandi, verifikasi dua langkah, sandi baru):
 * panel kiri bergaya hero beranda, panel kanan formulir — senada dengan situs publik.
 */
export function BingkaiAkun({
  judul,
  deskripsi,
  children,
  bawah,
}: {
  judul: string;
  deskripsi?: ReactNode;
  children: ReactNode;
  /** tautan kecil di bawah kartu, mis. "Kembali ke website" */
  bawah?: ReactNode;
}) {
  return (
    <main className="lp akun-halaman grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section aria-label={`Portal ${sekolah.namaPendek}`} className="akun-panel relative hidden overflow-hidden lg:flex lg:flex-col">
        <div className="relative z-10 px-12 pt-8 xl:px-16">
          <Link href="/" className="brand">
            <Image src={sekolah.logo} alt="" width={502} height={497} sizes="48px" className="brand-logo" />
            <span>
              <strong>{sekolah.namaPendek}</strong>
              <small>SEJAK {sekolah.tahunBerdiri} · KOTA BANDUNG</small>
            </span>
          </Link>
          <p className="eyebrow kh-muncul mt-8">Portal 22</p>
          <h2 className="mt-2 max-w-md font-serif text-[clamp(2rem,3vw,3rem)] leading-[1.02] tracking-[-0.04em]">
            <span className="baris-judul">
              <span style={{ animationDelay: "100ms" }}>Satu pintu untuk</span>
            </span>
            <span className="baris-judul">
              <span style={{ animationDelay: "230ms" }}>
                keluarga <em className="text-[#284fd7]">SMAN 22.</em>
              </span>
            </span>
          </h2>
          <ul className="kh-muncul mt-5 flex flex-wrap gap-2" style={{ animationDelay: "450ms" }}>
            {FITUR.map(({ Ikon, teks }) => (
              <li key={teks} className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-2 text-[13px] font-medium shadow-[0_6px_20px_-12px_rgb(40_79_215/0.5)] ring-1 ring-[#e3def3]">
                <Ikon size={15} aria-hidden className="text-[#284fd7]" /> {teks}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative flex-1">
          <VisualAkun />
        </div>
        <p className="absolute bottom-4 right-6 z-10 text-[10px] text-[#606875]">Visual ilustratif · model sintetis</p>
      </section>

      <section className="akun-isi flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Link href="/" className="brand">
            <Image src={sekolah.logo} alt="" width={502} height={497} sizes="48px" className="brand-logo" />
            <span>
              <strong>{sekolah.namaPendek}</strong>
              <small>SEJAK {sekolah.tahunBerdiri} · KOTA BANDUNG</small>
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="akun-kartu kh-muncul w-full max-w-[440px]">
            <h1 className="font-serif text-[2.4rem] leading-[1.05] tracking-[-0.03em]">{judul}</h1>
            {deskripsi && <div className="mt-2 text-[15px] leading-relaxed text-[#555f6b]">{deskripsi}</div>}
            {children}
          </div>
        </div>
        {bawah && <div className="mx-auto w-full max-w-[440px] text-sm">{bawah}</div>}
      </section>
    </main>
  );
}
