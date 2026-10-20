import type { Metadata } from "next";
import { CtaBand, Kosong, SectionHeading } from "@/components/langit/Komponen";
import { PageHeader } from "@/components/ui";
import { getProfil } from "@/lib/data";

export const metadata: Metadata = { title: "Visi dan Misi" };

const NILAI = ["Berakhlak", "Berprestasi", "Berwawasan lingkungan"];

export default async function VisiMisi() {
  const p = await getProfil();
  return (
    <>
      <PageHeader judul="Visi dan misi" label="Profil" remah={[{ href: "/profil", label: "Profil" }]} deskripsi="Arah dan tujuan pendidikan di SMA Negeri 22 Bandung." />

      <section className="lgt-bagian">
        <div className="lgt-wadah lgt-kisi-2 lgt-kisi-renggang">
          <div>
            <SectionHeading label="Visi" judul={p.visi || "Visi resmi sekolah sedang dilengkapi."} />
          </div>
          <div>
            <p className="label-mono lgt-label-titik">Misi</p>
            {p.misi.length > 0 ? (
              <ol className="lgt-daftar-tgl mt-4">
                {p.misi.map((m, i) => (
                  <li key={m}>
                    <span className="lgt-tgl" aria-hidden>
                      <strong>{String(i + 1).padStart(2, "0")}</strong>
                    </span>
                    <p className="self-center text-[var(--ink)]">{m}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-4">
                <Kosong teks="Misi resmi sekolah sedang dilengkapi." />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="lgt-bagian lgt-bagian-soft">
        <div className="lgt-wadah">
          <SectionHeading label="Nilai sekolah" judul="Tiga hal yang kami pegang." />
          <ol className="lgt-nomor-kisi mt-8">
            {NILAI.map((n) => (
              <li key={n} className="lgt-nomor">
                <strong>{n}</strong>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <CtaBand label="Program" judul="Lihat bagaimana nilai ini dijalankan." tombol={{ href: "/program", teks: "Program dan karakter" }} />
    </>
  );
}
