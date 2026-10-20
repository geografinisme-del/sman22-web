import Link from "next/link";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { NavBk } from "@/components/bk/Nav";
import { punya, wajibIzin } from "@/lib/admin/auth";
import { hariIniWIB } from "@/lib/admin/absensi";
import { PRIORITAS_BK, STATUS_KASUS, STATUS_PERMINTAAN, JENIS_SESI } from "@/lib/bk";
import { bkSiap } from "@/lib/bk-kripto";
import { Lencana, waktuWIB } from "@/lib/lms";
import { tgl } from "@/lib/perpus";

export const metadata = { title: "Bimbingan & Konseling" };
type P = { id: string; topik: string; prioritas: string; sumber: string; status: string; created_at: string; kasus_id: string | null; siswa: { nama: string } | null };
type K = { id: string; kode: string; status: string; prioritas: string; risiko: string; dibuka: string; konselor_id: string | null; siswa: { nama: string } | null };
type S = { id: string; mulai: string; jenis: string; tempat: string; kasus_id: string; kasus: { kode: string; siswa: { nama: string } | null } | null };

export default async function Bk({ searchParams }: { searchParams: Promise<{ pesan?: string; semua?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibIzin("bk.konseling");
  const hari = hariIniWIB();
  const { data: saya } = await supabase.rpc("pegawai_saya");
  const [{ data: pm }, { data: ks }, { data: ss }, { data: tl }, { count: rujukanBaru }] = await Promise.all([
    supabase.from("permintaan_konseling").select("id, topik, prioritas, sumber, status, created_at, kasus_id, siswa(nama)").in("status", ["baru"]).order("created_at"),
    (() => { let q = supabase.from("kasus_bk").select("id, kode, status, prioritas, risiko, dibuka, konselor_id, siswa(nama)").in("status", ["aktif", "pemantauan"]).order("dibuka", { ascending: false });
      if (!sp.semua && saya) q = q.eq("konselor_id", saya); return q; })(),
    supabase.from("sesi_konseling").select("id, mulai, jenis, tempat, kasus_id, kasus:kasus_bk(kode, siswa(nama))").eq("status", "terjadwal")
      .gte("mulai", `${hari}T00:00:00+07:00`).lt("mulai", new Date(Date.parse(`${hari}T00:00:00+07:00`) + 8 * 864e5).toISOString()).order("mulai"),
    supabase.from("tindak_lanjut_bk").select("id, rencana, tenggat, kasus_id, kasus:kasus_bk(kode)").in("status", ["rencana", "berjalan"]).lte("tenggat", hari).order("tenggat"),
    supabase.from("rujukan_bk").select("id", { count: "exact", head: true }).eq("status", "baru"),
  ]);
  const permintaan = (pm ?? []) as unknown as P[];
  const kasus = (ks ?? []) as unknown as K[];
  const sesi = (ss ?? []) as unknown as S[];
  const tindak = (tl ?? []) as unknown as { id: string; rencana: string; tenggat: string; kasus_id: string; kasus: { kode: string } | null }[];
  return (
    <>
      <JudulHalaman judul="Bimbingan & Konseling" deskripsi="Ruang kerja guru BK. Isi konseling terenkripsi; setiap pembukaan kasus tercatat di log akses." />
      <NavBk konselor agregat={punya(akses, "bk.agregat")} />
      <Notifikasi kode={sp.pesan} />
      {!bkSiap && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200"><strong>BK_KUNCI belum dipasang.</strong> Catatan rahasia (asesmen, catatan sesi, cerita siswa) belum bisa disimpan. Tambahkan BK_KUNCI di Vercel (lihat panduan) lalu Redeploy.</p>}
      <div className="grid gap-6 xl:grid-cols-2">
        <Kartu>
          <h2 className="mb-3 text-2xl">Permintaan layanan baru ({permintaan.length})</h2>
          {permintaan.length === 0 ? <p className="text-sm text-black/50">Tidak ada.</p> : (
            <ul className="divide-y divide-black/5 text-sm">{permintaan.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
                <Lencana s={r.prioritas} peta={PRIORITAS_BK} />
                <Link href={`/admin/bk/permintaan/${r.id}`} className="flex-1 font-medium hover:underline">{r.siswa?.nama} — {r.topik}</Link>
                <span className="text-xs text-black/50">{r.sumber === "ortu" ? "dari orang tua" : "dari siswa"} · {waktuWIB(r.created_at)}</span>
              </li>))}</ul>
          )}
          {(rujukanBaru ?? 0) > 0 && <p className="mt-3 text-sm"><Link href="/admin/rujukan-bk" className="font-semibold text-blue-teks underline">{rujukanBaru} rujukan baru dari guru/wali →</Link></p>}
        </Kartu>
        <Kartu>
          <h2 className="mb-3 text-2xl">Jadwal 7 hari</h2>
          {sesi.length === 0 ? <p className="text-sm text-black/50">Belum ada sesi terjadwal.</p> : (
            <ul className="divide-y divide-black/5 text-sm">{sesi.map((x) => (
              <li key={x.id} className="flex gap-3 py-2"><span className="w-36 shrink-0 text-black/60">{waktuWIB(x.mulai)}</span>
                <Link href={`/admin/bk/kasus/${x.kasus_id}`} className="flex-1 hover:underline">{x.kasus?.siswa?.nama} <span className="font-mono text-xs text-black/50">{x.kasus?.kode}</span></Link>
                <span className="text-black/50">{JENIS_SESI[x.jenis]} · {x.tempat}</span></li>))}</ul>
          )}
          {tindak.length > 0 && (
            <div className="mt-4 border-t border-black/5 pt-3">
              <p className="mb-1 font-semibold text-amber-800">Tindak lanjut jatuh tempo</p>
              <ul className="text-sm">{tindak.map((t) => <li key={t.id}><Link href={`/admin/bk/kasus/${t.kasus_id}`} className="hover:underline"><span className="font-mono text-xs">{t.kasus?.kode}</span> · {t.rencana} · {tgl(t.tenggat)}</Link></li>)}</ul>
            </div>
          )}
        </Kartu>
      </div>
      <Kartu className="mt-6">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="flex-1 text-2xl">Kasus berjalan ({kasus.length})</h2>
          <Link href={sp.semua ? "?" : "?semua=1"} className="text-sm underline">{sp.semua ? "Hanya kasus saya" : "Semua konselor"}</Link>
        </div>
        {kasus.length === 0 ? <p className="text-sm text-black/50">Tidak ada.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead><tr className="text-xs uppercase tracking-wider text-black/50"><th className="py-2">Kode</th><th>Siswa</th><th>Status</th><th>Prioritas</th><th>Dibuka</th></tr></thead>
              <tbody>{kasus.map((k) => (
                <tr key={k.id} className="border-t border-black/5">
                  <td className="py-2 font-mono text-xs">{k.kode}</td>
                  <td><Link href={`/admin/bk/kasus/${k.id}`} className="font-medium hover:underline">{k.siswa?.nama}</Link>{k.risiko === "tinggi" && <span className="ml-2 rounded bg-red-100 px-1.5 text-xs font-semibold text-red-800">risiko tinggi</span>}</td>
                  <td><Lencana s={k.status} peta={STATUS_KASUS} /></td>
                  <td><Lencana s={k.prioritas} peta={PRIORITAS_BK} /></td>
                  <td>{tgl(k.dibuka)}</td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
      </Kartu>
      <p className="mt-4 text-xs text-black/50">Status permintaan: {Object.values(STATUS_PERMINTAAN).map((s) => s.label).join(" · ")}. Wali kelas tidak melihat isi konseling — hanya saran yang Anda bagikan.</p>
    </>
  );
}
