import type { Metadata } from "next";
import Link from "next/link";
import { BingkaiAkun } from "@/components/akun/BingkaiAkun";
import { supabaseAktif } from "@/lib/supabase/config";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = { title: "Masuk" };

export default async function Login({ searchParams }: { searchParams: Promise<{ sebagai?: string; pesan?: string }> }) {
  const { sebagai, pesan } = await searchParams;
  const awal = sebagai === "siswa" || sebagai === "orang_tua" ? sebagai : "staf";
  return (
    <BingkaiAkun
      judul="Masuk"
      deskripsi="Untuk guru, staf, siswa, dan orang tua SMAN 22 Bandung."
      bawah={
        <Link href="/" className="text-[#646c7a] hover:text-[#284fd7]">
          ← Kembali ke website
        </Link>
      }
    >
      {pesan === "keluar-semua" && (
        <p role="status" className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          Anda sudah keluar dari semua perangkat.
        </p>
      )}
      {supabaseAktif ? (
        <FormLogin awal={awal} />
      ) : (
        <div role="alert" className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          Database belum disambungkan. Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di Vercel (lihat
          PANDUAN-CMS.md), lalu deploy ulang.
        </div>
      )}
    </BingkaiAkun>
  );
}
