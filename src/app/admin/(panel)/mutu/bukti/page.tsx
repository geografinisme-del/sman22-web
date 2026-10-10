import { redirect } from "next/navigation";
import { JudulHalaman, Kartu } from "@/components/admin/ui";
import { TautanBukti, type B } from "@/components/mutu/Bukti";
import { NavMutu } from "@/components/mutu/Nav";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { waktuWIB } from "@/lib/lms";

export const metadata = { title: "Repositori bukti" };

export default async function Bukti({ searchParams }: { searchParams: Promise<{ q?: string; lama?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const tim = punya(akses, "mutu.kelola") || punya(akses, "mutu.audit") || punya(akses, "mutu.lihat");
  let q = supabase.from("bukti_mutu").select("*, tautan_bukti_mutu(periode, indikator_mutu(kode))").order("created_at", { ascending: false }).limit(300);
  if (sp.q) q = q.ilike("judul", `%${sp.q.slice(0, 60)}%`);
  if (!sp.lama) q = q.eq("digantikan", false);
  const [{ data }, { data: log }] = await Promise.all([
    q,
    punya(akses, "mutu.kelola") || punya(akses, "mutu.audit") ? supabase.from("akses_bukti_mutu").select("id, bukti_id, user_id, integritas_ok, waktu").order("waktu", { ascending: false }).limit(30) : Promise.resolve({ data: [] }),
  ]);
  if (!tim && !(data ?? []).length) redirect("/admin/mutu");
  const list = (data ?? []) as unknown as (B & { tautan_bukti_mutu: { periode: string; indikator_mutu: { kode: string } | null }[] })[];
  const judul = new Map(list.map((b) => [b.id, b.judul]));
  return (
    <>
      <JudulHalaman judul="Repositori bukti" deskripsi="Setiap bukti mencatat sumber, versi, tanggal, pengunggah, dan sidik jari SHA-256 (untuk berkas). Bukti tidak dapat diubah — perbarui dengan versi baru." />
      <NavMutu />
      <form className="mb-4 flex flex-wrap gap-2 text-sm">
        <input name="q" defaultValue={sp.q} placeholder="Cari judul bukti" aria-label="Cari" className="min-w-56 flex-1 rounded-full border border-black/15 bg-white px-4 py-2" />
        <label className="flex items-center gap-2"><input type="checkbox" name="lama" value="1" defaultChecked={Boolean(sp.lama)} /> tampilkan versi lama</label>
        <button className="rounded-full px-4 py-2 font-semibold ring-1 ring-black/15">Cari</button>
      </form>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Kartu>
          {list.length === 0 ? <p className="text-sm text-black/50">Belum ada bukti.</p> : (
            <ul className="divide-y divide-black/5 text-sm">{list.map((b) => (
              <li key={b.id} className={`py-2 ${b.digantikan ? "opacity-50" : ""}`}>
                <p className="font-medium">{b.judul} <span className="text-xs font-normal text-black/50">v{b.versi} · {b.jenis}</span></p>
                <p className="text-xs text-black/60"><TautanBukti b={b} /> · {waktuWIB(b.created_at)}{b.hash_sha256 && <> · SHA-256 <span className="font-mono">{b.hash_sha256.slice(0, 16)}…</span></>}
                  {b.tautan_bukti_mutu.length > 0 && ` · indikator ${b.tautan_bukti_mutu.map((t) => `${t.indikator_mutu?.kode} (${t.periode})`).join(", ")}`}</p>
              </li>))}</ul>
          )}
        </Kartu>
        {(log ?? []).length > 0 && (
          <Kartu className="self-start"><h2 className="mb-2 font-semibold">Akses berkas terakhir</h2>
            <ul className="space-y-1 text-xs">{(log ?? []).map((l) => <li key={l.id} className={l.integritas_ok === false ? "font-semibold text-merah" : "text-black/60"}>{waktuWIB(l.waktu)} · {judul.get(l.bukti_id) ?? "bukti"} · {l.integritas_ok === false ? "INTEGRITAS GAGAL" : "utuh"}</li>)}</ul></Kartu>
        )}
      </div>
    </>
  );
}
