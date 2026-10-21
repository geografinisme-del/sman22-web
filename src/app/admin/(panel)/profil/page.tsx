import { FormAksi, Input, TombolSimpan } from "@/components/admin/form";
import { JudulHalaman, Kartu } from "@/components/admin/ui";
import { simpanAngkaBeranda } from "../../actions-langit";
import { wajibIzin } from "@/lib/admin/auth";
import { FormProfil, type DataProfil } from "./FormProfil";

export const metadata = { title: "Profil Sekolah" };

export default async function AdminProfil() {
  const { supabase } = await wajibIzin("konten.kelola");
  const { data } = await supabase.from("profil_sekolah").select("*").eq("id", 1).maybeSingle();
  const bersih: DataProfil = Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [k, v == null ? "" : String(v)]));

  return (
    <>
      <JudulHalaman judul="Profil Sekolah" deskripsi="Data ini tampil di beranda, halaman Profil, Kontak, dan bagian bawah website." />
      <FormProfil data={bersih} />
      <Kartu className="mt-8">
        <h2 className="text-2xl">Angka beranda</h2>
        <p className="mb-5 mt-1 text-sm text-black/60">
          Untuk bento “SMAN 22 dalam angka”. Jumlah siswa, ekskul, nama & kutipan kepala sekolah diambil dari formulir di atas. Kosongkan bila belum ada data resmi — kartunya tidak ditampilkan.
        </p>
        <FormAksi aksi={simpanAngkaBeranda} className="grid gap-5 sm:grid-cols-2">
          <Input label="Lulusan melanjutkan ke perguruan tinggi (%)" nama="lulusan_pt_persen" nilai={bersih.lulusan_pt_persen ?? ""} maks={5} placeholder="mis. 87" bantuan="Angka saja, tanpa tanda %. Sebutkan sumbernya di arsip sekolah." />
          <Input label="Jabatan di bawah kutipan" nama="kepala_sekolah_jabatan" nilai={bersih.kepala_sekolah_jabatan ?? ""} maks={80} placeholder="mis. Kepala SMA Negeri 22 Bandung" />
          <div className="sm:col-span-2">
            <TombolSimpan>Simpan angka beranda</TombolSimpan>
          </div>
        </FormAksi>
      </Kartu>
    </>
  );
}
