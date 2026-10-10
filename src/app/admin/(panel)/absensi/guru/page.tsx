import { JudulHalaman, Kartu, Lencana, kelasTabel, kelasTd, kelasTh } from "@/components/admin/ui";
import { punya, wajibIzin } from "@/lib/admin/auth";
import { STATUS_PEGAWAI_ABSEN, hariIniWIB, tanggalValid } from "@/lib/admin/absensi";
import { formatTanggal } from "@/lib/format";
import { FormAbsenPegawai } from "./FormAbsenPegawai";

export const metadata = { title: "Kehadiran Guru" };

export default async function KehadiranGuru({ searchParams }: { searchParams: Promise<{ tanggal?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibIzin("absensi_pegawai.lihat");
  const hariIni = hariIniWIB();
  const tgl = tanggalValid(sp.tanggal) ? sp.tanggal : hariIni;
  const [{ data: pegawai }, { data: absen }] = await Promise.all([
    supabase.from("pegawai").select("id, nama, jenis").eq("status", "aktif").is("deleted_at", null).order("nama").range(0, 999),
    supabase.from("absensi_pegawai").select("id, pegawai_id, status, jam_masuk, jam_pulang, keterangan, jarak_masuk, foto_masuk, foto_pulang").eq("tanggal", tgl).range(0, 999),
  ]);
  const peta = new Map((absen ?? []).map((a) => [a.pegawai_id, a]));
  const belum = (pegawai ?? []).filter((p) => !peta.has(p.id)).length;
  const jam = (t?: string | null) => (t ? t.slice(0, 5) : "—");

  return (
    <>
      <JudulHalaman
        judul="Kehadiran Guru & Pegawai"
        deskripsi={`${formatTanggal(tgl, { weekday: "long" })} · ${peta.size} tercatat · ${belum} belum presensi`}
        aksi={
          <form className="flex items-center gap-2">
            <input type="date" name="tanggal" defaultValue={tgl} max={hariIni} aria-label="Tanggal" className="rounded-full border border-black/15 bg-white px-4 py-2" />
            <button className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium">Tampilkan</button>
          </form>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
          <table className={kelasTabel}>
            <thead><tr><th className={kelasTh}>Nama</th><th className={kelasTh}>Status</th><th className={kelasTh}>Masuk</th><th className={kelasTh}>Pulang</th><th className={kelasTh}>Keterangan</th></tr></thead>
            <tbody>
              {pegawai?.map((p) => {
                const a = peta.get(p.id);
                return (
                  <tr key={p.id}>
                    <td className={kelasTd}>{p.nama}</td>
                    <td className={kelasTd}>
                      {a ? <Lencana warna={a.status === "H" ? "hijau" : a.status === "T" ? "kuning" : "abu"}>{STATUS_PEGAWAI_ABSEN[a.status as keyof typeof STATUS_PEGAWAI_ABSEN]}</Lencana> : <span className="text-black/40">Belum</span>}
                    </td>
                    <td className={`${kelasTd} tabular-nums`}>
                      {jam(a?.jam_masuk)}
                      {a?.jarak_masuk != null && <span className="block text-xs text-black/40">±{a.jarak_masuk} m</span>}
                      {a?.foto_masuk && <a href={`/berkas/swafoto-masuk/${a.id}`} target="_blank" rel="noopener" className="block text-xs text-brand-700 underline">swafoto</a>}
                    </td>
                    <td className={`${kelasTd} tabular-nums`}>
                      {jam(a?.jam_pulang)}
                      {a?.foto_pulang && <a href={`/berkas/swafoto-pulang/${a.id}`} target="_blank" rel="noopener" className="block text-xs text-brand-700 underline">swafoto</a>}
                    </td>
                    <td className={kelasTd}>{a?.keterangan || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {punya(akses, "absensi_pegawai.kelola") && (
          <Kartu>
            <h2 className="mb-4 font-serif text-2xl">Catat izin / sakit / dinas</h2>
            <FormAbsenPegawai pegawai={pegawai ?? []} tanggal={tgl} />
          </Kartu>
        )}
      </div>
    </>
  );
}
