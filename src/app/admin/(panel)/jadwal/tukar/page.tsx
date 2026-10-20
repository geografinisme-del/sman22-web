import { JudulHalaman, Kartu, Notifikasi, TombolLink } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { muatTukar, STATUS_TUKAR } from "@/lib/admin/tukar";
import { putuskanTukar } from "../../../actions-tukar";

export const metadata = { title: "Persetujuan Tukar Jam" };

export default async function PersetujuanTukar({ searchParams }: { searchParams: Promise<{ pesan?: string; galat?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await wajibIzin("jadwal.kelola");
  const semua = await muatTukar(supabase, (q) => q);
  const menunggu = semua.filter((t) => t.status === "menunggu_kurikulum");
  const lain = semua.filter((t) => t.status !== "menunggu_kurikulum").slice(0, 40);

  return (
    <>
      <JudulHalaman
        judul="Persetujuan Tukar Jam"
        deskripsi="Pengajuan yang sudah diterima guru tujuan. Saat disetujui, sistem memeriksa ulang bentrok lalu mengubah jadwal hari itu dan memberi tahu guru & siswa."
        aksi={<TombolLink href="/admin/jadwal/riwayat" sekunder>Riwayat jadwal</TombolLink>}
      />
      <Notifikasi kode={sp.pesan} />
      {sp.galat && <p role="alert" className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">{sp.galat}</p>}
      <Kartu className="mb-6">
        <h2 className="mb-3 text-2xl">Menunggu keputusan ({menunggu.length})</h2>
        {menunggu.length === 0 ? <p className="text-sm text-black/50">Tidak ada pengajuan yang menunggu.</p> : (
          <ul className="space-y-4">
            {menunggu.map((t) => (
              <li key={t.id} className="rounded-xl bg-soft p-4 text-sm">
                <p className="font-semibold">{t.pemohon} ⇄ {t.mitra} {t.slotMitra ? "(tukar jam)" : "(digantikan)"}</p>
                <p><span className="text-black/50">{t.mitra} mengisi:</span> {t.slotPemohon}</p>
                {t.slotMitra && <p><span className="text-black/50">{t.pemohon} mengisi:</span> {t.slotMitra}</p>}
                <p className="text-black/60">Alasan: {t.alasan}{t.catatan_mitra && ` · ${t.mitra}: ${t.catatan_mitra}`}</p>
                <form action={putuskanTukar} className="mt-3 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={t.id} />
                  <input name="catatan" maxLength={300} placeholder="Catatan (wajib bila ditolak)" aria-label="Catatan" className="min-w-48 flex-1 rounded-xl border border-black/15 bg-white px-3 py-2" />
                  <button name="keputusan" value="setuju" className="rounded-full bg-ink px-4 py-2 font-semibold text-white">Setujui</button>
                  <button name="keputusan" value="tolak" className="rounded-full px-4 py-2 font-semibold text-blue-teks ring-1 ring-blue/30">Tolak</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Kartu>
      <Kartu>
        <h2 className="mb-3 text-2xl">Riwayat pengajuan</h2>
        {lain.length === 0 ? <p className="text-sm text-black/50">Belum ada.</p> : (
          <ul className="divide-y divide-black/5 text-sm">
            {lain.map((t) => (
              <li key={t.id} className="flex flex-wrap items-start gap-3 py-2.5">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${STATUS_TUKAR[t.status]?.warna}`}>{STATUS_TUKAR[t.status]?.label}</span>
                <span className="flex-1">
                  <span className="block font-medium">{t.pemohon} ⇄ {t.mitra}</span>
                  <span className="block text-black/60">{t.slotPemohon}{t.slotMitra && ` / ${t.slotMitra}`}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Kartu>
    </>
  );
}
