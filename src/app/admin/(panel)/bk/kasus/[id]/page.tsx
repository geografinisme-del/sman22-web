import { notFound } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi, TombolLink } from "@/components/admin/ui";
import { FormKasus, FormRujukanLuar, FormSesi, FormTindakLanjut } from "@/components/bk/Form";
import { NavBk } from "@/components/bk/Nav";
import { punya, wajibIzin } from "@/lib/admin/auth";
import { hariIniWIB } from "@/lib/admin/absensi";
import { daftarStaf } from "@/lib/admin/nama";
import { uuid } from "@/lib/admin/schema";
import { ASAL_KASUS, JENIS_RUJUKAN_LUAR, JENIS_SESI, MODE_SESI, PRIORITAS_BK, STATUS_KASUS, STATUS_SESI, STATUS_TL } from "@/lib/bk";
import { dekripsi, sidik } from "@/lib/bk-kripto";
import { Lencana, keLokalWIB, waktuWIB } from "@/lib/lms";
import { tgl } from "@/lib/perpus";

export const metadata = { title: "Kasus BK", robots: { index: false } };
type Buka = { asesmen_enc: string; ringkasan_enc: string; sesi: { id: string; catatan_enc: string }[]; permintaan: { id: string; topik: string; pesan_enc: string; sumber: string; waktu_preferensi: string; dibuat: string }[] };

