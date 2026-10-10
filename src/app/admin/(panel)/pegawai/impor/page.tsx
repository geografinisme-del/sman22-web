import { Impor } from "@/components/admin/Impor";
import { JudulHalaman, TombolLink } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";

export const metadata = { title: "Impor pegawai" };

export default async function ImporPegawai() {
  await wajibIzin("data_induk.kelola");
  return (
    <>
      <JudulHalaman judul="Impor guru & pegawai" aksi={<TombolLink href="/admin/pegawai" sekunder>← Kembali</TombolLink>} />
      <Impor jenis="pegawai" kembali="/admin/pegawai" templateHref="/admin/pegawai/template" />
    </>
  );
}
