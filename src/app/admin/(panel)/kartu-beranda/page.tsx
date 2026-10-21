import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Centang, FormAksi, Input, InputGambar, TextArea, TombolSimpan } from "@/components/admin/form";
import { JudulHalaman, Kartu, KosongAdmin, Lencana, Notifikasi } from "@/components/admin/ui";
import { FotoSementara } from "@/components/admin/FotoSementara";
import { wajibIzin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { geserKartu, simpanKartu } from "../../actions-langit";

export const metadata = { title: "Kartu Beranda" };

type Baris = { id: string; urutan: number; aktif: boolean; label: string; judul: string; deskripsi: string; foto_url: string; is_placeholder: boolean; url: string };

export default async function AdminKartuBeranda({ searchParams }: { searchParams: Promise<{ pesan?: string; ubah?: string; baru?: string }> }) {
  const { pesan, ubah, baru } = await searchParams;
  const { supabase } = await wajibIzin("konten.kelola");
  const { data, error } = await supabase.from("kartu_beranda").select("*").order("urutan").order("created_at");
  const list = (data ?? []) as Baris[];
  const diubah = ubah && uuid.safeParse(ubah).success ? list.find((k) => k.id === ubah) : undefined;
  const tampilForm = Boolean(diubah || baru);
  const d = diubah ?? { label: "", judul: "", deskripsi: "", url: "", foto_url: "", aktif: true };

  return (
    <>
      <JudulHalaman
        judul="Kartu beranda"
        deskripsi="Kartu putar 3D di hero beranda. Semua kartu satu desain: foto, label, judul, deskripsi singkat, tautan. Kartu nonaktif tidak tampil."
        aksi={
          !tampilForm && !error ? (
            <Link href="/admin/kartu-beranda?baru=1" className="inline-flex min-h-10 items-center rounded-full bg-[var(--ink)] px-4 text-sm font-semibold text-white">
              Tambah kartu
            </Link>
          ) : undefined
        }
      />
      <Notifikasi kode={pesan} />
      {error && (
        <p role="alert" className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Tabel kartu_beranda belum tersedia. Jalankan migrasi <code>20261220000000_kartu_beranda.sql</code>. Sampai itu, beranda memakai 12 kartu bawaan.
        </p>
      )}

      {tampilForm && (
        <Kartu className="mb-8">
          <h2 className="mb-5 text-2xl">{diubah ? "Ubah kartu" : "Tambah kartu"}</h2>
          <FormAksi key={diubah?.id ?? "baru"} aksi={simpanKartu} className="grid gap-5 sm:grid-cols-2">
            {diubah && <input type="hidden" name="id" value={diubah.id} />}
            <Input label="Label (huruf kapital kecil di kartu)" nama="label" nilai={d.label} wajib maks={40} placeholder="mis. Layanan" />
            <Input label="Judul" nama="judul" nilai={d.judul} wajib maks={60} />
            <div className="sm:col-span-2">
              <TextArea label="Deskripsi (1–2 baris)" nama="deskripsi" nilai={d.deskripsi} baris={2} maks={140} />
            </div>
            <div className="sm:col-span-2">
              <Input label="Tautan" nama="url" nilai={d.url} wajib placeholder="/profil atau https://…" bantuan="Diawali / untuk halaman situs, atau https:// untuk situs lain." />
            </div>
            <div className="sm:col-span-2">
              <InputGambar label="Foto (opsional)" nama="foto" sekarang={d.foto_url || undefined} />
              {d.foto_url && (
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" name="hapus_foto" className="h-4 w-4" /> Hapus foto saat ini
                </label>
              )}
            </div>
            <Centang label="Tampilkan di beranda" nama="aktif" nilai={d.aktif} />
            <div className="flex items-center gap-3 sm:col-span-2">
              <TombolSimpan>{diubah ? "Simpan perubahan" : "Tambah kartu"}</TombolSimpan>
              <Link href="/admin/kartu-beranda" className="text-sm text-black/60 hover:underline">
                Batal
              </Link>
            </div>
          </FormAksi>
        </Kartu>
      )}

      {!error && list.length === 0 ? (
        <KosongAdmin teks="Belum ada kartu. Beranda memakai 12 kartu bawaan sampai kartu pertama ditambahkan." />
      ) : (
        <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          {list.map((k, i) => (
            <li key={k.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--soft)]">
                {k.foto_url && <Image src={k.foto_url} alt="" fill sizes="80px" className="object-cover" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  <span className="text-black/40">{String(i + 1).padStart(2, "0")}</span>
                  {k.judul}
                  <Lencana>{k.label}</Lencana>
                  {!k.aktif && <Lencana>Nonaktif</Lencana>}
                </p>
                <p className="truncate text-sm text-black/50">
                  {k.url} · {k.deskripsi}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <FotoSementara tabel="kartu_beranda" id={k.id} sementara={k.is_placeholder && Boolean(k.foto_url)} kembali="/admin/kartu-beranda" />
                {(["naik", "turun"] as const).map((arah) => (
                  <form key={arah} action={geserKartu}>
                    <input type="hidden" name="id" value={k.id} />
                    <input type="hidden" name="arah" value={arah} />
                    <button
                      type="submit"
                      disabled={(arah === "naik" && i === 0) || (arah === "turun" && i === list.length - 1)}
                      aria-label={`${arah === "naik" ? "Naikkan" : "Turunkan"} ${k.judul}`}
                      className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5 disabled:opacity-30"
                    >
                      {arah === "naik" ? <ArrowUp size={16} aria-hidden /> : <ArrowDown size={16} aria-hidden />}
                    </button>
                  </form>
                ))}
                <Link href={`/admin/kartu-beranda?ubah=${k.id}`} className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-black/5">
                  Ubah
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
