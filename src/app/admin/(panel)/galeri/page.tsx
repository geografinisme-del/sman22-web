import Link from "next/link";
import { FormArsip, JudulHalaman, Kartu, KosongAdmin, Notifikasi } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { FormFoto } from "./FormFoto";

export const metadata = { title: "Galeri" };

export default async function AdminGaleri({ searchParams }: { searchParams: Promise<{ pesan?: string; ubah?: string }> }) {
  const { pesan, ubah } = await searchParams;
  const { supabase } = await wajibIzin("konten.kelola");
  const { data: list } = await supabase
    .from("galeri")
    .select("id, judul, gambar_url, urutan")
    .is("deleted_at", null)
    .order("urutan", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(300);
  const diubah = ubah && uuid.safeParse(ubah).success ? list?.find((a) => a.id === ubah) : undefined;
  const urutanBerikut = (list ?? []).reduce((m, g) => Math.max(m, g.urutan), 0) + 1;

  return (
    <>
      <JudulHalaman judul="Galeri" deskripsi="Foto tampil di halaman Galeri sesuai urutan." />
      <Notifikasi kode={pesan} />
      <Kartu className="mb-8">
        <h2 className="mb-5 font-serif text-2xl">{diubah ? "Ubah foto" : "Unggah foto baru"}</h2>
        <FormFoto key={diubah?.id ?? "baru"} data={diubah ?? { judul: "", urutan: urutanBerikut, gambar_url: "" }} />
      </Kartu>

      {!list || list.length === 0 ? (
        <KosongAdmin teks="Belum ada foto." />
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {list.map((g) => (
            <li key={g.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.gambar_url} alt={g.judul} className="aspect-[4/3] w-full object-cover" />
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-medium">{g.judul}</p>
                <p className="text-xs text-black/40">Urutan {g.urutan}</p>
                <div className="mt-2 flex items-center gap-1">
                  <Link href={`/admin/galeri?ubah=${g.id}`} className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-black/5">
                    Ubah
                  </Link>
                  <FormArsip tabel="galeri" id={g.id} judul={g.judul} kembali="/admin/galeri" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
