import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { KATEGORI_PEL } from "@/lib/kesiswaan/label";
import { FormAturan, FormJenis } from "./Form";

export const metadata = { title: "Aturan Poin Kesiswaan" };

export default async function AturanPoin({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const { pesan } = await searchParams;
  const { supabase } = await wajibIzin("kesiswaan.kelola");
  const [{ data: jenis }, { data: prestasi }, { data: tindakan }, { data: atur }] = await Promise.all([
    supabase.from("jenis_pelanggaran").select("id, kode, nama, kategori, poin, versi").eq("aktif", true).order("kategori").order("poin"),
    supabase.from("aturan_poin_prestasi").select("tingkat, peringkat, poin"),
    supabase.from("aturan_tindakan_poin").select("ambang, tindakan").order("ambang"),
    supabase.from("pengaturan_kesiswaan").select("prestasi_kurangi_poin").eq("id", 1).single(),
  ]);
  return (
    <>
      <JudulHalaman judul="Aturan Poin" deskripsi="Sesuaikan dengan tata tertib sekolah. Mengubah poin membuat versi baru — catatan yang sudah ada tidak berubah." />
      <Notifikasi kode={pesan} />
      <div className="space-y-8">
        <Kartu>
          <h2 className="mb-4 font-serif text-3xl">Jenis pelanggaran</h2>
          {(["ringan", "sedang", "berat"] as const).map((k) => (
            <div key={k} className="mb-6">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-black/50">{KATEGORI_PEL[k]}</p>
              <div className="space-y-3">
                {(jenis ?? []).filter((j) => j.kategori === k).map((j) => <FormJenis key={j.id} j={j} />)}
              </div>
            </div>
          ))}
          <div className="border-t border-black/10 pt-4"><p className="mb-2 font-semibold">Tambah jenis baru</p><FormJenis /></div>
        </Kartu>
        <Kartu><FormAturan prestasi={prestasi ?? []} tindakan={tindakan ?? []} kurangi={Boolean(atur?.prestasi_kurangi_poin)} /></Kartu>
      </div>
    </>
  );
}
