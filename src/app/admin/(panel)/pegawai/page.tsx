import Link from "next/link";
import { JudulHalaman, Lencana, Notifikasi, Paginasi, TombolLink, kelasTabel, kelasTd, kelasTh } from "@/components/admin/ui";
import { punya, wajibIzin } from "@/lib/admin/auth";
import { STATUS_PEGAWAI } from "@/lib/admin/induk";

export const metadata = { title: "Guru & Pegawai" };
const PER_HALAMAN = 25;

export default async function DaftarPegawai({ searchParams }: { searchParams: Promise<{ q?: string; jenis?: string; status?: string; hal?: string; pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibIzin("data_induk.baca");
  const bisaUbah = punya(akses, "data_induk.kelola");
  const halaman = Math.max(1, Number(sp.hal) || 1);
  const status = sp.status === "semua" ? "" : (STATUS_PEGAWAI as readonly string[]).includes(sp.status ?? "") ? sp.status! : "aktif";
  const q = (sp.q ?? "").replace(/[%_,()*\\]/g, " ").trim().slice(0, 80);

  let query = supabase
    .from("pegawai")
    .select("id, nama, nip, jenis, jabatan, status, user_id", { count: "exact" })
    .is("deleted_at", null)
    .order("nama")
    .range((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN - 1);
  if (status) query = query.eq("status", status);
  if (sp.jenis === "guru" || sp.jenis === "tendik") query = query.eq("jenis", sp.jenis);
  if (q) query = /^\d+$/.test(q) ? query.ilike("nip", `${q}%`) : query.ilike("nama", `%${q}%`);
  const { data: list, count } = await query;

  return (
    <>
      <JudulHalaman
        judul="Guru & Pegawai"
        aksi={
          <div className="flex flex-wrap gap-2">
            <TombolLink href="/admin/pegawai/ekspor" sekunder>Unduh Excel</TombolLink>
            {bisaUbah && (
              <>
                <TombolLink href="/admin/pegawai/impor" sekunder>Impor Excel</TombolLink>
                <TombolLink href="/admin/pegawai/baru">+ Tambah</TombolLink>
              </>
            )}
          </div>
        }
      />
      <Notifikasi kode={sp.pesan} />
      <form className="mb-5 grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5 sm:grid-cols-[2fr_1fr_1fr_auto]" role="search">
        <label htmlFor="q" className="sr-only">Cari</label>
        <input id="q" name="q" defaultValue={q} placeholder="Cari nama atau NIP…" className="rounded-full border border-black/15 px-4 py-2" />
        <label htmlFor="jenis" className="sr-only">Jenis</label>
        <select id="jenis" name="jenis" defaultValue={sp.jenis ?? ""} className="rounded-full border border-black/15 bg-white px-4 py-2">
          <option value="">Guru & tendik</option>
          <option value="guru">Guru</option>
          <option value="tendik">Tenaga kependidikan</option>
        </select>
        <label htmlFor="status" className="sr-only">Status</label>
        <select id="status" name="status" defaultValue={status || "semua"} className="rounded-full border border-black/15 bg-white px-4 py-2">
          <option value="semua">Semua status</option>
          {STATUS_PEGAWAI.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
        <button type="submit" className="rounded-full bg-ink px-5 py-2 font-semibold text-white">Terapkan</button>
      </form>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className={kelasTabel}>
          <thead>
            <tr>
              <th className={kelasTh}>Nama</th>
              <th className={kelasTh}>NIP</th>
              <th className={kelasTh}>Jenis</th>
              <th className={kelasTh}>Jabatan</th>
              <th className={kelasTh}>Akun</th>
            </tr>
          </thead>
          <tbody>
            {list?.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-black/50">Belum ada data.</td></tr>
            )}
            {list?.map((p) => (
              <tr key={p.id} className="hover:bg-soft/50">
                <td className={kelasTd}>
                  <Link href={`/admin/pegawai/${p.id}`} className="font-medium hover:underline">{p.nama}</Link>
                  {p.status !== "aktif" && <span className="ml-2"><Lencana>{p.status}</Lencana></span>}
                </td>
                <td className={`${kelasTd} tabular-nums`}>{p.nip ?? "—"}</td>
                <td className={kelasTd}>{p.jenis === "guru" ? "Guru" : "Tendik"}</td>
                <td className={kelasTd}>{p.jabatan || "—"}</td>
                <td className={kelasTd}>{p.user_id ? <Lencana warna="hijau">Ada</Lencana> : <span className="text-black/40">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginasi halaman={halaman} total={count ?? 0} perHalaman={PER_HALAMAN} dasar="/admin/pegawai" params={{ q, jenis: sp.jenis, status: sp.status }} />
    </>
  );
}
