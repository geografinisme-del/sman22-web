import { redirect } from "next/navigation";
import { JudulHalaman, KosongAdmin, Lencana, Notifikasi } from "@/components/admin/ui";
import { berperan, punya, wajibLogin } from "@/lib/admin/auth";
import { STATUS_SISWA_ABSEN, type KodeAbsen } from "@/lib/admin/absensi";
import { formatTanggal } from "@/lib/format";
import { putuskanPengajuan } from "../../../actions-absensi";

export const metadata = { title: "Pengajuan Koreksi" };

type P = {
  id: string; tanggal: string; status_lama: KodeAbsen | "H"; status_baru: KodeAbsen | "H"; alasan: string; status: string;
  diajukan_oleh: string; diajukan_pada: string; diputus_pada: string | null; catatan: string; bukti_path: string;
  siswa: { nama: string } | null;
};
const label = (k: string) => (k === "H" ? "Hadir" : STATUS_SISWA_ABSEN[k as KodeAbsen]?.label ?? k);

export default async function Pengajuan({ searchParams }: { searchParams: Promise<{ pesan?: string; lihat?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const memutuskan = punya(akses, "absensi.kelola");
  if (!memutuskan && !berperan(akses, "wali_kelas")) redirect("/admin?pesan=tanpa-akses");
  const riwayat = sp.lihat === "riwayat";
  let q = supabase
    .from("pengajuan_koreksi")
    .select("id, tanggal, status_lama, status_baru, alasan, status, diajukan_oleh, diajukan_pada, diputus_pada, catatan, bukti_path, siswa:siswa_id(nama)")
    .order("diajukan_pada", { ascending: false })
    .limit(200);
  q = riwayat ? q.neq("status", "menunggu") : q.eq("status", "menunggu");
  const { data } = await q;
  const list = (data ?? []) as unknown as P[];
  const ids = [...new Set(list.map((p) => p.diajukan_oleh))];
  const { data: orang } = ids.length ? await supabase.from("pengguna").select("user_id, nama").in("user_id", ids) : { data: [] };
  const nama = new Map((orang ?? []).map((o) => [o.user_id, o.nama]));

  return (
    <>
      <JudulHalaman
        judul="Pengajuan Koreksi"
        deskripsi={memutuskan ? "Tinjau koreksi absensi dari wali kelas untuk tanggal yang sudah lewat minggu berjalan." : "Pengajuan koreksi yang Anda kirim."}
      />
      <Notifikasi kode={sp.pesan} />
      <nav className="mb-5 flex gap-2 text-sm">
        <a href="/admin/absensi/pengajuan" className={`rounded-full px-4 py-2 ${!riwayat ? "bg-brand-900 text-white" : "ring-1 ring-black/10"}`}>Menunggu</a>
        <a href="/admin/absensi/pengajuan?lihat=riwayat" className={`rounded-full px-4 py-2 ${riwayat ? "bg-brand-900 text-white" : "ring-1 ring-black/10"}`}>Riwayat (arsip)</a>
      </nav>
      {list.length === 0 ? (
        <KosongAdmin teks={riwayat ? "Belum ada riwayat pengajuan." : "Tidak ada pengajuan yang menunggu."} />
      ) : (
        <ul className="space-y-3">
          {list.map((p) => (
            <li key={p.id} className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.siswa?.nama ?? "—"} · {formatTanggal(p.tanggal, { weekday: "short" })}</p>
                  <p className="mt-1 text-sm">
                    <span className="text-black/50 line-through">{label(p.status_lama)}</span> → <strong>{label(p.status_baru)}</strong>
                  </p>
                  <p className="mt-2 text-sm text-black/70">“{p.alasan}”</p>
                  {p.bukti_path && (
                    <a href={`/berkas/koreksi/${p.id}`} target="_blank" rel="noopener" className="mt-1 inline-block text-sm font-semibold text-brand-700 underline">
                      Lihat bukti ↗
                    </a>
                  )}
                  <p className="mt-1 text-xs text-black/40">
                    Diajukan {nama.get(p.diajukan_oleh) ?? "wali kelas"} · {new Date(p.diajukan_pada).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
                  </p>
                  {p.status !== "menunggu" && p.catatan && <p className="mt-1 text-xs text-black/60">Catatan: {p.catatan}</p>}
                </div>
                {p.status === "menunggu" ? (
                  memutuskan && p.diajukan_oleh !== akses?.userId ? (
                    <form action={putuskanPengajuan} className="flex flex-col gap-2 sm:w-64">
                      <input type="hidden" name="id" value={p.id} />
                      <input name="catatan" placeholder="Catatan (opsional)" maxLength={300} aria-label="Catatan keputusan" className="rounded-xl border border-black/15 px-3 py-2 text-sm" />
                      <div className="flex gap-2">
                        <button name="keputusan" value="setuju" className="flex-1 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Setujui</button>
                        <button name="keputusan" value="tolak" className="flex-1 rounded-full px-4 py-2 text-sm font-semibold text-merah ring-1 ring-red-200 hover:bg-red-50">Tolak</button>
                      </div>
                    </form>
                  ) : (
                    <Lencana warna="kuning">Menunggu</Lencana>
                  )
                ) : (
                  <Lencana warna={p.status === "disetujui" ? "hijau" : "abu"}>{p.status}</Lencana>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
