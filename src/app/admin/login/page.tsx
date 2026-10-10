import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { sekolah } from "@/content/sekolah";
import { supabaseAktif } from "@/lib/supabase/config";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = { title: "Masuk" };

export default async function Login({ searchParams }: { searchParams: Promise<{ sebagai?: string; pesan?: string }> }) {
  const { sebagai, pesan } = await searchParams;
  const awal = sebagai === "siswa" || sebagai === "orang_tua" ? sebagai : "staf";
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand-900 lg:block">
        <Image src="/images/gedung.jpg" alt="" fill sizes="50vw" className="object-cover opacity-50" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900 via-brand-900/40 to-transparent" />
        <p className="absolute bottom-12 left-12 right-12 font-serif text-5xl leading-tight text-white">
          Satu pintu untuk keluarga besar <em className="text-accent-400">{sekolah.namaPendek}</em>.
        </p>
      </div>
      <div className="flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm">
          <Image src={sekolah.logo} alt={`Logo ${sekolah.nama}`} width={56} height={56} />
          <h1 className="mt-6 font-serif text-4xl">Masuk</h1>
          <p className="mt-2 text-black/60">Untuk guru, staf, siswa, dan orang tua SMAN 22 Bandung.</p>
          {pesan === "keluar-semua" && (
            <p role="status" className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
              Anda sudah keluar dari semua perangkat.
            </p>
          )}
          {supabaseAktif ? (
            <FormLogin awal={awal} />
          ) : (
            <div role="alert" className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
              Database belum disambungkan. Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di Vercel (lihat PANDUAN-CMS.md), lalu deploy ulang.
            </div>
          )}
          <Link href="/" className="mt-10 inline-block text-sm text-black/50 hover:text-black">
            ← Kembali ke website
          </Link>
        </div>
      </div>
    </main>
  );
}
