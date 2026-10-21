import type { Metadata } from "next";
import { InfoCard } from "@/components/langit/Komponen";
import { Kosong, PageHeader, Section } from "@/components/ui";
import { BIDANG_ORG, JENIS_ORG } from "@/lib/ekskul";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabasePublik } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Ekstrakurikuler & OSIS", description: "Ekstrakurikuler, OSIS, dan organisasi siswa SMAN 22 Bandung." };
export const revalidate = 300;
type O = { id: string; jenis: string; nama: string; slug: string; singkatan: string; bidang: string; deskripsi: string; logo_url: string; warna: string; jadwal_rutin: string; jumlah_anggota: number; pendaftaran_buka: boolean };

export default async function DaftarEkskul() {
  const { data } = supabaseAktif ? await supabasePublik().rpc("organisasi_publik") : { data: [] };
  const list = (data ?? []) as O[];
  return (
    <>
      <PageHeader judul="Ekskul dan OSIS" label="Kehidupan siswa" deskripsi="Wadah siswa mengembangkan minat, bakat, dan kepemimpinan." />
      <Section>
        {list.length === 0 ? (
          <Kosong teks="Daftar organisasi segera tersedia." />
        ) : (
          <div className="lgt-kisi">
            {list.map((o) => (
              <InfoCard
                key={o.id}
                href={`/ekskul/${o.slug}`}
                foto={o.logo_url || undefined}
                alt={`Logo ${o.nama}`}
                label={[JENIS_ORG[o.jenis], BIDANG_ORG[o.bidang]].filter(Boolean).join(" · ")}
                judul={o.nama}
                deskripsi={o.deskripsi || undefined}
              >
                <span className="mt-2 text-[0.8125rem] text-[var(--muted)]">
                  {[o.jadwal_rutin, `${o.jumlah_anggota} anggota`].filter(Boolean).join(" · ")}
                </span>
                {o.pendaftaran_buka && <span className="lgt-pil-tingkat mt-2 self-start">Pendaftaran dibuka</span>}
              </InfoCard>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
