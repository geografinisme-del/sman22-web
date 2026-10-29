import Link from "next/link";
import { JudulHalaman, KosongAdmin, Notifikasi } from "@/components/admin/ui";
import { wajibBoleh } from "@/lib/admin/auth";
import { BOLEH } from "@/lib/admin/akses-modul";
import { penugasanSaya } from "@/lib/admin/lms-data";

export const metadata = { title: "Kelas Digital" };

export default async function Lms({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await wajibBoleh(BOLEH.mengajar);
  const { saya, list } = await penugasanSaya(supabase);
  if (!saya) return (<><JudulHalaman judul="Kelas Digital" /><KosongAdmin teks="Akun Anda belum ditautkan ke data guru." /></>);
  const [{ data: tugas }, { data: kuis }, { data: belum }] = await Promise.all([
    supabase.from("tugas").select("id, mapel_id, tugas_kelas(kelas_id)").eq("pegawai_id", saya).is("deleted_at", null),
    supabase.from("kuis").select("id, mapel_id, kuis_kelas(kelas_id)").eq("pegawai_id", saya).is("deleted_at", null),
    supabase.from("pengumpulan_tugas").select("tugas_id, siswa_id, tugas!inner(pegawai_id, mapel_id, tugas_kelas(kelas_id))").eq("status", "dikumpulkan").eq("tugas.pegawai_id", saya),
  ]);
  const hitung = (rows: { mapel_id: string; [k: string]: unknown }[] | null, kunci: string, p: { mapel_id: string; kelas_id: string }) =>
    (rows ?? []).filter((r) => r.mapel_id === p.mapel_id && (r[kunci] as { kelas_id: string }[]).some((k) => k.kelas_id === p.kelas_id)).length;

  return (
    <>
      <JudulHalaman judul="Kelas Digital" deskripsi="Satu ruang per kelas & mapel: materi, tugas (pengumpulan & penilaian), dan kuis online yang dinilai otomatis." />
      <Notifikasi kode={sp.pesan} />
      {list.length === 0 ? <KosongAdmin teks="Belum ada penugasan mengajar di tahun ajaran aktif." /> : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const perluNilai = ((belum ?? []) as unknown as { tugas: { mapel_id: string; tugas_kelas: { kelas_id: string }[] } }[])
              .filter((x) => x.tugas.mapel_id === p.mapel_id && x.tugas.tugas_kelas.some((k) => k.kelas_id === p.kelas_id)).length;
            return (
              <li key={p.id}>
                <Link href={`/admin/lms/${p.id}`} className="block rounded-2xl bg-white p-5 ring-1 ring-black/5 hover:ring-muted">
                  <p className="text-xs uppercase tracking-[0.15em] text-black/50">Kelas {p.kelas}</p>
                  <p className="text-2xl">{p.mapel}</p>
                  <p className="mt-2 text-sm text-black/60">{hitung(tugas as never, "tugas_kelas", p)} tugas · {hitung(kuis as never, "kuis_kelas", p)} kuis</p>
                  {perluNilai > 0 && <p className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">{perluNilai} pengumpulan perlu dinilai</p>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
