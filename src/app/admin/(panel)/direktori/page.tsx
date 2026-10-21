import { JudulHalaman, Kartu, kelasTabel, kelasTd, kelasTh } from "@/components/admin/ui";
import { wajibLogin } from "@/lib/admin/auth";

export const metadata = { title: "Direktori GTK" };

type Orang = { nama: string; jabatan: string; peran: string[] };

/** Direktori Guru & Tenaga Kependidikan: nama, jabatan, peran (tanpa email/telepon). Hanya untuk GTK aktif (dijaga database). */
export default async function Direktori({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: qMentah } = await searchParams;
  const { supabase } = await wajibLogin();
  const { data, error } = await supabase.rpc("direktori_gtk");
  const q = (qMentah ?? "").trim().toLowerCase().slice(0, 80);
  const semua = (data ?? []) as Orang[];
  const daftar = q ? semua.filter((o) => `${o.nama} ${o.jabatan} ${o.peran.join(" ")}`.toLowerCase().includes(q)) : semua;

  return (
    <>
      <JudulHalaman judul="Direktori GTK" deskripsi="Guru dan Tenaga Kependidikan SMA Negeri 22 Bandung yang memiliki akun aktif." />
      {error ? (
        <Kartu>
          <p className="text-sm text-[var(--muted)]">Direktori belum tersedia. Fitur ini memerlukan migrasi 20261225000000_gtk_jabatan_peran.sql.</p>
        </Kartu>
      ) : (
        <>
          <form className="mb-4" role="search">
            <label htmlFor="q" className="sr-only">
              Cari di direktori
            </label>
            <input id="q" name="q" defaultValue={qMentah ?? ""} placeholder="Cari nama, jabatan, atau peran…" className="w-full rounded-full border border-black/15 bg-white px-5 py-3 sm:max-w-sm" />
          </form>
          <p className="mb-3 text-sm text-[var(--muted)]">{daftar.length} orang</p>
          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
            <table className={kelasTabel}>
              <thead>
                <tr>
                  <th className={kelasTh}>Nama</th>
                  <th className={kelasTh}>Jabatan</th>
                  <th className={kelasTh}>Peran</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((o, i) => (
                  <tr key={`${o.nama}-${i}`}>
                    <td className={`${kelasTd} font-medium`}>{o.nama}</td>
                    <td className={kelasTd}>{o.jabatan || <span className="text-black/40">—</span>}</td>
                    <td className={kelasTd}>{o.peran.length ? o.peran.join(", ") : <span className="text-black/40">Pegawai umum</span>}</td>
                  </tr>
                ))}
                {!daftar.length && (
                  <tr>
                    <td colSpan={3} className={`${kelasTd} text-center text-[var(--muted)]`}>
                      Tidak ada yang cocok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
