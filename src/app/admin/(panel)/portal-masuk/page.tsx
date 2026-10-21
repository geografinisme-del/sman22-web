import { Centang, FormAksi, Input, TombolSimpan } from "@/components/admin/form";
import { FotoFokus } from "@/components/admin/FotoFokus";
import { JudulHalaman, Kartu, Lencana, Notifikasi } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { FOTO_PORTAL_BAWAAN, type PeranFoto } from "@/lib/data";
import { simpanFotoPortal, simpanTautanGuruLama } from "../../actions-portal-masuk";

export const metadata = { title: "Halaman masuk portal" };

const PERAN: { kunci: PeranFoto; label: string; alamat: string }[] = [
  { kunci: "gtk", label: "Guru & Tendik", alamat: "/portal-digital/masuk/gtk" },
  { kunci: "siswa", label: "Siswa", alamat: "/portal-digital/masuk/siswa" },
  { kunci: "orang_tua", label: "Orang Tua", alamat: "/portal-digital/masuk/orang-tua" },
];

type Baris = { peran: PeranFoto; foto_url: string; caption: string; alt_text: string; fokus_x: number; fokus_y: number; is_placeholder: boolean };

/**
 * CMS foto halaman masuk per peran (juga dipakai kartu "Pilih pintu Anda.") + tautan aplikasi guru lama.
 * Kosong = foto bawaan (aula / apel / gedung). Perubahan langsung tampil tanpa deploy ulang.
 */
export default async function AdminPortalMasuk({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const { pesan } = await searchParams;
  const { supabase } = await wajibIzin("konten.kelola");
  const [f, p] = await Promise.all([supabase.from("portal_login").select("*"), supabase.from("portal_pengaturan").select("*").eq("id", 1).maybeSingle()]);
  const galat = f.error ?? p.error;
  const isi = new Map(((f.data ?? []) as Baris[]).map((r) => [r.peran, r]));

  return (
    <>
      <JudulHalaman
        judul="Halaman masuk portal"
        deskripsi="Foto khusus setiap pintu masuk (Guru & Tendik, Siswa, Orang Tua). Foto yang sama tampil di kartu “Pilih pintu Anda.”. Kosong = foto awal tiap pintu (Guru & Tendik: aula, Siswa: apel, Orang Tua: gedung utama)."
      />
      <Notifikasi kode={pesan} />
      {galat && (
        <p role="alert" className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Tabel halaman masuk belum tersedia. Jalankan migrasi <code>20261224000000_portal_masuk.sql</code>. Sampai itu, halaman masuk memakai foto bawaan.
        </p>
      )}
      {!galat &&
        PERAN.map((r) => {
          const d = isi.get(r.kunci);
          const bawaan = FOTO_PORTAL_BAWAAN[r.kunci];
          const pakaiCms = Boolean(d?.foto_url);
          return (
            <Kartu key={r.kunci} className="mb-8 scroll-mt-24">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 id={`foto-${r.kunci}`} className="text-2xl">
                  {r.label}
                </h2>
                {pakaiCms ? <Lencana>Foto CMS</Lencana> : <Lencana>Foto bawaan</Lencana>}
                {d?.is_placeholder && pakaiCms && <Lencana>Ilustrasi sementara</Lencana>}
                <a href={r.alamat} target="_blank" className="ml-auto text-sm font-medium text-blue-teks underline">
                  Lihat halaman masuk ↗
                </a>
              </div>
              <FormAksi aksi={simpanFotoPortal} className="grid gap-5">
                <input type="hidden" name="peran" value={r.kunci} />
                <FotoFokus sekarang={d?.foto_url || bawaan.src} x={d?.fokus_x ?? bawaan.fokus.x} y={d?.fokus_y ?? bawaan.fokus.y} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Teks alternatif (alt) — wajib bila ada foto" nama="alt_text" nilai={d?.alt_text ?? ""} maks={160} placeholder={bawaan.alt} />
                  <Input label="Caption kecil di atas foto" nama="caption" nilai={d?.caption ?? ""} maks={80} placeholder={bawaan.caption} />
                </div>
                <Centang label="Ilustrasi sementara (foto stok — tampil label “Ilustrasi sementara”)" nama="is_placeholder" nilai={d?.is_placeholder ?? false} />
                {pakaiCms && <Centang label={`Kembalikan ke foto awal (${bawaan.caption})`} nama="bawaan" bantuan="Berkas yang sudah diunggah tidak dihapus." />}
                <div>
                  <TombolSimpan>Simpan foto {r.label}</TombolSimpan>
                </div>
              </FormAksi>
            </Kartu>
          );
        })}

      {!galat && (
        <Kartu className="mb-8 scroll-mt-24">
          <h2 id="guru-lama" className="mb-1 text-2xl">
            Tautan aplikasi guru lama (opsional)
          </h2>
          <p className="mb-4 text-sm text-[var(--muted)]">Bila diisi, tampil sebagai kartu tautan keluar di dasbor guru (Ruang Guru). Kosongkan keduanya untuk menyembunyikan.</p>
          <FormAksi aksi={simpanTautanGuruLama} className="grid gap-4 sm:grid-cols-2">
            <Input label="Judul" nama="guru_lama_judul" nilai={p.data?.guru_lama_judul ?? ""} maks={60} placeholder="mis. Aplikasi guru lama" />
            <Input label="Alamat (https://…)" nama="guru_lama_url" tipe="url" nilai={p.data?.guru_lama_url ?? ""} placeholder="https://" />
            <div className="sm:col-span-2">
              <TombolSimpan>Simpan tautan</TombolSimpan>
            </div>
          </FormAksi>
        </Kartu>
      )}
    </>
  );
}
