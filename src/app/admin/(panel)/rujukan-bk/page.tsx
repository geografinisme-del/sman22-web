import { JudulHalaman, KosongAdmin, Lencana } from "@/components/admin/ui";
import { punya, wajibIzin } from "@/lib/admin/auth";
import { formatWaktu } from "@/lib/format";
import { FormTangani } from "./Form";

export const metadata = { title: "Rujukan BK" };

export default async function RujukanBk() {
  const { supabase, akses } = await wajibIzin("bk.rujukan");
  const konselor = punya(akses, "bk.konseling");
  const { data } = await supabase.from("rujukan_bk").select("id, siswa_id, alasan, dirujuk_oleh, dirujuk_pada, status, catatan_bk, siswa:siswa_id(nama)").order("status").order("dirujuk_pada", { ascending: false }).limit(100);
  type R = { id: string; siswa_id: string; alasan: string; dirujuk_oleh: string; dirujuk_pada: string; status: string; catatan_bk: string; siswa: { nama: string } | null };
  const list = (data ?? []) as unknown as R[];
  return (
    <>
      <JudulHalaman judul="Rujukan BK" deskripsi="Rujukan dari wali kelas/kesiswaan. Catatan BK hanya dapat dibaca guru BK; perujuk hanya melihat statusnya." />
      {!list.length ? <KosongAdmin teks="Belum ada rujukan." /> : (
        <ul className="space-y-4">
          {list.map((r) => (
            <li key={r.id} className="grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-black/5 lg:grid-cols-[1fr_360px]">
              <div>
                <p className="font-semibold">{r.siswa?.nama} <Lencana warna={r.status === "baru" ? "kuning" : r.status === "selesai" ? "hijau" : "abu"}>{r.status}</Lencana></p>
                <p className="mt-1 text-xs text-black/50">Dirujuk {formatWaktu(r.dirujuk_pada)}</p>
                <p className="mt-2 text-sm text-black/70">“{r.alasan}”</p>
                <a href={`/admin/kesiswaan/siswa/${r.siswa_id}`} className="mt-2 inline-block text-sm text-blue-teks underline">Rapor perkembangan siswa</a>
                {konselor && r.status === "baru" && <a href={`/admin/bk/kasus/baru?rujukan=${r.id}`} className="ml-4 mt-2 inline-block text-sm font-semibold text-blue-teks underline">Buka kasus BK →</a>}
              </div>
              <FormTangani id={r.id} status={r.status} catatan={r.catatan_bk} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
