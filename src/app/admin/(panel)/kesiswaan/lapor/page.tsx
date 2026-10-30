import { JudulHalaman, Kartu, Lencana } from "@/components/admin/ui";
import { FormPelanggaran, FormPrestasi } from "@/components/kesiswaan/Form";
import { hariIniWIB } from "@/lib/admin/absensi";
import { wajibBoleh } from "@/lib/admin/auth";
import { BOLEH } from "@/lib/admin/akses-modul";
import { STATUS_LAPORAN } from "@/lib/kesiswaan/label";
import { formatTanggal } from "@/lib/format";
import { TabPills } from "@/components/admin/TabPills";

export const metadata = { title: "Lapor Pelanggaran / Prestasi" };

export default async function Lapor({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const { supabase, akses } = await wajibBoleh(BOLEH.mengajar);
  const prestasi = tab === "prestasi";
  const [{ data: jenis }, { data: pel }, { data: pre }, { data: rujukan }] = await Promise.all([
    supabase.from("jenis_pelanggaran").select("id, nama, kategori, poin").eq("aktif", true).order("kategori").order("poin"),
    supabase.from("pelanggaran_siswa").select("id, tanggal, nama_pelanggaran, status, catatan_verifikasi, siswa:siswa_id(nama)").eq("dilaporkan_oleh", akses?.userId ?? "").order("dilaporkan_pada", { ascending: false }).limit(20),
    supabase.from("prestasi_siswa").select("id, tanggal, nama_kegiatan, status, catatan_verifikasi, siswa:siswa_id(nama)").eq("diajukan_oleh", akses?.userId ?? "").order("diajukan_pada", { ascending: false }).limit(20),
    supabase.rpc("status_rujukan_saya"),
  ]);
  type Baris = { id: string; tanggal: string; status: string; catatan_verifikasi: string; siswa: { nama: string } | null; nama_pelanggaran?: string; nama_kegiatan?: string };
  const riwayat = ([...(pel ?? []), ...(pre ?? [])] as unknown as Baris[]).sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
  const hari = hariIniWIB();

  return (
    <>
      <JudulHalaman judul="Lapor" deskripsi="Semua guru dapat melaporkan pelanggaran maupun prestasi siswa. Poin baru dihitung setelah diverifikasi kesiswaan." />
      <TabPills label="Jenis laporan" item={[{ href: "/admin/kesiswaan/lapor", label: "Pelanggaran" }, { href: "/admin/kesiswaan/lapor?tab=prestasi", label: "Prestasi" }]} aktif={prestasi ? "/admin/kesiswaan/lapor?tab=prestasi" : "/admin/kesiswaan/lapor"} />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <Kartu>{prestasi ? <FormPrestasi hariIni={hari} /> : <FormPelanggaran jenis={jenis ?? []} hariIni={hari} />}</Kartu>
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-2xl">Laporan saya</h2>
            {!riwayat.length ? <p className="text-sm text-black/50">Belum ada.</p> : (
              <ul className="space-y-2">
                {riwayat.map((r) => (
                  <li key={r.id} className="rounded-xl bg-white p-3 text-sm ring-1 ring-black/5">
                    <div className="flex items-start justify-between gap-2">
                      <span><strong>{r.siswa?.nama}</strong><span className="block text-black/60">{r.nama_pelanggaran ?? `🏆 ${r.nama_kegiatan}`} · {formatTanggal(r.tanggal, { year: undefined })}</span></span>
                      <Lencana warna={r.status === "terverifikasi" ? "hijau" : r.status.startsWith("di") && r.status !== "ditolak" && r.status !== "dibatalkan" ? "kuning" : "abu"}>{STATUS_LAPORAN[r.status] ?? r.status}</Lencana>
                    </div>
                    {r.catatan_verifikasi && <p className="mt-1 text-xs text-black/50">Catatan: {r.catatan_verifikasi}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
          {!!rujukan?.length && (
            <section>
              <h2 className="mb-3 text-2xl">Rujukan BK saya</h2>
              <ul className="space-y-2 text-sm">
                {(rujukan as { id: string; siswa: string; status: string }[]).map((r) => (
                  <li key={r.id} className="flex justify-between rounded-xl bg-white p-3 ring-1 ring-black/5"><span>{r.siswa}</span><Lencana>{r.status}</Lencana></li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
