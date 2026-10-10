import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <>
    <Header />
    <main className="flex-1">
    <div className="mx-auto max-w-xl px-5 pb-24 pt-36 text-center">
      <p className="font-serif text-8xl italic text-merah">404</p>
      <h1 className="mt-4 font-serif text-4xl">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-black/60">Halaman yang Anda cari mungkin sudah dipindah atau tidak tersedia.</p>
      <Link href="/" className="mt-8 inline-block rounded-full bg-tinta px-5 py-3 font-semibold text-white hover:bg-merah">
        Kembali ke beranda
      </Link>
    </div>
    </main>
    <Footer />
    </>
  );
}
