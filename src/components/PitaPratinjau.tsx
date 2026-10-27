"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { COOKIE_LABEL_PRATINJAU, JALUR_KENDALI_PRATINJAU, PESAN_PRATINJAU } from "@/lib/pratinjau-umum";

/**
 * Pita "Lihat sebagai…" + penjaga tombol di peramban. Dibaca dari cookie penanda (tanpa rahasia) sehingga bekerja di
 * semua halaman (termasuk halaman publik yang di-cache) tanpa membuat halaman dinamis.
 * Ini hanya kenyamanan tampilan: penolakan sebenarnya terjadi di server (proxy.ts, aksesAksi, database read-only).
 * - Tombol simpan/kirim/hapus tetap tampil; saat dikirim → pesan pratinjau (tidak ada permintaan ke server).
 * - Form keluar akun (data-keluar-akun) → akhiri pratinjau + keluar lewat /lihat-sebagai/selesai.
 * - Tautan ekspor/unduhan data pribadi → pesan pratinjau.
 */
const bacaLabel = () => {
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_LABEL_PRATINJAU}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
};
const berlangganan = () => () => {};
const UNDUHAN = /\/(ekspor|nilai)(\/|\?|$)|^\/berkas\//;

export function PitaPratinjau() {
  // cookie penanda dibaca saat hidrasi (server: selalu null, halaman publik tetap statis)
  const label = useSyncExternalStore(berlangganan, bacaLabel, () => null);
  const [pesan, setPesan] = useState(0);

  useEffect(() => {
    if (!label) return;
    const akar = document.documentElement;
    akar.dataset.pratinjau = "1";
    const tampilkan = () => setPesan((n) => n + 1);

    const kirim = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement | null;
      if (!form || form.hasAttribute("data-pratinjau-izinkan")) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (form.hasAttribute("data-keluar-akun")) {
        const f = document.createElement("form");
        f.method = "post";
        f.action = `${JALUR_KENDALI_PRATINJAU}/selesai?keluar=1`;
        f.setAttribute("data-pratinjau-izinkan", "");
        document.body.appendChild(f);
        f.submit();
        return;
      }
      tampilkan();
    };
    const klik = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const u = new URL(a.href, location.href);
      if (u.origin === location.origin && UNDUHAN.test(u.pathname)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        tampilkan();
      }
    };
    document.addEventListener("submit", kirim, true);
    document.addEventListener("click", klik, true);
    return () => {
      document.removeEventListener("submit", kirim, true);
      document.removeEventListener("click", klik, true);
      delete akar.dataset.pratinjau;
    };
  }, [label]);

  // tinggi pita nyata (1–2 baris tergantung lebar layar) → --tinggi-pita: isi & header tetap di bawah pita
  useEffect(() => {
    const pita = document.querySelector<HTMLElement>(".pita-pratinjau");
    if (!label || !pita) return;
    const akar = document.documentElement;
    const ukur = () => akar.style.setProperty("--tinggi-pita", `${Math.ceil(pita.getBoundingClientRect().height)}px`);
    const ro = new ResizeObserver(ukur);
    ro.observe(pita);
    ukur();
    return () => {
      ro.disconnect();
      akar.style.removeProperty("--tinggi-pita");
    };
  }, [label]);

  useEffect(() => {
    if (!pesan) return;
    const t = window.setTimeout(() => setPesan(0), 3500);
    return () => clearTimeout(t);
  }, [pesan]);

  if (!label) return null;
  return (
    <>
      <div className="pita-pratinjau" role="region" aria-label="Mode pratinjau peran">
        <p>
          <strong>Anda melihat sebagai: {label}</strong> <span>— mode pratinjau, hanya baca</span>
        </p>
        <div className="pita-pratinjau-aksi">
          <a href={JALUR_KENDALI_PRATINJAU}>Ganti peran</a>
          <form method="post" action={`${JALUR_KENDALI_PRATINJAU}/selesai`} data-pratinjau-izinkan="">
            <button type="submit">Keluar dari pratinjau</button>
          </form>
        </div>
      </div>
      <p className="pesan-pratinjau" role="status" aria-live="polite" data-tampil={pesan ? "" : undefined}>
        {pesan ? PESAN_PRATINJAU : ""}
      </p>
    </>
  );
}
