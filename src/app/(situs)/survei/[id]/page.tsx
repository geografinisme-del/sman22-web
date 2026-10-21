import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormSurvei } from "@/components/humas/Publik";
import { PageHeader, Section } from "@/components/ui";
import type { Pertanyaan } from "@/lib/humas";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Isi Survei", robots: { index: false } };
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function IsiSurvei({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabaseAktif || !UUID.test(id)) notFound();
  const sb = await supabaseServer();
  const [{ data }, { data: u }] = await Promise.all([sb.rpc("ambil_survei", { p_id: id }), sb.auth.getUser()]);
  const s = ((data ?? []) as { id: string; judul: string; deskripsi: string; sasaran: string; pertanyaan: Pertanyaan[]; sudah: boolean }[])[0];
  if (!s) notFound();
  const perluMasuk = s.sasaran !== "publik" && !u.user;
  return (
    <>
      <PageHeader judul={s.judul} deskripsi={s.deskripsi || "Jawaban Anda anonim dan hanya dilaporkan dalam bentuk rekap."} />
      <Section><div className="max-w-3xl">
        {s.sudah ? <p className="rounded-2xl bg-emerald-50 p-6 text-emerald-900 ring-1 ring-emerald-200">Anda sudah mengisi survei ini. Terima kasih!</p>
          : perluMasuk ? <p className="kartu p-6">Survei ini untuk warga sekolah. <Link href={`/masuk?lanjut=${encodeURIComponent(`/survei/${id}`)}`} className="font-semibold underline">Masuk ke portal</Link> lalu buka kembali tautan ini.</p>
          : <FormSurvei id={s.id} pertanyaan={s.pertanyaan} />}
      </div></Section>
    </>
  );
}
