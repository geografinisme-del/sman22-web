import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { ReactNode } from "react";
import { Centang, FormAksi, Input, InputGambar, TextArea, TombolSimpan } from "@/components/admin/form";
import { FotoSementara } from "@/components/admin/FotoSementara";
import { JudulHalaman, Kartu, KosongAdmin, Lencana, Notifikasi } from "@/components/admin/ui";
import { geserBarisHalaman, simpanBarisHalaman } from "@/app/admin/actions-halaman";

export type BarisHalaman = { id: string; urutan: number; aktif: boolean; nama: string; jabatan?: string; bidang?: string; deskripsi?: string; foto_url: string; is_placeholder: boolean };

/**
 * Pengelola daftar CMS halaman publik (Guru & Tendik, fasilitas): tambah/ubah, foto, urutan, aktif/nonaktif.
 * Tidak ada hapus permanen — baris yang tidak dipakai dinonaktifkan.
 */
export function DaftarBarisHalaman({
  tabel,
  halaman,
  judul,
  deskripsi,
  catatan,
  list,
  galat,
  ubah,
  baru,
  pesan,
}: {
  tabel: "staf_publik" | "fasilitas";
  halaman: string;
  judul: string;
  deskripsi: string;
  catatan?: ReactNode;
  list: BarisHalaman[];
  galat: boolean;
  ubah?: string;
  baru?: string;
  pesan?: string;
}) {
  const diubah = ubah ? list.find((k) => k.id === ubah) : undefined;
  const tampilForm = Boolean(diubah || baru);
  const d = diubah ?? { nama: "", jabatan: "", bidang: "", deskripsi: "", foto_url: "", aktif: true };
  const staf = tabel === "staf_publik";

  return (
    <>
      <JudulHalaman
        judul={judul}
        deskripsi={deskripsi}
        aksi={
          !tampilForm && !galat ? (
            <Link href={`${halaman}?baru=1`} className="inline-flex min-h-10 items-center rounded-full bg-[var(--ink)] px-4 text-sm font-semibold text-white">
              Tambah
            </Link>
          ) : undefined
        }
      />
      <Notifikasi kode={pesan} />
      {catatan}
      {galat && (
        <p role="alert" className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Tabel {tabel} belum tersedia. Jalankan migrasi <code>20261222000000_halaman_publik.sql</code>. Sampai itu, halaman publik menampilkan keadaan kosong.
        </p>
      )}

      {tampilForm && (
        <Kartu className="mb-8">
          <h2 className="mb-5 text-2xl">{diubah ? "Ubah" : "Tambah"}</h2>
          <FormAksi key={diubah?.id ?? "baru"} aksi={simpanBarisHalaman} className="grid gap-5 sm:grid-cols-2">
            <input type="hidden" name="tabel" value={tabel} />
            {diubah && <input type="hidden" name="id" value={diubah.id} />}
            <Input label={staf ? "Nama lengkap (dengan gelar)" : "Nama fasilitas"} nama="nama" nilai={d.nama} wajib maks={staf ? 120 : 80} />
            {staf ? (
              <>
                <Input label="Jabatan" nama="jabatan" nilai={d.jabatan ?? ""} maks={120} placeholder="mis. Guru, Wakasek Kurikulum, Staf TU" />
                <Input label="Bidang (untuk saringan)" nama="bidang" nilai={d.bidang ?? ""} maks={60} placeholder="mis. Matematika, Tata usaha" />
              </>
            ) : (
              <div className="sm:col-span-2">
                <TextArea label="Deskripsi singkat" nama="deskripsi" nilai={d.deskripsi ?? ""} baris={3} maks={280} />
              </div>
            )}
            <div className="sm:col-span-2">
              <InputGambar label="Foto (opsional)" nama="foto" sekarang={d.foto_url || undefined} />
              {d.foto_url && (
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" name="hapus_foto" className="h-4 w-4" /> Hapus foto saat ini
                </label>
              )}
            </div>
            <Centang label="Tampilkan di situs" nama="aktif" nilai={d.aktif} />
            <div className="flex items-center gap-3 sm:col-span-2">
              <TombolSimpan>{diubah ? "Simpan perubahan" : "Tambah"}</TombolSimpan>
              <Link href={halaman} className="text-sm text-[var(--muted)] hover:underline">
                Batal
              </Link>
            </div>
          </FormAksi>
        </Kartu>
      )}

      {!galat && list.length === 0 ? (
        <KosongAdmin teks="Belum ada data. Halaman publik menampilkan keadaan kosong sampai data pertama ditambahkan." />
      ) : (
        <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-2xl bg-white ring-1 ring-[var(--line)]">
          {list.map((k, i) => (
            <li key={k.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--soft)]">
                {k.foto_url && <Image src={k.foto_url} alt="" fill sizes="56px" className="object-cover" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  <span className="text-[var(--muted)]">{String(i + 1).padStart(2, "0")}</span>
                  {k.nama}
                  {k.bidang && <Lencana>{k.bidang}</Lencana>}
                  {!k.aktif && <Lencana>Nonaktif</Lencana>}
                </p>
                <p className="truncate text-sm text-[var(--muted)]">{k.jabatan || k.deskripsi}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <FotoSementara tabel={tabel} id={k.id} sementara={k.is_placeholder && Boolean(k.foto_url)} kembali={halaman} />
                {(["naik", "turun"] as const).map((arah) => (
                  <form key={arah} action={geserBarisHalaman}>
                    <input type="hidden" name="tabel" value={tabel} />
                    <input type="hidden" name="id" value={k.id} />
                    <input type="hidden" name="arah" value={arah} />
                    <button
                      type="submit"
                      disabled={(arah === "naik" && i === 0) || (arah === "turun" && i === list.length - 1)}
                      aria-label={`${arah === "naik" ? "Naikkan" : "Turunkan"} ${k.nama}`}
                      className="grid h-9 w-9 place-items-center rounded-full hover:bg-[var(--soft)] disabled:opacity-30"
                    >
                      {arah === "naik" ? <ArrowUp size={16} aria-hidden /> : <ArrowDown size={16} aria-hidden />}
                    </button>
                  </form>
                ))}
                <Link href={`${halaman}?ubah=${k.id}`} className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-[var(--soft)]">
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
