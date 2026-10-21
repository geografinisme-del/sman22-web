import { JudulHalaman, Paginasi, kelasTabel, kelasTd, kelasTh } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { AKSI_AUDIT, PERISTIWA_AUDIT, TABEL_AUDIT } from "@/lib/admin/label-audit";

export const metadata = { title: "Log Aktivitas" };
const PER = 50;
const TABEL = TABEL_AUDIT;
const AKSI = AKSI_AUDIT;
const PERISTIWA = PERISTIWA_AUDIT;

export default async function Log({ searchParams }: { searchParams: Promise<{ tabel?: string; aksi?: string; hal?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await wajibIzin("audit.baca");
  const hal = Math.max(1, Number(sp.hal) || 1);
  let q = supabase
    .from("audit_log")
    .select("id, waktu, user_id, tabel, aksi, record_id, data_baru", { count: "exact" })
    .order("waktu", { ascending: false })
    .range((hal - 1) * PER, hal * PER - 1);
  if (sp.tabel && TABEL[sp.tabel]) q = q.eq("tabel", sp.tabel);
  if (sp.aksi && AKSI[sp.aksi]) q = q.eq("aksi", sp.aksi);
  const { data, count } = await q;
  const ids = [...new Set((data ?? []).map((d) => d.user_id).filter(Boolean))];
  const { data: orang } = ids.length ? await supabase.from("pengguna").select("user_id, nama, email").in("user_id", ids) : { data: [] };
  const nama = new Map((orang ?? []).map((o) => [o.user_id, o.nama || o.email]));
  const judul = (d: { data_baru: Record<string, unknown> | null }) => {
    const b = d.data_baru ?? {};
    if (b.peristiwa) return PERISTIWA[String(b.peristiwa)] ?? String(b.peristiwa);
    if (b.akun) return `akun: ${String(b.akun)}${b.dibatasi ? " (dibatasi)" : ""}`;
    return String(b.nama ?? b.judul ?? b.peran ?? (b.jumlah != null ? `${b.jumlah} baris` : ""));
  };

  return (
    <>
      <JudulHalaman judul="Log Aktivitas" deskripsi="Semua perubahan data tercatat otomatis oleh database dan tidak bisa diubah dari aplikasi." />
      <form className="mb-4 flex flex-wrap gap-3">
        <select name="tabel" defaultValue={sp.tabel ?? ""} className="rounded-full border border-black/15 bg-white px-4 py-2" aria-label="Jenis data">
          <option value="">Semua data</option>
          {Object.entries(TABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="aksi" defaultValue={sp.aksi ?? ""} className="rounded-full border border-black/15 bg-white px-4 py-2" aria-label="Aksi">
          <option value="">Semua aksi</option>
          {Object.entries(AKSI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="rounded-full bg-ink px-5 py-2 font-semibold text-white">Terapkan</button>
      </form>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className={kelasTabel}>
          <thead>
            <tr>
              <th className={kelasTh}>Waktu</th>
              <th className={kelasTh}>Oleh</th>
              <th className={kelasTh}>Aksi</th>
              <th className={kelasTh}>Data</th>
            </tr>
          </thead>
          <tbody>
            {data?.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-black/50">Belum ada aktivitas.</td></tr>}
            {data?.map((d) => (
              <tr key={d.id}>
                <td className={`${kelasTd} whitespace-nowrap text-black/60`}>
                  {new Date(d.waktu).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
                </td>
                <td className={kelasTd}>{nama.get(d.user_id) ?? <span className="text-black/40">sistem</span>}</td>
                <td className={kelasTd}>{AKSI[d.aksi] ?? d.aksi}</td>
                <td className={kelasTd}>
                  {TABEL[d.tabel] ?? d.tabel}
                  {judul(d) && <span className="text-black/50"> · {judul(d)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginasi halaman={hal} total={count ?? 0} perHalaman={PER} dasar="/admin/log" params={{ tabel: sp.tabel, aksi: sp.aksi }} />
    </>
  );
}
