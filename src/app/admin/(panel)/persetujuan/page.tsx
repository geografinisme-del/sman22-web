import { JudulHalaman, KosongAdmin, Lencana, Notifikasi } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { formatTanggal, formatWaktu } from "@/lib/format";
import { putuskanBerita } from "../../actions-situs";

export const metadata = { title: "Persetujuan Konten" };

export default async function Persetujuan({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const { pesan } = await searchParams;
  const { supabase } = await wajibIzin("konten.terbitkan");
  const [{ data: menunggu }, { data: terakhir }] = await Promise.all([
    supabase
      .from("berita")
      .select("id, judul, ringkasan, kategori, tanggal, gambar_url, tayang_mulai, diajukan_oleh, diajukan_pada")
      .eq("status", "diajukan")
      .is("deleted_at", null)
      .order("diajukan_pada"),
    supabase
      .from("berita")
      .select("id, judul, status, disetujui_pada, catatan_review, updated_at")
      .in("status", ["terbit", "ditolak"])
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);
  const ids = [...new Set((menunggu ?? []).map((b) => b.diajukan_oleh).filter(Boolean))] as string[];
  const { data: orang } = ids.length ? await supabase.from("pengguna").select("user_id, nama").in("user_id", ids) : { data: [] };
  const nama = new Map((orang ?? []).map((o) => [o.user_id, o.nama]));

  return (
    <>
      <JudulHalaman judul="Persetujuan Konten" deskripsi="Berita dari tim humas tampil di website setelah Anda setujui. Buka pratinjau untuk membaca versi lengkapnya." />
      <Notifikasi kode={pesan} />
      {!menunggu?.length ? (
        <KosongAdmin teks="Tidak ada berita yang menunggu persetujuan." />
      ) : (
        <ul className="space-y-4">
          {menunggu.map((b) => (
            <li key={b.id} className="flex flex-col gap-4 rounded-2xl bg-white p-5 ring-1 ring-black/5 lg:flex-row">
              <div className="h-28 w-full shrink-0 overflow-hidden rounded-xl bg-krem-tua lg:w-44">
                {b.gambar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.gambar_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-2xl leading-tight">{b.judul}</p>
                <p className="mt-1 text-sm text-black/60">{b.ringkasan}</p>
                <p className="mt-2 text-xs text-black/50">
                  {b.kategori} · {formatTanggal(b.tanggal)} · diajukan {nama.get(b.diajukan_oleh ?? "") ?? "humas"}
                  {b.diajukan_pada && `, ${formatWaktu(b.diajukan_pada)}`}
                  {b.tayang_mulai && ` · dijadwalkan tayang ${formatWaktu(b.tayang_mulai)}`}
                </p>
                <a href={`/pratinjau/berita/${b.id}`} target="_blank" rel="noopener" className="mt-2 inline-block text-sm font-semibold text-brand-700 underline">
                  Baca pratinjau lengkap ↗
                </a>
              </div>
              <form action={putuskanBerita} className="flex w-full flex-col gap-2 lg:w-72">
                <input type="hidden" name="id" value={b.id} />
                <textarea name="catatan" rows={2} maxLength={500} placeholder="Catatan (wajib bila dikembalikan)" aria-label={`Catatan untuk ${b.judul}`} className="rounded-xl border border-black/15 px-3 py-2 text-sm" />
                <div className="flex gap-2">
                  <button name="keputusan" value="setuju" className="flex-1 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Setujui & terbitkan</button>
                  <button name="keputusan" value="kembalikan" className="flex-1 rounded-full px-4 py-2 text-sm font-semibold text-merah ring-1 ring-red-200 hover:bg-red-50">Kembalikan</button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      )}
      {!!terakhir?.length && (
        <section className="mt-10">
          <h2 className="font-serif text-2xl">Keputusan terakhir</h2>
          <ul className="mt-3 divide-y divide-black/5 rounded-2xl bg-white ring-1 ring-black/5">
            {terakhir.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>{b.judul}{b.status === "ditolak" && b.catatan_review && <span className="block text-xs text-black/50">Catatan: {b.catatan_review}</span>}</span>
                <Lencana warna={b.status === "terbit" ? "hijau" : "kuning"}>{b.status === "terbit" ? "Terbit" : "Dikembalikan"}</Lencana>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
