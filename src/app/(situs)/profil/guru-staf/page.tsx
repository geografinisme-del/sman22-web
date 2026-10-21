import type { Metadata } from "next";
import { MediaSlot } from "@/components/MediaSlot";
import { Kosong } from "@/components/langit/Komponen";
import { SaringTingkat } from "@/components/langit/SaringTingkat";
import { PageHeader, Section } from "@/components/ui";
import { getStafPublik } from "@/lib/data";

export const metadata: Metadata = { title: "Guru dan Tenaga Kependidikan" };

const inisial = (nama: string) =>
  nama
    .replace(/,.*$/, "")
    .split(/\s+/)
    .filter((k) => /^[A-Za-z]/.test(k))
    .slice(0, 2)
    .map((k) => k[0].toUpperCase())
    .join("");

export default async function GuruStaf() {
  const staf = await getStafPublik();
  const bidang = [...new Set(staf.map((s) => s.bidang).filter(Boolean))].sort((a, b) => a.localeCompare(b, "id"));
  return (
    <>
      <PageHeader judul="Guru dan Tenaga Kependidikan" label="Profil" remah={[{ href: "/profil", label: "Profil" }]} deskripsi="Pendidik dan tenaga kependidikan SMA Negeri 22 Bandung." />
      <Section>
        {staf.length === 0 ? (
          <Kosong teks="Daftar guru dan tenaga kependidikan sedang disiapkan." sub="Data ditampilkan setelah diisi dan disetujui pihak sekolah." />
        ) : (
          <SaringTingkat tingkat={bidang} label="Saring bidang">
            <ul className="lgt-orang-kisi">
              {staf.map((s) => (
                <li key={s.id} data-tingkat={s.bidang.replace(/[^A-Za-z]/g, "") || undefined}>
                  <MediaSlot
                    src={s.foto}
                    alt={`Foto ${s.nama}`}
                    ratio="4/5"
                    focus="50% 0%"
                    isPlaceholder={s.sementara}
                    sizes="(min-width: 900px) 220px, 50vw"
                    className="lgt-orang-foto"
                    kosong={<span aria-hidden>{inisial(s.nama)}</span>}
                  />
                  <span className="lgt-orang-nama">{s.nama}</span>
                  {(s.jabatan || s.bidang) && <span className="lgt-orang-jabatan">{[s.jabatan, s.bidang].filter(Boolean).join(" · ")}</span>}
                </li>
              ))}
            </ul>
          </SaringTingkat>
        )}
      </Section>
    </>
  );
}
