import Link from "next/link";
import { redirect } from "next/navigation";
import { JudulHalaman, KosongAdmin, Notifikasi, TombolLink, kelasTabel, kelasTd, kelasTh } from "@/components/admin/ui";
import { berperan, punya, wajibBoleh } from "@/lib/admin/auth";
import { BOLEH } from "@/lib/admin/akses-modul";
import { BIDANG, PERINGKAT, TINGKAT } from "@/lib/kesiswaan/label";
import { formatTanggal } from "@/lib/format";
import { verifikasi } from "../../actions-kesiswaan";

export const metadata = { title: "Kesiswaan" };

type Rekap = { siswa_id: string; nama: string; kelas: string | null; kelas_id: string | null; poin_pelanggaran: number; poin_prestasi: number; poin_bersih: number; jumlah_pelanggaran: number; jumlah_prestasi: number; tindakan: string | null };

function FormVerifikasi({ tipe, id, label }: { tipe: string; id: string; label: string }) {
  return (
    <form action={verifikasi} className="flex w-full flex-col gap-2 sm:w-64">
      <input type="hidden" name="tipe" value={tipe} /><input type="hidden" name="id" value={id} />
      <input name="catatan" maxLength={500} placeholder="Catatan (wajib bila ditolak)" aria-label={`Catatan ${label}`} className="rounded-xl border border-black/15 px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <button name="keputusan" value="sah" className="flex-1 rounded-full bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Verifikasi</button>
        <button name="keputusan" value="tolak" className="flex-1 rounded-full px-3 py-2 text-sm font-semibold text-blue-teks ring-1 ring-red-200">Tolak</button>
      </div>
    </form>
  );
}

