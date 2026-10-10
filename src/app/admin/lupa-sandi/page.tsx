import Image from "next/image";
import Link from "next/link";
import { sekolah } from "@/content/sekolah";
import { FormLupaSandi } from "./Form";

export const metadata = { title: "Lupa kata sandi" };

export default async function LupaSandi({ searchParams }: { searchParams: Promise<{ kedaluwarsa?: string }> }) {
  const { kedaluwarsa } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5">
        <Image src={sekolah.logo} alt="" width={44} height={44} />
        <h1 className="mt-5 font-serif text-3xl">Lupa kata sandi</h1>
        <p className="mt-2 text-sm text-black/60">Untuk guru & staf. Kami kirim tautan atur ulang ke email akun Anda.</p>
        {kedaluwarsa && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
            Tautan sudah dipakai atau kedaluwarsa. Minta tautan baru di bawah.
          </p>
        )}
        <FormLupaSandi />
        <p className="mt-6 rounded-xl bg-krem p-3 text-xs text-black/60">
          <strong>Siswa & orang tua:</strong> akun portal tidak memakai email. Minta wali kelas atau operator mencetak ulang kartu akun (kata sandi baru).
        </p>
        <Link href="/admin/login" className="mt-6 inline-block text-sm text-black/50 hover:text-black">← Kembali ke halaman masuk</Link>
      </div>
    </main>
  );
}
