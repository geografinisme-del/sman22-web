import Link from "next/link";
import { JudulHalaman, Kartu, KosongAdmin, Lencana, Notifikasi } from "@/components/admin/ui";
import { punya, wajibIzin } from "@/lib/admin/auth";
import { formatTanggal } from "@/lib/format";
import { aktifkanTahunAjaran } from "../../actions-induk";
import { FormTahunAjaran } from "./FormTahunAjaran";

export const metadata = { title: "Tahun Ajaran" };

export default async function TahunAjaran({ searchParams }: { searchParams: Promise<{ pesan?: string; ubah?: string }> }) {
  const { pesan, ubah } = await searchParams;
  const { supabase, akses } = await wajibIzin("data_induk.baca");
  const bisaUbah = punya(akses, "data_induk.kelola");
  const { data: list } = await supabase
    .from("tahun_ajaran")
    .select("id, nama, semester, aktif, tanggal_mulai, tanggal_selesai")
    .order("nama", { ascending: false });
  const diubah = list?.find((t) => t.id === ubah);
  const tahun = new Date().getFullYear();

  return (
    <>
      <JudulHalaman
        judul="Tahun Ajaran"
        deskripsi="Hanya satu tahun ajaran yang aktif. Kelas dan penempatan siswa mengikuti tahun ajaran aktif."
      />
      <Notifikasi kode={pesan} />
      {bisaUbah && (
        <Kartu className="mb-8">
          <h2 className="mb-5 text-2xl">{diubah ? `Ubah ${diubah.nama}` : "Tambah tahun ajaran"}</h2>
          <FormTahunAjaran
            key={diubah?.id ?? "baru"}
            data={
              diubah
                ? { ...diubah, tanggal_mulai: diubah.tanggal_mulai ?? "", tanggal_selesai: diubah.tanggal_selesai ?? "" }
                : { nama: `${tahun}/${tahun + 1}`, semester: "ganjil", tanggal_mulai: "", tanggal_selesai: "" }
            }
          />
        </Kartu>
      )}
      {!list?.length ? (
        <KosongAdmin teks="Belum ada tahun ajaran." />
      ) : (
        <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          {list.map((t) => (
            <li key={t.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="flex items-center gap-2 text-2xl">
                  {t.nama} {t.aktif && <Lencana warna="hijau">Aktif</Lencana>}
                </p>
                <p className="text-sm text-black/50">
                  Semester {t.semester}
                  {t.tanggal_mulai && ` · ${formatTanggal(t.tanggal_mulai)} – ${t.tanggal_selesai ? formatTanggal(t.tanggal_selesai) : "…"}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/kelas?ta=${t.id}`} className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-black/5">
                  Lihat kelas
                </Link>
                {bisaUbah && (
                  <Link href={`/admin/tahun-ajaran?ubah=${t.id}`} className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-black/5">
                    Ubah
                  </Link>
                )}
                {bisaUbah && !t.aktif && (
                  <form action={aktifkanTahunAjaran}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className="rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-white hover:bg-ink/85">
                      Jadikan aktif
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
