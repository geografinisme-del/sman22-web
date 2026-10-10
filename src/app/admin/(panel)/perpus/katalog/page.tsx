import Link from "next/link";
import { JudulHalaman, Kartu, Notifikasi, Paginasi } from "@/components/admin/ui";
import { FormBuku } from "@/components/perpus/Form";
import { NavPerpus } from "@/components/perpus/Nav";
import { punya, wajibLogin } from "@/lib/admin/auth";

export const metadata = { title: "Katalog Perpustakaan" };
const PER = 40;
type K = { id: string; judul: string; pengarang: string; penerbit: string; tahun: number | null; kategori: string; rak: string; tersedia: number; total: number; jumlah_hasil: number };

export default async function Katalog({ searchParams }: { searchParams: Promise<{ q?: string; hal?: string; tambah?: string; pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const kelola = punya(akses, "perpus.kelola");
  const hal = Math.max(1, Number(sp.hal) || 1);
  const { data } = await supabase.rpc("katalog_publik", { p_cari: sp.q ?? "", p_batas: PER, p_lewati: (hal - 1) * PER });
  const list = (data ?? []) as K[];
  return (
    <>
      <JudulHalaman judul="Katalog" deskripsi="Semua judul buku dan ketersediaannya."
        aksi={kelola ? <Link href="?tambah=1#tambah" className="rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white">+ Buku</Link> : undefined} />
      <NavPerpus kelola={kelola} />
      <Notifikasi kode={sp.pesan} />
      {kelola && sp.tambah && <Kartu className="mb-6"><h2 id="tambah" className="mb-4 font-serif text-2xl">Buku baru</h2><FormBuku /></Kartu>}
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Cari judul, pengarang, kategori, ISBN" className="flex-1 rounded-full border border-black/15 bg-white px-4 py-2" /><button className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white">Cari</button></form>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead><tr className="bg-krem text-xs uppercase tracking-wider text-black/50"><th className="px-4 py-2">Judul</th><th className="px-4 py-2">Kategori</th><th className="px-4 py-2">Rak</th><th className="px-4 py-2 text-right">Tersedia</th></tr></thead>
          <tbody>
            {list.length === 0 ? <tr><td colSpan={4} className="px-4 py-4 text-center text-black/50">Tidak ada buku.</td></tr> : list.map((b) => (
              <tr key={b.id} className="border-t border-black/5">
                <td className="px-4 py-2"><Link href={`/admin/perpus/buku/${b.id}`} className="font-medium hover:underline">{b.judul}</Link><span className="block text-xs text-black/50">{[b.pengarang, b.penerbit, b.tahun].filter(Boolean).join(" · ")}</span></td>
                <td className="px-4 py-2">{b.kategori}</td><td className="px-4 py-2">{b.rak}</td>
                <td className={`px-4 py-2 text-right tabular-nums ${b.tersedia ? "" : "text-merah"}`}>{b.tersedia}/{b.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginasi halaman={hal} total={Number(list[0]?.jumlah_hasil ?? 0)} perHalaman={PER} dasar="/admin/perpus/katalog" params={{ q: sp.q }} />
      <p className="mt-2 text-xs text-black/50">Buku yang disembunyikan dari katalog publik tidak muncul di daftar ini; buka lewat label/kode.</p>
    </>
  );
}
