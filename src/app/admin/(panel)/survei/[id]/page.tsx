import { notFound } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi, TombolLink } from "@/components/admin/ui";
import { FormSurveiAdmin, type DataSurvei } from "@/components/humas/Form";
import { arsipSurvei } from "@/app/admin/actions-humas";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { hariIniWIB } from "@/lib/admin/absensi";
import { uuid } from "@/lib/admin/schema";
import { SASARAN_SURVEI, type Pertanyaan } from "@/lib/humas";

export const metadata = { title: "Survei" };
type H = { responden: number; per_peran: Record<string, number>; per_angkatan?: Record<string, number | null>; pertanyaan: (Pertanyaan & { n: number; rata: number | null; sebaran: Record<string, number> | null; jawaban_teks: string[] | null })[] };

export default async function DetailSurvei({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesan?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, akses } = await wajibLogin();
  const { data: s } = await supabase.from("survei").select("id, judul, deskripsi, sasaran, mulai, selesai, terbit, pertanyaan, angkatan").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!s) notFound();
  const tracer = s.sasaran === "alumni";
  const bolehUbah = punya(akses, "humas.kelola") || (tracer && punya(akses, "alumni.kelola"));
  if (!bolehUbah && !(tracer && punya(akses, "alumni.lihat"))) redirect("/admin?pesan=tanpa-akses");
  const { data: h } = await supabase.rpc("hasil_survei", { p_id: id });
  const hasil = (h ?? { responden: 0, per_peran: {}, pertanyaan: [] }) as H;
  const PERAN: Record<string, string> = { publik: "Umum", siswa: "Siswa", ortu: "Orang tua", pegawai: "Guru/staf", alumni: "Alumni" };
  return (
    <>
      <JudulHalaman judul={s.judul} deskripsi={`${SASARAN_SURVEI[s.sasaran as keyof typeof SASARAN_SURVEI]} · ${hasil.responden} responden`}
        aksi={<div className="flex gap-2"><TombolLink href={tracer ? "/admin/alumni/tracer" : "/admin/survei"} sekunder>← Semua survei</TombolLink>{s.terbit && <a href={`/survei/${s.id}`} target="_blank" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15">Buka formulir ↗</a>}</div>} />
      <Notifikasi kode={sp.pesan} />
      <div className="grid gap-6 xl:grid-cols-[1fr_480px]">
        <div className="space-y-4">
          <Kartu>
            <h2 className="mb-1 text-2xl">Rekap jawaban</h2>
            {tracer && Object.keys(hasil.per_angkatan ?? {}).length > 0 && <p className="mb-1 text-sm text-black/60">Per angkatan: {Object.entries(hasil.per_angkatan ?? {}).map(([k, v]) => `${k}: ${v ?? "< 3"}`).join(" · ")}</p>}
            <p className="mb-4 text-sm text-black/60">{Object.entries(hasil.per_peran).map(([k, v]) => `${PERAN[k] ?? k}: ${v}`).join(" · ") || "Belum ada jawaban."}</p>
            <ol className="space-y-5">
              {(s.pertanyaan as Pertanyaan[]).map((q, i) => {
                const r = hasil.pertanyaan[i];
                const daftarTeks = r?.jawaban_teks ?? [];
                const total = Math.max(1, r?.n ?? 0);
                return (
                  <li key={q.id}>
                    <p className="font-semibold">{i + 1}. {q.teks} <span className="font-normal text-black/50">({r?.n ?? 0} jawaban)</span></p>
                    {q.jenis === "skala" && <p className="text-sm">Rata-rata <strong className="text-lg">{r?.rata ?? "—"}</strong> dari 5</p>}
                    {q.jenis !== "teks" && (
                      <ul className="mt-2 space-y-1 text-sm">{(q.jenis === "skala" ? ["1", "2", "3", "4", "5"] : q.pilihan ?? []).map((o) => {
                        const v = r?.sebaran?.[o] ?? 0;
                        return <li key={o} className="grid grid-cols-[120px_1fr_40px] items-center gap-2"><span className="truncate">{o}</span><span className="h-2 rounded-full bg-black/5"><span className="block h-full rounded-full bg-muted" style={{ width: `${(100 * v) / total}%` }} /></span><span className="text-right tabular-nums">{v}</span></li>;
                      })}</ul>
                    )}
                    {q.jenis === "teks" && (daftarTeks.length ? <ul className="mt-2 max-h-64 space-y-1 overflow-auto text-sm">{daftarTeks.map((t, j) => <li key={j} className="rounded-lg bg-soft px-3 py-1.5">{t}</li>)}</ul> : <p className="text-sm text-black/50">Belum ada.</p>)}
                  </li>
                );
              })}
            </ol>
          </Kartu>
        </div>
        <div className="space-y-4 self-start">
          {bolehUbah && <Kartu><h2 className="mb-4 text-2xl">Pengaturan</h2><FormSurveiAdmin d={s as DataSurvei} terkunci={hasil.responden > 0} hari={hariIniWIB()} tracer={tracer && !punya(akses, "humas.kelola")} /></Kartu>}
          {bolehUbah && <form action={arsipSurvei}><input type="hidden" name="id" value={s.id} />{tracer && <input type="hidden" name="kembali" value="alumni" />}<button className="text-sm font-semibold text-blue-teks underline">Arsipkan survei</button></form>}
        </div>
      </div>
    </>
  );
}
