import Link from "next/link";
import { redirect } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormKerangka } from "@/components/mutu/Form";
import { NavMutu } from "@/components/mutu/Nav";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { pilihKerangka, type BarisAnalisis } from "@/lib/admin/mutu-data";
import { Lencana } from "@/lib/lms";
import { CELAH, PERSETUJUAN, STATUS_CAPAIAN, STATUS_KERANGKA } from "@/lib/mutu";
import { TombolUnduh } from "@/components/admin/TombolUnduh";

export const metadata = { title: "Mutu & Akreditasi" };
const persen = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);

export default async function Mutu({ searchParams }: { searchParams: Promise<{ k?: string; periode?: string; pesan?: string; baru?: string; celah?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const kelola = punya(akses, "mutu.kelola");
  const tim = kelola || punya(akses, "mutu.audit") || punya(akses, "mutu.lihat");
  const { semua, kini, periode } = await pilihKerangka(supabase, sp.k, sp.periode);
  if (!tim && semua.length === 0) redirect("/admin?pesan=tanpa-akses");
  const { data } = kini ? await supabase.rpc("analisis_mutu", { p_kerangka: kini.id, p_periode: periode }) : { data: [] };
  const baris = (data ?? []) as BarisAnalisis[];
  const n = baris.length;
  const dinilai = baris.filter((b) => b.status !== "belum").length, berbukti = baris.filter((b) => b.jumlah_bukti > 0).length, setuju = baris.filter((b) => b.persetujuan === "disetujui").length;
  const temuan = baris.reduce((t, b) => t + b.temuan_terbuka, 0);
  const standar = [...new Map(baris.map((b) => [b.standar_id, { kode: b.standar_kode, nama: b.standar }])).entries()];
  const hitungCelah = Object.keys(CELAH).map((c) => [c, baris.filter((b) => b.celah.includes(c)).length] as const).filter(([, v]) => v > 0);
  const tampil = sp.celah ? baris.filter((b) => b.celah.includes(sp.celah!)) : baris;
  const q = (x: Record<string, string>) => "?" + new URLSearchParams({ ...(kini ? { k: kini.id } : {}), periode, ...x }).toString();
  return (
    <>
      <JudulHalaman judul="Mutu & Akreditasi" deskripsi="Membantu mengumpulkan bukti dan evaluasi diri. Angka di sini adalah kelengkapan data — bukan pernyataan kepatuhan; penilaian tetap oleh tim & asesor."
        aksi={kelola ? <Link href="?baru=1" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">+ Kerangka</Link> : undefined} />
      <NavMutu />
      <Notifikasi kode={sp.pesan} />
      {kelola && sp.baru && <Kartu className="mb-6 max-w-3xl"><h2 className="mb-4 text-2xl">Kerangka baru</h2><FormKerangka /></Kartu>}
      {!kini ? <Kartu><p className="text-black/50">Belum ada kerangka mutu. {kelola ? "Buat kerangka (mis. IASP 2024) lalu isi standar & indikatornya." : "Hubungi tim penjaminan mutu."}</p></Kartu> : (
        <>
          <form className="mb-5 flex flex-wrap items-end gap-2 text-sm">
            <label className="flex flex-col gap-1"><span className="font-semibold">Kerangka</span>
              <select name="k" defaultValue={kini.id} className="rounded-xl border border-black/15 px-3 py-2">{semua.map((x) => <option key={x.id} value={x.id}>{x.kode} v{x.versi} — {STATUS_KERANGKA[x.status].label}</option>)}</select></label>
            <label className="flex flex-col gap-1"><span className="font-semibold">Periode</span><input name="periode" defaultValue={periode} className="w-32 rounded-xl border border-black/15 px-3 py-2" /></label>
            <button className="rounded-full px-4 py-2 font-semibold ring-1 ring-black/15">Tampilkan</button>
            <span className="flex-1" />
            {kelola && <Link href={`/admin/mutu/kerangka/${kini.id}`} className="rounded-full px-4 py-2 font-semibold ring-1 ring-black/15">Atur standar & indikator</Link>}
            <TombolUnduh href={`/admin/mutu/ekspor${q({})}`} namaCadangan="paket-laporan-mutu.xlsx">Paket laporan (Excel)</TombolUnduh>
            <a href={`/cetak/mutu${q({})}`} target="_blank" className="rounded-full px-4 py-2 font-semibold ring-1 ring-black/15">Cetak laporan</a>
          </form>
          <p className="mb-4 text-sm text-black/60"><strong>{kini.nama}</strong> · versi {kini.versi}{kini.sumber_regulasi && ` · ${kini.sumber_regulasi}`}</p>
          <ul className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[["Indikator", String(n)], ["Sudah dievaluasi", `${persen(dinilai, n)}%`], ["Punya bukti", `${persen(berbukti, n)}%`], ["Disetujui", `${persen(setuju, n)}%`], ["Temuan terbuka", String(temuan)]].map(([l, v]) => (
              <li key={l} className="rounded-2xl bg-white p-4 ring-1 ring-black/5"><p className="text-3xl tabular-nums">{v}</p><p className="text-sm text-black/60">{l}</p></li>))}
          </ul>
          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <Kartu>
              <div className="mb-3 flex flex-wrap items-center gap-2"><h2 className="flex-1 text-2xl">Indikator{sp.celah && ` — ${CELAH[sp.celah]}`}</h2>{sp.celah && <Link href={q({})} className="text-sm underline">Semua</Link>}</div>
              {standar.map(([sid, s]) => {
                const isi = tampil.filter((b) => b.standar_id === sid);
                if (!isi.length) return null;
                const semuaS = baris.filter((b) => b.standar_id === sid);
                return (
                  <div key={sid} className="mb-5">
                    <div className="mb-1 flex items-center gap-3"><p className="flex-1 font-semibold">{s.kode}. {s.nama}</p>
                      <span className="text-xs text-black/50">bukti {persen(semuaS.filter((b) => b.jumlah_bukti > 0).length, semuaS.length)}% · disetujui {persen(semuaS.filter((b) => b.persetujuan === "disetujui").length, semuaS.length)}%</span></div>
                    <div className="mb-2 h-1.5 rounded-full bg-black/5"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${persen(semuaS.filter((b) => b.persetujuan === "disetujui").length, semuaS.length)}%` }} /></div>
                    <ul className="divide-y divide-black/5 text-sm">{isi.map((b) => (
                      <li key={b.indikator_id} className="flex flex-wrap items-center gap-2 py-2">
                        <Link href={`/admin/mutu/indikator/${b.indikator_id}?periode=${periode}`} className="min-w-60 flex-1 hover:underline"><span className="font-mono text-xs text-black/50">{b.kode}</span> {b.nama}</Link>
                        <span className="text-xs text-black/50">{b.pemilik} · {b.jumlah_bukti} bukti{b.skor ? ` · skor ${b.skor}` : ""}</span>
                        <Lencana s={b.status} peta={STATUS_CAPAIAN} /><Lencana s={b.persetujuan} peta={PERSETUJUAN} />
                      </li>))}</ul>
                  </div>
                );
              })}
              {n === 0 && <p className="text-sm text-black/50">Kerangka ini belum punya indikator.</p>}
            </Kartu>
            <Kartu className="self-start">
              <h2 className="mb-3 text-xl">Analisis kesenjangan</h2>
              {hitungCelah.length === 0 ? <p className="text-sm text-emerald-700">Tidak ada celah kelengkapan terdeteksi untuk periode ini.</p> : (
                <ul className="space-y-1 text-sm">{hitungCelah.map(([c, v]) => (
                  <li key={c}><Link href={q({ celah: c })} className={`flex justify-between rounded-lg px-2 py-1 hover:bg-black/5 ${sp.celah === c ? "bg-black/5 font-semibold" : ""}`}><span>{CELAH[c]}</span><span className="tabular-nums">{v}</span></Link></li>))}</ul>
              )}
              <p className="mt-3 text-xs text-black/50">Penanda otomatis hanya memeriksa kelengkapan isian & bukti. Mutu sesungguhnya dinilai melalui telaah tim dan asesor.</p>
            </Kartu>
          </div>
        </>
      )}
    </>
  );
}
