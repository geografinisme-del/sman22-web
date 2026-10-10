import Link from "next/link";
import { redirect } from "next/navigation";
import { JudulHalaman, Notifikasi } from "@/components/admin/ui";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { hariIniWIB } from "@/lib/admin/absensi";
import { KATEGORI_ADUAN, STATUS_ADUAN } from "@/lib/humas";
import { Lencana } from "@/lib/lms";

export const metadata = { title: "Pengaduan" };
type A = { id: string; tiket: string; kategori: string; judul: string; status: string; rahasia: boolean; tenggat: string; created_at: string; anonim: boolean; pic_id: string | null };

export default async function Pengaduan({ searchParams }: { searchParams: Promise<{ status?: string; pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const { data: saya } = await supabase.rpc("pegawai_saya");
  const petugas = punya(akses, "pengaduan.kelola") || punya(akses, "pengaduan.rahasia");
  let q = supabase.from("pengaduan").select("id, tiket, kategori, judul, status, rahasia, tenggat, created_at, anonim, pic_id").order("created_at", { ascending: false }).limit(200);
  if (sp.status && STATUS_ADUAN[sp.status]) q = q.eq("status", sp.status);
  else if (sp.status !== "semua") q = q.in("status", ["baru", "diproses"]);
  const { data } = await q;
  const list = (data ?? []) as A[];
  if (!petugas && !list.length && !saya) redirect("/admin?pesan=tanpa-akses");
  const hari = hariIniWIB();
  return (
    <>
      <JudulHalaman judul="Pengaduan & Aspirasi" deskripsi={petugas ? "Pengaduan dari website/portal. Laporan perundungan & kekerasan hanya terlihat tim rahasia (kepala sekolah, BK, kesiswaan)." : "Pengaduan yang ditugaskan kepada Anda."}
        aksi={<a href="/pengaduan" target="_blank" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15">Formulir publik ↗</a>} />
      <Notifikasi kode={sp.pesan} />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {[["", "Aktif"], ...Object.entries(STATUS_ADUAN).map(([k, v]) => [k, v.label.split(" /")[0]]), ["semua", "Semua"]].map(([k, l]) => (
          <Link key={k} href={k ? `?status=${k}` : "?"} className={`rounded-full px-3 py-1.5 font-semibold ${(sp.status ?? "") === k ? "bg-brand-900 text-white" : "ring-1 ring-black/15"}`}>{l}</Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead><tr className="bg-krem text-xs uppercase tracking-wider text-black/50"><th className="px-4 py-2">Tiket</th><th className="px-4 py-2">Judul</th><th className="px-4 py-2">Kategori</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Tenggat</th></tr></thead>
          <tbody>
            {list.length === 0 ? <tr><td colSpan={5} className="px-4 py-4 text-center text-black/50">Tidak ada pengaduan.</td></tr> : list.map((a) => {
              const lewat = ["baru", "diproses"].includes(a.status) && a.tenggat < hari;
              return (
                <tr key={a.id} className={`border-t border-black/5 ${a.rahasia ? "bg-violet-50/50" : ""}`}>
                  <td className="px-4 py-2 font-mono text-xs">{a.tiket}</td>
                  <td className="px-4 py-2"><Link href={`/admin/pengaduan/${a.id}`} className="font-medium hover:underline">{a.judul}</Link>{a.rahasia && <span className="ml-2 rounded bg-violet-100 px-1.5 text-xs font-semibold text-violet-900">rahasia</span>}</td>
                  <td className="px-4 py-2">{KATEGORI_ADUAN[a.kategori as keyof typeof KATEGORI_ADUAN]}</td>
                  <td className="px-4 py-2"><Lencana s={a.status} peta={STATUS_ADUAN} /></td>
                  <td className={`px-4 py-2 ${lewat ? "font-semibold text-merah" : ""}`}>{new Date(a.tenggat + "T00:00:00Z").toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" })}{lewat && " (lewat)"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
