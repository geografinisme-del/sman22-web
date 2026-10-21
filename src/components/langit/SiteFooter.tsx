import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { sekolah } from "@/content/sekolah";
import type { DataMenu } from "./tipeMenu";

/**
 * Footer semua halaman publik — struktur kolom sama dengan mega menu / menu HP.
 * `id="navigasi-situs"` = tujuan tautan menu di header saat JavaScript tidak aktif.
 * Media sosial hanya tampil bila URL-nya diisi di CMS (Instagram, YouTube).
 */
export function SiteFooter({ data }: { data: DataMenu }) {
  const grup = data.grup;
  return (
    <footer className="lgt-footer">
      <div className="lgt-wadah">
        <div className="lgt-footer-atas">
          <div className="lgt-footer-identitas">
            <Link href="/" className="lgt-footer-merek" prefetch={false}>
              <Image src={sekolah.logo} alt="" width={502} height={497} sizes="44px" className="h-11 w-11" />
              <span>{sekolah.nama}</span>
            </Link>
            {(data.alamat || data.jamLayanan) && (
              <p className="lgt-footer-alamat">
                {data.alamat}
                {data.alamat && data.jamLayanan && <br />}
                {data.jamLayanan && `Jam layanan ${data.jamLayanan}`}
              </p>
            )}
            {data.sosial.length > 0 && (
              <ul className="lgt-footer-sosial">
                {data.sosial.map((s) => (
                  <li key={s.nama}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.nama}
                      <ArrowUpRight size={14} aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/spmb" className="lgt-footer-spmb">
              Info SPMB <ArrowUpRight size={15} aria-hidden />
            </Link>
          </div>
          <nav id="navigasi-situs" aria-label="Navigasi situs" className="lgt-footer-nav">
            {grup.map((g) => (
              <div key={g.kunci}>
                <p className="label-mono">{g.label}</p>
                <ul>
                  {g.anak.map((a) => (
                    <li key={a.href + a.label}>
                      <Link href={a.href}>{a.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <p className="lgt-footer-bawah">
          © {new Date().getFullYear()} {sekolah.nama} · Dikelola oleh Tim TIK {sekolah.nama}
        </p>
      </div>
    </footer>
  );
}
