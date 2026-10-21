"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Search, X } from "lucide-react";
import { MediaSlot } from "@/components/MediaSlot";
import type { KunciGrup } from "@/content/menu-langit";
import { sekolah } from "@/content/sekolah";
import { formatTanggal } from "@/lib/format";
import { AwanTipis } from "./AwanTipis";
import type { DataMenu } from "./tipeMenu";

/**
 * Menu layar penuh TERANG untuk HP & tablet (< 1024px) memakai <dialog> bawaan: Esc menutup, konten di luar inert
 * (fokus terkunci di dalam menu), scroll halaman dikunci, fokus kembali ke tombol pemicu (diatur SiteHeader).
 * 5 menu sebagai akordeon bernomor 01–05 (satu terbuka): foto kategori + caption, tautan, tombol lime ajakan;
 * Kabar & Agenda menampilkan 3 kabar terbaru. Lalu kartu Portal Digital 22, akses cepat per pengguna, alamat & medsos.
 */
export function MenuHp({ terbuka, onTutup, data }: { terbuka: boolean; onTutup: () => void; data: DataMenu }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [buka, setBuka] = useState<KunciGrup | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (terbuka && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = "hidden";
      // fokus awal: kolom cari
      requestAnimationFrame(() => d.querySelector<HTMLElement>("#lgt-hp-cari")?.focus());
    } else if (!terbuka && d.open) {
      d.close();
    }
    if (!terbuka) document.documentElement.style.overflow = "";
  }, [terbuka]);

  return (
    <dialog
      ref={ref}
      className="lgt-menu-hp"
      aria-label="Menu"
      aria-modal="true"
      onCancel={(e) => {
        e.preventDefault();
        onTutup();
      }}
      onClose={() => terbuka && onTutup()}
    >
      <AwanTipis lapis={2} className="lgt-menu-hp-awan" />
      <div className="lgt-menu-hp-isi">
        <div className="lgt-menu-hp-atas">
          <Link href="/" className="lgt-merek lgt-merek-gelap" prefetch={false} onClick={onTutup}>
            <Image src={sekolah.logo} alt="" width={502} height={497} sizes="80px" className="lgt-logo" />
            <span className="lgt-merek-teks">
              <strong>SMA Negeri 22</strong>
              <small>Bandung</small>
            </span>
            <span className="sr-only">, ke beranda</span>
          </Link>
          <button type="button" className="lgt-menu-hp-tutup" onClick={onTutup}>
            <X size={18} aria-hidden /> Tutup
          </button>
        </div>

        <form action="/cari" role="search" className="lgt-menu-hp-cari">
          <label htmlFor="lgt-hp-cari" className="sr-only">
            Cari di situs
          </label>
          <Search size={18} aria-hidden />
          <input id="lgt-hp-cari" name="q" type="search" placeholder="Cari berita, pengumuman, halaman…" maxLength={80} />
        </form>

        <ul className="lgt-akordeon">
          {data.grup.map((g, i) => {
            const terbukaIni = buka === g.kunci;
            return (
              <li key={g.kunci} data-buka={terbukaIni || undefined}>
                <h2>
                  <button type="button" aria-expanded={terbukaIni} aria-controls={`lgt-hp-${g.kunci}`} onClick={() => setBuka(terbukaIni ? null : g.kunci)}>
                    <span className="lgt-akordeon-nomor">{String(i + 1).padStart(2, "0")}</span>
                    <span className="lgt-akordeon-judul">{g.label}</span>
                    <ChevronDown size={22} aria-hidden className="lgt-akordeon-panah" />
                  </button>
                </h2>
                <div id={`lgt-hp-${g.kunci}`} className="lgt-akordeon-isi" hidden={!terbukaIni}>
                  <figure className="lgt-akordeon-foto">
                    <MediaSlot src={g.foto.src} alt={g.foto.alt} ratio="isi" isPlaceholder={g.foto.sementara} sizes="100vw" />
                    <figcaption className="lgt-pil-caption">{g.foto.caption}</figcaption>
                  </figure>
                  <p className="lgt-akordeon-pengantar">{g.keterangan}</p>
                  <ul className="lgt-akordeon-tautan">
                    {g.anak.map((a) => (
                      <li key={a.href + a.label}>
                        <Link href={a.href} onClick={onTutup}>
                          {a.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {g.jenis === "kabar" && data.kabar.Semua.length > 0 && (
                    <ul className="lgt-akordeon-kabar" aria-label="Kabar terbaru">
                      {data.kabar.Semua.map((k) => (
                        <li key={k.id}>
                          <Link href={k.href} onClick={onTutup}>
                            <span>{k.judul}</span>
                            <time className="label-mono" dateTime={k.tanggal.slice(0, 10)}>
                              {formatTanggal(k.tanggal)}
                            </time>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link href={g.ajakan.href} className="lgt-pil-tombol lgt-pil-lime lgt-akordeon-ajakan" onClick={onTutup}>
                    {g.ajakan.label}
                    <span className="lgt-pil-bulat" aria-hidden>
                      <ArrowUpRight size={16} />
                    </span>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>

        <Link href="/portal-digital" className="lgt-menu-hp-portal" onClick={onTutup}>
          <span>
            <strong>Portal Digital 22</strong>
            <span>Masuk ke portal</span>
          </span>
          <span className="lgt-pil-bulat" aria-hidden>
            <ArrowUpRight size={18} />
          </span>
        </Link>

        <div className="lgt-menu-hp-akses">
          <p className="label-mono">Akses cepat</p>
          {data.akses.map((a) => (
            <div key={a.untuk}>
              <p>{a.untuk}</p>
              <ul>
                {a.tautan.map((t) => (
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

        <div className="lgt-menu-hp-bawah">
          {(data.alamat || data.jamLayanan) && (
            <p>
              {data.alamat}
              {data.alamat && data.jamLayanan && <br />}
              {data.jamLayanan && `Jam layanan ${data.jamLayanan}`}
            </p>
          )}
          {data.sosial.length > 0 && (
            <ul>
              {data.sosial.map((s) => (
                <li key={s.nama}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.nama} <ArrowUpRight size={14} aria-hidden />
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
