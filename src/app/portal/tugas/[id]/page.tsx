import Link from "next/link";
import { notFound } from "next/navigation";
import { FormKumpul } from "@/components/lms/Form";
import { uuid } from "@/lib/admin/schema";
import { Lencana, STATUS_KUMPUL, waktuWIB } from "@/lib/lms";
import { konteksPortal } from "../../data";

export const metadata = { title: "Tugas" };

export default async function TugasPortal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, ortu, anak } = await konteksPortal();
  const { data: t } = await supabase.from("tugas").select("id, judul, instruksi, tautan, tenggat, nilai_maks, terima_terlambat, mapel(nama)").eq("id", id).eq("terbit", true).is("deleted_at", null).maybeSingle();
  if (!t) notFound();
  const { data: kumpul } = await supabase.from("pengumpulan_tugas").select("id, siswa_id, jawaban, tautan, berkas_path, berkas_nama, dikumpul_pada, terlambat, status, nilai, komentar").eq("tugas_id", id);
  const lewat = new Date(t.tenggat) < new Date();
  const bisa = !ortu && (!lewat || t.terima_terlambat);

  return (
    <div className="space-y-6">
      <Link href="/portal/kelas" className="text-sm text-[var(--muted)] hover:text-black">← Tugas & kuis</Link>
      <div>
        <p className="text-xs text-[var(--muted)]">{(t.mapel as unknown as { nama: string } | null)?.nama}</p>
        <h1 className="text-3xl">{t.judul}</h1>
        <p className={`text-sm ${lewat ? "font-semibold text-blue-teks" : "text-[var(--muted)]"}`}>Tenggat {waktuWIB(t.tenggat, true)} WIB · nilai maks {t.nilai_maks}</p>
      </div>
      {t.instruksi && <div className="whitespace-pre-line rounded-2xl bg-white p-5 ring-1 ring-black/5">{t.instruksi}</div>}
      {t.tautan && <a href={t.tautan} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold text-blue-teks underline">Buka tautan dari guru</a>}
      {(kumpul ?? []).map((k) => (
        <section key={k.id} className="space-y-2 rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex-1 font-semibold">{ortu ? `Pengumpulan ${anak.find((a) => a.id === k.siswa_id)?.nama ?? ""}` : "Pengumpulan Anda"}</h2>
            <Lencana s={k.status} peta={STATUS_KUMPUL} />
            {k.terlambat && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">terlambat</span>}
          </div>
          <p className="text-xs text-[var(--muted)]">Dikumpulkan {waktuWIB(k.dikumpul_pada)}</p>
          {k.nilai != null && <p className="text-4xl tabular-nums">{Number(k.nilai)}<span className="text-lg text-[var(--muted)]">/{t.nilai_maks}</span></p>}
          {k.komentar && <p className="rounded-lg bg-amber-50 p-3 text-sm">Catatan guru: {k.komentar}</p>}
          {k.berkas_path && <a href={`/berkas/tugas/${k.id}`} target="_blank" rel="noopener" className="text-sm font-semibold text-blue-teks underline">Berkas: {k.berkas_nama || "lampiran"}</a>}
        </section>
      ))}
      {bisa && (kumpul ?? [])[0]?.status !== "dinilai" ? (
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h2 className="mb-3 font-semibold">{(kumpul ?? []).length ? "Perbarui jawaban" : "Kumpulkan tugas"}</h2>
          <FormKumpul tugas_id={t.id} jawaban={(kumpul ?? [])[0]?.jawaban ?? ""} tautan={(kumpul ?? [])[0]?.tautan ?? ""} />
        </section>
      ) : !ortu && !(kumpul ?? []).length && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">Tenggat sudah lewat dan tugas ini tidak menerima keterlambatan.</p>}
      {ortu && !(kumpul ?? []).length && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Belum dikumpulkan.</p>}
    </div>
  );
}
