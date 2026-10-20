import type { Metadata } from "next";
import { CtaBand, Kosong, TeksCms } from "@/components/langit/Komponen";
import { PageHeader, Section } from "@/components/ui";
import { getHalamanCms } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

export const metadata: Metadata = { title: "Kurikulum" };

/** Isi dari CMS (Admin → Halaman → slug "kurikulum"); belum terbit → keadaan kosong yang jujur. */
export default async function Kurikulum() {
  const h = await getHalamanCms("kurikulum");
  return (
    <>
      <PageHeader judul={h?.judul || "Kurikulum"} label="Pembelajaran" remah={[{ href: "/pembelajaran", label: "Pembelajaran" }]} deskripsi={h?.ringkasan || "Struktur dan pelaksanaan kurikulum di SMA Negeri 22 Bandung."} />
      <Section>
        {h?.isi ? (
          <>
            <TeksCms isi={h.isi} />
            {h.diperbarui && <p className="mt-10 text-sm text-[var(--muted)]">Diperbarui {formatTanggal(h.diperbarui)}.</p>}
          </>
        ) : (
          <Kosong teks="Informasi kurikulum sedang disiapkan." sub="Sementara itu, lihat program dan karakter sekolah." />
        )}
      </Section>
      <CtaBand label="Program" judul="Program dan karakter" lanjutan="yang menyertai kurikulum." tombol={{ href: "/program", teks: "Lihat program" }} />
    </>
  );
}
