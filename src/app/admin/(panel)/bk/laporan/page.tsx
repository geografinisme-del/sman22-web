import { JudulHalaman, Kartu } from "@/components/admin/ui";
import { FormRetensi } from "@/components/bk/Form";
import { NavBk } from "@/components/bk/Nav";
import { punya, wajibIzin } from "@/lib/admin/auth";
import { hariIniWIB } from "@/lib/admin/absensi";

export const metadata = { title: "Laporan BK" };

export default async function LaporanBk({ searchParams }: { searchParams: Promise<{ dari?: string; sampai?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibIzin("bk.agregat");
  const konselor = punya(akses, "bk.konseling");
  const ok = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
  const sampai = ok(sp.sampai) ?? hariIniWIB();
  const dari = ok(sp.dari) ?? new Date(Date.parse(sampai) - 179 * 864e5).toISOString().slice(0, 10);
  const [{ data }, { data: cfg }] = await Promise.all([
    supabase.rpc("statistik_bk", { p_dari: dari, p_sampai: sampai }),
    konselor ? supabase.from("pengaturan_bk").select("retensi_tahun").eq("id", 1).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const s = (data ?? {}) as Record<string, number | Record<string, number | null> | null>;
  const n = (k: string) => Number(s[k] ?? 0);
  const peta = (k: string) => Object.entries((s[k] ?? {}) as Record<string, number | null>);
  const kotak: [string, number][] = [["Kasus baru", n("kasus_baru")], ["Kasus berjalan", n("kasus_aktif")], ["Kasus selesai", n("kasus_selesai")], ["Sesi terlaksana", n("sesi")],
    ["Permintaan layanan", n("permintaan")], ["…dari siswa sendiri", n("permintaan_siswa")], ["Rujukan dari guru", n("rujukan_guru")], ["Rujukan ke luar", n("rujukan_luar")]];
  return (
    <>
      <JudulHalaman judul="Laporan BK (agregat)" deskripsi="Hanya angka — tanpa nama atau isi konseling. Kelompok dengan kurang dari 3 kasus ditampilkan sebagai “< 3” agar siswa tidak dapat dikenali." />
      <NavBk konselor={konselor} agregat />
      <form className="mb-5 flex flex-wrap items-end gap-2 text-sm">
        <label className="flex flex-col gap-1"><span className="font-semibold">Dari</span><input type="date" name="dari" defaultValue={dari} className="rounded-xl border border-black/15 px-3 py-2" /></label>
        <label className="flex flex-col gap-1"><span className="font-semibold">Sampai</span><input type="date" name="sampai" defaultValue={sampai} className="rounded-xl border border-black/15 px-3 py-2" /></label>
        <button className="rounded-full px-4 py-2 font-semibold ring-1 ring-black/15">Tampilkan</button>
      </form>
      <ul className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kotak.map(([l, v]) => <li key={l} className="rounded-2xl bg-white p-4 ring-1 ring-black/5"><p className="font-serif text-3xl tabular-nums">{v}</p><p className="text-sm text-black/60">{l}</p></li>)}
      </ul>
      <div className="grid gap-6 lg:grid-cols-3">
        {[["Per kategori", "per_kategori"], ["Per tingkat kelas", "per_tingkat"], ["Per prioritas", "per_prioritas"]].map(([j, k]) => (
          <Kartu key={k}>
            <h2 className="mb-3 font-serif text-xl">{j}</h2>
            {peta(k).length === 0 ? <p className="text-sm text-black/50">Belum ada data.</p> : (
              <ul className="space-y-1 text-sm">{peta(k).map(([a, v]) => <li key={a} className="flex justify-between"><span>{a}</span><span className="tabular-nums">{v == null ? "< 3" : v}</span></li>)}</ul>
            )}
          </Kartu>
        ))}
      </div>
      <p className="mt-4 text-sm text-black/60">Rata-rata lama penanganan: {s.rata_hari_tutup == null ? "—" : `${s.rata_hari_tutup} hari`}.</p>
      {konselor && cfg && (
        <Kartu className="mt-6 max-w-2xl">
          <h2 className="mb-2 font-serif text-xl">Kebijakan retensi</h2>
          <p className="mb-3 text-sm text-black/60">Setelah kasus ditutup, isi terenkripsi (asesmen, catatan sesi, cerita) disimpan selama masa ini lalu dimusnahkan otomatis. Data agregat tetap ada.</p>
          <FormRetensi tahun={cfg.retensi_tahun} />
        </Kartu>
      )}
    </>
  );
}
