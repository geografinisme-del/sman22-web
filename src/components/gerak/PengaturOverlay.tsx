"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bell, X } from "lucide-react";
import { formatTanggal } from "@/lib/format";
import { AMBANG_RUTIN, pilihOverlay, type OverlayOtomatis, type Sesi } from "@/lib/tampilan/overlay";
import { DialogInformasi, type Informasi } from "./DialogInformasi";
import { ModalPrioritas, type InfoPrioritas } from "./ModalPrioritas";
import { KUNCI_PEMANDU_MATI, Pemandu } from "./Pemandu";

/** Storage yang aman: browser yang memblokir storage tidak membuat halaman gagal. */
function simpan(jenis: "session" | "local") {
  const s = () => (jenis === "session" ? window.sessionStorage : window.localStorage);
  return {
    baca(k: string) {
      try {
        return s().getItem(k);
      } catch {
        return null;
      }
    },
    tulis(k: string, v: string | null) {
      try {
        if (v === null) s().removeItem(k);
        else s().setItem(k, v);
      } catch {
        /* storage tidak tersedia: perilaku berlaku untuk halaman ini saja */
      }
    },
  };
}
const sesi = simpan("session");
const lokal = simpan("local");
const K = { prioritas: "sman22:overlay:prioritas", rutin: "sman22:overlay:rutin", sapa: "sman22:overlay:sapa", ditutup: "sman22:info:ditutup" };

const ACARA_PEMANDU = "sman22:pemandu";
const langgananPemandu = (cb: () => void) => {
  window.addEventListener(ACARA_PEMANDU, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(ACARA_PEMANDU, cb);
    window.removeEventListener("storage", cb);
  };
};
/** Nyalakan/matikan pemandu di perangkat ini (dipakai juga tautan di footer). */
export function aturPemandu(mati: boolean) {
  lokal.tulis(KUNCI_PEMANDU_MATI, mati ? "1" : null);
  window.dispatchEvent(new Event(ACARA_PEMANDU));
}
export function usePemanduMati() {
  return useSyncExternalStore(langgananPemandu, () => lokal.baca(KUNCI_PEMANDU_MATI) === "1", () => false);
}

type Mode = "tutup" | "panel" | "teaser";

