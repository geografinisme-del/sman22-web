"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, BadgeCheck, BookOpen, ClipboardList, MessageSquare, type LucideIcon } from "lucide-react";
import { MediaSlot } from "@/components/MediaSlot";
import { KATEGORI_KABAR, type GrupLangit, type KategoriKabar } from "@/content/menu-langit";
import { formatTanggal } from "@/lib/format";
import type { DataMenu } from "./tipeMenu";

/** Ikon garis per layanan (dicocokkan dari alamat tautan). */
const IKON_LAYANAN: [RegExp, LucideIcon][] = [
  [/perpustakaan/, BookOpen],
  [/pengaduan/, MessageSquare],
  [/sertifikat/, BadgeCheck],
  [/survei/, ClipboardList],
];

/**
 * Isi satu panel mega menu (desktop). KIRI: label mono + pengantar + SEMUA tautan (judul + keterangan) + "Lihat semua".
 * KANAN: 3 kartu foto sorotan (Profil, Pembelajaran, Kehidupan Siswa) · kategori & 3 kabar terbaru (Kabar & Agenda) ·
 * kartu layanan berikon + kotak bantuan (Layanan). Bawah: chip akses cepat. Klik tautan mana pun menutup panel.
 */
export function PanelMega({ g, data, onPilih }: { g: GrupLangit; data: DataMenu; onPilih: () => void }) {
  const [kategori, setKategori] = useState<KategoriKabar>("Semua");
  const kabar = data.kabar[kategori] ?? [];
  return (
    <div className="lgt-mega-isi">
      <div className="lgt-mega-kisi" data-jenis={g.jenis}>
        <div className="lgt-mega-kiri">
          <p className="label-mono lgt-mega-label">{g.label}</p>
          <p className="lgt-mega-pengantar">{g.keterangan}</p>
          {g.jenis === "kabar" && (
            <ul className="lgt-mega-kategori" aria-label="Kategori kabar">
              {KATEGORI_KABAR.map((k) => (
                <li key={k}>
                  <button type="button" aria-pressed={kategori === k} onMouseEnter={() => setKategori(k)} onFocus={() => setKategori(k)} onClick={() => setKategori(k)}>
                    {k}
                    <ArrowRight size={15} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {g.jenis === "kabar" && <p className="label-mono lgt-mega-subjudul">Buka halaman</p>}
          <ul className={`lgt-mega-tautan ${g.jenis === "kabar" ? "lgt-mega-tautan-ringkas" : ""}`}>
            {g.anak.map((a) => (
              <li key={a.href + a.label}>
                <Link href={a.href} onClick={onPilih}>
                  <strong>{a.label}</strong>
                  {g.jenis !== "kabar" && <span>{a.keterangan}</span>}
                </Link>
              </li>
            ))}
          </ul>
          <Link href={g.semua.href} className="lgt-mega-semua" onClick={onPilih}>
            {g.semua.label} <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="lgt-mega-kanan">
          {g.jenis === "foto" && (
            <>
              {g.sorotanJudul && <p className="label-mono lgt-mega-sorotan-judul">{g.sorotanJudul}</p>}
              <ul className="lgt-mega-kartu">
                {g.sorotan.slice(0, 3).map((k) => (
                  <li key={k.href + k.judul}>
                    <Link href={k.href} onClick={onPilih}>
                      <MediaSlot src={k.foto.src} alt={k.foto.alt} ratio="4/3" focus={k.fokus} isPlaceholder={k.sementara} labelDiNamaInduk sizes="(min-width: 1320px) 280px, 22vw" className="lgt-mega-foto" />
                      <strong>
                        {k.judul} <ArrowUpRight size={16} aria-hidden />
                      </strong>
                      <span>{k.keterangan}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          {g.jenis === "kabar" &&
            (kabar.length ? (
              <ul className="lgt-mega-kartu" aria-live="polite" aria-label={`Kabar terbaru: ${kategori}`}>
                {kabar.map((k) => (
                  <li key={k.id}>
                    <Link href={k.href} onClick={onPilih}>
                      <span className="lgt-mega-kabar-foto">
                        <MediaSlot src={k.foto} alt="" ratio="4/3" isPlaceholder={k.sementara} labelDiNamaInduk sizes="(min-width: 1320px) 280px, 22vw" className="lgt-mega-foto" />
                        <span className="lgt-mega-pil">{k.jenis}</span>
                      </span>
                      <strong className="lgt-mega-kabar-judul">{k.judul}</strong>
                      <time className="label-mono lgt-mega-tanggal" dateTime={k.tanggal.slice(0, 10)}>
                        {formatTanggal(k.tanggal)}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="lgt-mega-kosong">{kategori === "Semua" ? "Belum ada kabar terbaru." : `Belum ada kabar terbaru untuk kategori ${kategori.toLowerCase()}.`}</p>
            ))}

          {g.jenis === "layanan" && (
            <>
              <ul className="lgt-mega-layanan">
                {g.anak.map((a) => {
                  const Ikon = IKON_LAYANAN.find(([r]) => r.test(a.href))?.[1] ?? ArrowUpRight;
                  return (
                    <li key={a.href}>
                      <Link href={a.href} onClick={onPilih}>
                        <span className="lgt-mega-ikon">
                          <Ikon size={20} aria-hidden strokeWidth={1.8} />
                        </span>
                        <span>
                          <strong>{a.label}</strong>
                          <span>{a.keterangan}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="lgt-mega-bantuan">
                <p>
                  <strong>Butuh bantuan?</strong> Layanan TU {data.jamLayanan || "Senin–Jumat, 07.00–15.00 WIB"}
                </p>
                <Link href="/kontak" className="lgt-pil-tombol lgt-pil-lime" onClick={onPilih}>
                  Hubungi kami
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="lgt-mega-akses">
        <span>Akses cepat:</span>
        <ul>
          {data.chip.map((c) => (
            <li key={c.href + c.label}>
              <Link href={c.href} onClick={onPilih}>
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
