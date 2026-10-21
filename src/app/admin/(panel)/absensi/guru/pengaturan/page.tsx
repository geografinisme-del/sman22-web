import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { aturKelompokPegawai } from "../../../../actions-pegawai";
import { FormKelompok, FormLokasi, TombolHapusSwafoto, type Kelompok } from "./Form";

export const metadata = { title: "Jam Kerja & Presensi Pegawai" };

export default async function PengaturanPresensiPegawai({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const { pesan } = await searchParams;
  const { supabase } = await wajibIzin("absensi_pegawai.kelola");
  const [{ data: kelompok }, { data: pegawai }, { data: atur }] = await Promise.all([
    supabase.from("kelompok_kerja").select("*").is("deleted_at", null).order("nama"),
    supabase.from("pegawai").select("id, nama, jenis, kelompok_kerja_id").is("deleted_at", null).eq("status", "aktif").order("nama"),
    supabase.from("pengaturan_absensi").select("lokasi_lat, lokasi_lng, lokasi_radius, retensi_swafoto_hari").eq("id", 1).single(),
  ]);
  const nama = new Map((kelompok ?? []).map((k) => [k.id, k.nama]));

  return (
    <>
      <JudulHalaman judul="Jam Kerja & Presensi Pegawai" deskripsi="Atur jam masuk/pulang per kelompok (guru, tendik, satpam, dll.), serta kebijakan lokasi dan swafoto." />
      <Notifikasi kode={pesan} />
      <div className="space-y-8">
        <Kartu>
          <h2 className="text-3xl">Kelompok jam kerja</h2>
          <div className="mt-5 space-y-6">
            {(kelompok ?? []).map((k) => (
              <details key={k.id} className="rounded-2xl bg-soft p-4">
                <summary className="cursor-pointer font-semibold">
                  {k.nama} · {k.jam_masuk.slice(0, 5)}{k.toleransi_menit ? ` (+${k.toleransi_menit}′)` : ""}–{k.jam_pulang.slice(0, 5)}
                  {k.wajib_lokasi && " · 📍 lokasi"}{k.wajib_swafoto && " · 📷 swafoto"}
                  <span className="ml-2 text-sm font-normal text-black/50">{(pegawai ?? []).filter((p) => p.kelompok_kerja_id === k.id).length} orang</span>
                </summary>
                <div className="mt-4"><FormKelompok k={k as Kelompok} /></div>
              </details>
            ))}
            <details className="rounded-2xl p-4 ring-1 ring-black/10">
              <summary className="cursor-pointer font-semibold text-blue-teks">+ Tambah kelompok</summary>
              <div className="mt-4"><FormKelompok k={{ nama: "", jam_masuk: "07:00", toleransi_menit: 0, jam_pulang: "15:00", hari_kerja: [1, 2, 3, 4, 5], wajib_lokasi: false, wajib_swafoto: false }} /></div>
            </details>
          </div>
        </Kartu>

        <Kartu>
          <h2 id="pegawai" className="text-3xl">Anggota kelompok</h2>
          <p className="mt-1 text-sm text-black/60">Centang pegawai, pilih kelompok, lalu simpan. Pegawai tanpa kelompok memakai jam di Pengaturan Absensi.</p>
          <form action={aturKelompokPegawai} className="mt-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <select name="kelompok_kerja_id" aria-label="Kelompok tujuan" className="rounded-xl border border-black/15 bg-white px-3 py-2">
                <option value="">(tanpa kelompok)</option>
                {(kelompok ?? []).map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
              <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Pindahkan yang dicentang</button>
            </div>
            <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {(pegawai ?? []).map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-black/5">
                    <input type="checkbox" name="pegawai" value={p.id} className="h-4 w-4 accent-ink" />
                    <span className="flex-1">{p.nama}</span>
                    <span className="text-xs text-black/40">{nama.get(p.kelompok_kerja_id ?? "") ?? "—"}</span>
                  </label>
                </li>
              ))}
            </ul>
          </form>
        </Kartu>

        <Kartu>
          <h2 className="text-3xl">Lokasi sekolah & swafoto</h2>
          <p className="mt-1 text-sm text-black/60">Dipakai hanya untuk kelompok yang mewajibkan lokasi/swafoto. Yang disimpan hanya <strong>jarak</strong> ke sekolah, bukan koordinat pegawai.</p>
          <div className="mt-4"><FormLokasi lat={atur?.lokasi_lat ?? null} lng={atur?.lokasi_lng ?? null} radius={atur?.lokasi_radius ?? 150} retensi={atur?.retensi_swafoto_hari ?? 30} /></div>
          <div className="mt-6 border-t border-black/10 pt-4"><TombolHapusSwafoto /></div>
        </Kartu>
      </div>
    </>
  );
}
