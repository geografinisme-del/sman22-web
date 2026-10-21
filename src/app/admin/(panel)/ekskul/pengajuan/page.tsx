import Link from "next/link";
import { redirect } from "next/navigation";
import { JudulHalaman, Kartu } from "@/components/admin/ui";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { STATUS_PENGAJUAN } from "@/lib/ekskul";
import { Lencana, rupiah } from "@/lib/lms";
import { tgl } from "@/lib/perpus";

export const metadata = { title: "Pengajuan kegiatan" };
type A = { id: string; judul: string; mulai: string; status: string; total_anggaran: number; lpj_realisasi: number | null; organisasi: { nama: string; warna: string } | null };

export default async function DaftarPengajuan({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  let q = supabase.from("pengajuan_kegiatan").select("id, judul, mulai, status, total_anggaran, lpj_realisasi, organisasi(nama, warna)").order("updated_at", { ascending: false }).limit(300);
  if (sp.status && STATUS_PENGAJUAN[sp.status]) q = q.eq("status", sp.status);
  else if (sp.status !== "semua") q = q.in("status", ["diajukan", "disetujui_pembina", "lpj_diajukan", "revisi", "disetujui"]);
  const { data } = await q;
  const list = (data ?? []) as unknown as A[];
  const melihat = punya(akses, "ekskul.kelola") || punya(akses, "ekskul.lihat") || punya(akses, "ekskul.anggaran");
  if (!melihat && list.length === 0) {
    const { data: s } = await supabase.rpc("statistik_ekskul");
    if (!(s ?? []).length) redirect("/admin?pesan=tanpa-akses");
  }
  const total = list.filter((a) => ["disetujui", "lpj_diajukan", "selesai"].includes(a.status)).reduce((t, a) => t + Number(a.total_anggaran), 0);
  return (
    <>
      <JudulHalaman judul="Pengajuan kegiatan" deskripsi="Proposal kegiatan organisasi siswa: persetujuan pembina → kesiswaan, lalu LPJ setelah kegiatan." />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {[["", "Perlu tindak lanjut"], ...Object.entries(STATUS_PENGAJUAN).map(([k, v]) => [k, v.label]), ["semua", "Semua"]].map(([k, l]) => (
          <Link key={k} href={k ? `?status=${k}` : "?"} className={`rounded-full px-3 py-1.5 font-semibold ${(sp.status ?? "") === k ? "bg-ink text-white" : "ring-1 ring-black/15"}`}>{l}</Link>
        ))}
      </div>
      <Kartu>
        {list.length === 0 ? <p className="text-sm text-black/50">Tidak ada pengajuan.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead><tr className="text-xs uppercase tracking-wider text-black/50"><th className="py-2">Kegiatan</th><th>Organisasi</th><th>Tanggal</th><th className="text-right">Anggaran</th><th>Status</th></tr></thead>
              <tbody>{list.map((a) => (
                <tr key={a.id} className="border-t border-black/5">
                  <td className="py-2"><Link href={`/admin/ekskul/pengajuan/${a.id}`} className="font-medium hover:underline">{a.judul}</Link></td>
                  <td><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: a.organisasi?.warna }} />{a.organisasi?.nama}</td>
                  <td>{tgl(a.mulai)}</td>
                  <td className="text-right tabular-nums">{rupiah(Number(a.total_anggaran))}{a.lpj_realisasi != null && <span className="block text-xs text-black/50">realisasi {rupiah(Number(a.lpj_realisasi))}</span>}</td>
                  <td><Lencana s={a.status} peta={STATUS_PENGAJUAN} /></td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-sm text-black/60">Total anggaran disetujui pada daftar ini: <strong>{rupiah(total)}</strong></p>
      </Kartu>
    </>
  );
}
