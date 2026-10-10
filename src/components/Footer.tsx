import Image from "next/image";
import Link from "next/link";
import { sekolah } from "@/content/sekolah";
import { menu } from "@/content/menu";
import { getProfil, getSitus } from "@/lib/data";

export async function Footer() {
  const [profil, situs] = await Promise.all([getProfil(), getSitus()]);
  const sosmed = situs.sosialMedia;
  return (
    <footer className="bg-brand-900 text-white">
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-16 sm:px-8 sm:pt-24">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-4">
              <Image src={sekolah.logo} alt={`Logo ${sekolah.nama}`} width={64} height={64} />
              <p className="font-serif text-3xl leading-tight">{sekolah.nama}</p>
            </div>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/60">
              {profil.alamat && (
                <>
                  {profil.alamat}
                  <br />
                </>
              )}
              {sekolah.kota}
            </p>
            {situs.footerTeks && <p className="mt-4 max-w-sm whitespace-pre-line text-sm leading-relaxed text-white/60">{situs.footerTeks}</p>}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">Kontak</p>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              {profil.telepon && <li>{profil.telepon}</li>}
              {profil.email && <li>{profil.email}</li>}
              {profil.jamLayanan && <li>{profil.jamLayanan}</li>}
            </ul>
            {sosmed.length > 0 && (
              <ul className="mt-5 space-y-2 text-sm">
                {sosmed.map((s) => (
                  <li key={s.nama}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-white/80 underline-offset-4 hover:text-accent-400 hover:underline">
                      {s.nama} {s.akun}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">Jelajahi</p>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {menu.map((m) => (
                <li key={m.href}>
                  <Link href={m.href} className="text-white/80 hover:text-accent-400">
                    {m.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/masuk" className="text-white/80 hover:text-accent-400">
                  Portal Siswa & Orang Tua
                </Link>
              </li>
              <li>
                <Link href="/perpustakaan" className="text-white/80 hover:text-accent-400">
                  Perpustakaan
                </Link>
              </li>
              <li>
                <Link href="/pengaduan" className="text-white/80 hover:text-accent-400">
                  Pengaduan & Aspirasi
                </Link>
              </li>
              <li>
                <Link href="/ekskul" className="text-white/80 hover:text-accent-400">
                  Ekskul & OSIS
                </Link>
              </li>
              <li>
                <Link href="/alumni" className="text-white/80 hover:text-accent-400">
                  Alumni
                </Link>
              </li>
              <li>
                <Link href="/survei" className="text-white/80 hover:text-accent-400">
                  Survei Layanan
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <p aria-hidden className="mt-16 select-none font-serif text-[18vw] leading-none tracking-tight text-white/[0.06] lg:text-[11rem]">
          SMAN 22 Bandung
        </p>
        <div className="mt-6 flex flex-col justify-between gap-2 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} {sekolah.nama}</p>
          <p>{sekolah.kota}</p>
        </div>
      </div>
    </footer>
  );
}
