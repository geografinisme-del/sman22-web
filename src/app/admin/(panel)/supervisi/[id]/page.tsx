import { notFound } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi, TombolLink } from "@/components/admin/ui";
import { TombolCetak } from "@/components/jadwal/Bantu";
import { FormInstrumen, FormTanggapan } from "@/components/kurikulum/Supervisi";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { petaNamaPegawai } from "@/lib/admin/nama";
import { uuid } from "@/lib/admin/schema";
import { formatTanggal } from "@/lib/format";
import { INSTRUMEN_SUPERVISI, predikatSupervisi, SKALA_SKOR } from "@/lib/kurikulum";

export const metadata = { title: "Supervisi Akademik" };

export default async function DetailSupervisi({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesan?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, akses } = await wajibLogin();
  const { data: s } = await supabase.from("supervisi_akademik").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();
  const { data: saya } = await supabase.rpc("pegawai_saya");
  const nama = await petaNamaPegawai(supabase, [s.pegawai_id, s.supervisor_id]);
  const bolehIsi = s.status === "terjadwal" && (s.supervisor_id === saya || punya(akses, "supervisi.kelola"));
  const skor = (s.skor ?? {}) as Record<string, string>;

  return (
    <>
      <JudulHalaman judul={`Supervisi: ${nama.get(s.pegawai_id)}`} deskripsi={`${formatTanggal(s.tanggal, { weekday: "long" })} · supervisor ${nama.get(s.supervisor_id)} · semester ${s.semester}`}
        aksi={<div className="flex gap-2 print:hidden"><TombolLink href="/admin/supervisi" sekunder>← Kembali</TombolLink>{s.status === "selesai" && <TombolCetak />}</div>} />
      <Notifikasi kode={sp.pesan} />
      {bolehIsi ? (
        <Kartu><FormInstrumen id={s.id} skor={skor} kekuatan={s.kekuatan} perbaikan={s.perbaikan} rekomendasi={s.rekomendasi} /></Kartu>
      ) : s.status === "selesai" ? (
        <div className="space-y-6">
          <Kartu>
            <div className="flex flex-wrap items-end gap-6">
              <p><span className="block text-6xl leading-none tabular-nums">{Number(s.nilai).toFixed(0)}</span><span className="text-sm text-black/60">nilai (rata-rata × 25)</span></p>
              <p className="rounded-full bg-emerald-50 px-4 py-1.5 font-semibold text-emerald-800 ring-1 ring-emerald-200">{predikatSupervisi(Number(s.nilai))}</p>
            </div>
            {INSTRUMEN_SUPERVISI.map((b) => (
              <div key={b.bagian} className="mt-5">
                <h2 className="mb-1 font-semibold">{b.bagian}</h2>
                <ul className="text-sm">
                  {b.butir.map((x) => (
                    <li key={x.kode} className="flex gap-3 border-t border-black/5 py-1.5">
                      <span className="flex-1">{x.teks}</span>
                      <span className="w-40 text-right tabular-nums">{skor[x.kode] ?? "—"} · {SKALA_SKOR[Number(skor[x.kode]) as 1] ?? ""}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Kartu>
          <div className="grid gap-6 lg:grid-cols-3">
            {([["Kekuatan", s.kekuatan], ["Perlu diperbaiki", s.perbaikan], ["Rekomendasi", s.rekomendasi]] as const).map(([j, t]) => (
              <Kartu key={j}><h2 className="mb-2 text-xl">{j}</h2><p className="whitespace-pre-line text-sm text-black/70">{t || "—"}</p></Kartu>
            ))}
          </div>
          <Kartu>
            <h2 className="mb-3 text-xl">Tanggapan guru</h2>
            {s.pegawai_id === saya ? <FormTanggapan id={s.id} nilai={s.tanggapan_guru} /> : <p className="whitespace-pre-line text-sm text-black/70">{s.tanggapan_guru || "Belum ada tanggapan."}</p>}
          </Kartu>
        </div>
      ) : (
        <Kartu><p className="text-sm text-black/60">{s.status === "batal" ? "Supervisi ini dibatalkan." : "Supervisi belum dilaksanakan. Hasil tampil setelah supervisor menyelesaikan penilaian."}</p></Kartu>
      )}
    </>
  );
}
