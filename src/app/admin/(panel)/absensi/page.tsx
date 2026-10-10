import Link from "next/link";
import { redirect } from "next/navigation";
import { JudulHalaman, Kartu, Lencana, kelasTabel, kelasTd, kelasTh } from "@/components/admin/ui";
import { berperan, punya, wajibLogin } from "@/lib/admin/auth";
import { hariIniWIB, jamSekarangWIB, tanggalValid } from "@/lib/admin/absensi";
import { kelasWaliSaya } from "@/lib/admin/kelas-wali";
import { formatTanggal } from "@/lib/format";
import { FormTerlambat } from "./FormTerlambat";

export const metadata = { title: "Absensi Siswa" };

export default async function AbsensiHariIni({ searchParams }: { searchParams: Promise<{ tanggal?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const lihatSemua = punya(akses, "absensi.lihat");
  if (!lihatSemua) {
    if (!berperan(akses, "wali_kelas")) redirect("/admin?pesan=tanpa-akses");
    const kelas = await kelasWaliSaya(supabase);
    if (kelas.length === 1) redirect(`/admin/absensi/kelas/${kelas[0].id}`);
    redirect("/admin/kelas-saya");
  }
  const hariIni = hariIniWIB();
  const tgl = tanggalValid(sp.tanggal) && sp.tanggal <= hariIni ? sp.tanggal : hariIni;

  const { data: ta } = await supabase.from("tahun_ajaran").select("id, nama").eq("aktif", true).maybeSingle();
  if (!ta) {
    return (
      <>
        <JudulHalaman judul="Absensi Siswa" />
        <p className="rounded-xl bg-amber-50 p-5 text-amber-900 ring-1 ring-amber-200">Belum ada tahun ajaran aktif.</p>
      </>
    );
  }
  const [{ data: kelas }, { data: dicek }, { data: catatan }, { data: libur }, { data: atur }] = await Promise.all([
    supabase.from("kelas_ringkasan").select("id, nama, tingkat, wali_kelas, jumlah_siswa").eq("tahun_ajaran_id", ta.id).is("deleted_at", null),
    supabase.from("absensi_kelas_harian").select("kelas_id, dicek_pada").eq("tanggal", tgl),
    supabase.from("absensi_siswa").select("siswa_id, status").eq("tanggal", tgl).range(0, 4999),
    supabase.from("hari_libur").select("keterangan").eq("tanggal", tgl).maybeSingle(),
    supabase.from("pengaturan_absensi").select("hari_sekolah").eq("id", 1).single(),
  ]);
  const { data: anggota } = await supabase.from("anggota_kelas").select("siswa_id, kelas_id").eq("tahun_ajaran_id", ta.id).range(0, 4999);
  const kelasDari = new Map((anggota ?? []).map((a) => [a.siswa_id, a.kelas_id]));
  const hitung = new Map<string, Record<string, number>>();
  for (const c of catatan ?? []) {
    const k = kelasDari.get(c.siswa_id);
    if (!k) continue;
    const h = hitung.get(k) ?? {};
    h[c.status] = (h[c.status] ?? 0) + 1;
    hitung.set(k, h);
  }
  const sudah = new Set((dicek ?? []).map((d) => d.kelas_id));
  const urut = { X: 1, XI: 2, XII: 3 } as Record<string, number>;
  const list = [...(kelas ?? [])].sort((a, b) => urut[a.tingkat] - urut[b.tingkat] || a.nama.localeCompare(b.nama, "id", { numeric: true }));
  const total = (catatan ?? []).reduce((acc, c) => ({ ...acc, [c.status]: (acc[c.status] ?? 0) + 1 }), {} as Record<string, number>);
  const isoDow = ((new Date(tgl + "T00:00:00Z").getUTCDay() + 6) % 7) + 1;
  const bukanHariSekolah = libur || !(atur?.hari_sekolah ?? [1, 2, 3, 4, 5]).includes(isoDow);

  let daftarSiswa: { id: string; nama: string; nisn: string | null; kelas: string | null }[] = [];
  if (punya(akses, "absensi.kelola") && tgl === hariIni) {
    const { data } = await supabase.from("siswa_kelas_aktif").select("id, nama, nisn, kelas").eq("status", "aktif").is("deleted_at", null).order("nama").range(0, 4999);
    daftarSiswa = data ?? [];
  }

  return (
    <>
      <JudulHalaman
        judul="Absensi Siswa"
        deskripsi={formatTanggal(tgl, { weekday: "long" }) + (tgl === hariIni ? " (hari ini)" : "")}
        aksi={
          <form className="flex items-center gap-2">
            <label htmlFor="tanggal" className="sr-only">Tanggal</label>
            <input id="tanggal" type="date" name="tanggal" max={hariIni} defaultValue={tgl} className="rounded-full border border-black/15 bg-white px-4 py-2" />
            <button className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5">Tampilkan</button>
          </form>
        }
      />
      {bukanHariSekolah && (
        <p className="mb-6 rounded-xl bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200">
          {libur ? `Hari libur: ${libur.keterangan}.` : "Bukan hari sekolah."} Catatan pada tanggal ini tidak dihitung dalam rekap.
        </p>
      )}
      <ul className="mb-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {[
          ["Kelas dicek", `${sudah.size}/${list.length}`],
          ["Terlambat", total.T ?? 0],
          ["Sakit", total.S ?? 0],
          ["Izin", total.I ?? 0],
          ["Alpa", total.A ?? 0],
          ["Pulang cepat", total.PC ?? 0],
        ].map(([l, n]) => (
          <li key={l} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <p className="font-serif text-4xl leading-none">{n}</p>
            <p className="mt-1 text-xs text-black/60">{l}</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
          <table className={kelasTabel}>
            <thead>
              <tr>
                <th className={kelasTh}>Kelas</th>
                <th className={kelasTh}>Wali kelas</th>
                <th className={kelasTh}>Status</th>
                <th className={kelasTh}>T / S / I / A</th>
              </tr>
            </thead>
            <tbody>
              {list.map((k) => {
                const h = hitung.get(k.id) ?? {};
                return (
                  <tr key={k.id} className="hover:bg-krem/50">
                    <td className={`${kelasTd} font-semibold`}>
                      <Link href={`/admin/absensi/kelas/${k.id}?tanggal=${tgl}`} className="hover:underline">{k.nama}</Link>
                      <span className="ml-2 text-xs font-normal text-black/40">{k.jumlah_siswa} siswa</span>
                    </td>
                    <td className={kelasTd}>{k.wali_kelas ?? "—"}</td>
                    <td className={kelasTd}>{sudah.has(k.id) ? <Lencana warna="hijau">Sudah dicek</Lencana> : <Lencana warna="kuning">Belum</Lencana>}</td>
                    <td className={`${kelasTd} tabular-nums`}>
                      {h.T ?? 0} / {h.S ?? 0} / {h.I ?? 0} / <span className={h.A ? "font-bold text-red-700" : ""}>{h.A ?? 0}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {punya(akses, "absensi.kelola") && tgl === hariIni && (
          <Kartu>
            <h2 className="mb-4 font-serif text-2xl">Catat siswa terlambat</h2>
            <FormTerlambat siswa={daftarSiswa} jamSekarang={jamSekarangWIB()} />
          </Kartu>
        )}
      </div>
    </>
  );
}
