import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { IkonBidang } from "@/components/IkonBidang";
import { getAkses } from "@/lib/admin/auth";
import { BIDANG, type KunciBidang } from "@/lib/bidang";
import { putuskanPintu } from "@/lib/portal-digital";
import { keluar } from "../../../admin/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Membuka layanan", robots: { index: false, follow: false } };

/**
 * Keputusan akses kartu Portal Digital 22 (di server): belum masuk → login bersama dengan tujuan kembali;
 * berwenang → ruang kerja; tidak berwenang → penjelasan. Halaman tujuan tetap memeriksa izinnya sendiri.
 */
export default async function BukaBidang({ params }: { params: Promise<{ bidang: string }> }) {
  const { bidang } = await params;
  const { user, akses } = await getAkses();
  const k = putuskanPintu(bidang, akses, Boolean(user));
  if (!k) notFound();
  if (k.aksi !== "tolak") redirect(k.href);
  const b = BIDANG[bidang as KunciBidang];
  const hanyaPortal = akses ? akses.peran.every((p) => p === "siswa" || p === "orang_tua") : false;

  return (
    <div className="pd-wadah">
      <div className="pd-kotak" data-bidang={bidang} role="alert">
        <p className="flex items-center gap-2 font-semibold text-[var(--bidang-teks)]">
          <IkonBidang bidang={bidang as KunciBidang} size={20} /> {b.label}
        </p>
        <h1 className="mt-2 font-bold">{k.judul}</h1>
        <p className="mt-2 text-[#3b414b]">{k.alasan}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/portal-digital" className="pd-tautan">
            Kembali ke Portal Digital 22
          </Link>
          {akses && (
            <Link href={hanyaPortal ? "/portal" : "/admin/mulai"} className="pd-tautan">
              Ruang kerja saya
            </Link>
          )}
          <form action={keluar}>
            <button type="submit" className="pd-tautan">
              Masuk dengan akun lain
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
