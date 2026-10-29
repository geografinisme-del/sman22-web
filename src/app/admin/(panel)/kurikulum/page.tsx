import Link from "next/link";
import { JudulHalaman, Kartu, Notifikasi, kelasTabel, kelasTd, kelasTh } from "@/components/admin/ui";
import { FormStruktur } from "@/components/kurikulum/Form";
import { NavKurikulum } from "@/components/kurikulum/Nav";
import { punya, wajibBoleh } from "@/lib/admin/auth";
import { BOLEH } from "@/lib/admin/akses-modul";
import { KELOMPOK, TINGKAT, faseTingkat } from "@/lib/kurikulum";
import { hapusStruktur, salinStruktur } from "../../actions-kurikulum";

export const metadata = { title: "Struktur Kurikulum" };

type Baris = { id: string; tingkat: string; mapel_id: string; kelompok: keyof typeof KELOMPOK; jp_minggu: number; keterangan: string; mapel: { nama: string } | null };
type Cek = { kelas: string; tingkat: string; mapel: string; jp_struktur: number | null; jp_penugasan: number; masalah: string };

export default async function Struktur({ searchParams }: { searchParams: Promise<{ tingkat?: string; pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibBoleh(BOLEH.strukturKurikulum);
  const kelola = punya(akses, "kurikulum.kelola");
  const tingkat = TINGKAT.includes(sp.tingkat as (typeof TINGKAT)[number]) ? sp.tingkat! : "X";
  const { data: ta } = await supabase.from("tahun_ajaran").select("id, nama").eq("aktif", true).maybeSingle();
  const [{ data: rows }, { data: mapel }, { data: semuaTa }, cek] = await Promise.all([
    ta ? supabase.from("struktur_kurikulum").select("id, tingkat, mapel_id, kelompok, jp_minggu, keterangan, mapel(nama)").eq("tahun_ajaran_id", ta.id).order("kelompok").order("jp_minggu", { ascending: false }) : Promise.resolve({ data: [] }),
    supabase.from("mapel").select("id, nama").is("deleted_at", null).order("urutan").order("nama"),
    kelola ? supabase.from("tahun_ajaran").select("id, nama").neq("aktif", true).order("nama", { ascending: false }).limit(6) : Promise.resolve({ data: [] }),
    kelola || punya(akses, "jadwal.kelola") ? supabase.rpc("cek_struktur_kelas") : Promise.resolve({ data: [] }),
  ]);
  const semua = (rows ?? []) as unknown as Baris[];
  const list = semua.filter((r) => r.tingkat === tingkat);
  const total = (k?: string) => list.filter((r) => !k || r.kelompok === k).reduce((a, r) => a + r.jp_minggu, 0);
  const masalah = ((cek.data ?? []) as Cek[]);

  return (
    <>
      <JudulHalaman judul="Struktur Kurikulum" deskripsi={`Mata pelajaran & JP per minggu tiap tingkat — ${ta?.nama ?? "belum ada tahun ajaran aktif"}. Kelas X = fase E, XI–XII = fase F.`} />
      <NavKurikulum />
      <Notifikasi kode={sp.pesan} />
      <div className="mb-4 flex gap-2" role="tablist">
        {TINGKAT.map((t) => (
          <Link key={t} href={`?tingkat=${t}`} role="tab" aria-selected={t === tingkat} className={`rounded-full px-5 py-2 text-sm font-semibold ${t === tingkat ? "bg-ink text-white" : "bg-white ring-1 ring-black/10"}`}>
            Kelas {t} <span className="font-normal opacity-70">· fase {faseTingkat(t)}</span>
          </Link>
        ))}
      </div>
      <div className={`grid gap-6 ${kelola ? "xl:grid-cols-[1fr_380px]" : ""}`}>
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
          <table className={kelasTabel}>
            <thead><tr><th className={kelasTh}>Mata pelajaran</th><th className={kelasTh}>Kelompok</th><th className={`${kelasTh} text-right`}>JP/minggu</th><th className={kelasTh}>Keterangan</th>{kelola && <th className={kelasTh} />}</tr></thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={5} className={`${kelasTd} text-center text-black/50`}>Belum ada mapel untuk kelas {tingkat}.</td></tr>
              ) : list.map((r) => (
                <tr key={r.id}>
                  <td className={`${kelasTd} font-medium`}>{r.mapel?.nama}</td>
                  <td className={kelasTd}>{KELOMPOK[r.kelompok]}</td>
                  <td className={`${kelasTd} text-right tabular-nums`}>{r.jp_minggu}</td>
                  <td className={`${kelasTd} text-black/60`}>{r.keterangan}</td>
                  {kelola && (
                    <td className={`${kelasTd} text-right`}>
                      <form action={hapusStruktur}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="tingkat" value={tingkat} />
                        <button className="text-xs font-semibold text-blue-teks underline">Hapus</button></form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {list.length > 0 && (
              <tfoot>
                <tr><td className={`${kelasTd} font-semibold`} colSpan={2}>Total wajib (umum + mulok)</td><td className={`${kelasTd} text-right font-semibold tabular-nums`}>{total("umum") + total("mulok")}</td><td className={kelasTd} colSpan={2} /></tr>
                {total("pilihan") > 0 && <tr><td className={kelasTd} colSpan={2}>Mapel pilihan (tersedia)</td><td className={`${kelasTd} text-right tabular-nums`}>{total("pilihan")}</td><td className={kelasTd} colSpan={2} /></tr>}
              </tfoot>
            )}
          </table>
        </div>
        {kelola && (
          <div className="space-y-6">
            <Kartu>
              <h2 className="mb-4 text-2xl">Tambah / ubah mapel kelas {tingkat}</h2>
              <FormStruktur key={tingkat} tingkat={tingkat} mapel={(mapel ?? []) as { id: string; nama: string }[]} />
              <p className="mt-3 text-xs text-black/50">Memilih mapel yang sudah ada akan memperbarui JP-nya. Mapel baru ditambahkan di Jadwal → Mapel, jam & piket.</p>
            </Kartu>
            {(semuaTa ?? []).length > 0 && semua.length === 0 && (
              <Kartu>
                <h2 className="mb-2 text-xl">Salin dari tahun lalu</h2>
                <form action={salinStruktur} className="flex gap-2">
                  <select name="dari" className="flex-1 rounded-xl border border-black/15 bg-white px-3 py-2" aria-label="Tahun ajaran sumber">
                    {(semuaTa ?? []).map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
                  </select>
                  <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Salin</button>
                </form>
              </Kartu>
            )}
          </div>
        )}
      </div>

      {(kelola || punya(akses, "jadwal.kelola")) && (
        <section className="mt-10">
          <h2 className="mb-1 text-3xl">Kesesuaian dengan penugasan mengajar</h2>
          <p className="mb-3 text-sm text-black/60">Membandingkan struktur di atas dengan penugasan guru per kelas (menu Jadwal → Penugasan).</p>
          {masalah.length === 0 ? (
            <p className="rounded-2xl bg-emerald-50 px-5 py-4 text-sm text-emerald-900 ring-1 ring-emerald-200">Semua kelas sudah sesuai struktur kurikulum.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
              <table className={kelasTabel}>
                <thead><tr><th className={kelasTh}>Kelas</th><th className={kelasTh}>Mapel</th><th className={`${kelasTh} text-right`}>Struktur</th><th className={`${kelasTh} text-right`}>Penugasan</th><th className={kelasTh}>Masalah</th></tr></thead>
                <tbody>
                  {masalah.slice(0, 200).map((m, i) => (
                    <tr key={i}>
                      <td className={kelasTd}>{m.kelas}</td><td className={kelasTd}>{m.mapel}</td>
                      <td className={`${kelasTd} text-right tabular-nums`}>{m.jp_struktur ?? "—"}</td>
                      <td className={`${kelasTd} text-right tabular-nums`}>{m.jp_penugasan || "—"}</td>
                      <td className={`${kelasTd} text-amber-800`}>{m.masalah}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {masalah.length > 200 && <p className="p-3 text-sm text-black/50">…dan {masalah.length - 200} lainnya</p>}
            </div>
          )}
        </section>
      )}
    </>
  );
}
