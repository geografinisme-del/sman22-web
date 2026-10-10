import Link from "next/link";
import { notFound } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormBuku, FormTambahEksemplar, type DataBuku } from "@/components/perpus/Form";
import { NavPerpus } from "@/components/perpus/Nav";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { ubahEksemplar } from "../../../../actions-perpus";

export const metadata = { title: "Buku" };
const STATUS: Record<string, string> = { tersedia: "bg-emerald-50 text-emerald-800", dipinjam: "bg-sky-50 text-sky-900", rusak: "bg-amber-50 text-amber-900", hilang: "bg-red-50 text-red-800", dihapus: "bg-black/5 text-black/50" };

export default async function Buku({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesan?: string; galat?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, akses } = await wajibLogin();
  const kelola = punya(akses, "perpus.kelola");
  const [{ data: b }, { data: eks }, { data: pj }] = await Promise.all([
    supabase.from("buku").select("*").eq("id", id).maybeSingle(),
    supabase.from("eksemplar").select("id, kode, status, sumber, tanggal_masuk, pojok_id").eq("buku_id", id).order("kode"),
    supabase.from("pojok_baca").select("id, nama").is("deleted_at", null).eq("aktif", true).order("nama"),
  ]);
  const pojok = (pj ?? []) as { id: string; nama: string }[];
  const namaPojok = new Map(pojok.map((p) => [p.id, p.nama]));
  if (!b) notFound();
  return (
    <>
      <JudulHalaman judul={b.judul} deskripsi={[b.pengarang, b.penerbit, b.tahun].filter(Boolean).join(" · ")} />
      <NavPerpus kelola={kelola} />
      <Notifikasi kode={sp.pesan} />
      {sp.galat && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{sp.galat}</p>}
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <Kartu>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="flex-1 font-serif text-2xl">Eksemplar ({(eks ?? []).length})</h2>
              {kelola && <Link href={`/admin/perpus/label?buku=${b.id}`} className="text-sm font-semibold text-brand-700 underline">Cetak label</Link>}
            </div>
            <ul className="divide-y divide-black/5 text-sm">
              {(eks ?? []).map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-3 py-2">
                  <span className="w-28 font-mono">{e.kode}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[e.status]}`}>{e.status}</span>
                  <span className="flex-1 text-black/50">{[e.sumber, e.pojok_id ? `📍 ${namaPojok.get(e.pojok_id) ?? "pojok baca"}` : ""].filter(Boolean).join(" · ")}</span>
                  {kelola && e.status !== "dipinjam" && (
                    <form action={ubahEksemplar} className="flex gap-1">
                      <input type="hidden" name="id" value={e.id} /><input type="hidden" name="buku_id" value={b.id} />
                      <select name="status" defaultValue={e.status} aria-label={`Status ${e.kode}`} className="rounded-lg border border-black/15 px-2 py-1 text-xs">
                        {["tersedia", "rusak", "hilang", "dihapus"].map((s) => <option key={s}>{s}</option>)}
                      </select>
                      {pojok.length > 0 && (
                        <select name="pojok_id" defaultValue={e.pojok_id ?? ""} aria-label={`Lokasi ${e.kode}`} className="rounded-lg border border-black/15 px-2 py-1 text-xs">
                          <option value="">Perpustakaan</option>{pojok.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
                        </select>
                      )}
                      <button className="rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-black/15">Ubah</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
            {kelola && <div className="mt-4 border-t border-black/5 pt-4"><FormTambahEksemplar buku_id={b.id} pojok={pojok} /></div>}
          </Kartu>
          {b.sinopsis && <Kartu><h2 className="mb-2 font-serif text-xl">Sinopsis</h2><p className="whitespace-pre-line text-sm text-black/70">{b.sinopsis}</p></Kartu>}
        </div>
        {kelola && <Kartu className="self-start"><h2 className="mb-4 font-serif text-2xl">Ubah data buku</h2><FormBuku data={b as DataBuku} /></Kartu>}
      </div>
    </>
  );
}
