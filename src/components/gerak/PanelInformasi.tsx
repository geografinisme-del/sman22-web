"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { formatTanggal } from "@/lib/format";
import { DialogInformasi, type Informasi } from "./DialogInformasi";

/** Penyimpanan sesi yang aman: browser yang memblokir storage tidak membuat halaman gagal. */
const sesi = {
  baca(k: string) {
    try {
      return window.sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  tulis(k: string, v: string) {
    try {
      window.sessionStorage.setItem(k, v);
    } catch {
      /* storage tidak tersedia: perilaku tetap berjalan untuk halaman ini saja */
    }
  },
};
const KUNCI_OTOMATIS = "sman22:info:otomatis";
const KUNCI_TUTUP = "sman22:info:ditutup"; // hanya ID pengumuman, tanpa data pribadi
const AMBANG = 0.3; // muncul setelah ±30% halaman & bagian pembuka terlewati

type Mode = "diam" | "panel" | "teaser" | "tombol";

/**
 * Panel "Informasi sekolah": nonmodal, muncul otomatis paling banyak sekali per sesi setelah
 * pengunjung melewati bagian pembuka. Tidak mengambil fokus, tidak menggelapkan latar, tidak
 * mengunci scroll, dan tidak hilang sendiri. Setelah ditutup, tersisa tombol "Informasi".
 * Ponsel: teaser ringkas di bawah layar; panel lengkap baru terbuka setelah teaser diketuk.
 * Hanya dirender bila ada pengumuman aktif (data CMS terbit + rentang tayang).
 */
export function PanelInformasi({ info }: { info: Informasi[] }) {
  const [mode, setMode] = useState<Mode>("diam");
  const [detail, setDetail] = useState<Informasi | null>(null);
  const [adaInput, setAdaInput] = useState(false);
  const tombolBuka = useRef<HTMLButtonElement>(null);
  const fokusKeTombol = useRef(false);

  // muncul setelah ambang gulir — sekali per sesi; sesudahnya hanya tombol "Informasi"
  useEffect(() => {
    let frame = 0;
    const cek = () => {
      frame = 0;
      const pembuka = document.querySelector(".pembuka");
      const lewatPembuka = !pembuka || pembuka.getBoundingClientRect().bottom < 0;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (!lewatPembuka || (total > 0 && window.scrollY / total < AMBANG)) return;
      window.removeEventListener("scroll", jadwal);
      const ditutup = (sesi.baca(KUNCI_TUTUP) ?? "").split(",");
      const sudahOtomatis = sesi.baca(KUNCI_OTOMATIS) === "1";
      const adaBaru = info.some((i) => !ditutup.includes(i.id));
      if (sudahOtomatis || !adaBaru) return setMode("tombol");
      sesi.tulis(KUNCI_OTOMATIS, "1");
      setMode(window.matchMedia("(min-width: 768px)").matches ? "panel" : "teaser");
    };
    const jadwal = () => {
      if (!frame) frame = requestAnimationFrame(cek);
    };
    window.addEventListener("scroll", jadwal, { passive: true });
    jadwal();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", jadwal);
    };
  }, [info]);

  // jangan menutupi kolom isian yang sedang dipakai (mis. pencarian)
  useEffect(() => {
    const isian = (t: EventTarget | null) => t instanceof HTMLElement && !t.closest(".panel-info") && t.matches("input, textarea, select, [contenteditable]");
    const masuk = (e: FocusEvent) => setAdaInput(isian(e.target));
    const keluar = () => setAdaInput(false);
    document.addEventListener("focusin", masuk);
    document.addEventListener("focusout", keluar);
    return () => {
      document.removeEventListener("focusin", masuk);
      document.removeEventListener("focusout", keluar);
    };
  }, []);

  // setelah panel ditutup lewat keyboard, fokus pindah ke tombol "Informasi"
  useEffect(() => {
    if (mode === "tombol" && fokusKeTombol.current) {
      fokusKeTombol.current = false;
      tombolBuka.current?.focus();
    }
  }, [mode]);

  const tutup = (lewatKeyboard: boolean) => {
    sesi.tulis(KUNCI_TUTUP, info.map((i) => i.id).join(","));
    fokusKeTombol.current = lewatKeyboard;
    setMode("tombol");
  };

  if (mode === "diam" || adaInput) return <DialogInformasi info={detail} onTutup={() => setDetail(null)} />;
  const [utama, ...lain] = info;

  return (
    <>
      {mode === "tombol" && (
        <button ref={tombolBuka} type="button" className="info-tombol" onClick={() => setMode("panel")} aria-label={`Buka informasi sekolah (${info.length})`}>
          <Bell size={18} aria-hidden />
          Informasi
          <span className="info-jumlah" aria-hidden>
            {info.length}
          </span>
        </button>
      )}

      {mode === "teaser" && (
        <div className="info-teaser panel-info">
          <button type="button" className="info-teaser-buka" onClick={() => setMode("panel")} aria-label={`Lihat informasi sekolah: ${utama.judul}`}>
            <Bell size={18} aria-hidden className="shrink-0 text-[var(--lp-utama)]" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[var(--lp-utama)]">{utama.jenis}</span>
              <span className="block truncate font-semibold">{utama.judul}</span>
            </span>
          </button>
          <button type="button" className="tombol-tutup" aria-label="Tutup informasi" onClick={(e) => tutup(e.detail === 0)}>
            <X size={18} aria-hidden />
          </button>
        </div>
      )}

      {mode === "panel" && (
        <section className="info-panel panel-info" aria-labelledby="info-panel-judul">
          <div className="flex items-center justify-between gap-3">
            <h2 id="info-panel-judul" className="text-[0.9375rem] font-bold">
              Informasi sekolah
            </h2>
            <button type="button" className="tombol-tutup" aria-label="Tutup informasi" onClick={(e) => tutup(e.detail === 0)}>
              <X size={18} aria-hidden />
            </button>
          </div>
          <article className="mt-3">
            <p className="text-sm text-[#5b6270]">
              <span className="font-semibold text-[var(--lp-utama)]">{utama.jenis}</span> · <time dateTime={utama.tanggal}>{formatTanggal(utama.tanggal)}</time>
            </p>
            <h3 className="mt-1 line-clamp-2 text-[1.0625rem] font-semibold leading-snug">{utama.judul}</h3>
            {utama.isi && <p className="mt-1.5 line-clamp-3 text-[0.9375rem] text-[#3b414b]">{utama.isi}</p>}
            <button type="button" className="btn btn-primary mt-4 w-full" onClick={() => setDetail(utama)}>
              Baca informasi
            </button>
          </article>
          {lain.length > 0 && (
            <ul className="mt-4 border-t border-[#e5e1da] pt-2">
              {lain.slice(0, 2).map((i) => (
                <li key={i.id}>
                  <button type="button" className="info-lain" onClick={() => setDetail(i)}>
                    <span className="line-clamp-1 font-semibold">{i.judul}</span>
                    <time dateTime={i.tanggal} className="shrink-0 text-sm text-[#5b6270]">
                      {formatTanggal(i.tanggal, { year: undefined })}
                    </time>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <DialogInformasi info={detail} onTutup={() => setDetail(null)} />
    </>
  );
}
