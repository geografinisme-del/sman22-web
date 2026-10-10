import Link from "next/link";
import { JudulHalaman, Kartu, KosongAdmin, Notifikasi } from "@/components/admin/ui";
import { FormMateriBaru } from "@/components/kurikulum/Form";
import { NavKurikulum } from "@/components/kurikulum/Nav";
import { wajibLogin } from "@/lib/admin/auth";
import { formatTanggal } from "@/lib/format";

export const metadata = { title: "Materi Digital" };

type M = { id: string; judul: string; terbit: boolean; slide: unknown[]; updated_at: string; mapel: { nama: string } | null; materi_kelas_target: { kelas: { nama: string } | null }[] };

export default async function Materi({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await wajibLogin();
  const { data: saya } = await supabase.rpc("pegawai_saya");
  if (!saya) return (<><JudulHalaman judul="Materi Digital" /><NavKurikulum /><KosongAdmin teks="Akun Anda belum ditautkan ke data guru." /></>);
  const { data: ta } = await supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle();
  const [{ data: materi }, { data: tugas }] = await Promise.all([
    supabase.from("materi_kelas").select("id, judul, terbit, slide, updated_at, mapel(nama), materi_kelas_target(kelas(nama))").eq("pegawai_id", saya).is("deleted_at", null).order("updated_at", { ascending: false }),
    ta ? supabase.from("penugasan_mengajar").select("mapel_id, mapel(nama)").eq("pegawai_id", saya).eq("tahun_ajaran_id", ta.id).is("deleted_at", null) : Promise.resolve({ data: [] }),
  ]);
  const mapel = [...new Map(((tugas ?? []) as unknown as { mapel_id: string; mapel: { nama: string } | null }[]).map((t) => [t.mapel_id, { id: t.mapel_id, nama: t.mapel?.nama ?? "" }])).values()];
  const list = (materi ?? []) as unknown as M[];

  return (
    <>
      <JudulHalaman judul="Materi Digital" deskripsi="Susun slide untuk ditayangkan di papan interaktif (coretan, pewaktu, pilih siswa acak, kuis) dan bagikan ke portal siswa."
        aksi={<Link href="/papan" target="_blank" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15">Papan tulis kosong</Link>} />
      <NavKurikulum />
      <Notifikasi kode={sp.pesan} />
      <Kartu className="mb-6">
        <h2 className="mb-3 font-serif text-2xl">Materi baru</h2>
        {mapel.length ? <FormMateriBaru mapel={mapel} /> : <p className="text-sm text-black/50">Butuh penugasan mengajar di tahun ajaran aktif.</p>}
      </Kartu>
      {list.length === 0 ? <KosongAdmin teks="Belum ada materi." /> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((m) => (
            <li key={m.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <div className="flex items-start gap-3">
                <Link href={`/admin/materi/${m.id}`} className="flex-1">
                  <span className="block font-semibold hover:underline">{m.judul}</span>
                  <span className="text-sm text-black/60">{m.mapel?.nama} · {m.slide.length} slide · diubah {formatTanggal(m.updated_at.slice(0, 10))}</span>
                  <span className="block text-xs text-black/50">{m.materi_kelas_target.map((t) => t.kelas?.nama).join(", ") || "belum ada kelas"}</span>
                </Link>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.terbit ? "bg-emerald-50 text-emerald-800" : "bg-black/5 text-black/60"}`}>{m.terbit ? "Terbit" : "Draf"}</span>
              </div>
              <Link href={`/papan/${m.id}`} target="_blank" className="mt-3 inline-block rounded-full bg-accent-400 px-4 py-1.5 text-sm font-semibold text-brand-900">▶ Tayangkan</Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
