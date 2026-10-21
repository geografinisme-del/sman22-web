import type { Metadata } from "next";
import { Kosong, TeksCms } from "@/components/langit/Komponen";
import { PageHeader, Section } from "@/components/ui";
import { getHalamanCms } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

export const metadata: Metadata = { title: "Tata Tertib" };

/** Isi dari CMS (Admin → Halaman teks → "Tata tertib", slug "tata-tertib"); belum terbit → keadaan kosong yang jujur. */
export default async function TataTertib() {
  const h = await getHalamanCms("tata-tertib");
  return (
    <>
      <PageHeader judul={h?.judul || "Tata tertib"} label="Profil" remah={[{ href: "/profil", label: "Profil" }]} deskripsi={h?.ringkasan || "Aturan dan pembiasaan di SMA Negeri 22 Bandung."} />
      <Section>
        {h?.isi ? (
          <>
            <TeksCms isi={h.isi} />
            {h.diperbarui && <p className="mt-10 text-sm text-[var(--muted)]">Diperbarui {formatTanggal(h.diperbarui)}.</p>}
          </>
        ) : (
          <Kosong teks="Tata tertib sekolah sedang disiapkan." sub="Naskah resmi ditampilkan setelah diterbitkan pihak sekolah." />
        )}
      </Section>
    </>
  );
}
