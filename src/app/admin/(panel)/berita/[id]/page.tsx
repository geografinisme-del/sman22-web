import { notFound } from "next/navigation";
import { FormArsip, JudulHalaman, Lencana, Notifikasi, TombolLink } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { bolehTerbit } from "@/lib/admin/konten";
import { uuid } from "@/lib/admin/schema";
import { formatWaktu, keInputWaktu } from "@/lib/format";
import { pulihkanRevisi } from "../../../actions-situs";
import { FormBerita } from "../FormBerita";

export const metadata = { title: "Ubah berita" };

const STATUS: Record<string, string> = { draft: "Draf", diajukan: "Menunggu persetujuan", terbit: "Terbit", ditolak: "Dikembalikan" };

export default async function UbahBerita({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesan?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, akses } = await wajibIzin("konten.kelola");
  const [{ data }, { data: revisi }, boleh] = await Promise.all([
    supabase
      .from("berita")
      .select("id, judul, slug, kategori, tanggal, ringkasan, isi, status, gambar_url, tayang_mulai, catatan_review, diajukan_pada, disetujui_pada")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase.from("berita_revisi").select("id, data, status, dibuat_oleh, dibuat_pada").eq("berita_id", id).order("dibuat_pada", { ascending: false }).limit(30),
    bolehTerbit(supabase, akses),
  ]);
  if (!data) notFound();
  const ids = [...new Set((revisi ?? []).map((r) => r.dibuat_oleh).filter(Boolean))] as string[];
  const { data: orang } = ids.length ? await supabase.from("pengguna").select("user_id, nama").in("user_id", ids) : { data: [] };
  const nama = new Map((orang ?? []).map((o) => [o.user_id, o.nama]));

  return (
    <>
      <JudulHalaman
        judul="Ubah berita"
        deskripsi={`Status: ${STATUS[data.status] ?? data.status}${data.tayang_mulai && new Date(data.tayang_mulai) > new Date() ? ` · tayang ${formatWaktu(data.tayang_mulai)}` : ""}`}
        aksi={
          <div className="flex flex-wrap items-center gap-2">
            <TombolLink href={`/pratinjau/berita/${data.id}`} sekunder>Pratinjau ↗</TombolLink>
            <FormArsip tabel="berita" id={data.id} judul={data.judul} kembali="/admin/berita" />
            <TombolLink href="/admin/berita" sekunder>← Kembali</TombolLink>
          </div>
        }
      />
      <Notifikasi kode={sp.pesan} />
      <FormBerita bolehTerbit={boleh} data={{ ...data, tayang_mulai: keInputWaktu(data.tayang_mulai) }} />

      <section className="mt-10">
        <h2 className="font-serif text-3xl">Riwayat revisi</h2>
        <p className="mt-1 text-sm text-black/60">Setiap kali isi berita diubah, versi sebelumnya disimpan di sini dan bisa dipulihkan.</p>
        {!revisi?.length ? (
          <p className="mt-3 text-sm text-black/50">Belum ada revisi.</p>
        ) : (
          <ul className="mt-4 divide-y divide-black/5 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
            {revisi.map((r, i) => {
              const d = r.data as { judul: string; ringkasan: string; isi: string };
              return (
                <li key={r.id} className="p-4">
                  <details>
                    <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                      <strong>Versi {revisi.length - i}</strong>
                      <span className="text-black/50">{formatWaktu(r.dibuat_pada)} · diubah oleh {nama.get(r.dibuat_oleh ?? "") ?? "—"}</span>
                      <Lencana>{STATUS[r.status] ?? r.status}</Lencana>
                    </summary>
                    <div className="mt-3 rounded-xl bg-krem p-4 text-sm">
                      <p className="font-semibold">{d.judul}</p>
                      {d.ringkasan && <p className="mt-1 text-black/60">{d.ringkasan}</p>}
                      <p className="mt-2 line-clamp-6 whitespace-pre-line text-black/70">{d.isi}</p>
                    </div>
                    <form action={pulihkanRevisi} className="mt-3">
                      <input type="hidden" name="revisi" value={r.id} />
                      <button className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15 hover:bg-black/5">Pulihkan versi ini</button>
                    </form>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
