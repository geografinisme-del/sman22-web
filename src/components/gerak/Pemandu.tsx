"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Hand, X } from "lucide-react";

/**
 * Pemandu berbasis pilihan menu (bukan chatbot). Aset karakter belum tersedia, sehingga tampil sebagai
 * tombol bantuan berikon tangan: melambai SEKALI bila diizinkan pengatur overlay, lalu diam.
 * Tidak mengikuti kursor, tidak berbicara otomatis, bisa dinonaktifkan pengunjung (tersimpan di perangkat).
 * Semua tujuan adalah rute yang ada; pilihan peran TIDAK memberi izin apa pun.
 */
const PILIHAN: { kunci: string; label: string; tautan: { href: string; label: string }[] }[] = [
  {
    kunci: "calon",
    label: "Calon murid",
    tautan: [
      { href: "/spmb", label: "Informasi SPMB" },
      { href: "/profil", label: "Profil sekolah" },
      { href: "/program", label: "Program sekolah" },
      { href: "/kontak", label: "Kontak & lokasi" },
    ],
  },
  {
    kunci: "siswa",
    label: "Siswa",
    tautan: [
      { href: "/admin/login?sebagai=siswa", label: "Masuk Portal Sekolah" },
      { href: "/perpustakaan", label: "E-Library" },
      { href: "/agenda", label: "Agenda & kegiatan" },
      { href: "/ekskul", label: "Ekskul & OSIS" },
    ],
  },
  {
    kunci: "ortu",
    label: "Orang tua",
    tautan: [
      { href: "/admin/login?sebagai=orang_tua", label: "Masuk Portal Orang Tua" },
      { href: "/agenda", label: "Agenda & pengumuman" },
      { href: "/pengaduan", label: "Pengaduan & aspirasi" },
    ],
  },
  {
    kunci: "guru",
    label: "Guru & manajemen",
    tautan: [{ href: "/admin/login?sebagai=staf", label: "Masuk Portal Manajemen (ruang kerja sesuai tugas)" }],
  },
  {
    kunci: "tamu",
    label: "Pengunjung",
    tautan: [
      { href: "/profil", label: "Profil sekolah" },
      { href: "/berita", label: "Berita" },
      { href: "/kontak", label: "Kontak & lokasi" },
      { href: "/pengaduan", label: "Pengaduan & aspirasi" },
    ],
  },
];

export const KUNCI_PEMANDU_MATI = "sman22:pemandu:mati";

export function Pemandu({ melambai, tersembunyi, onMati }: { melambai: boolean; tersembunyi: boolean; onMati: () => void }) {
  const [buka, setBuka] = useState(false);
  const [pilih, setPilih] = useState<string | null>(null);
  const [tekan, setTekan] = useState(false);
  const tombol = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!buka) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setBuka(false);
        tombol.current?.focus();
      }
    };
    // composedPath() dicatat saat klik terjadi, jadi tetap benar walau tombol yang diklik sudah diganti render ulang
    const luar = (e: MouseEvent) => {
      const jalur = e.composedPath();
      if (!jalur.includes(panel.current!) && !jalur.includes(tombol.current!)) setBuka(false);
    };
    document.addEventListener("keydown", esc);
    document.addEventListener("click", luar);
    return () => {
      document.removeEventListener("keydown", esc);
      document.removeEventListener("click", luar);
    };
  }, [buka]);

  if (tersembunyi && !buka) return null;
  const grup = PILIHAN.find((p) => p.kunci === pilih);

  return (
    <div className="pemandu">
      {buka && (
        <div ref={panel} id={id} className="pemandu-panel" role="region" aria-label="Pemandu bantuan">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-[#1f2328]">{grup ? grup.label : "Butuh bantuan?"}</p>
              <p className="text-sm text-[#5b6270]">{grup ? "Pilih halaman tujuan." : "Pilih yang paling sesuai dengan Anda."}</p>
            </div>
            <button type="button" className="tombol-tutup" aria-label="Tutup pemandu" onClick={() => (setBuka(false), tombol.current?.focus())}>
              <X size={18} aria-hidden />
            </button>
          </div>
          {grup ? (
            <>
              <ul className="mt-3 grid gap-1">
                {grup.tautan.map((t) => (
                  <li key={t.href}>
                    <Link href={t.href} className="pemandu-pilihan" onClick={() => setBuka(false)}>
                      {t.label}
                      <ArrowRight size={16} aria-hidden className="ikon-geser shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
              <button type="button" className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-[#3b414b] hover:underline" onClick={() => setPilih(null)}>
                <ArrowLeft size={16} aria-hidden /> Pilihan lain
              </button>
            </>
          ) : (
            <ul className="mt-3 grid gap-1">
              {PILIHAN.map((p) => (
                <li key={p.kunci}>
                  <button type="button" className="pemandu-pilihan" onClick={() => setPilih(p.kunci)}>
                    {p.label}
                    <ArrowRight size={16} aria-hidden className="ikon-geser shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 border-t border-[#e5e1da] pt-2 text-[0.8125rem] text-[#5b6270]">
            Pilihan ini hanya membantu menemukan halaman; akses tetap mengikuti akun Anda.{" "}
            <button type="button" className="font-semibold underline" onClick={() => (setBuka(false), onMati())}>
              Sembunyikan pemandu
            </button>
          </p>
        </div>
      )}
      <button
        ref={tombol}
        type="button"
        className={`pemandu-tombol ${melambai ? "melambai" : ""} ${tekan ? "ditekan" : ""}`}
        aria-expanded={buka}
        aria-controls={buka ? id : undefined}
        onClick={() => {
          setBuka((b) => !b);
          setTekan(true);
          window.setTimeout(() => setTekan(false), 180);
        }}
      >
        <Hand size={20} aria-hidden className="pemandu-tangan" />
        <span className="pemandu-label">Bantuan</span>
      </button>
    </div>
  );
}
