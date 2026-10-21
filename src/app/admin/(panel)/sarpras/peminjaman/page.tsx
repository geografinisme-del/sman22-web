import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormPinjam } from "@/components/sarpras/Form";
import { NavSarpras } from "@/components/sarpras/Nav";
import { geserTanggal, hariIniWIB } from "@/lib/admin/absensi";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { Lencana, STATUS_PINJAM, waktuWIB } from "@/lib/lms";
import { prosesPinjam } from "../../../actions-sarpras";

export const metadata = { title: "Peminjaman Ruang & Barang" };

type P = { id: string; peminjam_id: string; mulai: string; selesai: string; status: string; keperluan: string; jumlah: number; catatan: string; ruang: { nama: string } | null; barang: { nama: string } | null };
const KOLOM = "id, peminjam_id, mulai, selesai, status, keperluan, jumlah, catatan, ruang(nama), barang(nama)";

export default async function Peminjaman({ searchParams }: { searchParams: Promise<{ pesan?: string; galat?: string; objek?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const kelola = punya(akses, "sarpras.kelola");
  const lihat = kelola || punya(akses, "sarpras.lihat");
  const hari = hariIniWIB();
  const awal = new Date(`${hari}T00:00:00+07:00`).toISOString();
  const [{ data: ruang }, { data: barang }, { data: milik }, { data: jadwal }, { data: menunggu }] = await Promise.all([
    supabase.from("ruang").select("id, nama").eq("bisa_dipinjam", true).is("deleted_at", null).order("nama"),
    supabase.from("barang").select("id, nama, jumlah").eq("bisa_dipinjam", true).is("deleted_at", null).in("kondisi", ["baik", "rusak_ringan"]).order("nama"),
    supabase.from("peminjaman").select(KOLOM).eq("peminjam_id", akses!.userId).order("mulai", { ascending: false }).limit(20),
    supabase.from("peminjaman").select(KOLOM).in("status", ["disetujui", "dipinjam"]).gte("selesai", awal).lte("mulai", new Date(`${geserTanggal(hari, 14)}T23:59:59+07:00`).toISOString()).order("mulai"),
    kelola ? supabase.from("peminjaman").select(KOLOM).eq("status", "diajukan").order("mulai") : Promise.resolve({ data: [] }),
  ]);
  const nama = (p: P) => p.ruang?.nama ?? `${p.barang?.nama} ×${p.jumlah}`;
  const ids = kelola ? [...new Set([...(menunggu ?? []), ...(jadwal ?? [])].map((p) => p.peminjam_id as string))] : [];
  const peminjam = new Map(await Promise.all(ids.map(async (u) => [u, ((await supabase.rpc("nama_pengguna", { p_user: u })).data as string | null) ?? "—"] as const)));

  return (
    <>
      <JudulHalaman judul="Peminjaman Ruang & Barang" deskripsi="Ajukan pinjam lab, aula, proyektor, dll. Sistem menolak bila bentrok dengan peminjaman lain atau jadwal pelajaran di ruang itu." />
      <NavSarpras lihat={lihat} kelola={kelola} />
      <Notifikasi kode={sp.pesan} />
      {sp.galat && <p role="alert" className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">{sp.galat}</p>}
      {kelola && (
        <Kartu className="mb-6 ring-2 ring-lime">
          <h2 className="mb-3 text-2xl">Menunggu persetujuan ({(menunggu ?? []).length})</h2>
          {(menunggu ?? []).length === 0 ? <p className="text-sm text-black/50">Tidak ada.</p> : (
            <ul className="space-y-3">
              {((menunggu ?? []) as unknown as P[]).map((p) => (
                <li key={p.id} className="rounded-xl bg-soft p-3 text-sm">
                  <p className="font-semibold">{nama(p)} · {waktuWIB(p.mulai)}–{waktuWIB(p.selesai).split(" ").pop()}</p>
                  <p className="text-black/60">{peminjam.get(p.peminjam_id) ?? "—"}: {p.keperluan}</p>
                  <form action={prosesPinjam} className="mt-2 flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input name="catatan" maxLength={300} placeholder="Catatan (wajib bila ditolak)" aria-label="Catatan" className="min-w-48 flex-1 rounded-xl border border-black/15 bg-white px-3 py-2" />
                    <button name="aksi" value="setuju" className="rounded-full bg-emerald-700 px-4 py-2 font-semibold text-white">Setujui</button>
                    <button name="aksi" value="tolak" className="rounded-full px-4 py-2 font-semibold text-blue-teks ring-1 ring-blue/30">Tolak</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Kartu>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Kartu>
            <h2 className="mb-3 text-2xl">Jadwal pemakaian 2 minggu</h2>
            {(jadwal ?? []).length === 0 ? <p className="text-sm text-black/50">Belum ada peminjaman disetujui.</p> : (
              <ul className="divide-y divide-black/5 text-sm">
                {((jadwal ?? []) as unknown as P[]).map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2 py-2">
                    <span className="w-44 text-black/60">{waktuWIB(p.mulai)}–{waktuWIB(p.selesai).split(" ").pop()}</span>
                    <span className="flex-1 font-medium">{nama(p)}{kelola && <span className="font-normal text-black/50"> · {peminjam.get(p.peminjam_id)}</span>}</span>
                    <Lencana s={p.status} peta={STATUS_PINJAM} />
                    {kelola && (
                      <form action={prosesPinjam} className="flex gap-1">
                        <input type="hidden" name="id" value={p.id} />
                        {p.status === "disetujui" && p.barang && <button name="aksi" value="serahkan" className="rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-black/15">Serahkan</button>}
                        <input name="catatan" placeholder="Kondisi kembali" aria-label="Kondisi saat kembali" className="w-32 rounded-lg border border-black/15 px-2 py-1 text-xs" />
                        <button name="aksi" value="kembali" className="rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-black/15">Dikembalikan</button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Kartu>
          <Kartu>
            <h2 className="mb-3 text-2xl">Pengajuan saya</h2>
            {(milik ?? []).length === 0 ? <p className="text-sm text-black/50">Belum ada.</p> : (
              <ul className="divide-y divide-black/5 text-sm">
                {((milik ?? []) as unknown as P[]).map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2 py-2">
                    <Lencana s={p.status} peta={STATUS_PINJAM} />
                    <span className="flex-1">{nama(p)} · {waktuWIB(p.mulai)}{p.catatan && <span className="block text-black/60">{p.catatan}</span>}</span>
                    {["diajukan", "disetujui"].includes(p.status) && (
                      <form action={prosesPinjam}><input type="hidden" name="id" value={p.id} /><button name="aksi" value="batal" className="text-xs font-semibold text-blue-teks underline">Batalkan</button></form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Kartu>
        </div>
        <Kartu className="self-start">
          <h2 id="form" className="mb-4 text-2xl">Ajukan peminjaman</h2>
          {(ruang ?? []).length + (barang ?? []).length === 0 ? <p className="text-sm text-black/50">Belum ada ruang/barang yang ditandai bisa dipinjam.</p> : (
            <FormPinjam ruang={(ruang ?? []) as { id: string; nama: string }[]} barang={(barang ?? []) as { id: string; nama: string; jumlah: number }[]} hariIni={hari} awal={sp.objek} />
          )}
        </Kartu>
      </div>
    </>
  );
}
