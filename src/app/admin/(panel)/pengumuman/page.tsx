import Link from "next/link";
import { FormArsip, JudulHalaman, Kartu, KosongAdmin, Lencana, Notifikasi } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { formatTanggal, formatWaktu, keInputWaktu } from "@/lib/format";
import { FormPengumuman } from "./FormPengumuman";

export const metadata = { title: "Pengumuman" };

export default async function AdminPengumuman({ searchParams }: { searchParams: Promise<{ pesan?: string; ubah?: string }> }) {
  const { pesan, ubah } = await searchParams;
  const { supabase } = await wajibIzin("konten.kelola");
  const { data: list } = await supabase
    .from("pengumuman")
    // "*" agar tetap berjalan sebelum migrasi Fase 19 (kolom popup prioritas)
    .select("*")
    .is("deleted_at", null)
    .order("tanggal", { ascending: false })
    .limit(200);
  const diubah = ubah && uuid.safeParse(ubah).success ? list?.find((a) => a.id === ubah) : undefined;
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

  return (
    <>
      <JudulHalaman judul="Pengumuman" deskripsi="Pengumuman aktif tampil di pita kuning beranda dan halaman Agenda." />
      <Notifikasi kode={pesan} />
      <Kartu className="mb-8">
        <h2 className="mb-5 text-2xl">{diubah ? "Ubah pengumuman" : "Tambah pengumuman"}</h2>
        <FormPengumuman
          key={diubah?.id ?? "baru"}
          data={diubah ? { ...diubah, tayang_mulai: keInputWaktu(diubah.tayang_mulai), tayang_selesai: keInputWaktu(diubah.tayang_selesai) } : { judul: "", isi: "", tanggal: hariIni, penting: false, aktif: true }}
        />
      </Kartu>

      {!list || list.length === 0 ? (
        <KosongAdmin teks="Belum ada pengumuman." />
      ) : (
        <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          {list.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {p.judul}
                  {p.penting && <Lencana warna="kuning">Penting</Lencana>}
                  {!p.aktif && <Lencana>Disembunyikan</Lencana>}
                  {p.tayang_mulai && new Date(p.tayang_mulai) > new Date() && <Lencana warna="kuning">Terjadwal {formatWaktu(p.tayang_mulai)}</Lencana>}
                  {p.tayang_selesai && new Date(p.tayang_selesai) <= new Date() && <Lencana>Sudah berakhir</Lencana>}
                </p>
                <p className="text-sm text-black/50">{formatTanggal(p.tanggal)}</p>
              </div>
              <div className="flex items-center gap-1">
                <Link href={`/admin/pengumuman?ubah=${p.id}`} className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-black/5">
                  Ubah
                </Link>
                <FormArsip tabel="pengumuman" id={p.id} judul={p.judul} kembali="/admin/pengumuman" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
