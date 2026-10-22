"use client";

import { useState } from "react";

/** Nama berkas dari header Content-Disposition (filename*=UTF-8''… atau filename="…"). */
function namaBerkas(cd: string | null, cadangan: string) {
  if (!cd) return cadangan;
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (utf) return decodeURIComponent(utf[1]);
  const biasa = /filename="?([^";]+)"?/i.exec(cd);
  return biasa ? biasa[1] : cadangan;
}

/**
 * Tombol unduh berkas (ekspor/template). Tidak "diam saja": selama proses tampil "Menyiapkan…", dan bila server gagal
 * membuat berkas tampil pesan galat yang jelas di bawah tombol. Berkas diunduh dengan nama dari server.
 */
export function TombolUnduh({
  href,
  children,
  namaCadangan = "unduhan",
  utama = false,
  kecil = false,
}: {
  href: string;
  children: React.ReactNode;
  namaCadangan?: string;
  utama?: boolean;
  kecil?: boolean;
}) {
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function unduh() {
    setProses(true);
    setGalat(null);
    try {
      const res = await fetch(href, { credentials: "same-origin", cache: "no-store" });
      if (!res.ok) {
        const pesan = (await res.text().catch(() => "")).trim();
        throw new Error(res.status === 401 || res.status === 403 ? "Sesi Anda berakhir atau tidak berhak. Muat ulang halaman lalu masuk kembali." : pesan && pesan.length < 200 && !pesan.startsWith("<") ? pesan : `Berkas gagal disiapkan (kode ${res.status}). Coba lagi.`);
      }
      const blob = await res.blob();
      if (!blob.size) throw new Error("Berkas yang diterima kosong. Coba lagi.");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = namaBerkas(res.headers.get("Content-Disposition"), namaCadangan);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setGalat(e instanceof TypeError ? "Koneksi terputus. Periksa internet lalu coba lagi." : (e as Error).message);
    } finally {
      setProses(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={unduh}
        disabled={proses}
        aria-busy={proses}
        data-utama={utama ? "1" : undefined}
        className={`tombol-unduh inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-colors disabled:cursor-wait disabled:opacity-70 ${
          kecil ? "min-h-10 px-4 text-sm" : "min-h-11 px-[18px] text-sm"
        } ${utama ? "bg-ink text-white hover:bg-ink/85" : "border border-[var(--line)] bg-white text-[var(--ink)] hover:bg-[var(--soft)]"}`}
      >
        {proses && <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />}
        {proses ? "Menyiapkan…" : children}
      </button>
      {galat && (
        <span role="alert" className="max-w-xs text-xs font-medium text-red-700">
          {galat}
        </span>
      )}
    </span>
  );
}
