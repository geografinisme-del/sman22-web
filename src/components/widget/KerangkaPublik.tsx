import "server-only";
import type { CSSProperties, ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PengamatMuncul } from "@/components/gerak/PengamatMuncul";
import { HeaderMengecil } from "@/components/buku/HeaderMengecil";
import { PengaturOverlay } from "@/components/gerak/PengaturOverlay";
import type { InfoPrioritas } from "@/components/gerak/ModalPrioritas";
import type { Informasi } from "@/components/gerak/DialogInformasi";
import { getBerita, getPengumuman } from "@/lib/data";
import type { Konfigurasi } from "@/lib/tampilan/konfigurasi";
import { FONT, PALET } from "@/lib/tampilan/token";
import Link from "next/link";
import "@/components/beranda/beranda.css";
import "./tema.css";
import "@/components/buku/buku.css";

const HARI_BERITA_RUTIN = 14;

/** Isi overlay: pengumuman prioritas (modal) & informasi rutin (panel) — hanya konten terbit/aktif (RLS). */
async function muatOverlay(k: Konfigurasi): Promise<{ prioritas: InfoPrioritas | null; rutin: Informasi[] }> {
  if (!k.popup.prioritas && !k.popup.rutin) return { prioritas: null, rutin: [] };
  const [pengumuman, berita] = await Promise.all([getPengumuman(12), k.popup.rutin ? getBerita(3) : Promise.resolve([])]);
  const p = pengumuman.find((x) => x.prioritas);
  const prioritas: InfoPrioritas | null =
    k.popup.prioritas && p
      ? { id: p.id, judul: p.judul, tanggal: p.tanggal, isi: p.isi, kategori: "Pengumuman prioritas", poster: p.poster, tautan: p.tautan, href: `/agenda#pengumuman-${p.id}` }
      : null;
  const batas = new Date(Date.now() - HARI_BERITA_RUTIN * 864e5).toISOString().slice(0, 10);
  const rutin: Informasi[] = k.popup.rutin
    ? [
        ...pengumuman
          .filter((x) => !x.prioritas)
          .map((x) => ({ id: x.id, jenis: x.penting ? "Pengumuman penting" : "Pengumuman", judul: x.judul, tanggal: x.tanggal, isi: x.isi, href: `/agenda#pengumuman-${x.id}` })),
        ...berita
          .filter((b) => b.tanggal >= batas)
          .map((b) => ({ id: `berita-${b.slug}`, jenis: b.kategori || "Berita", judul: b.judul, tanggal: b.tanggal, isi: b.ringkasan, href: `/berita/${b.slug}`, gambar: b.gambar })),
      ].slice(0, 4)
    : [];
  return { prioritas, rutin };
}

/**
 * Kerangka halaman publik: header, konten, footer, pengamat gerak, dan pengatur overlay.
 * Token tema (palet, font) dipasang sebagai variabel CSS di pembungkus ini saja — dasbor admin tidak
 * terpengaruh. `data-tema` & `data-gerak` memilih varian CSS tema dan tingkat gerak.
 */
export async function KerangkaPublik({ konfig, halamanUtama = "/", pita, children }: { konfig: Konfigurasi; halamanUtama?: string; pita?: ReactNode; children: ReactNode }) {
  const buku = konfig.tema === "buku";
  // tema Buku Tahunan: tanpa panel/tombol "Informasi" mengambang (pengumuman tampil di pita atas)
  const overlay = await muatOverlay(buku ? { ...konfig, popup: { ...konfig.popup, rutin: false } } : konfig);
  // pita pengumuman: satu pengumuman terpenting (prioritas → penting → terbaru); hilang bila tidak ada
  const daftarPengumuman = buku ? await getPengumuman(6) : [];
  const pitaPengumuman = daftarPengumuman.find((x) => x.prioritas) ?? daftarPengumuman[0];
  const p = PALET[konfig.palet];
  const gaya = { "--tema-utama": p.utama, "--tema-aksen": p.aksen, "--tema-gelap": p.gelap, "--font-publik": FONT[konfig.font].css } as CSSProperties;
  return (
    <div className="situs-publik flex min-h-screen flex-col" data-tema={konfig.tema} data-gerak={konfig.gerak} style={gaya}>
      <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2">
        Lewati ke konten
      </a>
      {pita}
      {pitaPengumuman && (
        <div className="pita-pengumuman">
          <p className="lp-wadah">
            <span className="pita-label">Pengumuman</span>
            <span className="pita-teks">{pitaPengumuman.judul}</span>
            <Link href={`/agenda#pengumuman-${pitaPengumuman.id}`} className="pita-tautan" prefetch={false}>
              Lihat
            </Link>
          </p>
        </div>
      )}
      <Header />
      <main id="konten" tabIndex={-1} className="lp halaman-publik flex-1 focus:outline-none">
        {children}
      </main>
      <Footer />
      <PengamatMuncul />
      {buku && <HeaderMengecil />}
      {/* lapisan overlay memakai gaya situs publik (.lp) walau berada di luar <main> */}
      <div className="lp">
        <PengaturOverlay
          halamanUtama={halamanUtama}
          aturan={{ prioritas: konfig.popup.prioritas, rutin: buku ? false : konfig.popup.rutin, pemandu: konfig.pemandu.aktif }}
          prioritas={overlay.prioritas}
          rutin={overlay.rutin}
          adaTombolInfo={!buku}
        />
      </div>
    </div>
  );
}
