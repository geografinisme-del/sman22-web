import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormBukti, FormEvaluasi, FormRencana, FormTemuan, type DataEvaluasi } from "@/components/mutu/Form";
import { reviuEvaluasi, tautkanBukti } from "@/app/admin/actions-mutu";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { daftarStaf } from "@/lib/admin/nama";
import { uuid } from "@/lib/admin/schema";
import { Lencana, waktuWIB } from "@/lib/lms";
import { JENIS_TEMUAN, PERSETUJUAN, STATUS_RENCANA, STATUS_TEMUAN, periodeAwal } from "@/lib/mutu";
import { TautanBukti, type B } from "@/components/mutu/Bukti";

export const metadata = { title: "Indikator mutu" };

export default async function Indikator({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ periode?: string; pesan?: string; galat?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, akses } = await wajibLogin();
  const { data: i } = await supabase.from("indikator_mutu").select("*, standar_mutu(id, kode, nama, kerangka_id, kerangka_mutu(kode, versi, periode_aktif))").eq("id", id).maybeSingle();
  if (!i) notFound();
  const st = i.standar_mutu as { id: string; kode: string; nama: string; kerangka_id: string; kerangka_mutu: { kode: string; versi: string; periode_aktif: string } };
  const periode = sp.periode && /^\d{4}(\/\d{4})?$/.test(sp.periode) ? sp.periode : st.kerangka_mutu.periode_aktif || periodeAwal();
  if (sp.periode !== periode) redirect(`/admin/mutu/indikator/${id}?periode=${periode}`);
  const [{ data: ev }, { data: tb }, { data: pemilik }, staf, { data: tm }, { data: rp }] = await Promise.all([
    supabase.from("evaluasi_indikator").select("*").eq("indikator_id", id).eq("periode", periode).maybeSingle(),
    supabase.from("tautan_bukti_mutu").select("catatan, bukti_mutu(*)").eq("indikator_id", id).eq("periode", periode),
    supabase.rpc("pemilik_indikator", { p_ind: id }),
    daftarStaf(supabase),
    supabase.from("temuan_mutu").select("id, jenis, uraian, status, tenggat").eq("indikator_id", id).eq("periode", periode),
    supabase.from("rencana_perbaikan").select("id, kegiatan, pj_id, tenggat, status, hasil").eq("indikator_id", id),
  ]);
  const { data: rv } = ev ? await supabase.from("reviu_mutu").select("id, keputusan, catatan, waktu").eq("evaluasi_id", ev.id).order("waktu") : { data: [] };
  const kelola = punya(akses, "mutu.kelola"), auditor = punya(akses, "mutu.audit");
  const bolehIsi = kelola || Boolean(pemilik);
  const persetujuan = ev?.persetujuan ?? "draf";
  const bukti = ((tb ?? []) as unknown as { catatan: string; bukti_mutu: B }[]).map((x) => x.bukti_mutu).sort((a, b) => Number(a.digantikan) - Number(b.digantikan));
  const nama = new Map(staf.map((s) => [s.id, s.nama]));
  const kembali = `/admin/mutu/indikator/${id}?periode=${periode}`;
  return (
    <>
      <JudulHalaman judul={`${i.kode} ${i.nama}`} deskripsi={`${st.kerangka_mutu.kode} v${st.kerangka_mutu.versi} · ${st.kode}. ${st.nama} · periode ${periode} · pemilik ${i.pemilik_id ? nama.get(i.pemilik_id) : "—"}`}
        aksi={<Link href={`/admin/mutu?k=${st.kerangka_id}&periode=${periode}`} className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15">← Dasbor</Link>} />
      <Notifikasi kode={sp.pesan} />
      {sp.galat && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{sp.galat}</p>}
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          {(i.cara_ukur || i.deskripsi) && <Kartu><p className="whitespace-pre-line text-sm">{i.deskripsi}</p>{i.cara_ukur && <p className="mt-2 whitespace-pre-line text-sm"><strong>Cara ukur:</strong> {i.cara_ukur}</p>}{i.sumber_data && <p className="mt-1 text-sm text-black/60">Sumber data: {i.sumber_data}</p>}</Kartu>}
          <Kartu>
            <div className="mb-3 flex items-center gap-2"><h2 className="flex-1 font-serif text-2xl">Evaluasi diri {periode}</h2><Lencana s={persetujuan} peta={PERSETUJUAN} /></div>
            {bolehIsi ? <FormEvaluasi indikator={id} periode={periode} d={(ev ?? undefined) as DataEvaluasi | undefined} kuantitatif={i.jenis === "kuantitatif"} terkunci={["diajukan", "disetujui"].includes(persetujuan) && !kelola} />
              : <div className="text-sm"><p>Target: {ev?.target || "—"} · Capaian: {ev?.capaian || "—"} · Skor: {ev?.skor ?? "—"}</p><p className="mt-2 whitespace-pre-line">{ev?.evaluasi_diri}</p></div>}
            {ev && (
              <form action={reviuEvaluasi} className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/5 pt-3 text-sm">
                <input type="hidden" name="id" value={ev.id} /><input type="hidden" name="kembali" value={kembali} />
                {bolehIsi && ["draf", "revisi"].includes(persetujuan) && <button name="keputusan" value="diajukan" className="rounded-full bg-brand-900 px-4 py-2 font-semibold text-white">Ajukan untuk ditinjau</button>}
                {(kelola || auditor) && persetujuan === "diajukan" && <>
                  <input name="catatan" maxLength={1000} placeholder="Catatan tinjauan" aria-label="Catatan tinjauan" className="min-w-56 flex-1 rounded-xl border border-black/15 px-3 py-2" />
                  <button name="keputusan" value="disetujui" className="rounded-full bg-emerald-700 px-4 py-2 font-semibold text-white">Setujui</button>
                  <button name="keputusan" value="revisi" className="rounded-full px-4 py-2 font-semibold ring-1 ring-black/15">Minta revisi</button></>}
              </form>
            )}
            {(rv ?? []).length > 0 && <ol className="mt-3 space-y-1 text-xs text-black/60">{(rv ?? []).map((r) => <li key={r.id}>{waktuWIB(r.waktu)} · {PERSETUJUAN[r.keputusan]?.label}{r.catatan && ` — ${r.catatan}`}</li>)}</ol>}
          </Kartu>
          <Kartu>
            <h2 className="mb-3 font-serif text-2xl">Bukti ({bukti.filter((b) => !b.digantikan).length})</h2>
            {bukti.length === 0 ? <p className="text-sm text-merah">Belum ada bukti untuk periode ini.</p> : (
              <ul className="divide-y divide-black/5 text-sm">{bukti.map((b) => (
                <li key={b.id} className={`py-2 ${b.digantikan ? "opacity-50" : ""}`}>
                  <p className="font-medium">{b.judul} <span className="text-xs font-normal text-black/50">v{b.versi}{b.digantikan && " · digantikan versi baru"}</span></p>
                  <p className="text-xs text-black/60"><TautanBukti b={b} />{b.tanggal_dokumen && ` · dok. ${b.tanggal_dokumen}`} · diunggah {waktuWIB(b.created_at)}{b.hash_sha256 && <> · SHA-256 <span className="font-mono">{b.hash_sha256.slice(0, 12)}…</span></>}{b.ukuran ? ` · ${Math.round(b.ukuran / 1024)} KB` : ""}</p>
                  {bolehIsi && !b.digantikan && <div className="mt-1 flex gap-3 text-xs">
                    <details><summary className="cursor-pointer font-semibold text-brand-700">Unggah versi baru</summary><div className="mt-2 w-[min(90vw,32rem)]"><FormBukti indikator={id} periode={periode} versiDari={b.id} judulAwal={b.judul} /></div></details>
                    <form action={tautkanBukti}><input type="hidden" name="bukti_id" value={b.id} /><input type="hidden" name="indikator_id" value={id} /><input type="hidden" name="periode" value={periode} /><input type="hidden" name="aksi" value="lepas" /><button className="font-semibold text-merah underline">Lepas tautan</button></form>
                  </div>}
                </li>))}</ul>
            )}
            {bolehIsi && <details className="mt-3 border-t border-black/5 pt-3" open={bukti.length === 0}><summary className="cursor-pointer text-sm font-semibold">+ Tambah bukti</summary><div className="mt-3"><FormBukti indikator={id} periode={periode} /></div></details>}
          </Kartu>
        </div>
        <div className="space-y-6 self-start">
          <Kartu>
            <h2 className="mb-2 font-serif text-xl">Temuan</h2>
            {(tm ?? []).length === 0 ? <p className="text-sm text-black/50">Tidak ada.</p> : <ul className="space-y-2 text-sm">{(tm ?? []).map((t) => <li key={t.id}><Lencana s={t.status} peta={STATUS_TEMUAN} /> <strong>{JENIS_TEMUAN[t.jenis]}</strong> — {t.uraian}</li>)}</ul>}
            {(kelola || auditor) && <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold">+ Catat temuan</summary><div className="mt-3"><FormTemuan kerangka={st.kerangka_id} periode={periode} indikator={id} staf={staf} /></div></details>}
          </Kartu>
          <Kartu>
            <h2 className="mb-2 font-serif text-xl">Rencana perbaikan</h2>
            {(rp ?? []).length === 0 ? <p className="text-sm text-black/50">Tidak ada.</p> : <ul className="space-y-1 text-sm">{(rp ?? []).map((r) => <li key={r.id}>{r.kegiatan} · {STATUS_RENCANA[r.status]}{r.pj_id && ` · ${nama.get(r.pj_id)}`}{r.tenggat && ` · ${r.tenggat}`}</li>)}</ul>}
            {bolehIsi && <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold">+ Rencana</summary><div className="mt-3"><FormRencana indikator={id} staf={staf} /></div></details>}
          </Kartu>
        </div>
      </div>
    </>
  );
}
