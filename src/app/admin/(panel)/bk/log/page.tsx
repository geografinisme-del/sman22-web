import { redirect } from "next/navigation";
import { JudulHalaman } from "@/components/admin/ui";
import { NavBk } from "@/components/bk/Nav";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { waktuWIB } from "@/lib/lms";

export const metadata = { title: "Log akses BK" };

export default async function LogBk() {
  const { supabase, akses } = await wajibLogin();
  if (!punya(akses, "bk.konseling") && !punya(akses, "audit.baca")) redirect("/admin?pesan=tanpa-akses");
  const { data } = await supabase.rpc("daftar_log_bk", { p_batas: 300 });
  const list = (data ?? []) as { waktu: string; pengguna: string; kode: string; aksi: string; alasan: string; konselor_kasus: boolean }[];
  return (
    <>
      <JudulHalaman judul="Log akses kerahasiaan BK" deskripsi="Siapa membuka atau mengubah catatan konseling, kapan, dan alasannya. Log tidak dapat diubah atau dihapus." />
      <NavBk konselor={punya(akses, "bk.konseling")} agregat={punya(akses, "bk.agregat")} />
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead><tr className="bg-soft text-xs uppercase tracking-wider text-black/50"><th className="px-4 py-2">Waktu</th><th className="px-4 py-2">Pengguna</th><th className="px-4 py-2">Kasus</th><th className="px-4 py-2">Aksi</th><th className="px-4 py-2">Alasan</th></tr></thead>
          <tbody>{list.length === 0 ? <tr><td colSpan={5} className="px-4 py-4 text-center text-black/50">Belum ada.</td></tr> : list.map((l, i) => (
            <tr key={i} className={`border-t border-black/5 ${!l.konselor_kasus && l.aksi === "buka" ? "bg-amber-50/60" : ""}`}>
              <td className="px-4 py-2">{waktuWIB(l.waktu)}</td><td className="px-4 py-2">{l.pengguna}{!l.konselor_kasus && l.aksi === "buka" && <span className="ml-1 text-xs text-amber-800">(bukan konselor kasus)</span>}</td>
              <td className="px-4 py-2 font-mono text-xs">{l.kode}</td><td className="px-4 py-2">{({ buka: "membuka", ubah_catatan: "mengubah catatan", musnahkan: "memusnahkan isi" } as Record<string, string>)[l.aksi]}</td>
              <td className="px-4 py-2 text-black/60">{l.alasan}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </>
  );
}
