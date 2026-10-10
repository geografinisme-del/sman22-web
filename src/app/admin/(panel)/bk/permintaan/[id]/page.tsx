import Link from "next/link";
import { notFound } from "next/navigation";
import { JudulHalaman, Kartu, TombolLink } from "@/components/admin/ui";
import { prosesPermintaan } from "@/app/admin/actions-bk";
import { wajibIzin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { PRIORITAS_BK, STATUS_PERMINTAAN } from "@/lib/bk";
import { dekripsi } from "@/lib/bk-kripto";
import { Lencana, waktuWIB } from "@/lib/lms";

export const metadata = { title: "Permintaan BK" };

export default async function Permintaan({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ galat?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase } = await wajibIzin("bk.konseling");
  const { data: r } = await supabase.from("permintaan_konseling").select("id, siswa_id, sumber, topik, prioritas, waktu_preferensi, status, kasus_id, catatan_untuk_pemohon, created_at, kategori, siswa(nama, nisn)").eq("id", id).maybeSingle();
  if (!r) notFound();
  const [{ data: enc }, { data: kasusLain }] = await Promise.all([
    supabase.rpc("baca_permintaan_bk", { p_id: id }),
    supabase.from("kasus_bk").select("id, kode, status").eq("siswa_id", r.siswa_id).in("status", ["aktif", "pemantauan"]),
  ]);
  const siswa = r.siswa as unknown as { nama: string; nisn: string } | null;
  return (
    <>
      <JudulHalaman judul={r.topik} deskripsi={`${siswa?.nama} · ${r.sumber === "ortu" ? "diajukan orang tua" : "diajukan siswa"} · ${waktuWIB(r.created_at, true)}`}
        aksi={<TombolLink href="/admin/bk" sekunder>← BK</TombolLink>} />
      {sp.galat && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{sp.galat}</p>}
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Kartu>
          <div className="mb-3 flex gap-2"><Lencana s={r.prioritas} peta={PRIORITAS_BK} /><Lencana s={r.status} peta={STATUS_PERMINTAAN} /></div>
          <p className="text-xs uppercase tracking-widest text-black/50">🔒 Cerita</p>
          <p className="mt-1 whitespace-pre-line">{dekripsi(enc as string) || <span className="text-black/50">(tidak ada cerita tertulis)</span>}</p>
          <p className="mt-4 text-sm"><strong>Waktu yang memungkinkan:</strong> {r.waktu_preferensi || "—"}</p>
          {r.kasus_id && <p className="mt-2 text-sm"><Link href={`/admin/bk/kasus/${r.kasus_id}`} className="font-semibold text-brand-700 underline">Buka kasus terkait →</Link></p>}
        </Kartu>
        <Kartu className="self-start">
          <h2 className="mb-3 font-serif text-2xl">Tanggapi</h2>
          <form action={prosesPermintaan} className="space-y-3 text-sm">
            <input type="hidden" name="id" value={r.id} />
            <label className="block font-semibold">Balasan untuk pemohon (terlihat di portal)
              <textarea name="catatan" defaultValue={r.catatan_untuk_pemohon} maxLength={500} rows={3} className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2 font-normal" placeholder="mis. Kita bertemu Selasa jam istirahat di ruang BK." /></label>
            {(kasusLain ?? []).length > 0 && (
              <label className="block font-semibold">Gabungkan ke kasus
                <select name="kasus_id" className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2 font-normal">
                  <option value="">Buat kasus baru</option>{(kasusLain ?? []).map((k) => <option key={k.id} value={k.id}>{k.kode} ({k.status})</option>)}
                </select></label>
            )}
            <div className="flex flex-wrap gap-2">
              {r.status === "baru" && <button name="aksi" value="terima" className="rounded-full bg-brand-900 px-4 py-2 font-semibold text-white">Terima & buka kasus</button>}
              <button name="aksi" value="balas" className="rounded-full px-4 py-2 font-semibold ring-1 ring-black/15">Kirim balasan</button>
              {r.status === "baru" && <button name="aksi" value="tolak" className="rounded-full px-4 py-2 font-semibold text-merah ring-1 ring-merah/30">Tidak dapat dilayani</button>}
            </div>
          </form>
          <p className="mt-3 text-xs text-black/50">Pemohon diberi tahu di aplikasi (tanpa WhatsApp). Pembukaan cerita ini tercatat bila sudah tertaut ke kasus.</p>
        </Kartu>
      </div>
    </>
  );
}
