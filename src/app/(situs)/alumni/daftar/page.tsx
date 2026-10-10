import type { Metadata } from "next";
import { FormDaftarAlumni } from "@/components/alumni/Form";
import { PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Daftar Alumni", robots: { index: false } };

export default function DaftarAlumni() {
  return (
    <>
      <PageHeader judul="Daftar Alumni" deskripsi="Isi data sesuai ijazah. Sekolah mencocokkan dengan data lulusan sebelum mengaktifkan akun Anda." />
      <Section><div className="max-w-2xl"><FormDaftarAlumni /></div></Section>
    </>
  );
}
