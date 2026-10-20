"use client";

import { MediaSlot } from "@/components/MediaSlot";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { formatTanggal } from "@/lib/format";

export type Informasi = { id: string; jenis: string; judul: string; tanggal: string; isi: string; href: string; gambar?: string };

const BATAS_RINGKAS = 480;

/**
 * Detail ringkas pengumuman/berita setelah pengguna mengklik "Baca informasi".
 * Memakai <dialog> bawaan browser (showModal): latar menjadi inert, fokus dikurung di dalam dialog,
 * Escape menutup, dan fokus dikembalikan ke pemicunya. Ponsel: bottom sheet maks. 85dvh.
 * Teks panjang dipotong dan diarahkan ke halaman aslinya (URL tetap bisa dibuka & dibagikan).
 */
export function DialogInformasi({ info, onTutup }: { info: Informasi | null; onTutup: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pemicu = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (info && !d.open) {
      pemicu.current = document.activeElement as HTMLElement | null;
      d.showModal();
    } else if (!info && d.open) d.close();
  }, [info]);

  const ringkas = info && info.isi.length > BATAS_RINGKAS ? `${info.isi.slice(0, BATAS_RINGKAS).replace(/\s+\S*$/, "")}…` : info?.isi;

  return (
    <dialog
      ref={ref}
      className="dialog-info"
      aria-labelledby="dialog-info-judul"
      onClose={() => {
        onTutup();
        // kembalikan fokus ke tombol yang membuka dialog
        const p = pemicu.current;
        if (p?.isConnected) requestAnimationFrame(() => p.focus());
      }}
      onClick={(e) => {
        // klik di latar (di luar kotak dialog) menutup
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      {info && (
        <div className="dialog-info-kotak">
          <div className="dialog-info-kepala">
            <p className="text-sm text-[var(--muted)]">
              <span className="font-semibold text-[var(--lp-utama)]">{info.jenis}</span> · <time dateTime={info.tanggal}>{formatTanggal(info.tanggal)}</time>
            </p>
            <button type="button" className="tombol-tutup" onClick={() => ref.current?.close()} aria-label="Tutup detail informasi">
              <X size={20} aria-hidden />
            </button>
          </div>
          <div className="dialog-info-isi">
            <h2 id="dialog-info-judul">{info.judul}</h2>
            {info.gambar && (
              <MediaSlot src={info.gambar} alt="" ratio="3/2" sizes="(min-width: 640px) 560px, 100vw" className="mt-4 rounded-lg" />
            )}
            {ringkas && <p className="mt-3 whitespace-pre-line text-[var(--muted)]">{ringkas}</p>}
          </div>
          <div className="dialog-info-kaki">
            <Link href={info.href} className="btn btn-primary" onClick={() => ref.current?.close()}>
              {info.isi.length > BATAS_RINGKAS ? "Baca selengkapnya" : "Buka halaman informasi"}
            </Link>
            <button type="button" className="btn" onClick={() => ref.current?.close()}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
