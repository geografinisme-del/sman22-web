import Link from "next/link";
import { ArrowUp, ArrowUpRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { Brand } from "@/components/Header";
import { sekolah } from "@/content/sekolah";
import { menu } from "@/content/menu";
import { getProfil, getSitus } from "@/lib/data";

const LAYANAN = [
  { href: "/masuk", label: "Portal siswa & orang tua" },
  { href: "/perpustakaan", label: "Katalog perpustakaan" },
  { href: "/ekskul", label: "Ekskul & OSIS" },
  { href: "/pengaduan", label: "Pengaduan & aspirasi" },
  { href: "/sertifikat", label: "Verifikasi sertifikat" },
  { href: "/alumni", label: "Alumni" },
  { href: "/survei", label: "Survei layanan" },
];

export async function Footer() {
  const [profil, situs] = await Promise.all([getProfil(), getSitus()]);
  const kontak = [
    { Ikon: MapPin, isi: [profil.alamat, sekolah.kota].filter(Boolean).join(", ") },
    { Ikon: Phone, isi: profil.telepon },
    { Ikon: Mail, isi: profil.email },
    { Ikon: Clock, isi: profil.jamLayanan },
  ].filter((k) => k.isi);

  return (
    <footer className="lp lp-footer">
      {/* ajakan */}
      <div className="lp-wadah">
        <div className="footer-ajakan">
          <div>
            <p className="eyebrow">Satu pintu, terhubung</p>
            <p className="mt-2 font-serif text-[clamp(1.6rem,3vw,2.4rem)] leading-tight tracking-[-0.02em]">
              Ada yang bisa kami <em className="text-[#544881]">bantu?</em>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/masuk" className="btn btn-primary">
              Masuk portal <ArrowUpRight size={16} aria-hidden />
            </Link>
            <Link href="/kontak" className="btn">
              Hubungi sekolah
            </Link>
          </div>
        </div>
      </div>

      <div className="lp-wadah footer-kolom">
        <div className="max-w-sm">
          <Brand />
          <p className="muted mt-4 text-[13px] leading-relaxed">
            {situs.footerTeks || "Ruang untuk belajar, bertumbuh, dan memberi dampak — sejak 1989 di Kota Bandung."}
          </p>
          {situs.sosialMedia.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {situs.sosialMedia.map((s) => (
                <li key={s.nama}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="footer-pil">
                    {s.nama} <ArrowUpRight size={12} aria-hidden />
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
            <ul className="mt-4 space-y-3 text-[13px] text-[#4f5763]">
              {kontak.map(({ Ikon, isi }) => (
                <li key={isi} className="flex gap-3">
                  <Ikon size={16} aria-hidden className="mt-0.5 shrink-0 text-[#284fd7]" />
                  <span>{isi}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted mt-4 text-[13px]">Segera diperbarui.</p>
          )}
        </div>
      </div>

      <div className="lp-wadah footer-bottom">
        <span>
          © {new Date().getFullYear()} {sekolah.nama}
        </span>
        <span>Satu sekolah. Banyak kemungkinan.</span>
        <a href="#" className="footer-atas" aria-label="Kembali ke atas">
          Ke atas <ArrowUp size={14} aria-hidden />
        </a>
      </div>
    </footer>
  );
}
