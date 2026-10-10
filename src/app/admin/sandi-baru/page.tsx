import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sekolah } from "@/content/sekolah";
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
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5">
        <Image src={sekolah.logo} alt="" width={44} height={44} />
        <h1 className="mt-5 font-serif text-3xl">Buat kata sandi baru</h1>
        <p className="mt-2 text-sm text-black/60">Untuk akun <strong>{u.user.email}</strong>.</p>
        <FormSandiBaru perluKode={perluKode} />
        <Link href="/admin" className="mt-6 inline-block text-sm text-black/50 hover:text-black">Lewati, ke panel →</Link>
      </div>
    </main>
  );
}
