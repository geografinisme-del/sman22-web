import Link from "next/link";
import { notFound } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormLpj, FormPengajuan } from "@/components/ekskul/Form";
import { prosesPengajuan } from "@/app/admin/actions-ekskul";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { STATUS_PENGAJUAN, type ItemAnggaran } from "@/lib/ekskul";
import { Lencana, rupiah, waktuWIB } from "@/lib/lms";
import { tgl } from "@/lib/perpus";

export const metadata = { title: "Pengajuan kegiatan" };

export default async function DetailPengajuan({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesan?: string; galat?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, akses } = await wajibLogin();
  const { data: a } = await supabase.from("pengajuan_kegiatan").select("*, organisasi(id, nama, warna)").eq("id", id).maybeSingle();
  if (!a) notFound();
  const org = a.organisasi as { id: string; nama: string; warna: string };
  const [{ data: hak }, { data: pembina }, { data: rw }] = await Promise.all([
    supabase.rpc("hak_org", { p_org: org.id, p_aksi: "pengajuan" }),
    supabase.rpc("pembina_org", { p_org: org.id }),
    supabase.from("riwayat_pengajuan_kegiatan").select("id, status, catatan, waktu").eq("pengajuan_id", id).order("waktu"),
  ]);
  const kel = punya(akses, "ekskul.kelola");
  const anggaran = (a.anggaran ?? []) as ItemAnggaran[];
  const bisaEdit = hak && ["draf", "revisi"].includes(a.status);
  const bisaReviu = (pembina && a.status === "diajukan") || (kel && ["diajukan", "disetujui_pembina"].includes(a.status));
  return (
    <>
      <div className="mb-2 h-2 rounded-full" style={{ background: org.warna }} />
      <JudulHalaman judul={a.judul} deskripsi={`${org.nama} · ${tgl(a.mulai)}${a.selesai !== a.mulai ? ` – ${tgl(a.selesai)}` : ""}${a.tempat ? ` · ${a.tempat}` : ""}`}
        aksi={<Link href="/admin/ekskul/pengajuan" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15">← Semua pengajuan</Link>} />
      <Notifikasi kode={sp.pesan} />
      {sp.galat && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{sp.galat}</p>}
      <div className="mb-4 flex items-center gap-2"><Lencana s={a.status} peta={STATUS_PENGAJUAN} />{a.catatan_reviu && <span className="text-sm text-black/70">Catatan: {a.catatan_reviu}</span>}</div>
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          {bisaEdit ? <Kartu><h2 className="mb-4 text-2xl">Proposal</h2><FormPengajuan org={org.id} d={{ ...a, id, anggaran }} /></Kartu> : (
            <Kartu>
              <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[180px_1fr]">
                <dt className="text-black/50">Latar & tujuan</dt><dd className="whitespace-pre-line">{a.tujuan || "—"}</dd>
                <dt className="text-black/50">Perkiraan peserta</dt><dd>{a.sasaran_peserta}</dd>
                <dt className="text-black/50">Risiko</dt><dd className="whitespace-pre-line">{a.risiko || "—"}</dd>
                <dt className="text-black/50">Mitigasi</dt><dd className="whitespace-pre-line">{a.mitigasi || "—"}</dd>
                <dt className="text-black/50">Kebutuhan sarpras</dt><dd className="whitespace-pre-line">{a.kebutuhan_sarpras || "—"}</dd>
                <dt className="text-black/50">Sumber dana</dt><dd>{a.sumber_dana || "—"}</dd>
              </dl>
            </Kartu>
          )}
          <Kartu>
            <h2 className="mb-3 text-2xl">Anggaran</h2>
            {anggaran.length === 0 ? <p className="text-sm text-black/50">Tanpa anggaran.</p> : (
              <table className="w-full text-left text-sm">
                <thead><tr className="text-xs uppercase tracking-wider text-black/50"><th className="py-1">Uraian</th><th className="text-right">Volume</th><th className="text-right">Harga</th><th className="text-right">Jumlah</th></tr></thead>
                <tbody>{anggaran.map((x, i) => (
                  <tr key={i} className="border-t border-black/5"><td className="py-1">{x.uraian}</td><td className="text-right">{x.volume} {x.satuan}</td><td className="text-right">{rupiah(x.harga)}</td><td className="text-right tabular-nums">{rupiah(x.volume * x.harga)}</td></tr>))}</tbody>
                <tfoot><tr className="border-t-2 border-black/10 font-semibold"><td className="py-1" colSpan={3}>Total</td><td className="text-right tabular-nums">{rupiah(Number(a.total_anggaran))}</td></tr></tfoot>
              </table>
            )}
            {a.lpj_realisasi != null && <p className="mt-2 text-sm">Realisasi (LPJ): <strong>{rupiah(Number(a.lpj_realisasi))}</strong></p>}
          </Kartu>
          {(["disetujui", "lpj_diajukan", "selesai"].includes(a.status)) && (
            <Kartu>
              <h2 className="mb-3 text-2xl">Laporan pertanggungjawaban (LPJ)</h2>
              {hak && a.status === "disetujui" ? <FormLpj id={id} d={a} /> : (
                <div className="text-sm"><p className="whitespace-pre-line">{a.lpj_ringkasan || "Belum ada."}</p>
                  {a.lpj_peserta != null && <p className="mt-1">Peserta: {a.lpj_peserta}</p>}
                  {a.lpj_tautan && <a href={a.lpj_tautan} target="_blank" rel="noreferrer" className="text-blue-teks underline">Dokumentasi ↗</a>}</div>
              )}
            </Kartu>
          )}
        </div>
        <div className="space-y-6 self-start">
          {(bisaEdit || bisaReviu || (kel && a.status === "lpj_diajukan")) && (
            <Kartu>
              <h2 className="mb-3 text-2xl">Tindakan</h2>
              <form action={prosesPengajuan} className="space-y-3">
                <input type="hidden" name="id" value={id} />
                {!bisaEdit && <textarea name="catatan" rows={3} maxLength={1000} placeholder="Catatan (wajib untuk revisi/tolak)" aria-label="Catatan" className="w-full rounded-xl border border-black/15 px-3 py-2 text-sm" />}
                <div className="flex flex-wrap gap-2">
                  {bisaEdit && <button name="aksi" value="ajukan" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Ajukan ke pembina</button>}
                  {bisaReviu && <>
                    <button name="aksi" value="setujui" className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Setujui</button>
                    <button name="aksi" value="revisi" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15">Minta revisi</button>
                    <button name="aksi" value="tolak" className="rounded-full px-4 py-2 text-sm font-semibold text-blue-teks ring-1 ring-blue/30">Tolak</button></>}
                  {kel && a.status === "lpj_diajukan" && <>
                    <button name="aksi" value="terima_lpj" className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Terima LPJ</button>
                    <button name="aksi" value="tolak_lpj" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15">Kembalikan LPJ</button></>}
                </div>
              </form>
            </Kartu>
          )}
          <Kartu>
            <h2 className="mb-2 font-semibold">Riwayat</h2>
            <ol className="space-y-1 text-sm">{(rw ?? []).length === 0 ? <li className="text-black/50">Masih draf.</li> : (rw ?? []).map((r) => (
              <li key={r.id} className="border-l-2 border-line pl-3"><span className="text-xs text-black/50">{waktuWIB(r.waktu)}</span> · {STATUS_PENGAJUAN[r.status]?.label}{r.catatan && <span className="text-black/60"> — {r.catatan}</span>}</li>))}</ol>
          </Kartu>
        </div>
      </div>
    </>
  );
}
