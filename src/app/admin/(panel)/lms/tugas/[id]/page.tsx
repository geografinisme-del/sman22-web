import { notFound } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormNilai, FormTugas } from "@/components/lms/Form";
import { wajibLogin } from "@/lib/admin/auth";
import { penugasanSaya } from "@/lib/admin/lms-data";
import { uuid } from "@/lib/admin/schema";
import { keLokalWIB, Lencana, STATUS_KUMPUL, waktuWIB } from "@/lib/lms";
import { arsipLms } from "../../../../actions-lms";

export const metadata = { title: "Tugas" };

type Rekap = { siswa_id: string; nama: string; kelas: string; pengumpulan_id: string | null; status: string; dikumpul_pada: string | null; terlambat: boolean | null; nilai: number | null };
type Kumpul = { id: string; jawaban: string; tautan: string; berkas_path: string; berkas_nama: string; komentar: string; nilai: number | null };

export default async function DetailTugas({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesan?: string; filter?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase } = await wajibLogin();
  const { saya, list } = await penugasanSaya(supabase);
  const { data: t } = await supabase.from("tugas").select("id, pegawai_id, mapel_id, judul, instruksi, tautan, tenggat, nilai_maks, terima_terlambat, terbit, tugas_kelas(kelas_id)").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!t || t.pegawai_id !== saya) notFound();
  const [{ data: rekap }, { data: kumpul }] = await Promise.all([
    supabase.rpc("rekap_tugas", { p_tugas: id }),
    supabase.from("pengumpulan_tugas").select("id, jawaban, tautan, berkas_path, berkas_nama, komentar, nilai").eq("tugas_id", id),
  ]);
  const peta = new Map(((kumpul ?? []) as Kumpul[]).map((k) => [k.id, k]));
  const semua = (rekap ?? []) as Rekap[];
  const tampil = sp.filter === "nilai" ? semua.filter((r) => r.status === "dikumpulkan") : semua;
  const kelasMapel = list.filter((x) => x.mapel_id === t.mapel_id).map((x) => ({ id: x.kelas_id, nama: x.kelas }));
  const hit = (s: string) => semua.filter((r) => r.status === s).length;

  return (
    <>
      <JudulHalaman judul={t.judul} deskripsi={`Tenggat ${waktuWIB(t.tenggat, true)} WIB · nilai maks ${t.nilai_maks}${t.terbit ? "" : " · DRAF"}`}
        aksi={<form action={arsipLms}><input type="hidden" name="jenis" value="tugas" /><input type="hidden" name="id" value={t.id} /><button className="rounded-full px-4 py-2.5 text-sm font-semibold text-merah ring-1 ring-merah/30">Arsipkan</button></form>} />
      <Notifikasi kode={sp.pesan} />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {(["belum", "dikumpulkan", "dikembalikan", "dinilai"] as const).map((s) => <span key={s} className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10">{STATUS_KUMPUL[s].label}: <strong>{hit(s)}</strong></span>)}
        <a href={sp.filter === "nilai" ? "?" : "?filter=nilai"} className="rounded-full px-3 py-1.5 font-semibold text-brand-700 underline">{sp.filter === "nilai" ? "Tampilkan semua" : "Hanya yang perlu dinilai"}</a>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Kartu>
          <h2 className="mb-3 font-serif text-2xl">Pengumpulan</h2>
          {tampil.length === 0 ? <p className="text-sm text-black/50">Tidak ada.</p> : (
            <ul className="divide-y divide-black/5">
              {tampil.map((r) => {
                const k = r.pengumpulan_id ? peta.get(r.pengumpulan_id) : undefined;
                return (
                  <li key={r.siswa_id} className="space-y-2 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{r.nama}</span><span className="text-black/50">{r.kelas}</span>
                      <Lencana s={r.status} peta={STATUS_KUMPUL} />
                      {r.terlambat && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">terlambat</span>}
                      {r.dikumpul_pada && <span className="text-xs text-black/50">{waktuWIB(r.dikumpul_pada)}</span>}
                      {r.nilai != null && <span className="ml-auto font-semibold tabular-nums">{Number(r.nilai)}/{t.nilai_maks}</span>}
                    </div>
                    {k && (
                      <>
                        {k.jawaban && <p className="whitespace-pre-line rounded-lg bg-krem p-3">{k.jawaban}</p>}
                        <div className="flex gap-3 text-xs font-semibold">
                          {k.tautan && <a href={k.tautan} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">Buka tautan</a>}
                          {k.berkas_path && <a href={`/berkas/tugas/${k.id}`} target="_blank" rel="noopener" className="text-brand-700 underline">Buka berkas ({k.berkas_nama || "lampiran"})</a>}
                        </div>
                        <FormNilai id={k.id} nilai={k.nilai} komentar={k.komentar} maks={t.nilai_maks} />
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Kartu>
        <Kartu className="self-start">
          <h2 className="mb-4 font-serif text-2xl">Pengaturan tugas</h2>
          <FormTugas mapel_id={t.mapel_id} kelas={kelasMapel} tenggatAwal=""
            data={{ id: t.id, judul: t.judul, instruksi: t.instruksi, tautan: t.tautan, tenggat: keLokalWIB(t.tenggat), nilai_maks: t.nilai_maks, terima_terlambat: t.terima_terlambat, terbit: t.terbit, kelas: (t.tugas_kelas as { kelas_id: string }[]).map((x) => x.kelas_id) }} />
        </Kartu>
      </div>
    </>
  );
}
