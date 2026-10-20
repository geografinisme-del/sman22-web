import Link from "next/link";
import { Centang, FormAksi, Input, TextArea, TombolSimpan } from "@/components/admin/form";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { simpanHalamanCms } from "../../actions-halaman";

export const metadata = { title: "Halaman teks" };

const HALAMAN = [{ slug: "kurikulum", judul: "Kurikulum", alamat: "/pembelajaran/kurikulum" }] as const;

export default async function AdminHalaman({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const { pesan } = await searchParams;
  const { supabase } = await wajibIzin("konten.kelola");
  const { data, error } = await supabase.from("halaman_cms").select("*");
  const ada = new Map((data ?? []).map((h) => [h.slug as string, h]));
  return (
    <>
      <JudulHalaman judul="Halaman teks" deskripsi="Isi halaman publik berbentuk teks. Paragraf dipisah baris kosong; baris diawali “## ” menjadi subjudul, “- ” menjadi butir daftar." />
      <Notifikasi kode={pesan} />
      {error && (
        <p role="alert" className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Tabel halaman_cms belum tersedia. Jalankan migrasi <code>20261222000000_halaman_publik.sql</code>.
        </p>
      )}
      {!error &&
        HALAMAN.map((h) => {
          const d = ada.get(h.slug);
          return (
            <Kartu key={h.slug} className="mb-8">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-2xl">{h.judul}</h2>
                <Link href={h.alamat} target="_blank" className="text-sm font-semibold text-[var(--blue-teks)] hover:underline">
                  Lihat {h.alamat} ↗
                </Link>
              </div>
              <FormAksi aksi={simpanHalamanCms} className="grid gap-5">
                <input type="hidden" name="slug" value={h.slug} />
                <Input label="Judul" nama="judul" nilai={d?.judul ?? h.judul} wajib maks={120} />
                <TextArea label="Ringkasan (satu kalimat di bawah judul)" nama="ringkasan" nilai={d?.ringkasan ?? ""} baris={2} maks={240} />
                <TextArea label="Isi" nama="isi" nilai={d?.isi ?? ""} baris={14} maks={40000} />
                <Centang label="Terbitkan (tampil di situs)" nama="terbit" nilai={d?.terbit ?? false} />
                <div>
                  <TombolSimpan>Simpan</TombolSimpan>
                </div>
              </FormAksi>
            </Kartu>
          );
        })}
    </>
  );
}
