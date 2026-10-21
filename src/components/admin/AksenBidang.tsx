"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { IkonBidang } from "@/components/IkonBidang";
import { BIDANG, type KunciBidang } from "@/lib/bidang";
import { ruangKerjaAktif, type RuangKerja } from "@/lib/ruang-kerja";

/** Ruang kerja → warna penanda bidang (lihat src/lib/bidang.ts). */
const BIDANG_RUANG: Record<string, KunciBidang> = {
  kurikulum: "kurikulum",
  kesiswaan: "kesiswaan",
  sarpras: "sarpras",
  humas: "humas",
  website: "humas",
  tata_usaha: "tata_usaha",
  tpmps: "tpmps",
  perpustakaan: "elibrary",
  bk: "bk",
};

/**
 * Aksen bidang untuk area kerja admin: hanya tampilan (warna tombol utama/indikator & pita nama ruang kerja).
 * Struktur kerja tetap sama di semua bidang dan TIDAK mengubah hak akses.
 */
export function AksenBidang({ ruang, children }: { ruang: RuangKerja[]; children: ReactNode }) {
  const path = usePathname();
  const r = ruangKerjaAktif(path, ruang);
  const bidang = r ? BIDANG_RUANG[r.kunci] : undefined;
  return (
    <div className="ruang-bidang" data-bidang={bidang}>
      {r && bidang && (
        <p className="mb-4 inline-flex items-center gap-2 rounded-md border border-[var(--bidang-garis)] bg-[var(--bidang-tint)] px-2.5 py-1 text-sm font-semibold text-[var(--bidang-teks)] print:hidden">
          <IkonBidang bidang={bidang} size={16} />
          Ruang kerja · {r.label}
          <span className="sr-only"> (warna penanda {BIDANG[bidang].label})</span>
        </p>
      )}
      {children}
    </div>
  );
}
