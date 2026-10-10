import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/ui";
import { sekolah } from "@/content/sekolah";
import { getProfil } from "@/lib/data";

export const metadata: Metadata = { title: "Kontak" };

export default async function Kontak() {
  const profil = await getProfil();
  const mapsSrc = `https://www.google.com/maps?q=${encodeURIComponent(sekolah.mapsQuery)}&output=embed`;
  const sosmed = sekolah.sosialMedia.filter((s) => s.url);

  return (
    <>
      <PageHeader judul="Kontak" deskripsi="Hubungi kami untuk informasi, layanan, saran, atau pengaduan." />
      <Section>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-5 rounded-2xl bg-white p-6 ">
            <div>
              <h2 className="text-sm uppercase tracking-[0.2em] text-black/50">Alamat</h2>
              {profil.alamat && <p className="mt-1">{profil.alamat}</p>}
              <p>{sekolah.kota}</p>
            </div>
            <div>
              <h2 className="text-sm uppercase tracking-[0.2em] text-black/50">Telepon</h2>
              <p className="mt-1">{profil.telepon || "Segera diperbarui"}</p>
            </div>
            <div>
              <h2 className="text-sm uppercase tracking-[0.2em] text-black/50">Email</h2>
              <p className="mt-1">{profil.email || "Segera diperbarui"}</p>
            </div>
            <div>
              <h2 className="text-sm uppercase tracking-[0.2em] text-black/50">Jam layanan</h2>
              <p className="mt-1">{profil.jamLayanan || "Segera diperbarui"}</p>
            </div>
            {sosmed.length > 0 && (
              <div>
                <h2 className="text-sm uppercase tracking-[0.2em] text-black/50">Media sosial</h2>
                <ul className="mt-1 flex flex-wrap gap-3">
                  {sosmed.map((s) => (
                    <li key={s.nama}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-merah hover:underline">
                        {s.nama} {s.akun}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="rounded-lg bg-krem p-4 text-sm text-black/60">
              Formulir pengaduan online akan tersedia pada tahap berikutnya (modul Humas & Pengaduan).
            </p>
          </div>
          <iframe
            title={`Peta lokasi ${sekolah.nama}`}
            src={mapsSrc}
            className="min-h-[360px] w-full rounded-2xl "
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </Section>
    </>
  );
}
