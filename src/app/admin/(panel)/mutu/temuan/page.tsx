import { redirect } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormRencana, FormTemuan } from "@/components/mutu/Form";
import { NavMutu } from "@/components/mutu/Nav";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { daftarStaf } from "@/lib/admin/nama";
import { pilihKerangka } from "@/lib/admin/mutu-data";
import { Lencana } from "@/lib/lms";
import { JENIS_TEMUAN, STATUS_RENCANA, STATUS_TEMUAN, SUMBER_TEMUAN } from "@/lib/mutu";
import { simpanTemuanStatus } from "./aksi";

export const metadata = { title: "Temuan & perbaikan" };
type T = { id: string; jenis: string; sumber: string; uraian: string; status: string; tenggat: string | null; pj_id: string | null; periode: string; indikator_mutu: { kode: string; nama: string } | null;
  rencana_perbaikan: { id: string; kegiatan: string; pj_id: string | null; tenggat: string | null; status: string; hasil: string }[] };

export default async function Temuan({ searchParams }: { searchParams: Promise<{ k?: string; periode?: string; pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const tim = punya(akses, "mutu.kelola") || punya(akses, "mutu.audit");
  const { kini, periode } = await pilihKerangka(supabase, sp.k, sp.periode);
  const [{ data }, staf, { data: ind }] = await Promise.all([
    supabase.from("temuan_mutu").select("id, jenis, sumber, uraian, status, tenggat, pj_id, periode, indikator_mutu(kode, nama), rencana_perbaikan(id, kegiatan, pj_id, tenggat, status, hasil)")
      .eq("kerangka_id", kini?.id ?? "00000000-0000-0000-0000-000000000000").order("created_at", { ascending: false }),
    daftarStaf(supabase),
    kini ? supabase.from("indikator_mutu").select("id, kode, nama, standar_mutu!inner(kerangka_id)").eq("standar_mutu.kerangka_id", kini.id).order("kode") : Promise.resolve({ data: [] }),
  ]);
  const list = (data ?? []) as unknown as T[];
  if (!tim && !punya(akses, "mutu.lihat") && list.length === 0) redirect("/admin/mutu");
  const nama = new Map(staf.map((s) => [s.id, s.nama]));
  return (
    <>
      <JudulHalaman judul="Temuan & rencana perbaikan" deskripsi={`${kini ? `${kini.kode} v${kini.versi}` : ""} · temuan audit internal, evaluasi diri, atau visitasi beserta tindak lanjutnya.`} />
      <NavMutu />
      <Notifikasi kode={sp.pesan} />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-3">
          {list.length === 0 && <Kartu><p className="text-black/50">Belum ada temuan.</p></Kartu>}
          {list.map((t) => (
            <Kartu key={t.id}>
              <div className="flex flex-wrap items-center gap-2"><Lencana s={t.status} peta={STATUS_TEMUAN} /><strong>{JENIS_TEMUAN[t.jenis]}</strong>
                <span className="text-sm text-black/50">· {SUMBER_TEMUAN[t.sumber]} · {t.periode}{t.indikator_mutu && ` · ${t.indikator_mutu.kode}`}{t.pj_id && ` · PJ ${nama.get(t.pj_id)}`}{t.tenggat && ` · tenggat ${t.tenggat}`}</span></div>
              <p className="mt-2 text-sm">{t.uraian}</p>
              <ul className="mt-2 space-y-1 text-sm">{t.rencana_perbaikan.map((r) => (
                <li key={r.id} className="rounded-lg bg-krem/60 p-2">↳ {r.kegiatan} · {STATUS_RENCANA[r.status]}{r.pj_id && ` · ${nama.get(r.pj_id)}`}{r.tenggat && ` · ${r.tenggat}`}{r.hasil && <span className="block text-black/60">{r.hasil}</span>}
                  <details><summary className="cursor-pointer text-xs font-semibold text-brand-700">Perbarui</summary><div className="mt-2"><FormRencana temuan={t.id} d={r} staf={staf} /></div></details></li>))}</ul>
              <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold">+ Rencana perbaikan</summary><div className="mt-2"><FormRencana temuan={t.id} staf={staf} /></div></details>
              {tim && (
                <form action={simpanTemuanStatus} className="mt-2 flex flex-wrap gap-2 text-xs">
                  <input type="hidden" name="id" value={t.id} />
                  {Object.entries(STATUS_TEMUAN).filter(([k]) => k !== t.status).map(([k, v]) => <button key={k} name="status" value={k} className="rounded-full px-3 py-1 font-semibold ring-1 ring-black/15">→ {v.label}</button>)}
                </form>
              )}
            </Kartu>
          ))}
        </div>
        {tim && kini && <Kartu className="self-start"><h2 className="mb-3 font-serif text-2xl">Catat temuan</h2>
          <FormTemuan kerangka={kini.id} periode={periode} staf={staf} indikatorOpsi={((ind ?? []) as { id: string; kode: string; nama: string }[]).map((x) => ({ id: x.id, nama: `${x.kode} ${x.nama.slice(0, 60)}` }))} /></Kartu>}
      </div>
    </>
  );
}
