import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/ui";
import { FormCek } from "@/components/humas/Publik";

export const metadata: Metadata = { title: "Cek Status Pengaduan", robots: { index: false } };

export default async function Cek({ searchParams }: { searchParams: Promise<{ tiket?: string }> }) {
  const t = ((await searchParams).tiket ?? "").toUpperCase();
  return (
    <>
      <PageHeader judul="Cek Status Pengaduan" deskripsi="Masukkan nomor tiket dan kode akses yang Anda terima saat mengirim pengaduan." />
      <Section><FormCek tiketAwal={/^ADU-\d{4}-[0-9A-F]{5}$/.test(t) ? t : ""} /></Section>
    </>
  );
}
