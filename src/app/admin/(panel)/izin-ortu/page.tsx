import { redirect } from "next/navigation";
import { JudulHalaman, KosongAdmin, Lencana, Notifikasi } from "@/components/admin/ui";
import { berperan, punya, wajibLogin } from "@/lib/admin/auth";
import { formatTanggal } from "@/lib/format";
import { prosesIzin } from "../../actions-portal";

export const metadata = { title: "Izin dari Orang Tua" };

type Z = {
  id: string; jenis: "S" | "I"; tanggal_mulai: string; tanggal_selesai: string; alasan: string; status: string;
  diajukan_pada: string; diproses_pada: string | null; catatan: string;
  siswa_id: string; bukti_path: string; siswa: { nama: string; nisn: string | null } | null;
};
const WARNA: Record<string, "hijau" | "abu" | "kuning"> = { menunggu: "kuning", diterima: "hijau" };

export default async function IzinOrtu({ searchParams }: { searchParams: Promise<{ pesan?: string; lihat?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  if (!punya(akses, "absensi.kelola") && !berperan(akses, "wali_kelas")) redirect("/admin?pesan=tanpa-akses");
  const riwayat = sp.lihat === "riwayat";
  let q = supabase
    .from("izin_ortu")
    .select("id, jenis, tanggal_mulai, tanggal_selesai, alasan, status, diajukan_pada, diproses_pada, catatan, siswa_id, bukti_path, siswa:siswa_id(nama, nisn)")
    .order("diajukan_pada", { ascending: riwayat ? false : true })
    .limit(200);
  q = riwayat ? q.neq("status", "menunggu") : q.eq("status", "menunggu");
  const { data } = await q;
  const list = (data ?? []) as unknown as Z[];
  const ids = [...new Set(list.map((z) => z.siswa_id))];
  const { data: kls } = ids.length ? await supabase.from("siswa_kelas_aktif").select("id, kelas").in("id", ids) : { data: [] };
  const kelasDari = new Map((kls ?? []).map((k) => [k.id as string, k.kelas as string | null]));

  return (
    <>
      <JudulHalaman
        judul="Izin dari Orang Tua"
        deskripsi="Pemberitahuan sakit/izin yang dikirim orang tua lewat portal. Bila diterima, absensi siswa terisi otomatis (tidak menimpa catatan terlambat)."
      />
      <Notifikasi kode={sp.pesan} />
      <nav className="mb-5 flex gap-2 text-sm">
        <a href="/admin/izin-ortu" className={`rounded-full px-4 py-2 ${!riwayat ? "bg-ink text-white" : "ring-1 ring-black/10"}`}>Menunggu</a>
        <a href="/admin/izin-ortu?lihat=riwayat" className={`rounded-full px-4 py-2 ${riwayat ? "bg-ink text-white" : "ring-1 ring-black/10"}`}>Riwayat</a>
      </nav>
      {list.length === 0 ? (
        <KosongAdmin teks={riwayat ? "Belum ada riwayat." : "Tidak ada pemberitahuan yang menunggu."} />
      ) : (
        <ul className="space-y-3">
          {list.map((z) => (
            <li key={z.id} className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {z.siswa?.nama ?? "—"}
                    {kelasDari.get(z.siswa_id) && <span className="font-normal text-black/50"> · {kelasDari.get(z.siswa_id)}</span>}{" "}
                    <span className={`ml-1 rounded px-1.5 py-0.5 text-xs font-bold text-white ${z.jenis === "S" ? "bg-sky-600" : "bg-indigo-600"}`}>
                      {z.jenis === "S" ? "Sakit" : "Izin"}
                    </span>
                  </p>
                  <p className="mt-1 text-sm">
                    {formatTanggal(z.tanggal_mulai, { weekday: "short" })}
                    {z.tanggal_selesai !== z.tanggal_mulai && <> – {formatTanggal(z.tanggal_selesai, { weekday: "short" })}</>}
                  </p>
                  <p className="mt-2 text-sm text-black/70">“{z.alasan}”</p>
                  {z.bukti_path && (
                    <a href={`/berkas/izin-ortu/${z.id}`} target="_blank" rel="noopener" className="mt-1 inline-block text-sm font-semibold text-blue-teks underline">Lihat surat/bukti ↗</a>
                  )}
                  <p className="mt-1 text-xs text-black/40">
                    Dikirim {new Date(z.diajukan_pada).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
                  </p>
                  {z.catatan && <p className="mt-1 text-xs text-black/60">Catatan: {z.catatan}</p>}
                </div>
                {z.status === "menunggu" ? (
                  <form action={prosesIzin} className="flex w-full flex-col gap-2 sm:w-64">
                    <input type="hidden" name="id" value={z.id} />
                    <input name="catatan" placeholder="Catatan untuk orang tua (opsional)" maxLength={300} aria-label="Catatan" className="rounded-xl border border-black/15 px-3 py-2 text-sm" />
                    <div className="flex gap-2">
                      <button name="keputusan" value="terima" className="flex-1 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Terima</button>
                      <button name="keputusan" value="tolak" className="flex-1 rounded-full px-4 py-2 text-sm font-semibold text-blue-teks ring-1 ring-red-200 hover:bg-red-50">Tolak</button>
                    </div>
                  </form>
                ) : (
                  <Lencana warna={WARNA[z.status] ?? "abu"}>{z.status}</Lencana>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
