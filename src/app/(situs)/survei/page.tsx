import type { Metadata } from "next";
import Link from "next/link";
import { Kosong, PageHeader, Section } from "@/components/ui";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Survei", description: "Survei kepuasan layanan & aspirasi SMAN 22 Bandung." };
export const dynamic = "force-dynamic";

export default async function DaftarSurvei() {
  const { data } = supabaseAktif ? await (await supabaseServer()).rpc("survei_aktif") : { data: [] };
  const list = (data ?? []) as { id: string; judul: string; deskripsi: string; selesai: string; sudah: boolean }[];
  return (
    <>
      <PageHeader judul="Survei" deskripsi="Bantu kami memperbaiki layanan sekolah. Jawaban Anda anonim." />
      <Section>
        {list.length === 0 ? <Kosong teks="Belum ada survei yang sedang dibuka." /> : (
          <ul className="grid gap-4 sm:grid-cols-2">{list.map((s) => (
            <li key={s.id} className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
              <h2 className="font-serif text-2xl">{s.judul}</h2>
              {s.deskripsi && <p className="mt-1 line-clamp-3 text-sm text-black/60">{s.deskripsi}</p>}
              <p className="mt-2 text-xs text-black/50">Ditutup {new Date(s.selesai + "T00:00:00Z").toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "UTC" })}</p>
              {s.sudah ? <p className="mt-3 text-sm font-semibold text-emerald-700">✓ Anda sudah mengisi</p> : <Link href={`/survei/${s.id}`} className="mt-3 inline-block rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white">Isi survei</Link>}
            </li>
          ))}</ul>
        )}
      </Section>
    </>
  );
}
