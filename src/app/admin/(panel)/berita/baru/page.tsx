import { JudulHalaman, TombolLink } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { bolehTerbit } from "@/lib/admin/konten";
import { FormBerita } from "../FormBerita";

export const metadata = { title: "Tulis berita" };

export default async function BeritaBaru() {
  const { supabase, akses } = await wajibIzin("konten.kelola");
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  return (
    <>
      <JudulHalaman judul="Tulis berita" aksi={<TombolLink href="/admin/berita" sekunder>← Kembali</TombolLink>} />
      <FormBerita
        bolehTerbit={await bolehTerbit(supabase, akses)}
        data={{ judul: "", slug: "", kategori: "Kegiatan", tanggal: hariIni, ringkasan: "", isi: "", status: "draft", gambar_url: "" }}
      />
    </>
  );
}
