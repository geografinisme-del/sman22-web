import Link from "next/link";
import { BingkaiAkun } from "@/components/akun/BingkaiAkun";
import { FormLupaSandi } from "./Form";

export const metadata = { title: "Lupa kata sandi" };

export default async function LupaSandi({ searchParams }: { searchParams: Promise<{ kedaluwarsa?: string }> }) {
  const { kedaluwarsa } = await searchParams;
  return (
    <BingkaiAkun
      judul="Lupa kata sandi"
      deskripsi="Untuk guru & staf. Kami kirim tautan atur ulang ke email akun Anda."
      bawah={
        <Link href="/admin/login" className="text-[#646c7a] hover:text-[var(--tema-utama)]">
          ← Kembali ke halaman masuk
        </Link>
      }
    >
      {kedaluwarsa && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          Tautan sudah dipakai atau kedaluwarsa. Minta tautan baru di bawah.
        </p>
      )}
      <FormLupaSandi />
      <p className="mt-6 rounded-lg bg-[#f4f5f7] p-3 text-sm leading-relaxed text-[#3b414b]">
        <strong>Siswa & orang tua:</strong> akun portal tidak memakai email. Minta wali kelas atau operator mencetak ulang kartu akun (kata sandi baru).
      </p>
    </BingkaiAkun>
  );
}
