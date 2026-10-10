import Link from "next/link";
import { Brand } from "@/components/Header";
import { sekolah } from "@/content/sekolah";
import { menu } from "@/content/menu";
import { getProfil, getSitus } from "@/lib/data";

const tautanLain = [
  { href: "/masuk", label: "Portal Siswa & Orang Tua" },
  { href: "/perpustakaan", label: "Perpustakaan" },
  { href: "/ekskul", label: "Ekskul & OSIS" },
  { href: "/pengaduan", label: "Pengaduan & Aspirasi" },
  { href: "/alumni", label: "Alumni" },
  { href: "/survei", label: "Survei Layanan" },
];

export async function Footer() {
  const [profil, situs] = await Promise.all([getProfil(), getSitus()]);
  const kontak = [profil.alamat, profil.telepon, profil.email].filter(Boolean);
  return (
    <footer className="lp lp-footer">
      <div className="lp-wadah">
        <div className="footer-grid">
          <div className="max-w-sm">
            <Brand />
            <p className="muted mt-[18px] text-xs leading-relaxed">
              {situs.footerTeks || (
                <>
                  Ruang untuk belajar, bertumbuh,
                  <br />
                  dan memberi dampak.
                </>
              )}
            </p>
            {kontak.length > 0 && <p className="muted mt-4 text-xs leading-relaxed">{kontak.join(" · ")}</p>}
            {situs.sosialMedia.length > 0 && (
              <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {situs.sosialMedia.map((s) => (
                  <a key={s.nama} href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#284fd7]">
                    {s.nama}
                  </a>
                ))}
              </p>
            )}
          </div>
          <nav className="footer-links" aria-label="Tautan kaki">
            {[...menu.filter((m) => m.href !== "/"), ...tautanLain].map((m) => (
              <Link key={m.href} href={m.href}>
                {m.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {sekolah.nama}. {sekolah.kota}.
          </span>
          <span>Satu sekolah. Banyak kemungkinan.</span>
        </div>
      </div>
    </footer>
  );
}
