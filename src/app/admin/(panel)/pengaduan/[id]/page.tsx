import { notFound } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi, TombolLink } from "@/components/admin/ui";
import { FormProsesAduan } from "@/components/humas/Form";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { daftarStaf } from "@/lib/admin/nama";
import { uuid } from "@/lib/admin/schema";
import { KATEGORI_ADUAN, STATUS_ADUAN } from "@/lib/humas";
import { Lencana } from "@/lib/lms";

export const metadata = { title: "Pengaduan" };

export default async function DetailAduan({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesan?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, akses } = await wajibLogin();
  const { data: a } = await supabase.from("pengaduan").select("*").eq("id", id).maybeSingle();
  if (!a) notFound();
  const [guru, { data: riw }] = await Promise.all([
    daftarStaf(supabase),
    supabase.from("riwayat_pengaduan").select("id, status, tanggapan, internal, pic_id, oleh, waktu").eq("pengaduan_id", id).order("waktu", { ascending: false }),
  ]);
  const riwayat = (riw ?? []) as { id: number; status: string; tanggapan: string; internal: string; pic_id: string | null; waktu: string }[];
  const namaGuru = new Map(guru.map((g) => [g.id, g.nama]));
  await supabase.rpc("catat_aktivitas", { nama_tabel: "pengaduan", aksi: "LIHAT", keterangan: { tiket: a.tiket } });
  return (
    <>
      <JudulHalaman judul={a.judul} deskripsi={`${a.tiket} · ${KATEGORI_ADUAN[a.kategori as keyof typeof KATEGORI_ADUAN]} · ${new Date(a.created_at).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" })}`}
        aksi={<TombolLink href="/admin/pengaduan" sekunder>← Semua pengaduan</TombolLink>} />
      <Notifikasi kode={sp.pesan} />
      {a.rahasia && <p className="mb-4 rounded-xl bg-violet-50 p-4 text-sm text-violet-900 ring-1 ring-violet-200"><strong>Rahasia.</strong> Jaga kerahasiaan pelapor & korban. Koordinasikan dengan BK/kesiswaan; catat tindak lanjut di catatan internal. Setiap pembukaan halaman ini tercatat di log.</p>}
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Kartu>
          <div className="mb-3 flex items-center gap-2"><Lencana s={a.status} peta={STATUS_ADUAN} /></div>
          <p className="whitespace-pre-line">{a.isi}</p>
          <dl className="mt-5 grid grid-cols-[120px_1fr] gap-y-1 border-t border-black/5 pt-4 text-sm">
            <dt className="text-black/50">Pelapor</dt><dd>{a.anonim ? <em>dirahasiakan</em> : a.nama || "—"}{a.pelapor_id && " (akun terdaftar)"}</dd>
            <dt className="text-black/50">Kontak</dt><dd>{a.anonim ? "—" : a.kontak || "—"}</dd>
            {a.rating && <><dt className="text-black/50">Penilaian</dt><dd><span className="text-amber-500">{"★".repeat(a.rating)}</span>{a.komentar_rating && ` — ${a.komentar_rating}`}</dd></>}
          </dl>
          {riwayat.length > 0 && (
            <div className="mt-5 border-t border-black/5 pt-4">
              <h2 className="mb-2 font-semibold">Riwayat tindak lanjut</h2>
              <ol className="space-y-2 text-sm">{riwayat.map((r) => (
                <li key={r.id} className="border-l-2 border-line pl-3">
                  <p className="text-xs text-black/50">{new Date(r.waktu).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })} · {STATUS_ADUAN[r.status]?.label.split(" /")[0] ?? r.status}{r.pic_id && ` · PIC → ${namaGuru.get(r.pic_id) ?? "—"}`}</p>
                  {r.tanggapan && <p><span className="text-black/50">Tanggapan:</span> {r.tanggapan}</p>}
                  {r.internal && <p className="text-black/70"><span className="text-black/50">Internal:</span> {r.internal}</p>}
                </li>))}</ol>
            </div>
          )}
        </Kartu>
        {/* kepala sekolah (pengaduan.lihat) hanya membaca; tindak lanjut oleh bidangnya (database juga menolak) */}
        {punya(akses, "pengaduan.kelola") || punya(akses, "pengaduan.rahasia") || (a.pic_id && a.pic_id === (await supabase.rpc("pegawai_saya")).data) ? (
          <Kartu className="self-start">
            <h2 className="mb-4 text-2xl">Tindak lanjut</h2>
            <FormProsesAduan d={a} guru={guru} />
          </Kartu>
        ) : (
          <Kartu className="self-start">
            <h2 className="mb-2 text-2xl">Tindak lanjut</h2>
            <p className="text-sm text-black/60">Anda dapat membaca pengaduan ini. Tindak lanjut dilakukan oleh {a.rahasia ? "guru BK atau Wakasek Kesiswaan" : "Wakasek Humas"} atau PIC yang ditugaskan.</p>
          </Kartu>
        )}
      </div>
    </>
  );
}
