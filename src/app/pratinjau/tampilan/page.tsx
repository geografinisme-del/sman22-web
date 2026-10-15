import Link from "next/link";
import { redirect } from "next/navigation";
import { KerangkaPublik } from "@/components/widget/KerangkaPublik";
import { SusunanBeranda } from "@/components/widget/SusunanBeranda";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { getSitus } from "@/lib/data";
import { bacaKonfigurasi, periksaKompatibilitas } from "@/lib/tampilan/konfigurasi";
import { TEMA } from "@/lib/tampilan/token";

export const metadata = { title: "Pratinjau tampilan", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Pratinjau beranda dengan konfigurasi DRAF. Hanya untuk pengelola konten (izin diperiksa di server
 * dan draf dibaca lewat RLS tampilan_draf), tidak diindeks, dan tidak mengubah apa pun yang terbit.
 */
export default async function PratinjauTampilan({ searchParams }: { searchParams: Promise<{ versi?: string }> }) {
  const { versi } = await searchParams;
  const { supabase, akses } = await wajibLogin();
  if (!punya(akses, "konten.kelola")) redirect("/admin?pesan=tanpa-akses");
  const [{ data: draf }, { tampilan: terbit }] = await Promise.all([supabase.from("tampilan_draf").select("konfigurasi").eq("id", 1).maybeSingle(), getSitus()]);
  const pakaiDraf = versi !== "terbit" && Boolean(draf);
  const konfig = pakaiDraf ? bacaKonfigurasi(draf!.konfigurasi) : terbit;
  const peringatan = periksaKompatibilitas(konfig);

  const pita = (
    <div className="border-b border-amber-300 bg-amber-100 px-4 py-2.5 text-sm text-amber-950" role="status">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p>
          <strong>Pratinjau {pakaiDraf ? "draf — belum terbit" : "versi terbit"}</strong> · Tema {TEMA[konfig.tema].label} · gerak {konfig.gerak}. Hanya terlihat oleh pengelola.
        </p>
        <Link href="/admin/tampilan" target="_top" className="font-semibold underline underline-offset-2">
          Kembali ke pengaturan
        </Link>
      </div>
      {peringatan.length > 0 && (
        <ul className="mx-auto mt-1 max-w-[1200px] list-disc pl-5">
          {peringatan.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <KerangkaPublik konfig={konfig} halamanUtama="/pratinjau/tampilan" pita={pita}>
      <SusunanBeranda konfig={konfig} />
    </KerangkaPublik>
  );
}
