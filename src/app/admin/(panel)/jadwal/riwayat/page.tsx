import { redirect } from "next/navigation";
import { JudulHalaman, Paginasi, kelasTabel, kelasTd, kelasTh } from "@/components/admin/ui";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { namaHari } from "@/lib/admin/jadwal";

export const metadata = { title: "Riwayat Jadwal" };
const PER = 50;
const TABEL: Record<string, string> = {
  jadwal: "Jadwal kelas",
  perubahan_jadwal: "Perubahan harian / pengganti",
  pengajuan_tukar_jadwal: "Tukar jam",
  jam_pelajaran: "Jam pelajaran",
  penugasan_mengajar: "Penugasan mengajar",
  piket_guru: "Piket",
  kegiatan_kalender: "Kalender",
};
const AKSI: Record<string, string> = { INSERT: "Tambah", UPDATE: "Ubah", DELETE: "Hapus" };

type Baris = { id: number; waktu: string; pelaku: string; tabel: string; aksi: string; data_lama: Record<string, unknown> | null; data_baru: Record<string, unknown> | null; total: number };

function ringkas(b: Baris) {
  const d = b.data_baru ?? b.data_lama ?? {};
  const bagian: string[] = [];
  if (d.hari) bagian.push(namaHari(Number(d.hari)));
  if (d.tanggal) bagian.push(String(d.tanggal));
  if (d.jp_ke) bagian.push(`JP ${d.jp_ke}`);
  if (d.jenis) bagian.push(String(d.jenis).replace("_", " "));
  if (d.status) bagian.push(String(d.status).replace("_", " "));
  if (d.judul) bagian.push(String(d.judul));
  if (d.catatan) bagian.push(String(d.catatan));
  if (d.jumlah != null) bagian.push(`${d.jumlah} baris`);
  return bagian.join(" · ").slice(0, 160);
}

export default async function RiwayatJadwal({ searchParams }: { searchParams: Promise<{ tabel?: string; hal?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  if (!punya(akses, "jadwal.kelola") && !punya(akses, "jadwal.pengganti")) redirect("/admin?pesan=tanpa-akses");
  const hal = Math.max(1, Number(sp.hal) || 1);
  const tabel = sp.tabel && TABEL[sp.tabel] ? sp.tabel : null;
  const { data, error } = await supabase.rpc("riwayat_jadwal", { p_batas: PER, p_lewati: (hal - 1) * PER, p_tabel: tabel });
  if (error) console.error("[riwayat jadwal]", error.message);
  const baris = (data ?? []) as Baris[];
  const total = baris[0]?.total ?? 0;

  return (
    <>
      <JudulHalaman judul="Riwayat Jadwal" deskripsi="Siapa mengubah apa dan kapan — dicatat otomatis oleh database, tidak bisa diubah." />
      <form className="mb-4 flex gap-3">
        <select name="tabel" defaultValue={tabel ?? ""} className="rounded-full border border-black/15 bg-white px-4 py-2" aria-label="Jenis perubahan">
          <option value="">Semua</option>
          {Object.entries(TABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Saring</button>
      </form>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className={kelasTabel}>
          <thead>
            <tr><th className={kelasTh}>Waktu</th><th className={kelasTh}>Oleh</th><th className={kelasTh}>Data</th><th className={kelasTh}>Aksi</th><th className={kelasTh}>Rincian</th></tr>
          </thead>
          <tbody>
            {baris.length === 0 ? (
              <tr><td colSpan={5} className={`${kelasTd} text-center text-black/50`}>Belum ada riwayat.</td></tr>
            ) : baris.map((b) => (
              <tr key={b.id}>
                <td className={`${kelasTd} whitespace-nowrap`}>{new Date(b.waktu).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}</td>
                <td className={kelasTd}>{b.pelaku}</td>
                <td className={kelasTd}>{TABEL[b.tabel] ?? b.tabel}</td>
                <td className={kelasTd}>{AKSI[b.aksi] ?? b.aksi}</td>
                <td className={`${kelasTd} text-black/60`}>{ringkas(b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginasi halaman={hal} total={Number(total)} perHalaman={PER} dasar="/admin/jadwal/riwayat" params={{ tabel: tabel ?? undefined }} />
    </>
  );
}
