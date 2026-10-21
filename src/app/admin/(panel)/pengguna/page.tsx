import Link from "next/link";
import { JudulHalaman, Kartu, Lencana, Notifikasi, kelasTabel, kelasTd, kelasTh } from "@/components/admin/ui";
import { NAMA_PERAN, wajibIzin } from "@/lib/admin/auth";
import { kunciAdminTersedia } from "@/lib/supabase/admin";
import { FormBuatAkun, FormTambahJabatan } from "./FormPengguna";

export const metadata = { title: "Pengguna & Peran" };

export default async function Pengguna({ searchParams }: { searchParams: Promise<{ pesan?: string; pegawai?: string; q?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await wajibIzin("pengguna.kelola");
  const q = (sp.q ?? "").replace(/[%_,()*\\]/g, " ").trim().slice(0, 80);
  type Baris = { user_id: string; nama: string; email: string; aktif: boolean; jabatan?: string | null; pengguna_peran: { peran: string }[] };
  const cari = (kolom: string) => {
    let query = supabase.from("pengguna").select(kolom).order("nama").limit(500);
    if (q) query = query.or(`nama.ilike.%${q}%,email.ilike.%${q}%`);
    return query.returns<Baris[]>();
  };
  // kolom jabatan & tabel jabatan_gtk ada setelah migrasi 20261225 — sebelum itu daftar tetap tampil tanpa jabatan
  const [hasil, { data: peran }, { data: pegawai }, { data: jabatan }] = await Promise.all([
    cari("user_id, nama, email, aktif, jabatan, pengguna_peran(peran)"),
    supabase.from("peran").select("kode, nama, keterangan").order("urutan"),
    supabase.from("pegawai").select("id, nama").is("user_id", null).is("deleted_at", null).eq("status", "aktif").order("nama").range(0, 999),
    supabase.from("jabatan_gtk").select("kode, nama").eq("aktif", true).order("urutan"),
  ]);
  const list = hasil.error ? (await cari("user_id, nama, email, aktif, pengguna_peran(peran)")).data : hasil.data;
  const namaJabatan = new Map((jabatan ?? []).map((j) => [j.kode as string, j.nama as string]));
  // akun aktif tanpa peran (bukan hasil pencarian): diperlakukan sebagai Pegawai umum sampai admin menetapkan perannya
  const { data: semua } = await supabase.from("pengguna").select("user_id, nama, email, aktif, pengguna_peran(peran)").eq("aktif", true).limit(2000).returns<Baris[]>();
  const tanpaPeran = (semua ?? []).filter((u) => u.pengguna_peran.length === 0);
  const pegawaiAwal = pegawai?.find((p) => p.id === sp.pegawai);

  return (
    <>
      <JudulHalaman judul="Pengguna & Peran" deskripsi="Atur siapa yang bisa masuk dan apa yang boleh dilakukan. Hak akses dijaga oleh database." />
      <Notifikasi kode={sp.pesan} />
      {tanpaPeran.length > 0 && (
        <Kartu className="mb-8 ring-2 ring-amber-300">
          <h2 className="text-2xl">Akun tanpa peran ({tanpaPeran.length})</h2>
          <p className="mt-1 text-sm text-black/60">Akun ini menunggu verifikasi: saat masuk hanya melihat profilnya sendiri dan kontak operator, tanpa data internal. Periksa pemiliknya, lalu tetapkan peran (minimal Pegawai umum) dan jabatannya.</p>
          <ul className="mt-4 divide-y divide-black/5">
            {tanpaPeran.map((u) => (
              <li key={u.user_id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <span className="font-medium">{u.nama || "(tanpa nama)"}</span>
                <span className="text-sm text-black/50">{u.email}</span>
                <Link href={`/admin/pengguna/${u.user_id}`} className="ml-auto text-sm font-semibold text-blue-teks hover:underline">
                  Verifikasi & atur peran →
                </Link>
              </li>
            ))}
          </ul>
        </Kartu>
      )}
      <Kartu className="mb-8">
        <details open={Boolean(pegawaiAwal)}>
          <summary className="cursor-pointer text-2xl">+ Buat akun baru</summary>
          <div className="mt-6">
            <FormBuatAkun peran={peran ?? []} pegawai={pegawai ?? []} pegawaiAwal={pegawaiAwal} adaKunci={kunciAdminTersedia} jabatan={jabatan ?? []} />
          </div>
        </details>
        {jabatan && (
          <details className="mt-6 border-t border-black/10 pt-4">
            <summary className="cursor-pointer font-semibold">Daftar jabatan ({jabatan.length})</summary>
            <p className="mt-2 text-sm text-black/60">{jabatan.map((j) => j.nama).join(" · ")}</p>
            <p className="mt-1 text-xs text-black/50">Jabatan hanya untuk tampilan dan direktori GTK. Hak akses tetap diatur lewat peran.</p>
            <div className="mt-4">
              <FormTambahJabatan />
            </div>
          </details>
        )}
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
              <th className={kelasTh}>Jabatan</th>
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
                <td className={kelasTd}>{u.jabatan ? (namaJabatan.get(u.jabatan) ?? u.jabatan) : <span className="text-black/40">—</span>}</td>
                <td className={kelasTd}>
                  {u.pengguna_peran.map((p) => NAMA_PERAN[p.peran] ?? p.peran).join(", ") || <Lencana>Tanpa peran</Lencana>}
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
