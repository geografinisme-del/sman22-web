import { redirect } from "next/navigation";
import { JudulHalaman, KosongAdmin, TombolLink, kelasTabel, kelasTd, kelasTh } from "@/components/admin/ui";
import { berperan, punya, wajibLogin } from "@/lib/admin/auth";
import { awalBulan, hariIniWIB, tanggalValid } from "@/lib/admin/absensi";
import { kelasWaliSaya } from "@/lib/admin/kelas-wali";
import { formatTanggal } from "@/lib/format";

export const metadata = { title: "Rekap Absensi" };

type R = { siswa_id: string; nisn: string | null; nama: string; sakit: number; izin: number; alpa: number; terlambat: number; pulang_cepat: number; hari_efektif: number; persen_hadir: number | null };

export default async function Rekap({ searchParams }: { searchParams: Promise<{ kelas?: string; dari?: string; sampai?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const semua = punya(akses, "absensi.lihat");
  if (!semua && !berperan(akses, "wali_kelas")) redirect("/admin?pesan=tanpa-akses");

  const hariIni = hariIniWIB();
  const dari = tanggalValid(sp.dari) ? sp.dari : awalBulan(hariIni);
  const sampai = tanggalValid(sp.sampai) ? sp.sampai : hariIni;
  let kelas: { id: string; nama: string }[];
  if (semua) {
    const { data: ta } = await supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle();
    const { data } = ta ? await supabase.from("kelas").select("id, nama").eq("tahun_ajaran_id", ta.id).is("deleted_at", null).order("nama") : { data: [] };
    kelas = data ?? [];
  } else kelas = await kelasWaliSaya(supabase);
  const pilih = kelas.find((k) => k.id === sp.kelas) ?? kelas[0];
  const { data } = pilih ? await supabase.rpc("rekap_absensi_kelas", { p_kelas: pilih.id, p_dari: dari, p_sampai: sampai }) : { data: [] };
  const rows = (data ?? []) as R[];
  const he = rows[0]?.hari_efektif ?? 0;
  const ekspor = pilih ? `/admin/absensi/rekap/ekspor?kelas=${pilih.id}&dari=${dari}&sampai=${sampai}` : "#";

  return (
    <>
      <JudulHalaman
        judul="Rekap Absensi"
        deskripsi={pilih ? `${pilih.nama} · ${formatTanggal(dari)} – ${formatTanggal(sampai)} · ${he} hari efektif` : undefined}
        aksi={pilih && <TombolLink href={ekspor} sekunder>Unduh Excel</TombolLink>}
      />
      <form className="mb-5 grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Kelas</span>
          <select name="kelas" defaultValue={pilih?.id} className="w-full rounded-xl border border-black/15 bg-white px-3 py-2">
            {kelas.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Dari</span>
          <input type="date" name="dari" defaultValue={dari} className="w-full rounded-xl border border-black/15 px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Sampai</span>
          <input type="date" name="sampai" defaultValue={sampai} max={hariIni} className="w-full rounded-xl border border-black/15 px-3 py-2" />
        </label>
        <button className="self-end rounded-full bg-ink px-5 py-2.5 font-semibold text-white">Tampilkan</button>
      </form>
      {!pilih ? (
        <KosongAdmin teks="Belum ada kelas." />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
          <table className={kelasTabel}>
            <thead>
              <tr>
                <th className={kelasTh}>No</th>
                <th className={kelasTh}>Nama</th>
                <th className={`${kelasTh} text-right`}>S</th>
                <th className={`${kelasTh} text-right`}>I</th>
                <th className={`${kelasTh} text-right`}>A</th>
                <th className={`${kelasTh} text-right`}>T</th>
                <th className={`${kelasTh} text-right`}>PC</th>
                <th className={`${kelasTh} text-right`}>% Hadir</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.siswa_id}>
                  <td className={`${kelasTd} text-black/40`}>{i + 1}</td>
                  <td className={kelasTd}>{r.nama}</td>
                  <td className={`${kelasTd} text-right tabular-nums`}>{r.sakit}</td>
                  <td className={`${kelasTd} text-right tabular-nums`}>{r.izin}</td>
                  <td className={`${kelasTd} text-right tabular-nums ${r.alpa >= 3 ? "font-bold text-red-700" : ""}`}>{r.alpa}</td>
                  <td className={`${kelasTd} text-right tabular-nums ${r.terlambat >= 3 ? "font-bold text-amber-700" : ""}`}>{r.terlambat}</td>
                  <td className={`${kelasTd} text-right tabular-nums`}>{r.pulang_cepat}</td>
                  <td className={`${kelasTd} text-right tabular-nums`}>{r.persen_hadir == null ? "—" : `${r.persen_hadir}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-black/50">
        % hadir = (hari efektif − sakit − izin − alpa) ÷ hari efektif. Hari efektif tidak menghitung akhir pekan, hari libur, dan tanggal sebelum mulai hitung.
      </p>
    </>
  );
}
