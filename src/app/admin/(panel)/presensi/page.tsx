import { JudulHalaman, Kartu, KosongAdmin, Lencana, Notifikasi, kelasTabel, kelasTd, kelasTh } from "@/components/admin/ui";
import { wajibLogin } from "@/lib/admin/auth";
import { STATUS_PEGAWAI_ABSEN, awalBulan, hariIniWIB } from "@/lib/admin/absensi";
import { formatTanggal } from "@/lib/format";
import { batalkanIzinPegawai } from "../../actions-pegawai";
import { FormIzinPegawai, TombolPresensi } from "./Presensi";

export const metadata = { title: "Presensi Saya" };

export default async function PresensiSaya({ searchParams }: { searchParams: Promise<{ pesan?: string; galat?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await wajibLogin();
  const { data: pid } = await supabase.rpc("pegawai_saya");
  if (!pid) {
    return (
      <>
        <JudulHalaman judul="Presensi Saya" />
        <KosongAdmin teks="Akun Anda belum ditautkan ke data guru/pegawai. Minta super admin menautkannya di menu Pengguna & Peran." />
      </>
    );
  }
  const hari = hariIniWIB();
  const [{ data: hariIni }, { data: bulanIni }, { data: aturan }, { data: pengajuan }] = await Promise.all([
    supabase.from("absensi_pegawai").select("status, jam_masuk, jam_pulang, jarak_masuk").eq("pegawai_id", pid).eq("tanggal", hari).maybeSingle(),
    supabase.from("absensi_pegawai").select("tanggal, status, jam_masuk, jam_pulang, keterangan").eq("pegawai_id", pid).gte("tanggal", awalBulan(hari)).order("tanggal", { ascending: false }),
    supabase.rpc("aturan_presensi_saya"),
    supabase.from("pengajuan_izin_pegawai").select("id, jenis, tanggal_mulai, tanggal_selesai, alasan, status, catatan").eq("pegawai_id", pid).order("diajukan_pada", { ascending: false }).limit(10),
  ]);
  const atur = (aturan ?? {}) as { kelompok?: string; jam_masuk?: string; jam_pulang?: string; wajib_lokasi?: boolean; wajib_swafoto?: boolean; radius?: number; retensi?: number };
  const jam = (t?: string | null) => (t ? t.slice(0, 5) : "—");

  return (
    <>
      <JudulHalaman judul="Presensi Saya" deskripsi={`${formatTanggal(hari, { weekday: "long" })}${atur.kelompok ? ` · ${atur.kelompok}` : ""} · batas masuk ${atur.jam_masuk ?? "—"} · pulang mulai ${atur.jam_pulang ?? "—"} WIB`} />
      <Notifikasi kode={sp.pesan} />
      {(atur.wajib_lokasi || atur.wajib_swafoto) && (
        <p className="mb-6 rounded-xl bg-krem px-4 py-3 text-sm text-black/70 ring-1 ring-black/10">
          Sesuai kebijakan sekolah, presensi kelompok Anda memerlukan
          {atur.wajib_lokasi && <> <strong>lokasi</strong> (hanya diperiksa saat menekan tombol; harus dalam radius {atur.radius} m dari sekolah, yang disimpan hanya jaraknya)</>}
          {atur.wajib_lokasi && atur.wajib_swafoto && " dan"}
          {atur.wajib_swafoto && <> <strong>swafoto</strong> (hanya dapat dilihat Anda dan TU/kepala sekolah, dihapus otomatis setelah {atur.retensi} hari)</>}.
        </p>
      )}
      {sp.galat && <p role="alert" className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-200">{sp.galat}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Kartu className="text-center">
          <p className="text-sm uppercase tracking-widest text-black/50">Masuk</p>
          <p className="mt-2 font-serif text-6xl tabular-nums">{jam(hariIni?.jam_masuk)}</p>
          {hariIni?.status === "T" && <p className="mt-1 text-sm font-semibold text-amber-700">Terlambat</p>}
          {hariIni?.jarak_masuk != null && <p className="mt-1 text-xs text-black/50">±{hariIni.jarak_masuk} m dari sekolah</p>}
          {!hariIni?.jam_masuk && !["S", "I", "DL", "C"].includes(hariIni?.status ?? "") && (
            <TombolPresensi jenis="masuk" utama wajibLokasi={Boolean(atur.wajib_lokasi)} wajibSwafoto={Boolean(atur.wajib_swafoto)} />
          )}
          {["S", "I", "DL", "C"].includes(hariIni?.status ?? "") && <p className="mt-4 text-sm font-semibold">Hari ini: {STATUS_PEGAWAI_ABSEN[hariIni!.status as keyof typeof STATUS_PEGAWAI_ABSEN]}</p>}
        </Kartu>
        <Kartu className="text-center">
          <p className="text-sm uppercase tracking-widest text-black/50">Pulang</p>
          <p className="mt-2 font-serif text-6xl tabular-nums">{jam(hariIni?.jam_pulang)}</p>
          {hariIni?.jam_masuk && !hariIni?.jam_pulang && (
            <TombolPresensi jenis="pulang" wajibLokasi={Boolean(atur.wajib_lokasi)} wajibSwafoto={Boolean(atur.wajib_swafoto)} />
          )}
        </Kartu>
      </div>
      <p className="mt-3 text-xs text-black/50">Jam dicatat oleh server sekolah, bukan jam di HP.</p>

      <section id="izin" className="mt-10 grid gap-6 lg:grid-cols-2">
        <Kartu>
          <h2 className="mb-4 font-serif text-3xl">Ajukan izin / sakit / dinas / cuti</h2>
          <FormIzinPegawai hariIni={hari} />
        </Kartu>
        <div>
          <h2 className="mb-3 font-serif text-2xl">Pengajuan saya</h2>
          {!pengajuan?.length ? <p className="text-sm text-black/50">Belum ada pengajuan.</p> : (
            <ul className="space-y-2">
              {pengajuan.map((z) => (
                <li key={z.id} className="rounded-2xl bg-white p-4 text-sm ring-1 ring-black/5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{STATUS_PEGAWAI_ABSEN[z.jenis as keyof typeof STATUS_PEGAWAI_ABSEN]} · {formatTanggal(z.tanggal_mulai, { weekday: "short" })}{z.tanggal_selesai !== z.tanggal_mulai && ` – ${formatTanggal(z.tanggal_selesai, { weekday: "short" })}`}</strong>
                    <Lencana warna={z.status === "disetujui" ? "hijau" : z.status === "menunggu" ? "kuning" : "abu"}>{z.status}</Lencana>
                  </div>
                  <p className="mt-1 text-black/60">{z.alasan}</p>
                  {z.catatan && <p className="mt-1 text-xs text-black/50">Catatan: {z.catatan}</p>}
                  {z.status === "menunggu" && (
                    <form action={batalkanIzinPegawai} className="mt-2"><input type="hidden" name="id" value={z.id} /><button className="text-xs text-merah underline">Batalkan</button></form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <h2 className="mb-3 mt-10 font-serif text-3xl">Bulan ini</h2>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className={kelasTabel}>
          <thead><tr><th className={kelasTh}>Tanggal</th><th className={kelasTh}>Status</th><th className={kelasTh}>Masuk</th><th className={kelasTh}>Pulang</th><th className={kelasTh}>Keterangan</th></tr></thead>
          <tbody>
            {!bulanIni?.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-black/50">Belum ada catatan bulan ini.</td></tr>}
            {bulanIni?.map((r) => (
              <tr key={r.tanggal}>
                <td className={kelasTd}>{formatTanggal(r.tanggal, { weekday: "short", year: undefined })}</td>
                <td className={kelasTd}>{STATUS_PEGAWAI_ABSEN[r.status as keyof typeof STATUS_PEGAWAI_ABSEN]}</td>
                <td className={`${kelasTd} tabular-nums`}>{jam(r.jam_masuk)}</td>
                <td className={`${kelasTd} tabular-nums`}>{jam(r.jam_pulang)}</td>
                <td className={kelasTd}>{r.keterangan || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
