import { DaftarBarisHalaman, type BarisHalaman } from "@/components/admin/DaftarBarisHalaman";
import { wajibIzin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";

export const metadata = { title: "Guru & Staf (publik)" };

export default async function AdminStafPublik({ searchParams }: { searchParams: Promise<{ pesan?: string; ubah?: string; baru?: string }> }) {
  const { pesan, ubah, baru } = await searchParams;
  const { supabase } = await wajibIzin("konten.kelola");
  const { data, error } = await supabase.from("staf_publik").select("*").order("urutan").order("nama");
  return (
    <DaftarBarisHalaman
      tabel="staf_publik"
      halaman="/admin/staf-publik"
      judul="Guru & staf (halaman publik)"
      deskripsi="Daftar yang tampil di Profil → Guru dan staf. Terpisah dari data kepegawaian; hanya isian di sini yang tampil publik."
      catatan={
        <p className="mb-6 rounded-xl bg-[var(--soft)] px-4 py-3 text-sm text-[var(--ink)] ring-1 ring-[var(--line)]">
          <strong>Persetujuan:</strong> tampilkan nama, jabatan, dan foto hanya untuk guru/staf yang sudah menyetujui datanya dipublikasikan. Data yang tidak lagi disetujui cukup dinonaktifkan.
        </p>
      }
      list={(data ?? []) as BarisHalaman[]}
      galat={Boolean(error)}
      ubah={ubah && uuid.safeParse(ubah).success ? ubah : undefined}
      baru={baru}
      pesan={pesan}
    />
  );
}
