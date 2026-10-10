import { JudulHalaman, TombolLink } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { FormPegawai } from "../FormPegawai";

export const metadata = { title: "Tambah pegawai" };

export default async function PegawaiBaru() {
  await wajibIzin("data_induk.kelola");
  return (
    <>
      <JudulHalaman judul="Tambah guru / pegawai" aksi={<TombolLink href="/admin/pegawai" sekunder>← Kembali</TombolLink>} />
      <FormPegawai bisaUbah data={{ nama: "", nip: "", nuptk: "", jenis: "guru", jenis_kelamin: "", jabatan: "", status: "aktif", telepon: "", email: "" }} />
    </>
  );
}
