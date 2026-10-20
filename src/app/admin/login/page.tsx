import type { Metadata } from "next";
import Link from "next/link";
import { BingkaiAkun } from "@/components/akun/BingkaiAkun";
import { getSitus } from "@/lib/data";
import { supabaseAktif } from "@/lib/supabase/config";
import { lanjutAman } from "@/lib/portal-digital";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = { title: "Masuk ke Portal Sekolah" };

export default async function Login({ searchParams }: { searchParams: Promise<{ sebagai?: string; pesan?: string; lanjut?: string }> }) {
  const [{ sebagai, pesan, lanjut }, { tema }] = await Promise.all([searchParams, getSitus()]);
  const awal = sebagai === "siswa" || sebagai === "orang_tua" ? sebagai : "staf";
  return (
    <BingkaiAkun
      judul={tema.masuk.judul || "Masuk ke Portal Sekolah"}
      deskripsi={tema.masuk.deskripsi}
      bawah={
        <>
          <p className="text-[var(--muted)]">
            Belum punya akun? Akun guru & staf dibuat oleh admin sekolah; akun siswa & orang tua dibagikan melalui wali kelas.
          </p>
          <Link href="/" className="inline-block font-semibold underline underline-offset-4">
            Kembali ke website
          </Link>
        </>
      }
    >
      {pesan === "keluar-semua" && (
        <p role="status" className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          Anda sudah keluar dari semua perangkat.
        </p>
      )}
      {supabaseAktif ? (
        <FormLogin awal={awal} lanjut={lanjutAman(lanjut) ?? undefined} />
      ) : (
        <div role="alert" className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          Database belum disambungkan. Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di Vercel (lihat
          PANDUAN-CMS.md), lalu deploy ulang.
        </div>
      )}
    </BingkaiAkun>
  );
}
