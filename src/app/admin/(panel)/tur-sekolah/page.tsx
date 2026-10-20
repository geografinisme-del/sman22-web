import Link from "next/link";
import { FormAksi, Input, TextArea, TombolSimpan } from "@/components/admin/form";
import { FotoSementara } from "@/components/admin/FotoSementara";
import { JudulHalaman, Kartu, KosongAdmin, Notifikasi } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { simpanTitikTur } from "../../actions-tur";
import { DaftarTur, type ItemTur } from "./DaftarTur";
import { PemilihMedia } from "./PemilihMedia";

export const metadata = { title: "Tur Sekolah" };

type Baris = {
  id: string;
  urutan: number;
  aktif: boolean;
  label: string;
  judul: string;
  deskripsi: string;
  tombol_teks: string;
  tombol_url: string;
  media_tipe: "foto" | "video";
  media_url: string;
  poster_url: string;
  fokus_x: number;
  fokus_y: number;
  alt_text: string;
  is_placeholder: boolean;
};

/**
 * Admin tur sekolah: daftar + pratinjau, urutan seret-lepas, unggah foto (WebP maks 2400px) atau video
 * (MP4 ≤ 15 detik / 8 MB), titik fokus, pratinjau desktop/HP, aktif/nonaktif (3–8 titik aktif).
 * Perubahan langsung tampil di beranda tanpa deploy ulang.
 */
export default async function AdminTurSekolah({ searchParams }: { searchParams: Promise<{ pesan?: string; ubah?: string; baru?: string }> }) {
  const { pesan, ubah, baru } = await searchParams;
  const { supabase } = await wajibIzin("konten.kelola");
  const { data, error } = await supabase.from("tur_sekolah").select("*").order("urutan").order("created_at");
  const list = (data ?? []) as Baris[];
  const diubah = ubah && uuid.safeParse(ubah).success ? list.find((t) => t.id === ubah) : undefined;
  const tampilForm = Boolean(diubah || baru);
  const d = diubah ?? { label: "", judul: "", deskripsi: "", tombol_teks: "", tombol_url: "", media_tipe: "foto" as const, media_url: "", poster_url: "", fokus_x: 50, fokus_y: 50, alt_text: "" };
  const item: ItemTur[] = list.map((t) => ({ id: t.id, label: t.label, judul: t.judul, aktif: t.aktif, gambar: t.media_tipe === "video" ? t.poster_url : t.media_url, tipe: t.media_tipe, sementara: t.is_placeholder }));

  return (
    <>
      <JudulHalaman
        judul="Tur sekolah"
        deskripsi="Titik-titik tur di beranda (3–8 titik aktif). Foto dikompres otomatis; video MP4 maks 15 detik / 8 MB dan wajib berposter. Perubahan langsung tampil tanpa deploy ulang."
        aksi={
          !tampilForm && !error ? (
            <Link href="/admin/tur-sekolah?baru=1" className="inline-flex min-h-10 items-center rounded-full bg-[var(--ink)] px-4 text-sm font-semibold text-white">
              Tambah titik
            </Link>
          ) : undefined
        }
      />
      <Notifikasi kode={pesan} />
      {error && (
        <p role="alert" className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Tabel tur_sekolah belum tersedia. Jalankan migrasi <code>20261221000000_tur_sekolah.sql</code>. Sampai itu, beranda memakai titik tur bawaan.
        </p>
      )}

      {tampilForm && (
        <Kartu className="mb-8">
          <h2 className="mb-5 text-2xl">{diubah ? "Ubah titik tur" : "Tambah titik tur"}</h2>
          <FormAksi key={diubah?.id ?? "baru"} aksi={simpanTitikTur} className="grid gap-5 sm:grid-cols-2">
            {diubah && <input type="hidden" name="id" value={diubah.id} />}
            <Input label="Label (penanda langkah)" nama="label" nilai={d.label} wajib maks={40} placeholder="mis. Perpustakaan" />
            <Input label="Judul" nama="judul" nilai={d.judul} wajib maks={80} />
            <div className="sm:col-span-2">
              <TextArea label="Deskripsi (maks 160 karakter)" nama="deskripsi" nilai={d.deskripsi} baris={2} maks={160} />
            </div>
            <Input label="Teks tombol (opsional)" nama="tombol_teks" nilai={d.tombol_teks} maks={40} placeholder="Selengkapnya" />
            <Input label="Tautan tombol (opsional)" nama="tombol_url" nilai={d.tombol_url} placeholder="/perpustakaan atau https://…" bantuan="Kosong = tanpa tombol." />
            <PemilihMedia awal={{ tipe: d.media_tipe, media: d.media_url, poster: d.poster_url, fokusX: d.fokus_x, fokusY: d.fokus_y }} />
            <div className="sm:col-span-2">
              <TextArea label="Teks alternatif (wajib untuk foto)" nama="alt_text" nilai={d.alt_text} baris={2} maks={200} bantuan="Jelaskan isi foto/video untuk pembaca layar. Jangan menyebut nama siswa." />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <TombolSimpan>{diubah ? "Simpan perubahan" : "Tambah titik"}</TombolSimpan>
              <Link href="/admin/tur-sekolah" className="text-sm text-black/60 hover:underline">
                Batal
              </Link>
              {diubah && <FotoSementara tabel="tur_sekolah" id={diubah.id} sementara={list.find((t) => t.id === diubah.id)?.is_placeholder} kembali="/admin/tur-sekolah" />}
            </div>
          </FormAksi>
        </Kartu>
      )}

      {!error && list.length === 0 ? <KosongAdmin teks="Belum ada titik tur. Section tur disembunyikan di beranda sampai ada titik aktif." /> : !error && <DaftarTur key={list.map((t) => t.id + t.aktif).sort().join()} awal={item} />}
    </>
  );
}
