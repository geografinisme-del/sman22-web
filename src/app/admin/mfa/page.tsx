import { redirect } from "next/navigation";
import { BingkaiAkun } from "@/components/akun/BingkaiAkun";
import { getAkses, labelPeran } from "@/lib/admin/auth";
import { lanjutAman } from "@/lib/portal-digital";
import { samarkanEmail } from "@/lib/format";
import { DaftarMfa, FormTantangan } from "@/components/keamanan/Mfa";
import { keluar } from "../actions";

export const metadata = { title: "Verifikasi dua langkah" };
export const dynamic = "force-dynamic";

export default async function HalamanMfa({ searchParams }: { searchParams: Promise<{ lanjut?: string }> }) {
  const lanjut = lanjutAman((await searchParams).lanjut) ?? "/admin/mulai";
  const { supabase, user, akses } = await getAkses();
  if (!supabase || !user) redirect("/admin/login");
  const [{ data: aal }, { data: f }] = await Promise.all([supabase.auth.mfa.getAuthenticatorAssuranceLevel(), supabase.auth.mfa.listFactors()]);
  if (aal?.currentLevel === "aal2") redirect("/admin");
  const faktor = (f?.totp ?? []).filter((x) => x.status === "verified").map((x) => ({ id: x.id, nama: x.friendly_name || "Aplikasi autentikator" }));
  const tertunda = akses?.peranTertunda ?? [];

  return (
    <BingkaiAkun
      tanpaFoto
      judul="Verifikasi dua langkah"
      deskripsi={
        faktor.length > 0 ? (
          <>
            Masukkan kode dari aplikasi autentikator di HP Anda untuk akun <strong>{samarkanEmail(user.email)}</strong>.
          </>
        ) : (
          <>
            Akun dengan peran <strong>{labelPeran(tertunda.length ? tertunda : ["super_admin"])}</strong> wajib memakai verifikasi dua langkah. Siapkan HP
            Anda — cukup sekali, sekitar 2 menit.
          </>
        )
      }
      bawah={
        <>
          {faktor.length > 0 && (
            <p className="text-[var(--muted)]">
              HP hilang atau berganti HP? Minta super admin lain mereset verifikasi dua langkah akun Anda melalui menu Pengguna & Peran.
            </p>
          )}
          <form data-keluar-akun="" action={keluar}>
            <button type="submit" className="font-semibold underline underline-offset-4">
              Keluar dan kembali ke halaman masuk
            </button>
          </form>
        </>
      }
    >
      {faktor.length > 0 ? <FormTantangan faktor={faktor} lanjut={lanjut} /> : <DaftarMfa lanjut={lanjut} />}
    </BingkaiAkun>
  );
}
