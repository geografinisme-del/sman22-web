import { notFound } from "next/navigation";
import { Papan } from "@/components/materi/Papan";
import { getAkses } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { slidesSchema } from "@/lib/kurikulum";
import { konteksPapan } from "../data";

export const metadata = { title: "Papan Interaktif", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PapanMateri({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const { supabase } = await getAkses();
  if (!supabase) notFound();
  const { data: m } = await supabase.from("materi_kelas").select("judul, slide, materi_kelas_target(kelas_id)").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!m) notFound();
  const target = ((m.materi_kelas_target ?? []) as { kelas_id: string }[]).map((t) => t.kelas_id);
  const { kelas } = await konteksPapan(target);
  const slide = slidesSchema.safeParse(m.slide);
  return <Papan judul={m.judul} slide={slide.success ? slide.data : []} kelas={kelas} />;
}
