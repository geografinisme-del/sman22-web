import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/ui";
import { spmb } from "@/content/sekolah";
import { getProfil } from "@/lib/data";

export const metadata: Metadata = {
  title: "SPMB",
  description: "Informasi Sistem Penerimaan Murid Baru SMA Negeri 22 Bandung.",
};

export default async function Spmb() {
  const profil = await getProfil();
  const kontak = [profil.telepon, profil.email].filter(Boolean).join(" atau ");
  return (
    <>
      <PageHeader judul={`SPMB ${spmb.tahun}`} deskripsi="Sistem Penerimaan Murid Baru" />
      <Section>
        <div className="rounded-2xl border border-accent-500/40 bg-accent-400/15 p-5">{spmb.catatan}</div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 ">
            <h2 className="font-serif text-3xl">Jalur Pendaftaran</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-black/70">
              {spmb.jalur.map((j) => (
                <li key={j}>{j}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-white p-6 ">
            <h2 className="font-serif text-3xl">Persyaratan</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-black/70">
              {spmb.persyaratan.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-brand-900 p-8 text-white">
          <h2 className="font-serif text-3xl">Butuh bantuan?</h2>
          <p className="mt-2 text-white/70">
            {kontak ? <>Hubungi panitia SPMB di {kontak}{profil.jamLayanan && ` (${profil.jamLayanan})`}.</> : "Hubungi tata usaha sekolah pada jam layanan."}
          </p>
          {spmb.tautanResmi && (
            <a
              href={spmb.tautanResmi}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block rounded-lg bg-accent-400 px-5 py-3 font-semibold text-brand-900 hover:bg-accent-500"
            >
              Buka situs SPMB resmi
            </a>
          )}
        </div>
      </Section>
    </>
  );
}
