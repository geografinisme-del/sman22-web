"use client";

import { MediaSlot } from "@/components/MediaSlot";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import { AKSES_CEPAT, GRUP_LANGIT, denganELearning, type GrupLangit } from "@/content/menu-langit";

export type DataMenu = {
  /** tujuan E-Learning dari CMS (atau halaman penjelasan bawaan) */
  eLearning: string;
  alamat: string;
  jamLayanan: string;
  /** hanya akun yang URL-nya diisi di CMS (Instagram, YouTube) */
  sosial: { nama: string; url: string }[];
};

/**
 * Menu layar penuh (latar #0A0A0C, aksen lime) memakai <dialog> bawaan: Esc menutup, konten di luar menjadi
 * inert (fokus terkunci di dalam menu), fokus kembali ke tombol pemicu saat ditutup (diatur SiteHeader).
 * Kolom 1: grup (hover/fokus mengganti kolom 2 + foto pratinjau). Kolom 3: akses cepat per peran.
 */
export function FullMenu({ terbuka, grupAwal, onTutup, data }: { terbuka: boolean; grupAwal: GrupLangit["kunci"]; onTutup: () => void; data: DataMenu }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [aktif, setAktif] = useState<GrupLangit["kunci"]>(grupAwal);
  const grup = denganELearning(GRUP_LANGIT, data.eLearning);
  const akses = denganELearning(AKSES_CEPAT, data.eLearning);
  const g = grup.find((x) => x.kunci === aktif) ?? grup[0];

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (terbuka && !d.open) {
      setAktif(grupAwal);
      d.showModal();
      document.documentElement.style.overflow = "hidden";
      // fokus awal: judul grup yang dipilih
      requestAnimationFrame(() => d.querySelector<HTMLElement>(`[data-grup="${grupAwal}"]`)?.focus());
    } else if (!terbuka && d.open) {
      d.close();
    }
    if (!terbuka) document.documentElement.style.overflow = "";
  }, [terbuka, grupAwal]);

  return (
    <dialog
      ref={ref}
      className="lgt-menu"
      aria-label="Menu lengkap"
      onCancel={(e) => {
        e.preventDefault();
        onTutup();
      }}
      onClose={() => terbuka && onTutup()}
    >
      <div className="lgt-menu-isi">
        <div className="lgt-menu-atas">
          <span className="label-mono lgt-menu-judul">Menu lengkap</span>
          <button type="button" className="lgt-menu-tutup" onClick={onTutup}>
            <X size={18} aria-hidden /> Tutup
          </button>
        </div>

        <div className="lgt-menu-kisi">
          {/* kolom 1 */}
          <ul className="lgt-menu-grup" aria-label="Grup menu">
            {grup.map((x) => (
              <li key={x.kunci}>
                <button
                  type="button"
                  data-grup={x.kunci}
                  aria-expanded={aktif === x.kunci}
                  aria-controls="lgt-menu-anak"
                  onMouseEnter={() => setAktif(x.kunci)}
                  onFocus={() => setAktif(x.kunci)}
                  onClick={() => setAktif(x.kunci)}
                >
                  {x.label}
                </button>
              </li>
            ))}
          </ul>

          {/* kolom 2 */}
          <div id="lgt-menu-anak" className="lgt-menu-anak" aria-live="polite">
            <figure className="lgt-menu-foto">
              <MediaSlot src={g.foto.src} alt={g.foto.alt} ratio="isi" sizes="(min-width: 900px) 28vw, 90vw" />
            </figure>
            <p className="lgt-menu-ket">{g.keterangan}</p>
            <ul>
              {g.anak.map((a) => (
                <li key={a.href + a.label}>
                  <Link href={a.href} onClick={onTutup}>
                    {a.label}
                    <ArrowUpRight size={18} aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* kolom 3 */}
          <div className="lgt-menu-akses">
            <p className="label-mono">Akses cepat untuk</p>
            {akses.map((k) => (
              <div key={k.untuk}>
                <p className="lgt-menu-untuk">{k.untuk}</p>
                <ul>
                  {k.tautan.map((t) => (
                    <li key={t.href + t.label}>
                      <Link href={t.href} onClick={onTutup}>
                        {t.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="lgt-menu-bawah">
          <form action="/cari" role="search" className="lgt-menu-cari">
            <label htmlFor="lgt-cari" className="sr-only">
              Cari di situs
            </label>
            <Search size={18} aria-hidden />
            <input id="lgt-cari" name="q" type="search" placeholder="Cari berita, pengumuman, halaman…" maxLength={80} />
            <button type="submit">Cari</button>
          </form>
          <p className="lgt-menu-alamat">
            {[data.alamat, data.jamLayanan && `Jam layanan ${data.jamLayanan}`].filter(Boolean).join(" · ")}
          </p>
          {data.sosial.length > 0 && (
            <ul className="lgt-menu-sosial">
              {data.sosial.map((s) => (
                <li key={s.nama}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.nama}
                    <ArrowUpRight size={15} aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </dialog>
  );
}
