import Link from "next/link";
import { JudulHalaman, KosongAdmin } from "@/components/admin/ui";
import { NavJadwal } from "@/components/jadwal/NavJadwal";
import { wajibIzin } from "@/lib/admin/auth";
import { muatEntri, muatJam } from "@/lib/admin/jadwal-data";
import { EditorJadwal, type OpsiPenugasan } from "./Editor";

export const metadata = { title: "Susun Jadwal" };

export default async function SusunJadwal({ searchParams }: { searchParams: Promise<{ kelas?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibIzin("jadwal.kelola");
  const { data: ta } = await supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle();
  const { data: kelas } = ta
    ? await supabase.from("kelas").select("id, nama").eq("tahun_ajaran_id", ta.id).is("deleted_at", null).order("tingkat").order("nama")
    : { data: [] as { id: string; nama: string }[] };
  const pilih = (kelas ?? []).find((k) => k.id === sp.kelas) ?? kelas?.[0];
  const [jam, semua, { data: pen }, { data: ruang }] = await Promise.all([
    muatJam(supabase),
    muatEntri(supabase),
    pilih ? supabase.from("penugasan_ringkasan").select("id, mapel, kode_mapel, guru, pegawai_id, jp_per_minggu").eq("kelas_id", pilih.id).order("mapel") : Promise.resolve({ data: [] }),
    supabase.from("ruang").select("id, nama").is("deleted_at", null).order("nama"),
  ]);

  const penugasan: OpsiPenugasan[] = ((pen ?? []) as { id: string; mapel: string; kode_mapel: string; guru: string | null; pegawai_id: string | null; jp_per_minggu: number }[])
    .map((p) => ({ id: p.id, mapel: p.mapel, kode: p.kode_mapel, guru: p.guru, pegawai_id: p.pegawai_id, jp: p.jp_per_minggu }));
  const awal: Record<string, { penugasan_id: string; ruang_id: string | null }> = {};
  const sibukGuru: Record<string, Record<string, string>> = {};
  const sibukRuang: Record<string, Record<string, string>> = {};
  for (const e of semua) {
    const slot = `${e.hari}-${e.jp_ke}`;
    if (e.kelas_id === pilih?.id) continue;
    if (e.pegawai_id) (sibukGuru[slot] ??= {})[e.pegawai_id] = e.kelas;
    if (e.ruang_id) (sibukRuang[slot] ??= {})[e.ruang_id] = e.kelas;
  }
  if (pilih) {
    const { data: asli } = await supabase.from("jadwal").select("hari, jp_ke, penugasan_id, ruang_id").eq("kelas_id", pilih.id);
    for (const a of asli ?? []) awal[`${a.hari}-${a.jp_ke}`] = { penugasan_id: a.penugasan_id, ruang_id: a.ruang_id };
  }

  return (
    <>
      <JudulHalaman judul="Susun Jadwal" deskripsi="Pilih mapel untuk setiap jam. Guru yang sudah mengajar di kelas lain pada jam yang sama otomatis tidak bisa dipilih." />
      <NavJadwal akses={akses} aktif="/admin/jadwal/susun" />
      {!kelas?.length ? <KosongAdmin teks="Belum ada kelas di tahun ajaran aktif." /> : (
        <>
          <form className="mb-5 flex flex-wrap items-end gap-2">
            <select name="kelas" defaultValue={pilih?.id} aria-label="Kelas" className="w-48 rounded-xl border border-black/15 bg-white px-3 py-2">
              {kelas.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
            <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Buka</button>
            {pilih && <Link href={`/admin/jadwal?lihat=kelas&id=${pilih.id}`} className="ml-2 text-sm text-blue-teks underline">Lihat hasil</Link>}
          </form>
          {!jam.some((j) => j.jp_ke) ? (
            <KosongAdmin teks="Jam pelajaran belum diatur." aksi={<Link href="/admin/jadwal/pengaturan" className="text-blue-teks underline">Atur jam pelajaran</Link>} />
          ) : !penugasan.length ? (
            <KosongAdmin teks={`Kelas ${pilih?.nama} belum punya penugasan mengajar.`} aksi={<Link href={`/admin/jadwal/penugasan?kelas=${pilih?.id}`} className="text-blue-teks underline">Isi penugasan</Link>} />
          ) : (
            pilih && <EditorJadwal key={pilih.id} kelasId={pilih.id} jam={jam} penugasan={penugasan} awal={awal} sibukGuru={sibukGuru} sibukRuang={sibukRuang} ruang={ruang ?? []} />
          )}
        </>
      )}
    </>
  );
}
