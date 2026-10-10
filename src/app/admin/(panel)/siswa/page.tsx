import Link from "next/link";
import { JudulHalaman, Lencana, Notifikasi, Paginasi, TombolLink, kelasTabel, kelasTd, kelasTh } from "@/components/admin/ui";
import { punya, wajibIzin } from "@/lib/admin/auth";
import { STATUS_SISWA } from "@/lib/admin/induk";

export const metadata = { title: "Data Siswa" };
const PER_HALAMAN = 25;

type SP = { q?: string; kelas?: string; status?: string; tingkat?: string; hal?: string; pesan?: string };

export default async function DaftarSiswa({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibIzin("data_induk.baca");
  const bisaUbah = punya(akses, "data_induk.kelola");
  const halaman = Math.max(1, Number(sp.hal) || 1);
  const status = sp.status === "semua" ? "" : (STATUS_SISWA as readonly string[]).includes(sp.status ?? "") ? sp.status! : "aktif";
  const q = (sp.q ?? "").trim().slice(0, 80);

  const { data: ta } = await supabase.from("tahun_ajaran").select("id, nama").eq("aktif", true).maybeSingle();
  const { data: daftarKelas } = ta
    ? await supabase.from("kelas").select("id, nama, tingkat").eq("tahun_ajaran_id", ta.id).is("deleted_at", null).order("nama")
    : { data: [] as { id: string; nama: string; tingkat: string }[] };

  let query = supabase
    .from("siswa_kelas_aktif")
    .select("id, nisn, nama, jenis_kelamin, status, kelas, tingkat", { count: "exact" })
    .is("deleted_at", null)
    .order("nama")
    .range((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN - 1);
  if (status) query = query.eq("status", status);
  if (sp.kelas === "tanpa") query = query.is("kelas_id", null);
  else if (sp.kelas) query = query.eq("kelas_id", sp.kelas);
  if (sp.tingkat && ["X", "XI", "XII"].includes(sp.tingkat)) query = query.eq("tingkat", sp.tingkat);
  if (q) {
    const aman = q.replace(/[%_,()*\\]/g, " ").trim();
    query = /^\d+$/.test(aman) ? query.ilike("nisn", `${aman}%`) : query.ilike("nama", `%${aman}%`);
  }
  const { data: list, count, error } = await query;
  const total = count ?? 0;
  const ekspor = new URLSearchParams(Object.entries({ q, kelas: sp.kelas ?? "", status: status || "semua", tingkat: sp.tingkat ?? "" }).filter(([, v]) => v));

  return (
    <>
      <JudulHalaman
        judul="Data Siswa"
        deskripsi={ta ? `Kelas mengikuti tahun ajaran aktif ${ta.nama}.` : "Belum ada tahun ajaran aktif."}
        aksi={
          <div className="flex flex-wrap gap-2">
            <TombolLink href={`/admin/siswa/ekspor?${ekspor}`} sekunder>
              Ekspor CSV
            </TombolLink>
            {bisaUbah && (
              <>
                <TombolLink href="/admin/siswa/impor" sekunder>
                  Impor Excel
                </TombolLink>
                <TombolLink href="/admin/siswa/baru">+ Tambah siswa</TombolLink>
              </>
            )}
          </div>
        }
      />
      <Notifikasi kode={sp.pesan} />

      <form className="mb-5 grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]" role="search">
        <label className="sr-only" htmlFor="q">Cari</label>
        <input id="q" name="q" defaultValue={q} placeholder="Cari nama atau NISN…" className="rounded-full border border-black/15 px-4 py-2" />
        <label className="sr-only" htmlFor="kelas">Kelas</label>
        <select id="kelas" name="kelas" defaultValue={sp.kelas ?? ""} className="rounded-full border border-black/15 bg-white px-4 py-2">
          <option value="">Semua kelas</option>
          <option value="tanpa">Belum punya kelas</option>
          {daftarKelas?.map((k) => (
            <option key={k.id} value={k.id}>{k.nama}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="tingkat">Tingkat</label>
        <select id="tingkat" name="tingkat" defaultValue={sp.tingkat ?? ""} className="rounded-full border border-black/15 bg-white px-4 py-2">
          <option value="">Semua tingkat</option>
          <option value="X">Kelas X</option>
          <option value="XI">Kelas XI</option>
          <option value="XII">Kelas XII</option>
        </select>
        <label className="sr-only" htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={status || "semua"} className="rounded-full border border-black/15 bg-white px-4 py-2">
          <option value="semua">Semua status</option>
          {STATUS_SISWA.map((s) => (
            <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <button type="submit" className="rounded-full bg-brand-900 px-5 py-2 font-semibold text-white hover:bg-brand-700">Terapkan</button>
      </form>

      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className={kelasTabel}>
          <thead>
            <tr>
              <th className={kelasTh}>NISN</th>
              <th className={kelasTh}>Nama</th>
              <th className={kelasTh}>L/P</th>
              <th className={kelasTh}>Kelas</th>
              <th className={kelasTh}>Status</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-red-700">Gagal memuat data. Muat ulang halaman.</td></tr>
            )}
            {!error && list?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-black/50">
                  {q || sp.kelas || sp.tingkat ? "Tidak ada siswa yang cocok dengan filter." : "Belum ada data siswa."}
                  {bisaUbah && !q && !sp.kelas && (
                    <>
                      {" "}
                      <Link href="/admin/siswa/impor" className="font-semibold text-brand-700 underline">Impor dari Excel/Dapodik</Link>
                    </>
                  )}
                </td>
              </tr>
            )}
            {list?.map((s) => (
              <tr key={s.id} className="hover:bg-krem/50">
                <td className={`${kelasTd} tabular-nums`}>{s.nisn ?? <span className="text-black/40">—</span>}</td>
                <td className={kelasTd}>
                  <Link href={`/admin/siswa/${s.id}`} className="font-medium hover:underline">{s.nama}</Link>
                </td>
                <td className={kelasTd}>{s.jenis_kelamin ?? "—"}</td>
                <td className={kelasTd}>{s.kelas ?? <span className="text-amber-700">Belum ada</span>}</td>
                <td className={kelasTd}>
                  <Lencana warna={s.status === "aktif" ? "hijau" : "abu"}>{s.status}</Lencana>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginasi halaman={halaman} total={total} perHalaman={PER_HALAMAN} dasar="/admin/siswa" params={{ q, kelas: sp.kelas, status: sp.status, tingkat: sp.tingkat }} />
    </>
  );
}
