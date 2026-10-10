import Image from "next/image";
import { redirect } from "next/navigation";
import { sekolah } from "@/content/sekolah";
import { getAkses, labelPeran } from "@/lib/admin/auth";
import { DaftarMfa, FormTantangan } from "@/components/keamanan/Mfa";
import { keluar } from "../actions";

export const metadata = { title: "Verifikasi dua langkah" };
export const dynamic = "force-dynamic";

export default async function HalamanMfa() {
  const { supabase, user, akses } = await getAkses();
  if (!supabase || !user) redirect("/admin/login");
  const [{ data: aal }, { data: f }] = await Promise.all([supabase.auth.mfa.getAuthenticatorAssuranceLevel(), supabase.auth.mfa.listFactors()]);
  if (aal?.currentLevel === "aal2") redirect("/admin");
  const faktor = (f?.totp ?? []).filter((x) => x.status === "verified").map((x) => ({ id: x.id, nama: x.friendly_name || "Aplikasi autentikator" }));
  const tertunda = akses?.peranTertunda ?? [];

  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5">
        <Image src={sekolah.logo} alt="" width={44} height={44} />
        <h1 className="mt-5 font-serif text-3xl">Verifikasi dua langkah</h1>
        {faktor.length > 0 ? (
          <>
            <p className="mt-2 text-sm text-black/60">
              Masukkan kode 6 angka dari aplikasi autentikator di HP Anda untuk <strong>{user.email}</strong>.
            </p>
            <FormTantangan faktor={faktor} />
            <p className="mt-6 text-xs text-black/50">HP hilang atau ganti HP? Minta super admin lain mereset verifikasi dua langkah akun Anda.</p>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-black/60">
              Akun dengan peran <strong>{labelPeran(tertunda.length ? tertunda : ["super_admin"])}</strong> wajib memakai verifikasi dua langkah,
              agar akun tetap aman walaupun kata sandi bocor. Siapkan HP Anda — cukup sekali, sekitar 2 menit.
            </p>
            <DaftarMfa />
          </>
        )}
        <form action={keluar} className="mt-8 border-t border-black/10 pt-4">
          <button type="submit" className="text-sm text-black/50 hover:text-black">Keluar</button>
        </form>
      </div>
    </main>
  );
}
