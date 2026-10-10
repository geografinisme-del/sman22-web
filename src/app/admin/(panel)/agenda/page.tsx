import Link from "next/link";
import { FormArsip, JudulHalaman, Kartu, KosongAdmin, Notifikasi } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { formatTanggal } from "@/lib/format";
import { FormAgenda } from "./FormAgenda";

export const metadata = { title: "Agenda" };

export default async function AdminAgenda({ searchParams }: { searchParams: Promise<{ pesan?: string; ubah?: string }> }) {
  const { pesan, ubah } = await searchParams;
  const { supabase } = await wajibIzin("konten.kelola");
  const { data: list } = await supabase
    .from("agenda")
    .select("id, judul, tanggal, waktu, tempat")
    .is("deleted_at", null)
    .order("tanggal", { ascending: false })
    .limit(200);
  const diubah = ubah && uuid.safeParse(ubah).success ? list?.find((a) => a.id === ubah) : undefined;
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

  return (
    <>
      <JudulHalaman judul="Agenda" deskripsi="Agenda tampil di beranda dan halaman Agenda (mulai 7 hari terakhir ke depan)." />
      <Notifikasi kode={pesan} />
      <Kartu className="mb-8">
        <h2 className="mb-5 font-serif text-2xl">{diubah ? "Ubah agenda" : "Tambah agenda"}</h2>
        <FormAgenda key={diubah?.id ?? "baru"} data={diubah ?? { judul: "", tanggal: hariIni, waktu: "", tempat: "" }} />
      </Kartu>

      {!list || list.length === 0 ? (
        <KosongAdmin teks="Belum ada agenda." />
      ) : (
        <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          {list.map((a) => (
            <li key={a.id} className={`flex flex-col gap-2 p-4 sm:flex-row sm:items-center ${a.tanggal < hariIni ? "opacity-50" : ""}`}>
              <time className="w-48 shrink-0 text-sm font-semibold text-brand-700">{formatTanggal(a.tanggal, { weekday: "short" })}</time>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.judul}</p>
                {(a.waktu || a.tempat) && <p className="text-sm text-black/50">{[a.waktu, a.tempat].filter(Boolean).join(" · ")}</p>}
              </div>
              <div className="flex items-center gap-1">
                <Link href={`/admin/agenda?ubah=${a.id}`} className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-black/5">
                  Ubah
                </Link>
                <FormArsip tabel="agenda" id={a.id} judul={a.judul} kembali="/admin/agenda" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