const KUERI_LEBAR = "(min-width: 768px)";
const langgananLebar = (cb: () => void) => {
  const mq = window.matchMedia(KUERI_LEBAR);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/**
 * Pengatur overlay bersama untuk halaman publik (dipasang sekali di layout).
 * Memutuskan lewat `pilihOverlay()` (diuji di src/lib/tampilan/tampilan.test.ts) sehingga modal prioritas,
 * panel informasi rutin, dan lambaian pemandu tidak pernah tampil bersamaan atau berturut-turut.
 * Modal prioritas & panel rutin hanya otomatis di halaman beranda; pemandu tersedia di semua halaman publik.
 */
export function PengaturOverlay({
  halamanUtama = "/",
  aturan,
  prioritas,
  rutin,
  adaTombolInfo = true,
}: {
  halamanUtama?: string;
  /** false = tanpa tombol "Informasi" mengambang (tema Buku Tahunan: pengumuman di pita atas) */
  adaTombolInfo?: boolean;
  aturan: { prioritas: boolean; rutin: boolean; pemandu: boolean };
  prioritas: InfoPrioritas | null;
  rutin: Informasi[];
}) {
  const path = usePathname();
  const diBeranda = path === halamanUtama;
  const pemanduMati = usePemanduMati();
  const [otomatis, setOtomatis] = useState<OverlayOtomatis | null>(null);
  const [mode, setMode] = useState<Mode>("tutup");
  const [tombolInfo, setTombolInfo] = useState(false);
  const [detail, setDetail] = useState<Informasi | null>(null);
  const lebar = useSyncExternalStore(langgananLebar, () => window.matchMedia(KUERI_LEBAR).matches, () => true);
  const tombolBuka = useRef<HTMLButtonElement>(null);
  const fokusKeTombol = useRef(false);
  const mulai = useRef(0);

  // informasi di panel: prioritas (bila ada) + informasi rutin
  const daftar: Informasi[] = [
    ...(prioritas ? [{ id: prioritas.id, jenis: prioritas.kategori, judul: prioritas.judul, tanggal: prioritas.tanggal, isi: prioritas.isi, href: prioritas.href }] : []),
    ...rutin,
  ];
  const kandidat = {
    prioritas: diBeranda && aturan.prioritas && Boolean(prioritas),
    rutin: diBeranda && aturan.rutin && rutin.length > 0,
    pemandu: aturan.pemandu && !pemanduMati,
  };

  const evaluasi = useCallback(() => {
    const pembuka = document.querySelector(".pembuka, [data-hero-langit]");
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const progres = total > 0 ? window.scrollY / total : 0;
    const lewatPembuka = !pembuka || pembuka.getBoundingClientRect().bottom < 0;
    const aktif = document.activeElement;
    const s: Sesi = { prioritasTampil: sesi.baca(K.prioritas) === "1", rutinTampil: sesi.baca(K.rutin) === "1", sapaTampil: sesi.baca(K.sapa) === "1" };
    // tombol "Informasi" tersedia setelah ambang gulir (atau setelah panel/modal pernah tampil di sesi ini),
    // tidak bergantung pada overlay otomatis yang sedang berjalan
    if (adaTombolInfo && diBeranda && daftar.length && (s.rutinTampil || s.prioritasTampil || (lewatPembuka && progres >= AMBANG_RUTIN))) setTombolInfo(true);
    if (otomatis) return;
    const pilih = pilihOverlay(kandidat, s, {
      pembukaTerlihat: Boolean(pembuka) && performance.now() - mulai.current > 1200,
      lewatPembuka,
      progres,
      sedangMengisi: aktif instanceof HTMLElement && aktif.matches("input, textarea, select, [contenteditable]"),
      dialogLainTerbuka: Boolean(document.querySelector("dialog[open], .menu-hp[open], #laci-menu, .menu-layanan-panel:not([hidden]), .pemandu-panel")),
      overlayTampil: mode !== "tutup",
    });
    if (!pilih) return;
    sesi.tulis(K[pilih], "1");
    setOtomatis(pilih);
    if (pilih === "rutin") setMode(window.matchMedia(KUERI_LEBAR).matches ? "panel" : "teaser");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- kandidat/daftar dihitung ulang tiap render dari props
  }, [otomatis, mode, diBeranda, adaTombolInfo, kandidat.prioritas, kandidat.rutin, kandidat.pemandu, daftar.length]);

  useEffect(() => {
    mulai.current = performance.now();
    let frame = 0;
    const jadwal = () => {
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          evaluasi();
        });
    };
    // pemeriksaan awal memakai timer langsung (bukan rAF) agar tetap berjalan walau halaman belum dilukis
    const t = window.setTimeout(evaluasi, 1300);
    window.addEventListener("scroll", jadwal, { passive: true });
    document.addEventListener("focusout", jadwal);
    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", jadwal);
      document.removeEventListener("focusout", jadwal);
    };
  }, [evaluasi, path]);

  // lambaian pemandu hanya sekali, lalu diam
  useEffect(() => {
    if (otomatis !== "sapa") return;
    const t = window.setTimeout(() => setOtomatis(null), 1600);
    return () => window.clearTimeout(t);
  }, [otomatis]);

  useEffect(() => {
    if (mode === "tutup" && fokusKeTombol.current) {
      fokusKeTombol.current = false;
      tombolBuka.current?.focus();
    }
  }, [mode]);

  const tutupPanel = (lewatKeyboard: boolean) => {
    sesi.tulis(K.ditutup, daftar.map((i) => i.id).join(","));
    fokusKeTombol.current = lewatKeyboard;
    setMode("tutup");
    setTombolInfo(true);
    if (otomatis === "rutin") setOtomatis(null);
  };
  const [utama, ...lain] = daftar;

  return (
    <>
      {prioritas && diBeranda && <ModalPrioritas info={prioritas} buka={otomatis === "prioritas"} onTutup={() => setOtomatis(null)} />}

      {mode === "tutup" && tombolInfo && diBeranda && utama && (
        <button ref={tombolBuka} type="button" className="info-tombol" onClick={() => setMode("panel")} aria-label={`Buka informasi sekolah (${daftar.length})`}>
          <Bell size={18} aria-hidden />
          Informasi
          <span className="info-jumlah" aria-hidden>
            {daftar.length}
          </span>
        </button>
      )}

      {mode === "teaser" && utama && (
        <div className="info-teaser panel-info">
          <button type="button" className="info-teaser-buka" onClick={() => setMode("panel")} aria-label={`Lihat informasi sekolah: ${utama.judul}`}>
            <Bell size={18} aria-hidden className="shrink-0 text-[var(--lp-utama)]" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[var(--lp-utama)]">{utama.jenis}</span>
              <span className="block truncate font-semibold">{utama.judul}</span>
            </span>
          </button>
          <button type="button" className="tombol-tutup" aria-label="Tutup informasi" onClick={(e) => tutupPanel(e.detail === 0)}>
            <X size={18} aria-hidden />
          </button>
        </div>
      )}

      {mode === "panel" && utama && (
        <section className="info-panel panel-info" aria-labelledby="info-panel-judul">
          <div className="flex items-center justify-between gap-3">
            <h2 id="info-panel-judul">Informasi sekolah</h2>
            <button type="button" className="tombol-tutup" aria-label="Tutup informasi" onClick={(e) => tutupPanel(e.detail === 0)}>
              <X size={18} aria-hidden />
            </button>
          </div>
          <article className="mt-3">
            <p className="text-sm text-[#5b6270]">
              <span className="font-semibold text-[var(--lp-utama)]">{utama.jenis}</span> · <time dateTime={utama.tanggal}>{formatTanggal(utama.tanggal)}</time>
            </p>
            <h3 className="mt-1 line-clamp-2 font-semibold leading-snug">{utama.judul}</h3>
            {utama.isi && <p className="mt-1.5 line-clamp-3 text-[0.9375rem] text-[#3b414b]">{utama.isi}</p>}
            <button type="button" className="btn btn-primary mt-4 w-full" onClick={() => setDetail(utama)}>
              Baca informasi
            </button>
          </article>
          {lain.length > 0 && (
            <ul className="mt-4 border-t border-[#e5e1da] pt-2">
              {lain.slice(0, 3).map((i) => (
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

      {aturan.pemandu && (
        <Pemandu melambai={otomatis === "sapa"} tersembunyi={pemanduMati || (!lebar && mode !== "tutup")} onMati={() => aturPemandu(true)} />
      )}
    </>
  );
}
