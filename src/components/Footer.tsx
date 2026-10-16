import Link from "next/link";
import { Brand } from "@/components/Header";
import { sekolah } from "@/content/sekolah";
import { menu } from "@/content/menu";
import { getProfil, getSitus } from "@/lib/data";

const LAYANAN = [
  { href: "/portal-digital", label: "Portal Digital 22" },
  { href: "/perpustakaan", label: "Katalog perpustakaan" },
  { href: "/ekskul", label: "Ekskul & OSIS" },
  { href: "/pengaduan", label: "Pengaduan & aspirasi" },
  { href: "/sertifikat", label: "Verifikasi sertifikat" },
  { href: "/alumni", label: "Alumni" },
  { href: "/survei", label: "Survei layanan" },
];

export async function Footer() {
  const [profil, situs] = await Promise.all([getProfil(), getSitus()]);
  // hanya data kontak resmi yang sudah diisi di CMS — tidak ada isian karangan
  const kontak = [
    { label: "Alamat", isi: [profil.alamat, sekolah.kota].filter(Boolean).join(", ") },
    { label: "Telepon", isi: profil.telepon },
    { label: "Email", isi: profil.email },
    { label: "Jam layanan", isi: profil.jamLayanan },
  ].filter((k) => k.isi);

  return (
    <footer className="lp lp-footer">
      <div className="lp-wadah footer-kolom">
        <div>
          <Brand />
          {situs.footerTeks && <p className="muted mt-4 max-w-sm whitespace-pre-line">{situs.footerTeks}</p>}
          {situs.sosialMedia.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              {situs.sosialMedia.map((s) => (
                <li key={s.nama}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="tautan">
                    {s.nama}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <nav aria-label="Jelajahi">
          <p className="footer-judul">Jelajahi</p>
          <ul className="footer-daftar">
            {menu.map((m) => (
              <li key={m.href}>
                <Link href={m.href}>{m.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Layanan">
          <p className="footer-judul">Layanan</p>
          <ul className="footer-daftar">
            {LAYANAN.map((m) => (
              <li key={m.href}>
                <Link href={m.href}>{m.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="footer-judul">Kontak</p>
          {kontak.length ? (
            <dl className="mt-3 space-y-2">
              {kontak.map((k) => (
                <div key={k.label}>
                  <dt className="text-sm text-[#5b6270]">{k.label}</dt>
                  <dd className="text-[#3b414b]">{k.isi}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="muted mt-3">Kontak resmi sedang dilengkapi.</p>
          )}
          <Link href="/kontak" className="tautan mt-4 inline-block">
            Lokasi & kontak
          </Link>
        </div>
      </div>

      <div className="lp-wadah footer-bottom">
        <span>
          © {new Date().getFullYear()} {sekolah.nama}
        </span>
        <a href="#konten" className="hover:text-[var(--tema-utama)]">
          Kembali ke atas
        </a>
      </div>
    </footer>
  );
}
