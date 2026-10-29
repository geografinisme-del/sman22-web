import Link from "next/link";
import { JudulHalaman, Kartu, KosongAdmin, Notifikasi } from "@/components/admin/ui";
import { TombolCetak } from "@/components/jadwal/Bantu";
import { AiModul, AiTp, LabelAI } from "@/components/kurikulum/Ai";
import { FormCp, FormTp, type DataTp } from "@/components/kurikulum/Form";
import { NavKurikulum } from "@/components/kurikulum/Nav";
import { punya, wajibBoleh } from "@/lib/admin/auth";
import { BOLEH } from "@/lib/admin/akses-modul";
import { uuid } from "@/lib/admin/schema";
import { aiAktif } from "@/lib/ai";
import { arsipCp, arsipTp, aturStatusAtp } from "../../../actions-kurikulum";

export const metadata = { title: "CP, TP & ATP" };

type Cp = { id: string; elemen: string; deskripsi: string; urutan: number };

export default async function Atp({ searchParams }: { searchParams: Promise<{ mapel?: string; fase?: string; ubah?: string; ubahCp?: string; pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibBoleh(BOLEH.strukturKurikulum);
  const kelola = punya(akses, "kurikulum.kelola");
  const { data: saya } = await supabase.rpc("pegawai_saya");
  const { data: ta } = await supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle();

  // mapel yang bisa dipilih: semua (kurikulum) atau yang diampu
  const { data: tugas } = saya && ta
    ? await supabase.from("penugasan_mengajar").select("mapel_id, kelas(tingkat)").eq("pegawai_id", saya).eq("tahun_ajaran_id", ta.id).is("deleted_at", null)
    : { data: [] };
  const diampu = new Map<string, Set<string>>();
  for (const t of (tugas ?? []) as unknown as { mapel_id: string; kelas: { tingkat: string } | null }[]) {
    if (!diampu.has(t.mapel_id)) diampu.set(t.mapel_id, new Set());
    if (t.kelas) diampu.get(t.mapel_id)!.add(t.kelas.tingkat);
  }
  const { data: semuaMapel } = await supabase.from("mapel").select("id, nama").is("deleted_at", null).order("urutan").order("nama");
  const pilihanMapel = (semuaMapel ?? []).filter((m) => kelola || diampu.has(m.id));
  if (!pilihanMapel.length)
    return (
      <>
        <JudulHalaman judul="CP, TP & ATP" />
        <NavKurikulum />
        <KosongAdmin teks="Anda belum punya penugasan mengajar di tahun ajaran aktif. TP & ATP disusun oleh guru pengampu mapel." />
      </>
    );
  const mapelId = sp.mapel && uuid.safeParse(sp.mapel).success && pilihanMapel.some((m) => m.id === sp.mapel) ? sp.mapel : pilihanMapel[0].id;
  const tingkatDiampu = [...(diampu.get(mapelId) ?? [])];
  const faseAwal = tingkatDiampu.includes("X") || !tingkatDiampu.length ? "E" : "F";
  const fase = sp.fase === "E" || sp.fase === "F" ? sp.fase : faseAwal;
  const tingkatOpsi = fase === "E" ? ["X"] : ["XI", "XII"];
  const namaMapel = pilihanMapel.find((m) => m.id === mapelId)?.nama ?? "";
  const dasar = `/admin/kurikulum/atp?mapel=${mapelId}&fase=${fase}`;

  const [{ data: cp }, { data: tp }, { data: st }, { data: boleh }, { data: struktur }] = await Promise.all([
    supabase.from("capaian_pembelajaran").select("id, elemen, deskripsi, urutan").eq("mapel_id", mapelId).eq("fase", fase).is("deleted_at", null).order("urutan"),
    supabase.from("tujuan_pembelajaran").select("id, kode, elemen, deskripsi, kktp, alokasi_jp, semester, tingkat, urutan").eq("mapel_id", mapelId).eq("fase", fase).is("deleted_at", null)
      .order("tingkat").order("semester").order("urutan").order("kode"),
    supabase.from("atp_status").select("status, catatan, updated_at").eq("mapel_id", mapelId).eq("fase", fase).maybeSingle(),
    supabase.rpc("boleh_ubah_atp", { p_mapel: mapelId, p_fase: fase }),
    ta ? supabase.from("struktur_kurikulum").select("tingkat, jp_minggu").eq("tahun_ajaran_id", ta.id).eq("mapel_id", mapelId) : Promise.resolve({ data: [] }),
  ]);
  const listCp = (cp ?? []) as Cp[];
  const listTp = (tp ?? []) as DataTp[];
  const final = st?.status === "final";
  const jpStruktur = Object.fromEntries((struktur ?? []).map((s) => [s.tingkat, s.jp_minggu as number]));
  const ubahTp = sp.ubah ? listTp.find((t) => t.id === sp.ubah) : undefined;
  const ubahCp = sp.ubahCp ? listCp.find((t) => t.id === sp.ubahCp) : undefined;
  const teksCp = listCp.map((c) => `${c.elemen}: ${c.deskripsi}`).join("\n");

  return (
    <>
      <JudulHalaman judul="CP, TP & ATP" deskripsi="Capaian pembelajaran, tujuan pembelajaran beserta KKTP, dan alurnya per semester. Dipakai untuk modul ajar dan rapor." aksi={<TombolCetak label="Cetak ATP" />} />
      <NavKurikulum />
      <Notifikasi kode={sp.pesan} />
      <form className="mb-6 flex flex-wrap items-end gap-3 print:hidden">
        <label className="text-sm">Mapel<br />
          <select name="mapel" defaultValue={mapelId} className="rounded-xl border border-black/15 bg-white px-3 py-2">
            {pilihanMapel.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
          </select>
        </label>
        <label className="text-sm">Fase<br />
          <select name="fase" defaultValue={fase} className="rounded-xl border border-black/15 bg-white px-3 py-2">
            <option value="E">E (kelas X)</option><option value="F">F (kelas XI–XII)</option>
          </select>
        </label>
        <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Tampilkan</button>
        <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ring-1 ${final ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-amber-50 text-amber-900 ring-amber-200"}`}>
          ATP {final ? "final (terkunci)" : "draf"}
        </span>
      </form>
      <h2 className="mb-4 hidden text-2xl print:block">ATP {namaMapel} — Fase {fase}</h2>

      {kelola && (
        <Kartu className="mb-6 print:hidden">
          <form action={aturStatusAtp} className="flex flex-wrap items-end gap-3 text-sm">
            <input type="hidden" name="mapel_id" value={mapelId} /><input type="hidden" name="fase" value={fase} />
            <input type="hidden" name="status" value={final ? "draf" : "final"} />
            <label className="min-w-64 flex-1">Catatan kurikulum<br /><input name="catatan" defaultValue={st?.catatan ?? ""} maxLength={500} className="w-full rounded-xl border border-black/15 px-3 py-2" /></label>
            <button className={`rounded-full px-5 py-2.5 font-semibold ${final ? "ring-1 ring-black/15" : "bg-emerald-700 text-white"}`}>
              {final ? "Buka kunci (kembali ke draf)" : "Tetapkan ATP final"}
            </button>
          </form>
          <p className="mt-2 text-xs text-black/50">ATP final dikunci untuk guru; perubahan berikutnya melalui kurikulum.</p>
        </Kartu>
      )}
      {!kelola && st?.catatan && <p className="mb-6 rounded-xl bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-200">Catatan kurikulum: {st.catatan}</p>}

      <section id="cp" className="mb-8">
        <h2 className="mb-3 text-3xl">Capaian Pembelajaran — {namaMapel}, fase {fase}</h2>
        <div className={`grid gap-6 ${boleh ? "xl:grid-cols-[1fr_380px]" : ""}`}>
          <div className="space-y-3">
            {listCp.length === 0 ? <KosongAdmin teks="Belum ada CP. Salin CP resmi dari BSKAP per elemen." /> : listCp.map((c) => (
              <div key={c.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <div className="flex items-start gap-3">
                  <h3 className="flex-1 font-semibold">{c.elemen}</h3>
                  {boleh && (
                    <span className="flex gap-3 text-xs print:hidden">
                      <Link href={`${dasar}&ubahCp=${c.id}#cp`} className="font-semibold text-blue-teks underline">Ubah</Link>
                      <form action={arsipCp}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="kembali" value={dasar} /><button className="font-semibold text-blue-teks underline">Arsip</button></form>
                    </span>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-line text-sm text-black/70">{c.deskripsi}</p>
              </div>
            ))}
          </div>
          {boleh && (
            <Kartu className="self-start print:hidden">
              <h3 className="mb-3 text-xl">{ubahCp ? "Ubah elemen CP" : "Tambah elemen CP"}</h3>
              <FormCp key={ubahCp?.id ?? "baru"} mapel_id={mapelId} fase={fase} data={ubahCp} />
            </Kartu>
          )}
        </div>
      </section>

      <section id="tp" className="mb-8">
        <h2 className="mb-3 text-3xl">Tujuan Pembelajaran & KKTP (alur)</h2>
        {tingkatOpsi.map((t) => {
          const isi = listTp.filter((x) => x.tingkat === t);
          const total = isi.reduce((a, x) => a + x.alokasi_jp, 0);
          return (
            <div key={t} className="mb-6">
              <h3 className="mb-2 font-semibold">
                Kelas {t} <span className="font-normal text-black/50">· {total} JP{jpStruktur[t] ? ` dari ±${jpStruktur[t] * 34} JP setahun (${jpStruktur[t]} JP/minggu)` : ""}</span>
              </h3>
              {[1, 2].map((s) => {
                const baris = isi.filter((x) => x.semester === s);
                return (
                  <div key={s} className="mb-3 overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead><tr className="bg-soft text-xs uppercase tracking-wider text-black/50">
                        <th className="w-20 px-3 py-2">Smt {s}</th><th className="px-3 py-2">Tujuan pembelajaran</th><th className="px-3 py-2">KKTP</th><th className="w-14 px-3 py-2 text-right">JP</th>{boleh && <th className="w-24 print:hidden" />}
                      </tr></thead>
                      <tbody>
                        {baris.length === 0 ? <tr><td colSpan={5} className="px-3 py-3 text-black/40">—</td></tr> : baris.map((x) => (
                          <tr key={x.id} className="border-t border-black/5 align-top">
                            <td className="px-3 py-2 font-semibold">{x.kode}</td>
                            <td className="px-3 py-2">{x.deskripsi}{x.elemen && <span className="block text-xs text-black/50">{x.elemen}</span>}</td>
                            <td className="px-3 py-2 text-black/70">{x.kktp}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{x.alokasi_jp}</td>
                            {boleh && (
                              <td className="px-3 py-2 text-right text-xs print:hidden">
                                <Link href={`${dasar}&ubah=${x.id}#form-tp`} className="font-semibold text-blue-teks underline">Ubah</Link>{" "}
                                <form action={arsipTp} className="inline"><input type="hidden" name="id" value={x.id} /><input type="hidden" name="kembali" value={dasar} /><button className="font-semibold text-blue-teks underline">Arsip</button></form>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          );
        })}
      </section>

      {boleh && (
        <div className="grid gap-6 xl:grid-cols-2 print:hidden">
          <Kartu>
            <h2 id="form-tp" className="mb-4 text-2xl">{ubahTp ? `Ubah ${ubahTp.kode || "TP"}` : "Tambah TP manual"}</h2>
            <FormTp key={ubahTp?.id ?? "baru"} mapel_id={mapelId} tingkatOpsi={tingkatOpsi} data={ubahTp} />
          </Kartu>
          <Kartu>
            <h2 className="mb-1 flex items-center gap-2 text-2xl">Asisten penyusun ATP <LabelAI /></h2>
            {aiAktif() ? (
              <>
                <p className="mb-4 text-sm text-black/60">AI menyusun draf TP berurutan, KKTP, dan alokasi JP dari CP di atas. Pilih yang sesuai, lalu simpan.</p>
                <AiTp mapel_id={mapelId} tingkatOpsi={tingkatOpsi} cp={teksCp} jpAwal={jpStruktur} />
              </>
            ) : <p className="text-sm text-black/60">Belum diaktifkan sekolah. Super admin dapat mengisi <code>ANTHROPIC_API_KEY</code> di Vercel (lihat panduan).</p>}
          </Kartu>
        </div>
      )}
      {listTp.length > 0 && aiAktif() && saya && (
        <Kartu className="mt-6 print:hidden">
          <h2 className="mb-1 flex items-center gap-2 text-2xl">Kerangka modul ajar <LabelAI /></h2>
          <p className="mb-4 text-sm text-black/60">Pilih 1–5 TP; AI menyusun kerangka modul ajar lengkap (kegiatan, asesmen, LKPD) yang bisa diunduh sebagai dokumen Word.</p>
          <AiModul tp={listTp.map((x) => ({ id: x.id, label: `${x.tingkat} smt ${x.semester} · ${x.kode} ${x.deskripsi}` }))} />
        </Kartu>
      )}
    </>
  );
}
