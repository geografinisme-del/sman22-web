import { redirect } from "next/navigation";
import { JudulHalaman, KosongAdmin, Lencana, Notifikasi } from "@/components/admin/ui";
import { STATUS_PEGAWAI_ABSEN } from "@/lib/admin/absensi";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { formatTanggal, formatWaktu } from "@/lib/format";
import { putuskanIzinPegawai } from "../../actions-pegawai";

export const metadata = { title: "Izin Guru & Pegawai" };

type Z = { id: string; pegawai_id: string; jenis: string; tanggal_mulai: string; tanggal_selesai: string; alasan: string; bukti_path: string; status: string; diajukan_pada: string; catatan: string; pegawai: { nama: string } | null };

export default async function IzinPegawai({ searchParams }: { searchParams: Promise<{ pesan?: string; lihat?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const memutuskan = punya(akses, "izin_pegawai.setujui");
  if (!memutuskan && !punya(akses, "absensi_pegawai.lihat")) redirect("/admin?pesan=tanpa-akses");
  const riwayat = sp.lihat === "riwayat";
  let q = supabase
    .from("pengajuan_izin_pegawai")
    .select("id, pegawai_id, jenis, tanggal_mulai, tanggal_selesai, alasan, bukti_path, status, diajukan_pada, catatan, pegawai:pegawai_id(nama)")
    .order("diajukan_pada", { ascending: riwayat ? false : true })
    .limit(200);
  q = riwayat ? q.neq("status", "menunggu") : q.eq("status", "menunggu");
  const { data } = await q;
  const list = (data ?? []) as unknown as Z[];
  const { data: saya } = await supabase.rpc("pegawai_saya");

  return (
    <>
      <JudulHalaman judul="Izin Guru & Pegawai" deskripsi="Pengajuan sakit, izin, dinas luar, dan cuti dari guru/pegawai. Setelah disetujui, kehadiran terisi otomatis dan guru tersebut muncul di menu Guru Pengganti." />
      <Notifikasi kode={sp.pesan} />
      <nav className="mb-5 flex gap-2 text-sm">
        <a href="/admin/izin-pegawai" className={`rounded-full px-4 py-2 ${!riwayat ? "bg-brand-900 text-white" : "ring-1 ring-black/10"}`}>Menunggu</a>
        <a href="/admin/izin-pegawai?lihat=riwayat" className={`rounded-full px-4 py-2 ${riwayat ? "bg-brand-900 text-white" : "ring-1 ring-black/10"}`}>Riwayat</a>
      </nav>
      {!list.length ? <KosongAdmin teks={riwayat ? "Belum ada riwayat." : "Tidak ada pengajuan yang menunggu."} /> : (
        <ul className="space-y-3">
          {list.map((z) => (
            <li key={z.id} className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
              <div className="min-w-0">
                <p className="font-semibold">{z.pegawai?.nama ?? "—"} <Lencana>{STATUS_PEGAWAI_ABSEN[z.jenis as keyof typeof STATUS_PEGAWAI_ABSEN]}</Lencana></p>
                <p className="mt-1 text-sm">{formatTanggal(z.tanggal_mulai, { weekday: "short" })}{z.tanggal_selesai !== z.tanggal_mulai && <> – {formatTanggal(z.tanggal_selesai, { weekday: "short" })}</>}</p>
                <p className="mt-2 text-sm text-black/70">“{z.alasan}”</p>
                {z.bukti_path && <a href={`/berkas/izin-pegawai/${z.id}`} target="_blank" rel="noopener" className="mt-1 inline-block text-sm font-semibold text-brand-700 underline">Lihat bukti ↗</a>}
                <p className="mt-1 text-xs text-black/40">Diajukan {formatWaktu(z.diajukan_pada)}</p>
                {z.catatan && <p className="mt-1 text-xs text-black/60">Catatan: {z.catatan}</p>}
              </div>
              {z.status === "menunggu" && memutuskan && z.pegawai_id !== saya ? (
                <form action={putuskanIzinPegawai} className="flex w-full flex-col gap-2 sm:w-64">
                  <input type="hidden" name="id" value={z.id} />
                  <input name="catatan" maxLength={300} placeholder="Catatan (opsional)" aria-label="Catatan" className="rounded-xl border border-black/15 px-3 py-2 text-sm" />
                  <div className="flex gap-2">
                    <button name="keputusan" value="setuju" className="flex-1 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Setujui</button>
                    <button name="keputusan" value="tolak" className="flex-1 rounded-full px-4 py-2 text-sm font-semibold text-merah ring-1 ring-red-200">Tolak</button>
                  </div>
                </form>
              ) : (
                <Lencana warna={z.status === "disetujui" ? "hijau" : z.status === "menunggu" ? "kuning" : "abu"}>{z.status}</Lencana>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
