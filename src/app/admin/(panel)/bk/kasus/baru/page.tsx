import { JudulHalaman, Kartu } from "@/components/admin/ui";
import { FormKasusBaru } from "@/components/bk/Form";
import { NavBk } from "@/components/bk/Nav";
import { punya, wajibIzin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { bkSiap } from "@/lib/bk-kripto";

export const metadata = { title: "Kasus BK baru" };

export default async function KasusBaru({ searchParams }: { searchParams: Promise<{ rujukan?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibIzin("bk.konseling");
  const { data: kat } = await supabase.from("kategori_konseling").select("kode, nama").eq("aktif", true).order("urutan");
  let siswa: { id: string; nama: string; kelas: string | null } | undefined;
  let rujukan: { id: string; alasan: string } | undefined;
  if (sp.rujukan && uuid.safeParse(sp.rujukan).success) {
    const { data: r } = await supabase.from("rujukan_bk").select("id, alasan, siswa_id, siswa(nama)").eq("id", sp.rujukan).maybeSingle();
    if (r) { siswa = { id: r.siswa_id, nama: (r.siswa as unknown as { nama: string } | null)?.nama ?? "", kelas: null }; rujukan = { id: r.id, alasan: r.alasan }; }
  }
  return (
    <>
      <JudulHalaman judul="Buka kasus" deskripsi="Untuk siswa yang ditemui langsung, dirujuk guru, atau dari pengaduan. Permintaan dari portal dibuka lewat halaman permintaan." />
      <NavBk konselor agregat={punya(akses, "bk.agregat")} />
      {!bkSiap && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">BK_KUNCI belum dipasang — asesmen belum bisa disimpan (kosongkan kolom asesmen).</p>}
      <Kartu className="max-w-2xl">
        {rujukan && <p className="mb-4 rounded-xl bg-soft p-3 text-sm"><strong>Alasan rujukan:</strong> {rujukan.alasan}</p>}
        <FormKasusBaru kategori={(kat ?? []).map((k) => ({ id: k.kode, nama: k.nama }))} siswa={siswa} rujukan_id={rujukan?.id} asal={rujukan ? "rujukan_guru" : "inisiatif_bk"} />
      </Kartu>
    </>
  );
}
