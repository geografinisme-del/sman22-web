import type { Metadata } from "next";
import { MediaSlot } from "@/components/MediaSlot";
import { PageHeader, Section } from "@/components/ui";
import { KREDIT_STOK_LAMA } from "@/content/kredit-foto";
import { getFotoSlot } from "@/lib/foto-slot";
import { formatTanggal } from "@/lib/format";

export const metadata: Metadata = {
  title: "Kredit foto",
  description: "Daftar foto ilustrasi sementara di website SMA Negeri 22 Bandung beserta fotografer, sumber, dan lisensinya.",
};

type Baris = { src: string; isi: string; fotografer: string; tautan: string; lisensi: string; diunduh: string | null; lokasi: string[] };

export default async function KreditFoto() {
  // foto stok baru yang SEDANG dipakai (masih sementara), digabung per foto
  const per = new Map<string, Baris>();
  for (const s of await getFotoSlot()) {
    if (!s.sementara || !s.fotografer || s.src.startsWith("/images/")) continue;
    const b = per.get(s.src) ?? { src: s.src, isi: s.alt, fotografer: s.fotografer, tautan: s.tautanSumber, lisensi: s.lisensi, diunduh: s.diunduhPada, lokasi: [] };
    b.lokasi.push(s.nama);
    per.set(s.src, b);
  }
  const daftar: Baris[] = [
    ...per.values(),
    ...KREDIT_STOK_LAMA.map((k) => ({ src: k.berkas, isi: k.isi, fotografer: k.fotografer, tautan: k.tautan, lisensi: "Unsplash License", diunduh: k.diunduh, lokasi: k.lokasi })),
  ];

  return (
    <>
      <PageHeader
        judul="Kredit foto"
        label="Website"
        deskripsi="Sebagian foto di website ini adalah ilustrasi sementara dari Unsplash, berlabel “Ilustrasi sementara” atau “Ilustrasi — bukan foto kegiatan”, sampai foto asli sekolah tersedia."
      />
      <Section>
        <p className="mb-8 max-w-3xl text-[var(--muted)]">
          Semua foto di bawah memakai{" "}
          <a href="https://unsplash.com/license" target="_blank" rel="noopener" className="tautan">
            Unsplash License
          </a>{" "}
          (gratis untuk penggunaan komersial dan nonkomersial). Terima kasih kepada para fotografer.
        </p>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {daftar.map((d, i) => (
            <li key={d.src} className="overflow-hidden rounded-[18px] border border-[var(--line)] bg-white">
              <MediaSlot src={d.src} alt={d.isi} ratio="3/2" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" priority={i < 3} />
              <div className="p-4 text-sm">
                <p className="font-semibold text-[var(--ink)]">{d.isi}</p>
                <p className="mt-1">
                  Foto:{" "}
                  <a href={d.tautan} target="_blank" rel="noopener" className="tautan">
                    {d.fotografer} di Unsplash
                  </a>
                </p>
                <p className="mt-1 text-[var(--muted)]">
                  {d.lisensi.replace(/ \(https?:[^)]+\)/, "")}
                  {d.diunduh ? ` · diunduh ${formatTanggal(d.diunduh)}` : ""}
                </p>
                <p className="mt-2 text-[var(--muted)]">Dipakai di: {d.lokasi.join("; ")}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
