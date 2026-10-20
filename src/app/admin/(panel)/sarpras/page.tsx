import Link from "next/link";
import { redirect } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi, Paginasi } from "@/components/admin/ui";
import { FormBarang } from "@/components/sarpras/Form";
import { NavSarpras } from "@/components/sarpras/Nav";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { KONDISI, Lencana, rupiah } from "@/lib/lms";

export const metadata = { title: "Inventaris Sarpras" };
const PER = 50;

type Rekap = { kategori: string; kondisi: string; jenis: number; unit: number; nilai: number };
type B = { id: string; kode: string; nama: string; jumlah: number; satuan: string; kondisi: string; merk: string; kategori_barang: { nama: string } | null; ruang: { nama: string } | null };

export default async function Inventaris({ searchParams }: { searchParams: Promise<{ q?: string; kategori?: string; ruang?: string; kondisi?: string; hal?: string; tambah?: string; pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const kelola = punya(akses, "sarpras.kelola");
  const lihat = kelola || punya(akses, "sarpras.lihat");
  if (!lihat) redirect("/admin/sarpras/peminjaman");
  const hal = Math.max(1, Number(sp.hal) || 1);
  let q = supabase.from("barang").select("id, kode, nama, jumlah, satuan, kondisi, merk, kategori_barang(nama), ruang(nama)", { count: "exact" }).is("deleted_at", null).order("kode").range((hal - 1) * PER, hal * PER - 1);
  if (sp.q) q = q.or(`nama.ilike.%${sp.q.replace(/[%,()]/g, " ")}%,kode.ilike.%${sp.q.replace(/[%,()]/g, " ")}%,merk.ilike.%${sp.q.replace(/[%,()]/g, " ")}%`);
  if (sp.kategori && uuid.safeParse(sp.kategori).success) q = q.eq("kategori_id", sp.kategori);
  if (sp.ruang && uuid.safeParse(sp.ruang).success) q = q.eq("ruang_id", sp.ruang);
  if (sp.kondisi && KONDISI[sp.kondisi]) q = q.eq("kondisi", sp.kondisi);
  const [{ data: barang, count }, { data: rekap }, { data: kategori }, { data: ruang }] = await Promise.all([
    q, supabase.rpc("rekap_sarpras"),
    supabase.from("kategori_barang").select("id, nama").order("urutan"),
    supabase.from("ruang").select("id, nama").is("deleted_at", null).order("nama"),
  ]);
  const r = (rekap ?? []) as Rekap[];
  const total = (f: (x: Rekap) => boolean, k: "jenis" | "unit" | "nilai") => r.filter(f).reduce((a, x) => a + Number(x[k]), 0);
  const kat = [...new Set(r.map((x) => x.kategori))];
  const params = { q: sp.q, kategori: sp.kategori, ruang: sp.ruang, kondisi: sp.kondisi };

  return (
    <>
      <JudulHalaman judul="Sarana & Prasarana" deskripsi="Inventaris barang sekolah: kode otomatis, lokasi, kondisi, nilai aset, dan label QR."
        aksi={<div className="flex gap-2"><a href="/admin/sarpras/ekspor" className="rounded-full px-4 py-2.5 text-sm font-semibold ring-1 ring-black/15">Unduh Excel</a>
          {kelola && <Link href="?tambah=1#tambah" className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white">+ Barang</Link>}</div>} />
      <NavSarpras lihat={lihat} kelola={kelola} />
      <Notifikasi kode={sp.pesan} />
      <ul className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Jenis barang", total(() => true, "jenis").toLocaleString("id-ID")], ["Total unit", total(() => true, "unit").toLocaleString("id-ID")],
          ["Nilai aset", rupiah(total(() => true, "nilai"))], ["Unit rusak/hilang", total((x) => x.kondisi !== "baik", "unit").toLocaleString("id-ID")]].map(([l, v]) => (
          <li key={l} className="rounded-2xl bg-white p-4 ring-1 ring-black/5"><p className="text-3xl tabular-nums">{v}</p><p className="text-sm text-black/60">{l}</p></li>
        ))}
      </ul>
      {kat.length > 0 && (
        <div className="mb-6 overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead><tr className="bg-soft text-xs uppercase tracking-wider text-black/50"><th className="px-4 py-2">Kategori</th>{Object.values(KONDISI).map((k) => <th key={k.label} className="px-4 py-2 text-right">{k.label}</th>)}<th className="px-4 py-2 text-right">Nilai</th></tr></thead>
            <tbody>
              {kat.map((k) => (
                <tr key={k} className="border-t border-black/5">
                  <td className="px-4 py-2 font-medium">{k}</td>
                  {Object.keys(KONDISI).map((c) => <td key={c} className="px-4 py-2 text-right tabular-nums">{total((x) => x.kategori === k && x.kondisi === c, "unit") || "—"}</td>)}
                  <td className="px-4 py-2 text-right tabular-nums">{rupiah(total((x) => x.kategori === k, "nilai"))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {kelola && sp.tambah && (
        <Kartu className="mb-6"><h2 id="tambah" className="mb-4 text-2xl">Barang baru</h2>
          <FormBarang kategori={(kategori ?? []) as { id: string; nama: string }[]} ruang={(ruang ?? []) as { id: string; nama: string }[]} /></Kartu>
      )}
      <form className="mb-4 flex flex-wrap gap-2 text-sm">
        <input name="q" defaultValue={sp.q} placeholder="Cari nama / kode / merk" className="min-w-56 flex-1 rounded-full border border-black/15 bg-white px-4 py-2" />
        <select name="kategori" defaultValue={sp.kategori ?? ""} className="rounded-full border border-black/15 bg-white px-3 py-2" aria-label="Kategori"><option value="">Semua kategori</option>{(kategori ?? []).map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}</select>
        <select name="ruang" defaultValue={sp.ruang ?? ""} className="rounded-full border border-black/15 bg-white px-3 py-2" aria-label="Ruang"><option value="">Semua lokasi</option>{(ruang ?? []).map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}</select>
        <select name="kondisi" defaultValue={sp.kondisi ?? ""} className="rounded-full border border-black/15 bg-white px-3 py-2" aria-label="Kondisi"><option value="">Semua kondisi</option>{Object.entries(KONDISI).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <button className="rounded-full bg-ink px-4 py-2 font-semibold text-white">Saring</button>
      </form>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead><tr className="bg-soft text-xs uppercase tracking-wider text-black/50"><th className="px-4 py-2">Kode</th><th className="px-4 py-2">Nama</th><th className="px-4 py-2">Kategori</th><th className="px-4 py-2">Lokasi</th><th className="px-4 py-2 text-right">Jumlah</th><th className="px-4 py-2">Kondisi</th></tr></thead>
          <tbody>
            {((barang ?? []) as unknown as B[]).length === 0 ? <tr><td colSpan={6} className="px-4 py-4 text-center text-black/50">Belum ada barang.</td></tr> : ((barang ?? []) as unknown as B[]).map((b) => (
              <tr key={b.id} className="border-t border-black/5">
                <td className="px-4 py-2 font-mono text-xs">{b.kode}</td>
                <td className="px-4 py-2"><Link href={`/admin/sarpras/barang/${b.id}`} className="font-medium hover:underline">{b.nama}</Link>{b.merk && <span className="block text-xs text-black/50">{b.merk}</span>}</td>
                <td className="px-4 py-2">{b.kategori_barang?.nama}</td><td className="px-4 py-2">{b.ruang?.nama ?? <span className="text-black/40">gudang</span>}</td>
                <td className="px-4 py-2 text-right tabular-nums">{b.jumlah} {b.satuan}</td><td className="px-4 py-2"><Lencana s={b.kondisi} peta={KONDISI} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginasi halaman={hal} total={count ?? 0} perHalaman={PER} dasar="/admin/sarpras" params={params} />
    </>
  );
}
