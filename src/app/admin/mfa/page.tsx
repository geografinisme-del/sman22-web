import { redirect } from "next/navigation";
import { BingkaiAkun } from "@/components/akun/BingkaiAkun";
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
    <BingkaiAkun
      judul="Verifikasi dua langkah"
      bawah={
        <form action={keluar}>
          <button type="submit" className="text-[#646c7a] hover:text-[var(--tema-utama)]">
            Keluar
          </button>
        </form>
      }
    >
      {faktor.length > 0 ? (
        <>
          <p className="mt-2 text-[15px] text-[#555f6b]">
            Masukkan kode 6 angka dari aplikasi autentikator di HP Anda untuk <strong>{user.email}</strong>.
          </p>
          <FormTantangan faktor={faktor} />
          <p className="mt-6 text-xs text-[#646c7a]">HP hilang atau ganti HP? Minta super admin lain mereset verifikasi dua langkah akun Anda.</p>
        </>
      ) : (
        <>
          <p className="mt-2 text-[15px] text-[#555f6b]">
            Akun dengan peran <strong>{labelPeran(tertunda.length ? tertunda : ["super_admin"])}</strong> wajib memakai verifikasi dua langkah, agar akun tetap aman
            walaupun kata sandi bocor. Siapkan HP Anda — cukup sekali, sekitar 2 menit.
          </p>
          <DaftarMfa />
        </>
      )}
    </BingkaiAkun>
  );
}
