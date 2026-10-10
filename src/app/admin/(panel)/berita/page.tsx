import Link from "next/link";
import { FormArsip, JudulHalaman, KosongAdmin, Lencana, Notifikasi, TombolLink } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { formatTanggal, formatWaktu } from "@/lib/format";

export const metadata = { title: "Berita" };

export default async function AdminBerita({ searchParams }: { searchParams: Promise<{ pesan?: string; cari?: string }> }) {
  const { pesan, cari } = await searchParams;
  const { supabase } = await wajibIzin("konten.kelola");
  let q = supabase
    .from("berita")
    .select("id, judul, slug, kategori, tanggal, status, gambar_url, tayang_mulai")
    .is("deleted_at", null)
    .order("tanggal", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);
  const kataKunci = (cari ?? "").trim().slice(0, 100);
  if (kataKunci) q = q.ilike("judul", `%${kataKunci.replace(/[%_\\]/g, "\\$&")}%`);
  const { data: list, error } = await q;

  return (
    <>
      <JudulHalaman judul="Berita" deskripsi="Tulis, ubah, dan terbitkan berita sekolah." aksi={<TombolLink href="/admin/berita/baru">+ Tulis berita</TombolLink>} />
      <Notifikasi kode={pesan} />

      <form className="mb-6" role="search">
        <label htmlFor="cari" className="sr-only">
          Cari berita
        </label>
        <input
          id="cari"
          name="cari"
          defaultValue={kataKunci}
          placeholder="Cari judul berita…"
          className="w-full rounded-full border border-black/15 bg-white px-5 py-3 outline-none focus:border-brand-600 sm:max-w-sm"
        />
      </form>

      {error ? (
        <KosongAdmin teks="Gagal memuat berita. Muat ulang halaman." />
      ) : !list || list.length === 0 ? (
        <KosongAdmin
          teks={kataKunci ? `Tidak ada berita dengan kata "${kataKunci}".` : "Belum ada berita."}
          aksi={!kataKunci && <TombolLink href="/admin/berita/baru">Tulis berita pertama</TombolLink>}
        />
      ) : (
        <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          {list.map((b) => (
            <li key={b.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-krem-tua">
                {b.gambar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.gambar_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/berita/${b.id}`} className="font-semibold hover:text-brand-700 hover:underline">
                  {b.judul}
                </Link>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-black/50">
                  {b.status === "terbit" ? (
                    b.tayang_mulai && new Date(b.tayang_mulai) > new Date() ? <Lencana warna="kuning">Terjadwal {formatWaktu(b.tayang_mulai)}</Lencana> : <Lencana warna="hijau">Terbit</Lencana>
                  ) : b.status === "diajukan" ? (
                    <Lencana warna="kuning">Menunggu persetujuan</Lencana>
                  ) : b.status === "ditolak" ? (
                    <Lencana warna="kuning">Dikembalikan</Lencana>
                  ) : (
                    <Lencana>Draf</Lencana>
                  )}
                  {b.kategori} · {formatTanggal(b.tanggal)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {b.status === "terbit" && (
                  <a href={`/berita/${b.slug}`} target="_blank" rel="noopener" className="rounded-full px-3 py-1.5 text-sm hover:bg-black/5">
                    Lihat ↗
                  </a>
                )}
                {b.status !== "terbit" && (
                  <a href={`/pratinjau/berita/${b.id}`} target="_blank" rel="noopener" className="rounded-full px-3 py-1.5 text-sm hover:bg-black/5">
                    Pratinjau ↗
                  </a>
                )}
                <Link href={`/admin/berita/${b.id}`} className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-black/5">
                  Ubah
                </Link>
                <FormArsip tabel="berita" id={b.id} judul={b.judul} kembali="/admin/berita" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
