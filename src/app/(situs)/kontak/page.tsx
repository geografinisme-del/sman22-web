import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Clock, Mail, MapPin, MessageSquareWarning, Phone, Search } from "lucide-react";
import { Reveal } from "@/components/Reveal";
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

  const kartu = [
    { Ikon: MapPin, judul: "Alamat", isi: [profil.alamat, sekolah.kota].filter(Boolean).join(", "), href: mapsBuka, aksi: "Buka di Maps" },
    { Ikon: Phone, judul: "Telepon", isi: profil.telepon, href: telp ? `tel:${telp}` : undefined, aksi: "Telepon" },
    { Ikon: Mail, judul: "Email", isi: profil.email, href: profil.email ? `mailto:${profil.email}` : undefined, aksi: "Kirim email" },
    { Ikon: Clock, judul: "Jam layanan", isi: profil.jamLayanan },
  ];

  return (
    <>
      <PageHeader judul="Kontak" deskripsi="Hubungi kami untuk informasi, layanan, saran, atau pengaduan.">
        {sosmed.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {sosmed.map((s) => (
              <li key={s.nama}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-[var(--tema-utama)]/20 transition hover:bg-[var(--tema-utama)] hover:text-white">
                  {s.nama} {s.akun && <span className="font-normal opacity-70">{s.akun}</span>}
                </a>
              </li>
            ))}
          </ul>
        )}
      </PageHeader>

      <div className="lp-wadah grid gap-6 py-10 sm:py-12 lg:grid-cols-[1fr_1.15fr]">
        <div className="grid content-start gap-3 sm:grid-cols-2">
          {kartu.map(({ Ikon, judul, isi, href, aksi }, i) => {
            const dalam = (
              <>
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[#ede8fa] text-[var(--tema-utama)] transition group-hover:bg-[var(--tema-utama)] group-hover:text-white">
                  <Ikon size={19} aria-hidden />
                </span>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#646c7a]">{judul}</p>
                <p className={`mt-1 ${isi ? "text-[#20252c]" : "text-[#9aa1ab]"}`}>{isi || "Segera diperbarui"}</p>
                {href && isi && (
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--tema-utama)]">
                    {aksi} <ArrowUpRight size={14} aria-hidden />
                  </span>
                )}
              </>
            );
            return (
              <Reveal key={judul} delay={i * 90} className={judul === "Alamat" ? "sm:col-span-2" : ""}>
                {href && isi ? (
                  <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="kartu group block h-full p-5">
                    {dalam}
                  </a>
                ) : (
                  <div className="kartu group h-full p-5">{dalam}</div>
                )}
              </Reveal>
            );
          })}
          <Reveal delay={400} className="sm:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/pengaduan" className="kartu group flex items-center gap-3 p-4">
                <MessageSquareWarning size={20} aria-hidden className="text-[#51419c]" />
                <span className="text-sm font-semibold">Kirim pengaduan / aspirasi</span>
                <ArrowUpRight size={15} aria-hidden className="ml-auto text-[var(--tema-utama)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <Link href="/pengaduan/cek" className="kartu group flex items-center gap-3 p-4">
                <Search size={20} aria-hidden className="text-[#51419c]" />
                <span className="text-sm font-semibold">Cek status tiket</span>
                <ArrowUpRight size={15} aria-hidden className="ml-auto text-[var(--tema-utama)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>
        </div>
        <Reveal delay={150} className="relative min-h-[380px] overflow-hidden rounded-[22px] ring-1 ring-[#e6e3f0]">
          <iframe
            title={`Peta lokasi ${sekolah.nama}`}
            src={mapsSrc}
            className="absolute inset-0 h-full w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </Reveal>
      </div>
    </>
  );
}
