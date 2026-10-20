import { DaftarBarisHalaman, type BarisHalaman } from "@/components/admin/DaftarBarisHalaman";
import { wajibIzin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";

export const metadata = { title: "Fasilitas" };

export default async function AdminFasilitas({ searchParams }: { searchParams: Promise<{ pesan?: string; ubah?: string; baru?: string }> }) {
  const { pesan, ubah, baru } = await searchParams;
  const { supabase } = await wajibIzin("konten.kelola");
  const { data, error } = await supabase.from("fasilitas").select("*").order("urutan").order("created_at");
  return (
    <DaftarBarisHalaman
      tabel="fasilitas"
      halaman="/admin/fasilitas"
      judul="Fasilitas"
      deskripsi="Kartu fasilitas di Profil → Fasilitas: nama, deskripsi singkat, dan foto asli sekolah."
      list={(data ?? []) as BarisHalaman[]}
      galat={Boolean(error)}
      ubah={ubah && uuid.safeParse(ubah).success ? ubah : undefined}
      baru={baru}
      pesan={pesan}
    />
  );
}
