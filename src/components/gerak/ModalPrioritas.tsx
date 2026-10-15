"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ExternalLink, X } from "lucide-react";
import { formatTanggal } from "@/lib/format";

export type InfoPrioritas = {
  id: string;
  judul: string;
  tanggal: string;
  isi: string;
  kategori: string;
  poster?: { url: string; alt: string };
  tautan?: { url: string; label: string };
  href: string;
};

/**
 * Modal pengumuman prioritas (latar redup). <dialog> bawaan dengan showModal(): latar inert & fokus terkurung,
 * Escape menutup. Scroll halaman dikunci selama terbuka. Poster tampil utuh (object-contain) dan bisa
 * diperbesar di tab baru; informasi penting tetap ditulis sebagai teks di luar poster.
 * Tidak pernah menutup sendiri. Saat tertutup, fokus dikembalikan ke posisi sebelumnya atau ke konten utama.
 */
export function ModalPrioritas({ info, buka, onTutup }: { info: InfoPrioritas; buka: boolean; onTutup: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const sebelum = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (buka && !d.open) {
      sebelum.current = document.activeElement as HTMLElement | null;
      document.documentElement.classList.add("kunci-gulir");
      d.showModal();
    } else if (!buka && d.open) d.close();
    return () => document.documentElement.classList.remove("kunci-gulir");
  }, [buka]);

  const tutup = () => {
    document.documentElement.classList.remove("kunci-gulir");
    onTutup();
    // muncul otomatis tanpa pemicu → kembalikan ke elemen sebelumnya bila ada, selain itu ke konten utama
    const p = sebelum.current;
    requestAnimationFrame(() => {
      if (p && p !== document.body && p.isConnected) p.focus();
      else document.getElementById("konten")?.focus({ preventScroll: true });
    });
  };

  return (
    <dialog
      ref={ref}
      className="dialog-info dialog-prioritas"
      aria-labelledby="prioritas-judul"
      aria-describedby={info.isi ? "prioritas-isi" : undefined}
      onClose={tutup}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="dialog-info-kotak">
        <div className="dialog-info-kepala">
          <p className="text-sm text-[#5b6270]">
            <span className="font-semibold text-[var(--lp-utama)]">{info.kategori}</span> · <time dateTime={info.tanggal}>{formatTanggal(info.tanggal)}</time>
          </p>
          <button type="button" className="tombol-tutup" onClick={() => ref.current?.close()} aria-label="Tutup pengumuman">
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="dialog-info-isi">
          <h2 id="prioritas-judul">{info.judul}</h2>
          {info.poster && (
            <figure className="poster-prioritas">
              {/* eslint-disable-next-line @next/next/no-img-element -- poster dari CMS, rasio bebas, ditampilkan utuh */}
              <img src={info.poster.url} alt={info.poster.alt} />
              <figcaption>
                <a href={info.poster.url} target="_blank" rel="noopener noreferrer" className="tautan inline-flex items-center gap-1.5 text-sm">
                  Perbesar poster <ExternalLink size={14} aria-hidden />
                  <span className="sr-only">(membuka tab baru)</span>
                </a>
              </figcaption>
            </figure>
          )}
          {info.isi && (
            <p id="prioritas-isi" className="mt-3 whitespace-pre-line text-[#3b414b]">
              {info.isi}
            </p>
          )}
        </div>
        <div className="dialog-info-kaki">
          {info.tautan ? (
            info.tautan.url.startsWith("/") ? (
              <Link href={info.tautan.url} className="btn btn-primary" onClick={() => ref.current?.close()}>
                {info.tautan.label}
              </Link>
            ) : (
              <a href={info.tautan.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                {info.tautan.label}
                <span className="sr-only">(membuka tab baru)</span>
              </a>
            )
          ) : (
            <Link href={info.href} className="btn btn-primary" onClick={() => ref.current?.close()}>
              Buka halaman pengumuman
            </Link>
          )}
          <button type="button" className="btn" onClick={() => ref.current?.close()}>
            Tutup
          </button>
        </div>
      </div>
    </dialog>
  );
}