export default async function Kesiswaan({ searchParams }: { searchParams: Promise<{ pesan?: string; kelas?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibBoleh(BOLEH.poinKesiswaan);
  const lihat = punya(akses, "kesiswaan.lihat");
  if (!lihat && !berperan(akses, "wali_kelas")) redirect("/admin/kesiswaan/lapor");
  const kelola = punya(akses, "kesiswaan.kelola");
  const [{ data: rekap }, pel, pre] = await Promise.all([
    supabase.rpc("rekap_poin"),
    kelola ? supabase.from("pelanggaran_siswa").select("id, tanggal, tempat, nama_pelanggaran, kategori, poin, kronologi, saksi, bukti_path, dilaporkan_oleh, siswa_id, siswa:siswa_id(nama)").eq("status", "dilaporkan").order("dilaporkan_pada") : Promise.resolve({ data: [] }),
    kelola ? supabase.from("prestasi_siswa").select("id, tanggal, nama_kegiatan, bidang, tingkat, peringkat, peserta, penyelenggara, poin, bukti_path, siswa_id, siswa:siswa_id(nama)").eq("status", "diajukan").order("diajukan_pada") : Promise.resolve({ data: [] }),
  ]);
  const semua = (rekap ?? []) as Rekap[];
  const kelasList = [...new Map(semua.filter((r) => r.kelas_id).map((r) => [r.kelas_id!, r.kelas!])).entries()].sort((a, b) => a[1].localeCompare(b[1], "id", { numeric: true }));
  const baris = sp.kelas ? semua.filter((r) => r.kelas_id === sp.kelas) : semua;
  type Pel = { id: string; tanggal: string; tempat: string; nama_pelanggaran: string; kategori: string; poin: number; kronologi: string; saksi: string; bukti_path: string; siswa_id: string; siswa: { nama: string } | null };
  type Pre = { id: string; tanggal: string; nama_kegiatan: string; bidang: string; tingkat: string; peringkat: string; peserta: string; penyelenggara: string; poin: number; bukti_path: string; siswa_id: string; siswa: { nama: string } | null };
  const pelList = (pel.data ?? []) as unknown as Pel[];
  const preList = (pre.data ?? []) as unknown as Pre[];

  return (
    <>
      <JudulHalaman
        judul="Kesiswaan"
        deskripsi="Prestasi, pelanggaran berpoin, dan pembinaan. Data ini internal — tidak ada peringkat pelanggaran yang ditampilkan ke publik."
        aksi={<div className="flex flex-wrap gap-2"><TombolLink href="/admin/kesiswaan/lapor" sekunder>Lapor pelanggaran</TombolLink><TombolLink href="/admin/kesiswaan/lapor?tab=prestasi">Catat prestasi</TombolLink></div>}
      />
      <Notifikasi kode={sp.pesan} />

      {kelola && (pelList.length > 0 || preList.length > 0) && (
        <section className="mb-10">
          <h2 className="mb-3 text-3xl">Perlu verifikasi ({pelList.length + preList.length})</h2>
          <ul className="space-y-3">
            {pelList.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold"><Link href={`/admin/kesiswaan/siswa/${p.siswa_id}`} className="hover:underline">{p.siswa?.nama}</Link> <span className="ml-1 rounded bg-red-100 px-1.5 text-xs font-bold text-red-800">{p.nama_pelanggaran} · {p.poin} poin</span></p>
                  <p className="mt-1 text-sm text-black/50">{formatTanggal(p.tanggal, { weekday: "short" })}{p.tempat && ` · ${p.tempat}`}{p.saksi && ` · saksi: ${p.saksi}`}</p>
                  <p className="mt-2 text-sm text-black/70">“{p.kronologi}”</p>
                  {p.bukti_path && <a href={`/berkas/pelanggaran/${p.id}`} target="_blank" rel="noopener" className="mt-1 inline-block text-sm font-semibold text-blue-teks underline">Lihat bukti ↗</a>}
                </div>
                <FormVerifikasi tipe="pelanggaran" id={p.id} label={p.siswa?.nama ?? ""} />
              </li>
            ))}
            {preList.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold"><Link href={`/admin/kesiswaan/siswa/${p.siswa_id}`} className="hover:underline">{p.siswa?.nama}</Link> <span className="ml-1 rounded bg-emerald-100 px-1.5 text-xs font-bold text-emerald-800">🏆 {PERINGKAT[p.peringkat]} {TINGKAT[p.tingkat]} · {p.poin} poin</span></p>
                  <p className="mt-1 text-sm">{p.nama_kegiatan}</p>
                  <p className="text-sm text-black/50">{BIDANG[p.bidang]} · {p.peserta} · {p.penyelenggara || "—"} · {formatTanggal(p.tanggal)}</p>
                  {p.bukti_path ? <a href={`/berkas/prestasi/${p.id}`} target="_blank" rel="noopener" className="mt-1 inline-block text-sm font-semibold text-blue-teks underline">Lihat piagam ↗</a> : <p className="mt-1 text-xs text-amber-700">Tanpa bukti</p>}
                </div>
                <FormVerifikasi tipe="prestasi" id={p.id} label={p.siswa?.nama ?? ""} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-3xl">Rekap poin tahun ini</h2>
          {kelasList.length > 1 && (
            <form className="flex gap-2">
              <select name="kelas" defaultValue={sp.kelas ?? ""} aria-label="Filter kelas" className="rounded-xl border border-black/15 bg-white px-3 py-2">
                <option value="">Semua kelas</option>
                {kelasList.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
              </select>
              <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Tampilkan</button>
            </form>
          )}
        </div>
        {!baris.length ? <KosongAdmin teks="Belum ada catatan prestasi/pelanggaran terverifikasi." /> : (
          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
            <table className={kelasTabel}>
              <thead><tr><th className={kelasTh}>Siswa</th><th className={kelasTh}>Kelas</th><th className={`${kelasTh} text-right`}>Pelanggaran</th><th className={`${kelasTh} text-right`}>Prestasi</th><th className={`${kelasTh} text-right`}>Poin</th><th className={kelasTh}>Tindak lanjut</th></tr></thead>
              <tbody>
                {baris.map((r) => (
                  <tr key={r.siswa_id}>
                    <td className={kelasTd}><Link href={`/admin/kesiswaan/siswa/${r.siswa_id}`} className="font-medium hover:underline">{r.nama}</Link></td>
                    <td className={kelasTd}>{r.kelas ?? "—"}</td>
                    <td className={`${kelasTd} text-right tabular-nums`}>{r.jumlah_pelanggaran}× · {r.poin_pelanggaran}</td>
                    <td className={`${kelasTd} text-right tabular-nums text-emerald-700`}>{r.jumlah_prestasi}× · {r.poin_prestasi}</td>
                    <td className={`${kelasTd} text-right font-semibold tabular-nums`}>{r.poin_bersih}</td>
                    <td className={kelasTd}>{r.tindakan ? <span className="text-amber-800">{r.tindakan}</span> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
