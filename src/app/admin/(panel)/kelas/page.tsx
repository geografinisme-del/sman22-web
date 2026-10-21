import Link from "next/link";
import { JudulHalaman, Kartu, KosongAdmin, Notifikasi, kelasTabel, kelasTd, kelasTh } from "@/components/admin/ui";
import { punya, wajibIzin } from "@/lib/admin/auth";
import { arsipkanKelas } from "../../actions-induk";
import { FormKelas } from "./FormKelas";

export const metadata = { title: "Kelas" };

export default async function Kelas({ searchParams }: { searchParams: Promise<{ pesan?: string; ubah?: string; ta?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibIzin("data_induk.baca");
  const bisaUbah = punya(akses, "data_induk.kelola");

  const { data: semuaTa } = await supabase.from("tahun_ajaran").select("id, nama, aktif").order("nama", { ascending: false });
  const ta = semuaTa?.find((t) => t.id === sp.ta) ?? semuaTa?.find((t) => t.aktif) ?? semuaTa?.[0];
  if (!ta) {
    return (
      <>
        <JudulHalaman judul="Kelas" />
        <KosongAdmin
          teks="Buat tahun ajaran terlebih dahulu sebelum menambah kelas."
          aksi={<Link href="/admin/tahun-ajaran" className="font-semibold text-blue-teks underline">Buka Tahun Ajaran</Link>}
        />
      </>
    );
  }

  const [{ data: kelas }, { data: guru }] = await Promise.all([
    supabase.from("kelas_ringkasan").select("*").eq("tahun_ajaran_id", ta.id).is("deleted_at", null).order("tingkat").order("nama"),
    supabase.from("pegawai").select("id, nama").eq("jenis", "guru").eq("status", "aktif").is("deleted_at", null).order("nama").range(0, 999),
  ]);
  const urutTingkat = { X: 1, XI: 2, XII: 3 } as Record<string, number>;
  const list = [...(kelas ?? [])].sort(
    (a, b) => urutTingkat[a.tingkat] - urutTingkat[b.tingkat] || a.nama.localeCompare(b.nama, "id", { numeric: true }),
  );
  const diubah = list.find((k) => k.id === sp.ubah);
  const total = list.reduce((s, k) => s + k.jumlah_siswa, 0);

  return (
    <>
      <JudulHalaman
        judul="Kelas"
        deskripsi={`Tahun ajaran ${ta.nama}${ta.aktif ? " (aktif)" : ""} · ${list.length} kelas · ${total} siswa aktif`}
        aksi={
          <form className="flex items-center gap-2">
            <label htmlFor="ta" className="text-sm text-black/60">
              Tahun ajaran
            </label>
            <select id="ta" name="ta" defaultValue={ta.id} className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm">
              {semuaTa?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama}
                  {t.aktif ? " (aktif)" : ""}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5">
              Tampilkan
            </button>
          </form>
        }
      />
      <Notifikasi kode={sp.pesan} />

      {bisaUbah && (
        <Kartu className="mb-8">
          <h2 className="mb-5 text-2xl">{diubah ? `Ubah kelas ${diubah.nama}` : "Tambah kelas"}</h2>
          <FormKelas
            key={diubah?.id ?? "baru"}
            guru={guru ?? []}
            kembali={`/admin/kelas?ta=${ta.id}`}
            data={
              diubah
                ? { ...diubah, wali_kelas_id: diubah.wali_kelas_id ?? "" }
                : { tahun_ajaran_id: ta.id, tingkat: "X", nama: "", program: "", wali_kelas_id: "" }
            }
          />
        </Kartu>
      )}

      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className={kelasTabel}>
          <thead>
            <tr>
              <th className={kelasTh}>Kelas</th>
              <th className={kelasTh}>Tingkat</th>
              <th className={kelasTh}>Wali kelas</th>
              <th className={`${kelasTh} text-right`}>Siswa</th>
              <th className={kelasTh}>
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-black/50">
                  Belum ada kelas di tahun ajaran ini. Kelas juga bisa dibuat otomatis saat impor siswa.
                </td>
              </tr>
            )}
            {list.map((k) => (
              <tr key={k.id} className="hover:bg-soft/50">
                <td className={`${kelasTd} font-semibold`}>
                  <Link href={`/admin/kelas/${k.id}`} className="hover:underline">
                    {k.nama}
                  </Link>
                  {k.program && <span className="ml-2 text-xs text-black/50">{k.program}</span>}
                </td>
                <td className={kelasTd}>{k.tingkat}</td>
                <td className={kelasTd}>{k.wali_kelas ?? <span className="text-amber-700">Belum ada</span>}</td>
                <td className={`${kelasTd} text-right tabular-nums`}>{k.jumlah_siswa}</td>
                <td className={`${kelasTd} text-right`}>
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/kelas/${k.id}`} className="rounded-full px-3 py-1 hover:bg-black/5">
                      Siswa
                    </Link>
                    {bisaUbah && (
                      <Link href={`/admin/kelas?ta=${ta.id}&ubah=${k.id}`} className="rounded-full px-3 py-1 hover:bg-black/5">
                        Ubah
                      </Link>
                    )}
                    {bisaUbah && k.jumlah_siswa === 0 && (
                      <form action={arsipkanKelas}>
                        <input type="hidden" name="id" value={k.id} />
                        <button type="submit" className="rounded-full px-3 py-1 text-blue-teks hover:bg-red-50">
                          Arsipkan
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
