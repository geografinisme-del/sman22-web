import { notFound } from "next/navigation";
import { JudulHalaman, Notifikasi, TombolLink } from "@/components/admin/ui";
import { EditorMateri } from "@/components/materi/Editor";
import { wajibLogin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { aiAktif } from "@/lib/ai";
import { slidesSchema } from "@/lib/kurikulum";
import { arsipMateri } from "../../../actions-kurikulum";

export const metadata = { title: "Ubah Materi" };

export default async function UbahMateri({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesan?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase } = await wajibLogin();
  const { data: saya } = await supabase.rpc("pegawai_saya");
  const { data: m } = await supabase.from("materi_kelas").select("id, judul, ringkasan, slide, terbit, mapel_id, pegawai_id, mapel(nama), materi_kelas_target(kelas_id)").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!m || m.pegawai_id !== saya) notFound();
  const { data: ta } = await supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle();
  const { data: kelas } = ta
    ? await supabase.from("penugasan_mengajar").select("kelas_id, kelas(nama)").eq("pegawai_id", saya).eq("mapel_id", m.mapel_id).eq("tahun_ajaran_id", ta.id).is("deleted_at", null)
    : { data: [] };
  const slide = slidesSchema.safeParse(m.slide);

  return (
    <>
      <JudulHalaman judul={m.judul} deskripsi={(m.mapel as unknown as { nama: string } | null)?.nama}
        aksi={<div className="flex gap-2"><TombolLink href="/admin/materi" sekunder>← Semua materi</TombolLink>
          <form action={arsipMateri}><input type="hidden" name="id" value={m.id} /><button className="rounded-full px-4 py-2.5 text-sm font-semibold text-blue-teks ring-1 ring-blue/30">Arsipkan</button></form></div>} />
      <Notifikasi kode={sp.pesan} />
      <EditorMateri
        aiAktif={aiAktif()}
        kelas={((kelas ?? []) as unknown as { kelas_id: string; kelas: { nama: string } | null }[]).map((k) => ({ id: k.kelas_id, nama: k.kelas?.nama ?? "" }))}
        materi={{ id: m.id, judul: m.judul, ringkasan: m.ringkasan, terbit: m.terbit, slide: slide.success ? slide.data : [], kelas: ((m.materi_kelas_target ?? []) as { kelas_id: string }[]).map((t) => t.kelas_id) }}
      />
    </>
  );
}
