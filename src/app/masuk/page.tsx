import { redirect } from "next/navigation";
import { lanjutAman } from "@/lib/masuk";

/**
 * /masuk = tautan "masuk portal" umum (ekskul, detail buku, survei, menu tampilan). Penggunanya bisa siswa,
 * orang tua, atau Guru & Tendik → arahkan ke "Pilih pintu Anda." (/portal-digital); ?lanjut= yang aman dibawa.
 */
export default async function Masuk({ searchParams }: { searchParams: Promise<{ lanjut?: string }> }) {
  const lanjut = lanjutAman((await searchParams).lanjut);
  redirect(lanjut ? `/portal-digital?lanjut=${encodeURIComponent(lanjut)}` : "/portal-digital");
}
