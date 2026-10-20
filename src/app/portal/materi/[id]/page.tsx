import Link from "next/link";
import { notFound } from "next/navigation";
import { PemutarMateri } from "@/components/materi/Pemutar";
import { uuid } from "@/lib/admin/schema";
import { slidesSchema } from "@/lib/kurikulum";
import { konteksPortal } from "../../data";

export const metadata = { title: "Materi" };

export default async function LihatMateri({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const { supabase } = await konteksPortal();
  const { data: m } = await supabase.from("materi_kelas").select("judul, ringkasan, slide, mapel(nama)").eq("id", id).eq("terbit", true).is("deleted_at", null).maybeSingle();
  if (!m) notFound();
  const slide = slidesSchema.safeParse(m.slide);
  return (
    <div className="space-y-4">
      <Link href="/portal/materi" className="text-sm text-[var(--muted)] hover:text-black">← Semua materi</Link>
      <div>
        <p className="text-xs text-[var(--muted)]">{(m.mapel as unknown as { nama: string } | null)?.nama}</p>
        <h1 className="text-3xl">{m.judul}</h1>
        {m.ringkasan && <p className="text-[var(--muted)]">{m.ringkasan}</p>}
      </div>
      <PemutarMateri slide={slide.success ? slide.data : []} />
    </div>
  );
}
