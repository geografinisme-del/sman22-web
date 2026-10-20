import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { dataMenu } from "@/components/langit/dataMenu";
import { SiteFooter } from "@/components/langit/SiteFooter";
import { SiteHeader } from "@/components/langit/SiteHeader";
import "@/components/langit/langit.css";
import "@/components/langit/halaman.css";

/** 404 bergaya langit: hero gradien + awan, tombol kembali ke beranda (lime). */
export default async function NotFound() {
  const menu = await dataMenu();
  return (
    <div className="situs-publik situs-langit flex min-h-screen flex-col">
      <SiteHeader data={menu} />
      <main id="konten" className="lp flex-1">
        <section className="lgt-phero lgt-404" data-hero-langit>
          <svg className="lgt-phero-awan" viewBox="0 0 760 140" preserveAspectRatio="none" aria-hidden>
            <path d="M0 120 C 60 60 140 60 190 95 C 230 40 330 40 370 95 C 420 55 520 60 560 110 C 620 70 720 80 760 120 Z" />
          </svg>
          <div className="lgt-wadah lgt-phero-isi">
            <p className="label-mono lgt-phero-label">Galat 404</p>
            <h1>Halaman tidak ditemukan.</h1>
            <p className="lgt-phero-desk">Halaman yang Anda cari mungkin sudah dipindah atau tidak tersedia.</p>
            <div className="lgt-phero-aksi">
              <Link href="/" className="lgt-pil-tombol lgt-pil-lime">
                Kembali ke beranda
                <span className="lgt-pil-bulat" aria-hidden>
                  <ArrowUpRight size={16} />
                </span>
              </Link>
              <Link href="/cari">Cari di situs →</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter data={menu} />
    </div>
  );
}
