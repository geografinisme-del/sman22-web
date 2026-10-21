import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { SpmbInfo } from "@/lib/data";

/**
 * Ajakan SPMB (kotak gradien langit radius 32px). Tampil HANYA bila SPMB aktif di CMS (Admin → SPMB Beranda).
 */
export function CtaSpmb({ spmb }: { spmb: SpmbInfo | null }) {
  if (!spmb?.aktif) return null;
  return (
    <section className="lgt-bagian lgt-bagian-rapat" aria-labelledby="judul-cta-spmb">
      <div className="lgt-wadah">
        <div className="lgt-cta">
          <p className="label-mono">SPMB {spmb.tahun}</p>
          <h2 id="judul-cta-spmb">
            Bab berikutnya <span>dimulai di sini.</span>
          </h2>
          <Link href={spmb.tautanJalur || "/spmb"} className="lgt-pil-tombol lgt-pil-lime">
            Lihat jalur dan syarat
            <span className="lgt-pil-bulat" aria-hidden>
              <ArrowUpRight size={16} />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
