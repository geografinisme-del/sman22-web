import Image from "next/image";
import Link from "next/link";
import { Centang, FormAksi, Input, InputGambar, Pilihan, TombolSimpan } from "@/components/admin/form";
import { FormArsip, JudulHalaman, Kartu, KosongAdmin, Lencana, Notifikasi } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { TINGKAT_PRESTASI } from "@/lib/data";
import { formatTanggal } from "@/lib/format";
import { simpanAlumniPtn, simpanPrestasi, tandaiFotoAsli } from "../../actions-buku";

export const metadata = { title: "Prestasi & Alumni" };

type Baris = { id: string; peringkat: string; nama_lomba: string; nama_siswa: string; tingkat: string; tanggal: string; foto_url: string; is_placeholder: boolean; terbit: boolean };

export default async function AdminPrestasi({ searchParams }: { searchParams: Promise<{ pesan?: string; ubah?: string }> }) {
  const { pesan, ubah } = await searchParams;
  const { supabase } = await wajibIzin("konten.kelola");
  const [{ data, error }, { data: profil }] = await Promise.all([
    supabase.from("prestasi").select("*").is("deleted_at", null).order("tanggal", { ascending: false }).limit(300),
    supabase.from("profil_sekolah").select("*").eq("id", 1).maybeSingle(),
  ]);
  const list = (data ?? []) as Baris[];
  const diubah = ubah && uuid.safeParse(ubah).success ? list.find((p) => p.id === ubah) : undefined;
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const belumMigrasi = Boolean(error);
  const d = diubah ?? { peringkat: "", nama_lomba: "", nama_siswa: "", tingkat: "Kota", tanggal: hariIni, foto_url: "", terbit: true };

  return (
    <>
      <JudulHalaman judul="Prestasi & Alumni" deskripsi="Prestasi tampil di beranda (bagian Prestasi) dan dapat disaring menurut tingkat. Tanpa foto, prestasi tampil sebagai baris teks." />
      <Notifikasi kode={pesan} />
      {belumMigrasi && (
        <p role="alert" className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Tabel prestasi belum tersedia. Jalankan migrasi <code>20261210000000_buku_tahunan.sql</code> terlebih dahulu.
        </p>
      )}

      <Kartu className="mb-8">
        <h2 className="mb-5 font-serif text-2xl">{diubah ? "Ubah prestasi" : "Tambah prestasi"}</h2>
        <FormAksi key={diubah?.id ?? "baru"} aksi={simpanPrestasi} className="grid gap-5 sm:grid-cols-2">
          {diubah && <input type="hidden" name="id" value={diubah.id} />}
          <Input label="Peringkat" nama="peringkat" nilai={d.peringkat} wajib maks={40} placeholder="Juara 1, Medali Emas, Finalis…" />
          <Pilihan label="Tingkat" nama="tingkat" nilai={d.tingkat} opsi={TINGKAT_PRESTASI.map((t) => ({ nilai: t, label: t }))} />
          <div className="sm:col-span-2">
            <Input label="Nama lomba" nama="nama_lomba" nilai={d.nama_lomba} wajib maks={200} />
          </div>
          <Input label="Nama siswa / tim" nama="nama_siswa" nilai={d.nama_siswa} maks={200} bantuan="Pastikan siswa/orang tua setuju namanya dipublikasikan." />
          <Input label="Tanggal" nama="tanggal" tipe="date" nilai={d.tanggal} wajib />
          <div className="sm:col-span-2">
            <InputGambar label="Foto (opsional)" nama="foto" sekarang={d.foto_url || undefined} />
            {d.foto_url && (
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" name="hapus_foto" className="h-4 w-4" /> Hapus foto saat ini
              </label>
            )}
          </div>
          <Centang label="Tampilkan di website" nama="terbit" nilai={d.terbit} />
          <div className="flex items-center gap-3 sm:col-span-2">
            <TombolSimpan>{diubah ? "Simpan perubahan" : "Tambah prestasi"}</TombolSimpan>
            {diubah && (
              <Link href="/admin/prestasi" className="text-sm text-black/60 hover:underline">
                Batal
              </Link>
            )}
          </div>
        </FormAksi>
      </Kartu>

      {list.length === 0 ? (
        <KosongAdmin teks="Belum ada prestasi. Bagian Prestasi di beranda tersembunyi sampai ada data." />
      ) : (
        <ul className="mb-10 divide-y divide-black/5 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          {list.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              {p.foto_url && (
                <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded">
                  <Image src={p.foto_url} alt="" fill sizes="80px" className="object-cover" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {p.peringkat} · {p.nama_lomba}
                  <Lencana>{p.tingkat}</Lencana>
                  {!p.terbit && <Lencana>Disembunyikan</Lencana>}
                  {p.is_placeholder && p.foto_url && <Lencana warna="kuning">Ilustrasi sementara</Lencana>}
                </p>
                <p className="text-sm text-black/50">
                  {[p.nama_siswa, formatTanggal(p.tanggal)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {p.is_placeholder && p.foto_url && (
                  <form action={tandaiFotoAsli}>
                    <input type="hidden" name="tabel" value="prestasi" />
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="kembali" value="/admin/prestasi" />
                    <Link href={`/admin/prestasi?ubah=${p.id}`} className="rounded-full px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-50">
                      Ganti dengan foto asli
                    </Link>
                    <button type="submit" className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-black/5">
                      Tandai sudah asli
                    </button>
                  </form>
                )}
                <Link href={`/admin/prestasi?ubah=${p.id}`} className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-black/5">
                  Ubah
                </Link>
                <FormArsip tabel="prestasi" id={p.id} judul={p.nama_lomba} kembali="/admin/prestasi" />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Kartu>
        <h2 className="font-serif text-2xl">Alumni diterima di perguruan tinggi negeri</h2>
        <p className="mb-5 mt-1 text-sm text-black/60">Tampil di samping daftar prestasi. Kosongkan bila belum ada data resmi.</p>
        <FormAksi aksi={simpanAlumniPtn} className="grid gap-5 sm:grid-cols-2">
          <Input label="Jumlah alumni" nama="alumni_ptn" nilai={profil?.alumni_ptn ?? ""} maks={20} placeholder="mis. 180+" />
          <Input label="Tahun / angkatan" nama="alumni_ptn_tahun" nilai={profil?.alumni_ptn_tahun ?? ""} maks={20} placeholder="mis. 2026" />
          <div className="sm:col-span-2">
            <Input label="Keterangan singkat" nama="alumni_ptn_keterangan" nilai={profil?.alumni_ptn_keterangan ?? ""} maks={300} bantuan="Sebutkan sumber data, mis. rekap BK." />
          </div>
          <div className="sm:col-span-2">
            <TombolSimpan>Simpan angka alumni</TombolSimpan>
          </div>
        </FormAksi>
      </Kartu>
    </>
  );
}
