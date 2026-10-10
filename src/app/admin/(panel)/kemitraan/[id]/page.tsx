import { notFound } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi, TombolLink } from "@/components/admin/ui";
import { FormKegiatanMitra, FormMitra, type DataMitra } from "@/components/humas/Form";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { hariIniWIB } from "@/lib/admin/absensi";
import { daftarStaf } from "@/lib/admin/nama";
import { uuid } from "@/lib/admin/schema";
import { JENIS_MITRA } from "@/lib/humas";
import { tgl } from "@/lib/perpus";

export const metadata = { title: "Kemitraan" };
type K = { id: string; tanggal: string; kegiatan: string; hasil: string; nilai: number | null; tautan_dokumentasi: string };

export default async function DetailMitra({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesan?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, akses } = await wajibLogin();
  const [{ data: m }, { data: keg }, guru, { data: saya }] = await Promise.all([
    supabase.from("kemitraan").select("*").eq("id", id).is("deleted_at", null).maybeSingle(),
    supabase.from("kegiatan_mitra").select("id, tanggal, kegiatan, hasil, nilai, tautan_dokumentasi").eq("kemitraan_id", id).order("tanggal", { ascending: false }),
    daftarStaf(supabase),
    supabase.rpc("pegawai_saya"),
  ]);
  if (!m) notFound();
  const d = m as DataMitra;
  const kelola = punya(akses, "humas.kelola");
  const bolehCatat = kelola || (d.pic_id && d.pic_id === saya);
  const kegiatan = (keg ?? []) as K[];
  const dinilai = kegiatan.filter((k) => k.nilai);
  const rata = dinilai.length ? (dinilai.reduce((a, k) => a + (k.nilai ?? 0), 0) / dinilai.length).toFixed(1) : null;
  return (
    <>
      <JudulHalaman judul={d.mitra} deskripsi={`${JENIS_MITRA[d.jenis as keyof typeof JENIS_MITRA]} · ${d.mulai ? tgl(d.mulai) : "?"} – ${d.berakhir ? tgl(d.berakhir) : "tanpa batas"}`}
        aksi={<TombolLink href="/admin/kemitraan" sekunder>← Semua kemitraan</TombolLink>} />
      <Notifikasi kode={sp.pesan} />
      <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
        <div className="space-y-6">
          <Kartu>
            <div className="mb-3 flex flex-wrap items-baseline gap-3"><h2 className="flex-1 font-serif text-2xl">Kegiatan ({kegiatan.length})</h2>{rata && <span className="text-sm">rata-rata manfaat <strong className="text-amber-600">★ {rata}</strong></span>}</div>
            {kegiatan.length === 0 ? <p className="text-sm text-black/50">Belum ada kegiatan tercatat.</p> : (
              <ul className="divide-y divide-black/5 text-sm">{kegiatan.map((k) => (
                <li key={k.id} className="py-3">
                  <p><span className="text-black/50">{tgl(k.tanggal)}</span> · <strong>{k.kegiatan}</strong>{k.nilai && <span className="ml-2 text-amber-500">{"★".repeat(k.nilai)}</span>}</p>
                  {k.hasil && <p className="mt-1 whitespace-pre-line text-black/70">{k.hasil}</p>}
                  {k.tautan_dokumentasi && <a href={k.tautan_dokumentasi} target="_blank" rel="noreferrer" className="text-brand-700 underline">dokumentasi</a>}
                </li>
              ))}</ul>
            )}
            {bolehCatat && <div className="mt-4 border-t border-black/5 pt-4"><FormKegiatanMitra kemitraan_id={d.id} hari={hariIniWIB()} /></div>}
          </Kartu>
          {!kelola && d.evaluasi && <Kartu><h2 className="mb-2 font-serif text-xl">Evaluasi</h2><p className="whitespace-pre-line text-sm">{d.evaluasi}</p></Kartu>}
        </div>
        {kelola ? <Kartu className="self-start"><h2 className="mb-4 font-serif text-2xl">Data & evaluasi</h2><FormMitra d={d} guru={guru} /></Kartu> : (
          <Kartu className="self-start text-sm">
            <p><strong>Ruang lingkup:</strong> {d.ruang_lingkup || "—"}</p>
            <p className="mt-2"><strong>Nomor dokumen:</strong> {d.nomor_dokumen || "—"}</p>
            {d.tautan_dokumen && <a href={d.tautan_dokumen} target="_blank" rel="noreferrer" className="mt-2 inline-block text-brand-700 underline">Dokumen MoU ↗</a>}
          </Kartu>
        )}
      </div>
    </>
  );
}
