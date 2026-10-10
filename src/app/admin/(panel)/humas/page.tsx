import Link from "next/link";
import { redirect } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormSLA } from "@/components/humas/Form";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { hariIniWIB } from "@/lib/admin/absensi";
import { KATEGORI_ADUAN, STATUS_ADUAN } from "@/lib/humas";

export const metadata = { title: "Dasbor Humas" };

export default async function DasborHumas({ searchParams }: { searchParams: Promise<{ pesan?: string; dari?: string; sampai?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  if (!punya(akses, "humas.kelola") && !punya(akses, "pengaduan.kelola") && !punya(akses, "pengaduan.rahasia")) redirect("/admin?pesan=tanpa-akses");
  const hari = hariIniWIB();
  const tglOk = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
  const sampai = tglOk(sp.sampai) ?? hari;
  const dari = tglOk(sp.dari) ?? new Date(Date.parse(sampai) - 89 * 864e5).toISOString().slice(0, 10);
  const [{ data }, { data: sla }] = await Promise.all([
    supabase.rpc("statistik_humas", { p_dari: dari, p_sampai: sampai }),
    supabase.from("sla_pengaduan").select("kategori, hari"),
  ]);
  const s = (data ?? {}) as Record<string, number | Record<string, number> | null>;
  const n = (k: string) => Number(s[k] ?? 0);
  const kotak: [string, string, string?][] = [
    ["Pengaduan masuk", n("masuk").toLocaleString("id-ID"), `${n("rahasia")} di antaranya rahasia`],
    ["Masih aktif", n("aktif").toLocaleString("id-ID"), n("lewat_tenggat") ? `${n("lewat_tenggat")} lewat tenggat` : "semua dalam tenggat"],
    ["Selesai tepat waktu", s.tepat_waktu == null ? "—" : `${s.tepat_waktu}%`, s.rata_hari == null ? "" : `rata-rata ${s.rata_hari} hari`],
    ["Kepuasan pelapor", s.rating == null ? "—" : `★ ${s.rating}`, `${n("jumlah_rating")} penilaian`],
    ["Mitra aktif", String(n("mitra_aktif")), n("mitra_segera") ? `${n("mitra_segera")} MoU berakhir ≤30 hari` : `${n("kegiatan_mitra")} kegiatan`],
    ["Tamu", n("tamu").toLocaleString("id-ID"), "orang dalam periode"],
    ["Survei aktif", String(n("survei_aktif")), `${n("responden")} responden dalam periode`],
  ];
  const perKat = (s.per_kategori ?? {}) as Record<string, number>;
  const perStatus = (s.per_status ?? {}) as Record<string, number>;
  const maks = Math.max(1, ...Object.values(perKat));
  return (
    <>
      <JudulHalaman judul="Dasbor Humas" deskripsi="Angka agregat layanan publik. Pengaduan rahasia hanya dihitung, isinya tidak ditampilkan di sini." />
      <Notifikasi kode={sp.pesan} />
      <form className="mb-5 flex flex-wrap items-end gap-2 text-sm">
        <label className="flex flex-col gap-1"><span className="font-semibold">Dari</span><input type="date" name="dari" defaultValue={dari} className="rounded-xl border border-black/15 px-3 py-2" /></label>
        <label className="flex flex-col gap-1"><span className="font-semibold">Sampai</span><input type="date" name="sampai" defaultValue={sampai} className="rounded-xl border border-black/15 px-3 py-2" /></label>
        <button className="rounded-full px-4 py-2 font-semibold ring-1 ring-black/15">Tampilkan</button>
      </form>
      <ul className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kotak.map(([l, v, k]) => (
          <li key={l} className="rounded-2xl bg-white p-4 ring-1 ring-black/5"><p className="font-serif text-3xl tabular-nums">{v}</p><p className="text-sm font-medium">{l}</p>{k && <p className="text-xs text-black/50">{k}</p>}</li>
        ))}
      </ul>
      <div className="grid gap-6 xl:grid-cols-2">
        <Kartu>
          <h2 className="mb-3 font-serif text-2xl">Pengaduan per kategori</h2>
          {Object.keys(perKat).length === 0 ? <p className="text-sm text-black/50">Belum ada data.</p> : (
            <ul className="space-y-2 text-sm">{Object.entries(perKat).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <li key={k}><div className="flex justify-between"><span>{KATEGORI_ADUAN[k as keyof typeof KATEGORI_ADUAN] ?? k}</span><span className="tabular-nums">{v}</span></div>
                <div className="mt-1 h-2 rounded-full bg-black/5"><div className="h-full rounded-full bg-brand-600" style={{ width: `${(100 * v) / maks}%` }} /></div></li>
            ))}</ul>
          )}
          <p className="mt-4 text-sm text-black/60">{Object.entries(perStatus).map(([k, v]) => `${STATUS_ADUAN[k]?.label.split(" /")[0] ?? k}: ${v}`).join(" · ")}</p>
          <Link href="/admin/pengaduan" className="mt-3 inline-block text-sm font-semibold text-brand-700 underline">Buka daftar pengaduan</Link>
        </Kartu>
        <Kartu>
          <h2 className="mb-1 font-serif text-2xl">SLA pengaduan</h2>
          <p className="mb-4 text-sm text-black/60">Tenggat penyelesaian per kategori. PIC & humas diingatkan lewat dasbor bila lewat tenggat.</p>
          {punya(akses, "humas.kelola") ? <FormSLA sla={Object.fromEntries((sla ?? []).map((x) => [x.kategori, x.hari]))} /> : (
            <ul className="text-sm">{(sla ?? []).map((x) => <li key={x.kategori}>{KATEGORI_ADUAN[x.kategori as keyof typeof KATEGORI_ADUAN]}: {x.hari} hari</li>)}</ul>
          )}
        </Kartu>
      </div>
    </>
  );
}
