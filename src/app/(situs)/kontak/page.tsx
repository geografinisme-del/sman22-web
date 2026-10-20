import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { sekolah } from "@/content/sekolah";
import { getProfil } from "@/lib/data";

export const metadata: Metadata = { title: "Kontak" };

export default async function Kontak() {
  const profil = await getProfil();
  const mapsSrc = `https://www.google.com/maps?q=${encodeURIComponent(sekolah.mapsQuery)}&output=embed`;
  const mapsBuka = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sekolah.mapsQuery)}`;
  const sosmed = sekolah.sosialMedia.filter((s) => s.url);
  const telp = profil.telepon?.replace(/[^\d+]/g, "");

  const rincian = [
    { judul: "Alamat", isi: [profil.alamat, sekolah.kota].filter(Boolean).join(", "), href: mapsBuka, aksi: "Buka di Google Maps" },
    { judul: "Telepon", isi: profil.telepon, href: telp ? `tel:${telp}` : undefined, aksi: "Telepon" },
    { judul: "Email", isi: profil.email, href: profil.email ? `mailto:${profil.email}` : undefined, aksi: "Kirim email" },
    { judul: "Jam layanan", isi: profil.jamLayanan },
  ];
  const ada = rincian.filter((r) => r.isi);
  const belum = rincian.filter((r) => !r.isi).map((r) => r.judul.toLowerCase());

  return (
    <>
      <PageHeader judul="Kontak" label="Kunjungi kami" deskripsi="Hubungi sekolah untuk informasi, layanan, saran, atau pengaduan." />

      <section className="lgt-bagian">
        <div className="lgt-wadah grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <div>
            <dl className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {ada.map((r) => (
                <div key={r.judul} className="py-4">
                  <dt className="label-mono text-[var(--blue-teks)]">{r.judul}</dt>
                  <dd className="mt-0.5 text-[1.0625rem] font-semibold">{r.isi}</dd>
                  {r.href && (
                    <a href={r.href} target={r.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="lgt-tautan-panah mt-1 text-[0.9375rem]">
                      {r.aksi} <span aria-hidden>→</span>
                    </a>
                  )}
                </div>
              ))}
            </dl>
            {belum.length > 0 && <p className="mt-3 text-[0.9375rem] text-[var(--muted)]">Informasi {belum.join(", ")} sekolah sedang dilengkapi.</p>}

            {sosmed.length > 0 && (
              <div className="mt-6">
                <h2 className="text-[1.125rem]">Media sosial</h2>
                <ul className="mt-2 space-y-1">
                  {sosmed.map((s) => (
                    <li key={s.nama}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="tautan">
                        {s.nama} {s.akun}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-8">
              <h2 className="text-[1.125rem]">Layanan pengaduan</h2>
              <p className="mt-1 text-[var(--muted)]">Sampaikan saran atau laporan; setiap laporan mendapat nomor tiket.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href="/pengaduan" className="btn">
                  Kirim pengaduan
                </Link>
                <Link href="/pengaduan/cek" className="btn">
                  Cek status tiket
                </Link>
              </div>
            </div>
          </div>
          <div className="lgt-peta relative !mt-0 min-h-[360px] !aspect-auto">
            <iframe title={`Peta lokasi ${sekolah.nama}`} src={mapsSrc} className="absolute inset-0 h-full w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </div>
      </section>
    </>
  );
}
