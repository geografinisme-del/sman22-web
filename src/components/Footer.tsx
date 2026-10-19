import Link from "next/link";
import { sekolah } from "@/content/sekolah";
import { tautanELearning } from "@/content/menu";
import { getProfil, getSitus } from "@/lib/data";

const JELAJAHI = [
  { href: "/profil", label: "Profil" },
  { href: "/berita", label: "Berita" },
  { href: "/agenda", label: "Agenda" },
  { href: "/galeri", label: "Galeri" },
  { href: "/alumni", label: "Alumni" },
];
// selaras dengan menu utama: E-Learning hanya di Pembelajaran, E-Library hanya di Layanan
const LAYANAN = [
  { href: "/portal-digital", label: "Portal Digital 22" },
  { href: "/perpustakaan", label: "E-Library" },
  { href: "/pengaduan", label: "Pengaduan & aspirasi" },
  { href: "/sertifikat", label: "Verifikasi sertifikat" },
  { href: "/survei", label: "Survei layanan" },
];
const SPMB = [
  { href: "/spmb", label: "Jalur dan syarat" },
  { href: "/spmb#tahapan", label: "Jadwal" },
  { href: "/kontak", label: "Tanya panitia" },
];

/** Footer bergaya buku tahunan: latar marun, judul serif; hanya data resmi yang sudah diisi di CMS. */
export async function Footer() {
  const [profil, situs] = await Promise.all([getProfil(), getSitus()]);
  const deskripsi = situs.footerTeks || profil.slogan || `Sekolah menengah atas negeri di ${sekolah.kota} sejak ${sekolah.tahunBerdiri}.`;
  const pembelajaran = [
    { href: "/program", label: "Program & karakter" },
    { href: tautanELearning(situs.layanan), label: "E-Learning" },
  ];
  const kolom: [string, { href: string; label: string }[]][] = [
    ["Jelajahi", JELAJAHI],
    ["Pembelajaran", pembelajaran],
    ["Layanan", LAYANAN],
    ["SPMB", SPMB],
  ];

  return (
    <footer className="lp lp-footer">
      <div className="lp-wadah footer-kolom">
        <div>
          <p className="footer-nama">{sekolah.nama}</p>
          <p className="footer-deskripsi whitespace-pre-line">{deskripsi}</p>
          {situs.sosialMedia.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              {situs.sosialMedia.map((s) => (
                <li key={s.nama}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="footer-sosial">
                    {s.nama}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        {kolom.map(([judul, daftar]) => (
          <nav key={judul} aria-label={judul}>
            <p className="footer-judul">{judul}</p>
            <ul className="footer-daftar">
              {daftar.map((m) => (
                <li key={m.href + m.label}>
                  <Link href={m.href}>{m.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="lp-wadah footer-bottom">
        <span>
          © {new Date().getFullYear()} {sekolah.nama}
        </span>
        <span>Dikelola oleh Tim TIK {sekolah.nama}</span>
      </div>
    </footer>
  );
}
