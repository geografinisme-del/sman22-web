import type { Metadata } from "next";
import Link from "next/link";
import { keluarDanMasuk } from "@/app/admin/actions";
import { getAkses } from "@/lib/admin/auth";
import { alamatMasuk, dasborPeran, LABEL_PERAN_MASUK, lanjutAman, PERAN_MASUK, type PeranMasuk } from "@/lib/masuk";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Halaman untuk peran lain", robots: { index: false, follow: false } };

/**
 * Setelah masuk, ?lanjut= ternyata mengarah ke area peran lain (mis. siswa membuka /admin):
 * jelaskan halaman itu untuk siapa + tautan ke halaman masuk yang benar (keluar dulu dari akun sekarang).
 */
export default async function AksesLain({ searchParams }: { searchParams: Promise<{ untuk?: string; lanjut?: string }> }) {
  const sp = await searchParams;
  const untuk: PeranMasuk = (PERAN_MASUK as string[]).includes(sp.untuk ?? "") ? (sp.untuk as PeranMasuk) : "gtk";
  const lanjut = lanjutAman(sp.lanjut);
  const { akses } = await getAkses();
  const dasbor = akses ? dasborPeran([...akses.peran, ...akses.peranTertunda]) : "/portal-digital";
  const nama = untuk === "gtk" ? "Guru & Tendik" : LABEL_PERAN_MASUK[untuk].pendek;

  return (
    <section className="lgt-bagian" style={{ paddingTop: "calc(var(--tinggi-header) + 56px)" }}>
      <div className="lgt-wadah">
        <div className="pd-akses-lain" role="alert">
          <p className="label-mono">Akses berbeda</p>
          <h1>Halaman ini untuk {nama}</h1>
          <p>
            Akun yang Anda pakai tidak dapat membuka halaman tersebut. Jika Anda juga memiliki akun {nama}, keluar dulu lalu masuk lewat halaman
            masuk {nama}.
          </p>
          <div className="pd-akses-lain-aksi">
            <form data-keluar-akun="" action={keluarDanMasuk}>
              <input type="hidden" name="untuk" value={untuk} />
              {lanjut && <input type="hidden" name="lanjut" value={lanjut} />}
              <button type="submit" className="pd-tombol">
                Keluar & masuk sebagai {nama}
              </button>
            </form>
            <Link href={dasbor} className="lgt-tautan-panah">
              Kembali ke dasbor saya <span aria-hidden>→</span>
            </Link>
          </div>
          <p className="pd-akses-lain-kecil">
            Halaman masuk {nama}: <Link href={alamatMasuk(untuk)}>{alamatMasuk(untuk)}</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