export default async function Kasus({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesan?: string; alasan?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, akses } = await wajibIzin("bk.konseling");
  const { data: k } = await supabase.from("kasus_bk")
    .select("id, kode, siswa_id, kategori, prioritas, risiko, status, konselor_id, asal, saran_wali, dibuka, ditutup, retensi_sampai, isi_dimusnahkan, siswa(nama, nisn)")
    .eq("id", id).maybeSingle();
  if (!k) notFound();
  const siswa = k.siswa as unknown as { nama: string; nisn: string } | null;
  const { data: buka, error } = await supabase.rpc("buka_kasus_bk", { p_id: id, p_alasan: (sp.alasan ?? "").slice(0, 300) });
  if (error?.message === "PERLU_ALASAN") {
    return (
      <>
        <JudulHalaman judul={`Kasus ${k.kode}`} deskripsi="Kasus ini ditangani konselor lain." aksi={<TombolLink href="/admin/bk" sekunder>← BK</TombolLink>} />
        <Kartu className="max-w-xl">
          <form className="space-y-3">
            <label className="block text-sm font-semibold">Alasan membuka (tercatat di log akses)
              <input name="alasan" minLength={10} maxLength={300} required className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2 font-normal" placeholder="mis. Menggantikan konselor yang cuti" /></label>
            <button className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">Buka kasus</button>
          </form>
        </Kartu>
      </>
    );
  }
  const b = (buka ?? { asesmen_enc: "", ringkasan_enc: "", sesi: [], permintaan: [] }) as Buka;
  const catatan = new Map(b.sesi.map((x) => [x.id, dekripsi(x.catatan_enc)]));
  const [{ data: ss }, { data: tl }, { data: rl }, { data: kat }, staf, { data: lg }] = await Promise.all([
    supabase.from("sesi_konseling").select("id, mulai, durasi_menit, jenis, mode, tempat, status").eq("kasus_id", id).order("mulai", { ascending: false }),
    supabase.from("tindak_lanjut_bk").select("id, rencana, pihak, tenggat, status, hasil").eq("kasus_id", id).order("created_at"),
    supabase.from("rujukan_eksternal_bk").select("id, lembaga, jenis, tanggal, alasan, status").eq("kasus_id", id).order("tanggal"),
    supabase.from("kategori_konseling").select("kode, nama").eq("aktif", true).order("urutan"),
    daftarStaf(supabase),
    supabase.from("log_akses_bk").select("id, user_id, aksi, alasan, waktu").eq("kasus_id", id).order("waktu", { ascending: false }).limit(10),
  ]);
  const asesmen = dekripsi(b.asesmen_enc), ringkasan = dekripsi(b.ringkasan_enc);
  const kategori = (kat ?? []).map((x) => ({ id: x.kode, nama: x.nama }));
  const hari = hariIniWIB();
  return (
    <>
      <JudulHalaman judul={siswa?.nama ?? "Kasus"} deskripsi={`${k.kode} · NISN ${siswa?.nisn ?? "—"} · ${ASAL_KASUS[k.asal]} · dibuka ${tgl(k.dibuka)}${k.ditutup ? ` · ditutup ${tgl(k.ditutup)}` : ""}`}
        aksi={<TombolLink href="/admin/bk" sekunder>← BK</TombolLink>} />
      <NavBk konselor agregat={punya(akses, "bk.agregat")} />
      <Notifikasi kode={sp.pesan} />
      <div className="mb-4 flex flex-wrap gap-2"><Lencana s={k.status} peta={STATUS_KASUS} /><Lencana s={k.prioritas} peta={PRIORITAS_BK} />
        {k.retensi_sampai && <span className="text-xs text-black/50">isi disimpan sampai {tgl(k.retensi_sampai)}</span>}
        {k.isi_dimusnahkan && <span className="rounded bg-black/5 px-2 text-xs">isi sudah dimusnahkan (masa simpan berakhir)</span>}</div>
      <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
        <div className="space-y-6">
          {b.permintaan.length > 0 && (
            <Kartu>
              <h2 className="mb-2 text-xl">Permintaan awal</h2>
              {b.permintaan.map((r) => (
                <div key={r.id} className="border-t border-black/5 py-2 text-sm first:border-0">
                  <p className="font-semibold">{r.topik} <span className="font-normal text-black/50">· {r.sumber === "ortu" ? "orang tua" : "siswa"} · {waktuWIB(r.dibuat)}</span></p>
                  <p className="whitespace-pre-line">{dekripsi(r.pesan_enc) || "—"}</p>
                </div>
              ))}
            </Kartu>
          )}
          <Kartu>
            <h2 className="mb-3 text-2xl">Sesi ({(ss ?? []).length})</h2>
            <ul className="space-y-3">{(ss ?? []).map((x) => (
              <li key={x.id} className="rounded-xl bg-soft/60 p-3 text-sm">
                <p><strong>{waktuWIB(x.mulai, true)}</strong> · {JENIS_SESI[x.jenis]} · {MODE_SESI[x.mode]} · {x.tempat} · <span className={x.status === "terjadwal" ? "font-semibold text-sky-800" : ""}>{STATUS_SESI[x.status]}</span></p>
                {catatan.get(x.id) && <p className="mt-1 whitespace-pre-line">{catatan.get(x.id)}</p>}
                {!k.isi_dimusnahkan && (
                  <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-blue-teks">Ubah / tulis catatan</summary>
                    <div className="mt-2"><FormSesi kasus_id={id} d={{ ...x, mulai: keLokalWIB(x.mulai), catatan: catatan.get(x.id) ?? "", sidik: sidik(catatan.get(x.id) ?? "") }} /></div>
                  </details>
                )}
              </li>))}</ul>
            {k.status !== "selesai" && <details className="mt-4 border-t border-black/5 pt-3"><summary className="cursor-pointer font-semibold">+ Jadwalkan sesi</summary><div className="mt-3"><FormSesi kasus_id={id} /></div></details>}
          </Kartu>
          <Kartu>
            <h2 className="mb-3 text-2xl">Tindak lanjut</h2>
            <ul className="space-y-2 text-sm">{(tl ?? []).map((t) => (
              <li key={t.id} className="rounded-xl bg-soft/60 p-3">
                <p><strong>{t.rencana}</strong> · {t.pihak}{t.tenggat && ` · ${tgl(t.tenggat)}`} · <span className={t.status === "selesai" ? "text-emerald-700" : t.tenggat && t.tenggat < hari ? "font-semibold text-blue-teks" : ""}>{STATUS_TL[t.status]}</span></p>
                {t.hasil && <p className="mt-1 text-black/70">{t.hasil}</p>}
                <details className="mt-1"><summary className="cursor-pointer text-xs font-semibold text-blue-teks">Perbarui</summary><div className="mt-2"><FormTindakLanjut kasus_id={id} d={t} /></div></details>
              </li>))}</ul>
            <div className="mt-4 border-t border-black/5 pt-3"><FormTindakLanjut kasus_id={id} /></div>
          </Kartu>
          <Kartu>
            <h2 className="mb-3 text-2xl">Rujukan ke luar sekolah</h2>
            {(rl ?? []).length === 0 ? <p className="text-sm text-black/50">Belum ada.</p> : (
              <ul className="text-sm">{(rl ?? []).map((r) => <li key={r.id}>{tgl(r.tanggal)} · <strong>{r.lembaga}</strong> ({JENIS_RUJUKAN_LUAR[r.jenis]}) · {r.status}{r.alasan && ` — ${r.alasan}`}</li>)}</ul>
            )}
            <details className="mt-3 border-t border-black/5 pt-3"><summary className="cursor-pointer text-sm font-semibold">+ Catat rujukan</summary><div className="mt-3"><FormRujukanLuar kasus_id={id} hari={hari} /></div></details>
          </Kartu>
        </div>
        <div className="space-y-6 self-start">
          <Kartu>
            <h2 className="mb-4 text-2xl">Data kasus</h2>
            <FormKasus kategori={kategori} konselor={staf} terkunci={k.isi_dimusnahkan}
              d={{ id, kategori: k.kategori, prioritas: k.prioritas, risiko: k.risiko, status: k.status, konselor_id: k.konselor_id, saran_wali: k.saran_wali,
                   asesmen, ringkasan, sidik_asesmen: sidik(asesmen), sidik_ringkasan: sidik(ringkasan) }} />
          </Kartu>
          <Kartu>
            <h2 className="mb-2 font-semibold">Log akses terakhir</h2>
            <ul className="text-xs text-black/60">{(lg ?? []).map((l) => (
              <li key={l.id}>{waktuWIB(l.waktu)} · {l.aksi === "buka" ? "dibuka" : l.aksi === "ubah_catatan" ? "catatan diubah" : "dimusnahkan"}{l.alasan && ` — ${l.alasan}`}</li>
            ))}</ul>
          </Kartu>
        </div>
      </div>
    </>
  );
}
