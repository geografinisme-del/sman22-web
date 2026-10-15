import Link from "next/link";
import { notFound } from "next/navigation";
import { KerjakanKuis } from "@/components/lms/Kerjakan";
import { uuid } from "@/lib/admin/schema";
import { waktuWIB } from "@/lib/lms";
import { konteksPortal } from "../../data";

export const metadata = { title: "Kuis" };
export const dynamic = "force-dynamic";

type Hasil = { soal_id: string; pertanyaan: string; pilihan: string[]; kunci: number; pembahasan: string; jawaban: number | null; skor: number; benar: number; total: number };

export default async function KuisPortal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, ortu, anak } = await konteksPortal();
  const { data: k } = await supabase.from("kuis").select("id, judul, petunjuk, mulai, selesai, durasi_menit, tampil_hasil, mapel(nama)").eq("id", id).eq("terbit", true).is("deleted_at", null).maybeSingle();
  if (!k) notFound();
  const siswa = anak[0]?.id;
  const [{ data: st }, { data: hasil }] = await Promise.all([
    supabase.rpc("status_kuis", { p_siswa: siswa }),
    supabase.rpc("hasil_kuis", { p_kuis: id, p_siswa: siswa }),
  ]);
  const status = ((st ?? []) as { kuis_id: string; mulai_pada: string; selesai_pada: string | null; skor: number | null }[]).find((s) => s.kuis_id === id);
  const h = (hasil ?? []) as Hasil[];
  const now = new Date().getTime();
  const buka = now >= Date.parse(k.mulai) && now < Date.parse(k.selesai);

  return (
    <div className="space-y-6">
      <Link href="/portal/kelas" className="text-sm text-[#5b6270] hover:text-black">← Tugas & kuis</Link>
      <div>
        <p className="text-xs text-[#5b6270]">{(k.mapel as unknown as { nama: string } | null)?.nama}</p>
        <h1 className="font-serif text-3xl">{k.judul}</h1>
        <p className="text-sm text-[#5b6270]">Dibuka {waktuWIB(k.mulai)} – {waktuWIB(k.selesai)} WIB · {k.durasi_menit} menit</p>
      </div>
      {k.petunjuk && <p className="whitespace-pre-line rounded-2xl bg-white p-5 ring-1 ring-black/5">{k.petunjuk}</p>}
      {status?.selesai_pada ? (
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <p className="text-sm text-[#5b6270]">Selesai {waktuWIB(status.selesai_pada)}</p>
          {h.length ? (
            <>
              <p className="font-serif text-5xl tabular-nums">{Number(h[0].skor)}<span className="text-lg text-[#5b6270]"> · {h[0].benar}/{h[0].total} benar</span></p>
              <ol className="mt-4 space-y-3 text-sm">
                {h.map((x, i) => (
                  <li key={x.soal_id} className={`rounded-xl p-3 ring-1 ${x.jawaban === x.kunci ? "bg-emerald-50 ring-emerald-200" : "bg-red-50 ring-red-200"}`}>
                    <p className="font-medium">{i + 1}. {x.pertanyaan}</p>
                    <p>Jawaban: {x.jawaban != null ? `${String.fromCharCode(65 + x.jawaban)}. ${x.pilihan[x.jawaban]}` : "—"} · Kunci: {String.fromCharCode(65 + x.kunci)}. {x.pilihan[x.kunci]}</p>
                    {x.pembahasan && <p className="mt-1 text-[#3b414b]">{x.pembahasan}</p>}
                  </li>
                ))}
              </ol>
            </>
          ) : <p className="mt-2">Jawaban terkirim. Nilai & pembahasan tampil setelah kuis ditutup ({waktuWIB(k.selesai)}).</p>}
        </section>
      ) : ortu ? (
        <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{status ? "Sedang dikerjakan." : "Belum dikerjakan."}</p>
      ) : buka ? (
        <KerjakanKuis kuisId={k.id} durasi={k.durasi_menit} />
      ) : (
        <p className="rounded-2xl bg-white p-5 ring-1 ring-black/5">{now < Date.parse(k.mulai) ? `Kuis belum dibuka. Kembali ${waktuWIB(k.mulai)} WIB.` : "Kuis sudah ditutup."}</p>
      )}
    </div>
  );
}
