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
        {/* daftar ringkas dengan gambar mini kecil: cukup untuk kredit, ringan dimuat */}
        <ul className="grid gap-3 lg:grid-cols-2">
          {daftar.map((d) => (
            <li key={d.src} className="flex gap-4 rounded-[14px] border border-[var(--line)] bg-white p-3">
              <MediaSlot src={d.src} alt={d.isi} ratio="1/1" sizes="96px" className="w-24 shrink-0 overflow-hidden rounded-[10px]" />
              <div className="min-w-0 text-sm">
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
                <p className="mt-1 text-[var(--muted)]">Dipakai di: {d.lokasi.join("; ")}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
