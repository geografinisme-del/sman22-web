import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormLapor } from "@/components/sarpras/Form";
import { NavSarpras } from "@/components/sarpras/Nav";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { KONDISI, Lencana, rupiah, STATUS_RUSAK, waktuWIB } from "@/lib/lms";
import { tanganiKerusakan } from "../../../actions-sarpras";
import { TabPills } from "@/components/admin/TabPills";

export const metadata = { title: "Laporan Kerusakan" };

type L = { id: string; pelapor_id: string; judul: string; deskripsi: string; prioritas: string; status: string; penanganan: string; biaya: number | null; foto_path: string; created_at: string; barang_id: string | null; ruang: { nama: string } | null; barang: { nama: string; kode: string } | null };

export default async function Kerusakan({ searchParams }: { searchParams: Promise<{ pesan?: string; objek?: string; lihat?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const kelola = punya(akses, "sarpras.kelola");
  const lihat = kelola || punya(akses, "sarpras.lihat");
  let q = supabase.from("laporan_kerusakan").select("id, pelapor_id, judul, deskripsi, prioritas, status, penanganan, biaya, foto_path, created_at, barang_id, ruang(nama), barang(nama, kode)").order("created_at", { ascending: false }).limit(100);
  if (!lihat || sp.lihat === "saya") q = q.eq("pelapor_id", akses!.userId);
  else if (sp.lihat !== "semua") q = q.in("status", ["dilaporkan", "diproses"]);
  const [{ data }, { data: ruang }, { data: barang }] = await Promise.all([
    q,
    supabase.from("ruang").select("id, nama").is("deleted_at", null).order("nama"),
    supabase.from("barang").select("id, nama, kode").is("deleted_at", null).order("nama").limit(1000),
  ]);
  const list = (data ?? []) as unknown as L[];
  const pelapor = new Map(await Promise.all([...new Set(list.map((l) => l.pelapor_id))].map(async (u) => [u, ((await supabase.rpc("nama_pengguna", { p_user: u })).data as string | null) ?? "—"] as const)));

  return (
    <>
      <JudulHalaman judul="Laporan Kerusakan" deskripsi="Laporkan fasilitas yang rusak (dengan foto). Sarpras menindaklanjuti dan Anda diberi tahu perkembangannya." />
      <NavSarpras lihat={lihat} kelola={kelola} />
      <Notifikasi kode={sp.pesan} />
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <Kartu>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="flex-1 text-2xl">{!lihat || sp.lihat === "saya" ? "Laporan saya" : sp.lihat === "semua" ? "Semua laporan" : "Perlu ditangani"}</h2>
            {lihat && (
              <TabPills
                label="Saring laporan kerusakan"
                rapat
                item={[{ href: "?", label: "Aktif" }, { href: "?lihat=semua", label: "Semua" }, { href: "?lihat=saya", label: "Saya" }]}
                aktif={sp.lihat === "semua" ? "?lihat=semua" : sp.lihat === "saya" ? "?lihat=saya" : "?"}
              />
            )}
          </div>
          {list.length === 0 ? <p className="text-sm text-black/50">Tidak ada laporan.</p> : (
            <ul className="space-y-3">
              {list.map((l) => (
                <li key={l.id} className={`rounded-xl p-4 text-sm ring-1 ${l.prioritas === "tinggi" && l.status !== "selesai" ? "bg-red-50/50 ring-red-200" : "bg-soft ring-black/5"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Lencana s={l.status} peta={STATUS_RUSAK} />
                    {l.prioritas === "tinggi" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">mendesak</span>}
                    <span className="flex-1 font-semibold">{l.judul}</span>
                    <span className="text-xs text-black/50">{waktuWIB(l.created_at)}</span>
                  </div>
                  <p className="mt-1 text-black/60">{[l.ruang?.nama, l.barang && `${l.barang.nama} (${l.barang.kode})`, `pelapor ${pelapor.get(l.pelapor_id)}`].filter(Boolean).join(" · ")}</p>
                  {l.deskripsi && <p className="mt-1">{l.deskripsi}</p>}
                  {l.foto_path && <a href={`/berkas/kerusakan/${l.id}`} target="_blank" rel="noopener" className="mt-1 inline-block text-xs font-semibold text-blue-teks underline">Lihat foto</a>}
                  {l.penanganan && <p className="mt-2 rounded-lg bg-white p-2">Penanganan: {l.penanganan}{l.biaya != null && ` · ${rupiah(l.biaya)}`}</p>}
                  {kelola && l.status !== "selesai" && l.status !== "ditolak" && (
                    <form action={tanganiKerusakan} className="mt-3 grid gap-2 sm:grid-cols-[1fr_130px]">
                      <input type="hidden" name="id" value={l.id} />
                      <input name="penanganan" defaultValue={l.penanganan} maxLength={2000} placeholder="Tindakan / catatan" aria-label="Penanganan" className="rounded-lg border border-black/15 bg-white px-3 py-2" />
                      <input name="biaya" inputMode="numeric" defaultValue={l.biaya ?? ""} placeholder="Biaya (Rp)" aria-label="Biaya" className="rounded-lg border border-black/15 bg-white px-3 py-2" />
                      {l.barang_id && (
                        <select name="kondisi_barang" defaultValue="" aria-label="Kondisi barang setelah ditangani" className="rounded-lg border border-black/15 bg-white px-3 py-2">
                          <option value="">Kondisi barang: tidak diubah</option>{Object.entries(KONDISI).map(([k, v]) => <option key={k} value={k}>Kondisi → {v.label}</option>)}
                        </select>
                      )}
                      <div className="flex flex-wrap gap-2 sm:col-span-2">
                        {l.status === "dilaporkan" && <button name="status" value="diproses" className="rounded-full bg-sky-700 px-4 py-2 text-xs font-semibold text-white">Proses</button>}
                        <button name="status" value="selesai" className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white">Selesai</button>
                        <button name="status" value="ditolak" className="rounded-full px-4 py-2 text-xs font-semibold ring-1 ring-black/15">Tolak / bukan kerusakan</button>
                      </div>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Kartu>
        <Kartu className="self-start">
          <h2 id="form" className="mb-4 text-2xl">Laporkan kerusakan</h2>
          <FormLapor ruang={(ruang ?? []) as { id: string; nama: string }[]} barang={((barang ?? []) as { id: string; nama: string; kode: string }[]).map((b) => ({ id: b.id, nama: `${b.nama} — ${b.kode}` }))} awal={sp.objek} />
        </Kartu>
      </div>
    </>
  );
}
