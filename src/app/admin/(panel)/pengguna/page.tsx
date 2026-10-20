import Link from "next/link";
import { JudulHalaman, Kartu, Lencana, Notifikasi, kelasTabel, kelasTd, kelasTh } from "@/components/admin/ui";
import { NAMA_PERAN, wajibIzin } from "@/lib/admin/auth";
import { kunciAdminTersedia } from "@/lib/supabase/admin";
import { FormBuatAkun } from "./FormPengguna";

export const metadata = { title: "Pengguna & Peran" };

export default async function Pengguna({ searchParams }: { searchParams: Promise<{ pesan?: string; pegawai?: string; q?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await wajibIzin("pengguna.kelola");
  const q = (sp.q ?? "").replace(/[%_,()*\\]/g, " ").trim().slice(0, 80);
  let query = supabase.from("pengguna").select("user_id, nama, email, aktif, pengguna_peran(peran)").order("nama").limit(500);
  if (q) query = query.or(`nama.ilike.%${q}%,email.ilike.%${q}%`);
  const [{ data: list }, { data: peran }, { data: pegawai }] = await Promise.all([
    query,
    supabase.from("peran").select("kode, nama, keterangan").order("urutan"),
    supabase.from("pegawai").select("id, nama").is("user_id", null).is("deleted_at", null).eq("status", "aktif").order("nama").range(0, 999),
  ]);
  const pegawaiAwal = pegawai?.find((p) => p.id === sp.pegawai);

  return (
    <>
      <JudulHalaman judul="Pengguna & Peran" deskripsi="Atur siapa yang bisa masuk dan apa yang boleh dilakukan. Hak akses dijaga oleh database." />
      <Notifikasi kode={sp.pesan} />
      <Kartu className="mb-8">
        <details open={Boolean(pegawaiAwal)}>
          <summary className="cursor-pointer text-2xl">+ Buat akun baru</summary>
          <div className="mt-6">
            <FormBuatAkun peran={peran ?? []} pegawai={pegawai ?? []} pegawaiAwal={pegawaiAwal} adaKunci={kunciAdminTersedia} />
          </div>
        </details>
      </Kartu>
      <form className="mb-4" role="search">
        <label htmlFor="q" className="sr-only">Cari pengguna</label>
        <input id="q" name="q" defaultValue={q} placeholder="Cari nama atau email…" className="w-full rounded-full border border-black/15 bg-white px-5 py-3 sm:max-w-sm" />
      </form>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className={kelasTabel}>
          <thead>
            <tr>
              <th className={kelasTh}>Nama</th>
              <th className={kelasTh}>Email</th>
              <th className={kelasTh}>Peran</th>
              <th className={kelasTh}>Status</th>
            </tr>
          </thead>
          <tbody>
            {list?.map((u) => (
              <tr key={u.user_id} className="hover:bg-soft/50">
                <td className={kelasTd}>
                  <Link href={`/admin/pengguna/${u.user_id}`} className="font-medium hover:underline">{u.nama || "(tanpa nama)"}</Link>
                </td>
                <td className={kelasTd}>{u.email}</td>
                <td className={kelasTd}>
                  {(u.pengguna_peran as { peran: string }[]).map((p) => NAMA_PERAN[p.peran] ?? p.peran).join(", ") || <span className="text-black/40">—</span>}
                </td>
                <td className={kelasTd}>{u.aktif ? <Lencana warna="hijau">Aktif</Lencana> : <Lencana>Nonaktif</Lencana>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
