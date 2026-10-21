import Link from "next/link";
import { notFound } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi, TombolLink } from "@/components/admin/ui";
import { FormKuis, FormTugas } from "@/components/lms/Form";
import { geserTanggal, hariIniWIB } from "@/lib/admin/absensi";
import { wajibLogin } from "@/lib/admin/auth";
import { penugasanSaya } from "@/lib/admin/lms-data";
import { uuid } from "@/lib/admin/schema";
import { keLokalWIB, waktuWIB } from "@/lib/lms";

export const metadata = { title: "Kelas Digital" };

type T = { id: string; judul: string; tenggat: string; terbit: boolean; tugas_kelas: { kelas_id: string }[] };
type K = { id: string; judul: string; mulai: string; selesai: string; terbit: boolean; kuis_kelas: { kelas_id: string }[] };

export default async function RuangKelas({ params, searchParams }: { params: Promise<{ penugasan: string }>; searchParams: Promise<{ buat?: string; pesan?: string }> }) {
  const [{ penugasan }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(penugasan).success) notFound();
  const { supabase } = await wajibLogin();
  const { saya, list } = await penugasanSaya(supabase);
  const p = list.find((x) => x.id === penugasan);
  if (!saya || !p) notFound();
  const kelasMapel = list.filter((x) => x.mapel_id === p.mapel_id).map((x) => ({ id: x.kelas_id, nama: x.kelas }));
  const [{ data: tugas }, { data: kuis }, { data: materi }, { data: kumpul }] = await Promise.all([
    supabase.from("tugas").select("id, judul, tenggat, terbit, tugas_kelas!inner(kelas_id)").eq("pegawai_id", saya).eq("mapel_id", p.mapel_id).eq("tugas_kelas.kelas_id", p.kelas_id).is("deleted_at", null).order("tenggat", { ascending: false }),
    supabase.from("kuis").select("id, judul, mulai, selesai, terbit, kuis_kelas!inner(kelas_id)").eq("pegawai_id", saya).eq("mapel_id", p.mapel_id).eq("kuis_kelas.kelas_id", p.kelas_id).is("deleted_at", null).order("mulai", { ascending: false }),
    supabase.from("materi_kelas").select("id, judul, terbit, materi_kelas_target!inner(kelas_id)").eq("pegawai_id", saya).eq("mapel_id", p.mapel_id).eq("materi_kelas_target.kelas_id", p.kelas_id).is("deleted_at", null),
    supabase.from("pengumpulan_tugas").select("tugas_id, status"),
  ]);
  const jumlah = (id: string, s?: string) => (kumpul ?? []).filter((k) => k.tugas_id === id && (!s || k.status === s)).length;
  const sekarang = new Date().getTime();

  return (
    <>
      <JudulHalaman judul={`${p.mapel} · ${p.kelas}`} deskripsi="Tugas, kuis, dan materi untuk kelas ini."
        aksi={<div className="flex flex-wrap gap-2"><TombolLink href="/admin/lms" sekunder>← Semua kelas</TombolLink>
          <a href={`/admin/lms/${p.id}/nilai`} className="rounded-full px-4 py-2.5 text-sm font-semibold ring-1 ring-black/15">Unduh rekap nilai (Excel)</a></div>} />
      <Notifikasi kode={sp.pesan} />
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="?buat=tugas#buat" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">+ Tugas</Link>
        <Link href="?buat=kuis#buat" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">+ Kuis</Link>
        <Link href="/admin/materi" className="rounded-full px-5 py-2.5 text-sm font-semibold ring-1 ring-black/15">+ Materi (slide)</Link>
      </div>
      {(sp.buat === "tugas" || sp.buat === "kuis") && (
        <Kartu className="mb-6">
          <h2 id="buat" className="mb-4 text-2xl">{sp.buat === "tugas" ? "Tugas baru" : "Kuis baru"}</h2>
          {sp.buat === "tugas"
            ? <FormTugas mapel_id={p.mapel_id} kelas={kelasMapel} kelasAwal={p.kelas_id} tenggatAwal={`${geserTanggal(hariIniWIB(), 7)}T23:59`} />
            : <FormKuis mapel_id={p.mapel_id} kelas={kelasMapel} kelasAwal={p.kelas_id} mulaiAwal={keLokalWIB()} selesaiAwal={`${geserTanggal(hariIniWIB(), 1)}${keLokalWIB().slice(10)}`} />}
        </Kartu>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <Kartu>
          <h2 className="mb-3 text-2xl">Tugas</h2>
          {(tugas ?? []).length === 0 ? <p className="text-sm text-black/50">Belum ada tugas.</p> : (
            <ul className="divide-y divide-black/5">
              {((tugas ?? []) as T[]).map((t) => (
                <li key={t.id} className="py-3">
                  <Link href={`/admin/lms/tugas/${t.id}`} className="font-semibold hover:underline">{t.judul}</Link>
                  <p className="text-sm text-black/60">
                    Tenggat {waktuWIB(t.tenggat)} · {jumlah(t.id)} terkumpul{jumlah(t.id, "dikumpulkan") > 0 && <strong className="text-amber-800"> · {jumlah(t.id, "dikumpulkan")} perlu dinilai</strong>}
                    {!t.terbit && <span className="ml-1 rounded bg-black/5 px-1.5 text-xs">draf</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Kartu>
        <Kartu>
          <h2 className="mb-3 text-2xl">Kuis</h2>
          {(kuis ?? []).length === 0 ? <p className="text-sm text-black/50">Belum ada kuis.</p> : (
            <ul className="divide-y divide-black/5">
              {((kuis ?? []) as K[]).map((k) => (
                <li key={k.id} className="py-3">
                  <Link href={`/admin/lms/kuis/${k.id}`} className="font-semibold hover:underline">{k.judul}</Link>
                  <p className="text-sm text-black/60">
                    {waktuWIB(k.mulai)} – {waktuWIB(k.selesai)} · {!k.terbit ? "draf" : sekarang < Date.parse(k.mulai) ? "terjadwal" : sekarang > Date.parse(k.selesai) ? "ditutup" : "sedang dibuka"}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mb-2 mt-6 font-semibold">Materi</h3>
          {(materi ?? []).length === 0 ? <p className="text-sm text-black/50">Belum ada materi untuk kelas ini.</p> : (
            <ul className="space-y-1 text-sm">{(materi ?? []).map((m) => <li key={m.id}><Link href={`/admin/materi/${m.id}`} className="hover:underline">{m.judul}</Link>{!m.terbit && " (draf)"}</li>)}</ul>
          )}
        </Kartu>
      </div>
    </>
  );
}
