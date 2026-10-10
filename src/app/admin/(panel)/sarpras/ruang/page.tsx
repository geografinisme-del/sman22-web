import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormRuang } from "@/components/sarpras/Form";
import { NavSarpras } from "@/components/sarpras/Nav";
import { wajibIzin } from "@/lib/admin/auth";
import { daftarGuru } from "@/lib/admin/nama";

export const metadata = { title: "Ruang" };

export default async function Ruang({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await wajibIzin("sarpras.kelola");
  const [{ data: ruang }, guru, { data: jumlah }] = await Promise.all([
    supabase.from("ruang").select("id, nama, jenis, gedung, kondisi, kapasitas, bisa_dipinjam, penanggung_jawab_id").is("deleted_at", null).order("nama"),
    daftarGuru(supabase),
    supabase.from("barang").select("ruang_id").is("deleted_at", null),
  ]);
  const isi = (id: string) => (jumlah ?? []).filter((b) => b.ruang_id === id).length;
  return (
    <>
      <JudulHalaman judul="Ruang" deskripsi="Kondisi, penanggung jawab, dan ruang yang bisa dipinjam (lab, aula, perpustakaan). Ruang baru ditambahkan di Jadwal → Mapel, jam & piket." />
      <NavSarpras lihat kelola />
      <Notifikasi kode={sp.pesan} />
      <div className="space-y-3">
        {(ruang ?? []).map((r) => (
          <Kartu key={r.id}>
            <p className="mb-2 font-semibold">{r.nama} <span className="font-normal text-black/50">· {r.jenis} · {isi(r.id)} jenis barang</span></p>
            <FormRuang r={r as never} guru={guru} />
          </Kartu>
        ))}
      </div>
    </>
  );
}
