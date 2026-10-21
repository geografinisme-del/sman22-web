import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { MediaSlot } from "@/components/MediaSlot";
import { AwanTipis } from "@/components/langit/AwanTipis";
import { sekolah } from "@/content/sekolah";
import type { FotoPortal } from "@/lib/data";
import "@/components/langit/halaman.css";
import "./masuk.css";

/**
 * Tata letak halaman masuk (sama untuk Guru & Tendik, Siswa, Orang Tua):
 * kiri (desktop) panel gradien langit + awan tipis + logo + "SMA Negeri 22 Bandung / PORTAL SEKOLAH" + foto khusus
 * peran (radius 24) + caption; di HP foto menjadi pita gambar ±180px di atas formulir. Kanan: kartu putih.
 */
export function HalamanMasuk({ foto, label, judul, pengantar, children, bawah }: { foto: FotoPortal; label: string; judul: string; pengantar: ReactNode; children: ReactNode; bawah?: ReactNode }) {
  return (
    <main className="lp masuk-halaman">
      <section className="masuk-panel" aria-label="Identitas sekolah">
        <AwanTipis lapis={3} />
        <Link href="/" className="masuk-merek" prefetch={false}>
          <Image src={sekolah.logo} alt="" width={502} height={497} sizes="44px" className="masuk-logo" loading="eager" />
          <span>
            <strong>SMA Negeri 22 Bandung</strong>
            <small>Portal Sekolah</small>
          </span>
          <span className="sr-only">, ke beranda</span>
        </Link>
        <figure className="masuk-foto">
          <MediaSlot src={foto.src} alt={foto.alt} ratio="isi" focus={foto.fokus} isPlaceholder={foto.sementara} priority sizes="(min-width: 1024px) 46vw, 100vw" />
          {foto.caption && <figcaption>{foto.caption}</figcaption>}
        </figure>
      </section>

      <section className="masuk-sisi">
        <div className="masuk-kartu">
          <p className="label-mono masuk-label">{label}</p>
          <h1>{judul}</h1>
          <div className="masuk-pengantar">{pengantar}</div>
          {children}
          {bawah && <div className="masuk-bawah">{bawah}</div>}
        </div>
      </section>
    </main>
  );
}
