import Link from "next/link";
import { redirect } from "next/navigation";
import { BingkaiAkun } from "@/components/akun/BingkaiAkun";
import { FormSandiBaru } from "@/components/keamanan/FormSandi";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Kata sandi baru" };
export const dynamic = "force-dynamic";

export default async function SandiBaru() {
  if (!supabaseAktif) redirect("/admin/login");
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/admin/lupa-sandi");
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const perluKode = aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2";
  return (
    <BingkaiAkun
      judul="Buat kata sandi baru"
      deskripsi={
        <>
          Untuk akun <strong>{u.user.email}</strong>.
        </>
      }
      bawah={
        <Link href="/admin" className="text-[var(--muted)] hover:text-[var(--tema-utama)]">
          Lewati, ke panel →
        </Link>
      }
    >
      <FormSandiBaru perluKode={perluKode} />
    </BingkaiAkun>
  );
}
