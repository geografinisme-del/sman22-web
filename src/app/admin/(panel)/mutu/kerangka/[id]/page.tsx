import Link from "next/link";
import { notFound } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormIndikator, FormKerangka, FormSalin, FormStandar, type DataKerangka } from "@/components/mutu/Form";
import { wajibIzin } from "@/lib/admin/auth";
import { daftarStaf } from "@/lib/admin/nama";
import { uuid } from "@/lib/admin/schema";

export const metadata = { title: "Kerangka mutu" };

export default async function Kerangka({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesan?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase } = await wajibIzin("mutu.kelola");
  const [{ data: k }, { data: st }, staf] = await Promise.all([
    supabase.from("kerangka_mutu").select("*").eq("id", id).maybeSingle(),
    supabase.from("standar_mutu").select("id, kode, nama, deskripsi, koordinator_id, urutan, indikator_mutu(id, kode, nama, deskripsi, jenis, satuan, cara_ukur, sumber_data, bobot, pemilik_id, urutan)").eq("kerangka_id", id).order("urutan").order("kode"),
    daftarStaf(supabase),
  ]);
  if (!k) notFound();
  const nama = new Map(staf.map((s) => [s.id, s.nama]));
  type I = { id: string; kode: string; nama: string; deskripsi: string; jenis: string; satuan: string; cara_ukur: string; sumber_data: string; bobot: number; pemilik_id: string | null; urutan: number };
  type S = { id: string; kode: string; nama: string; deskripsi: string; koordinator_id: string | null; urutan: number; indikator_mutu: I[] };
  const standar = (st ?? []) as unknown as S[];
  return (
    <>
      <JudulHalaman judul={`${k.kode} v${k.versi}`} deskripsi={k.nama} aksi={<Link href={`/admin/mutu?k=${id}`} className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15">← Dasbor</Link>} />
      <Notifikasi kode={sp.pesan} />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          {standar.map((s) => (
            <Kartu key={s.id}>
              <p className="font-serif text-2xl">{s.kode}. {s.nama}</p>
              <p className="text-sm text-black/60">Koordinator: {s.koordinator_id ? nama.get(s.koordinator_id) : "—"}</p>
              <details className="mt-1"><summary className="cursor-pointer text-xs font-semibold text-brand-700">Ubah standar</summary><div className="mt-2"><FormStandar kerangka={id} d={s} staf={staf} /></div></details>
              <ul className="mt-3 divide-y divide-black/5 text-sm">{[...s.indikator_mutu].sort((a, b) => a.urutan - b.urutan || a.kode.localeCompare(b.kode)).map((i) => (
                <li key={i.id} className="py-2">
                  <p><span className="font-mono text-xs text-black/50">{i.kode}</span> {i.nama} <span className="text-black/50">· {i.pemilik_id ? nama.get(i.pemilik_id) : <span className="text-merah">tanpa pemilik</span>}</span></p>
                  <details><summary className="cursor-pointer text-xs font-semibold text-brand-700">Ubah</summary><div className="mt-2"><FormIndikator standar={s.id} d={{ ...i, bobot: Number(i.bobot) }} staf={staf} /></div></details>
                </li>))}</ul>
              <details className="mt-3 border-t border-black/5 pt-3"><summary className="cursor-pointer text-sm font-semibold">+ Indikator</summary><div className="mt-3"><FormIndikator standar={s.id} staf={staf} /></div></details>
            </Kartu>
          ))}
          <Kartu><h2 className="mb-3 font-serif text-xl">Standar / komponen baru</h2><FormStandar kerangka={id} staf={staf} /></Kartu>
        </div>
        <div className="space-y-6 self-start">
          <Kartu><h2 className="mb-3 font-serif text-xl">Data kerangka</h2><FormKerangka d={k as DataKerangka} /></Kartu>
          <Kartu><h2 className="mb-2 font-serif text-xl">Versi baru</h2><p className="mb-3 text-sm text-black/60">Saat regulasi berubah, salin kerangka ini menjadi versi baru (standar, indikator, dan pemilik ikut tersalin; evaluasi & bukti versi lama tetap utuh).</p><FormSalin id={id} /></Kartu>
        </div>
      </div>
    </>
  );
}
