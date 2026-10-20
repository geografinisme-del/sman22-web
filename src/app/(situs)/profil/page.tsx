import type { Metadata } from "next";
import { CtaBand, InfoCard, SectionHeading } from "@/components/langit/Komponen";
import { PageHeader } from "@/components/ui";
import { sekolah } from "@/content/sekolah";
import { getProfil } from "@/lib/data";
import { JENIS_MITRA } from "@/lib/humas";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabasePublik } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Profil Sekolah" };

const SUBHALAMAN = [
  { href: "/sambutan", label: "Profil", judul: "Sambutan kepala sekolah", deskripsi: "Pesan kepala sekolah untuk warga dan calon siswa.", foto: "/images/kepala-sekolah.jpg" },
  { href: "/profil/visi-misi", label: "Profil", judul: "Visi dan misi", deskripsi: "Arah dan tujuan pendidikan di SMA Negeri 22 Bandung.", foto: "/images/apel-lapangan.jpg" },
  { href: "/profil/sejarah", label: "Profil", judul: "Sejarah", deskripsi: `Perjalanan sekolah sejak ${sekolah.tahunBerdiri}.`, foto: "/images/gedung.jpg" },
  { href: "/profil/guru-staf", label: "Profil", judul: "Guru dan staf", deskripsi: "Pendidik dan tenaga kependidikan sekolah.", foto: "/images/keluarga-besar.jpg" },
  { href: "/profil/fasilitas", label: "Profil", judul: "Fasilitas", deskripsi: "Ruang belajar, laboratorium, dan sarana pendukung.", foto: "/images/kegiatan-aula.jpg" },
];

export default async function Profil() {
  const p = await getProfil();
  const { data: mitraData } = supabaseAktif ? await supabasePublik().rpc("mitra_publik") : { data: [] };
  const mitra = (mitraData ?? []) as { mitra: string; jenis: string }[];
  // hanya isian resmi yang sudah terisi yang ditampilkan; sisanya disebut ringkas
  const identitas: [string, string][] = [
    ["Nama sekolah", sekolah.nama],
    ["NPSN", p.npsn],
    ["Akreditasi", p.akreditasi],
    ["Kepala sekolah", p.kepalaSekolah],
    ["Tahun berdiri", String(sekolah.tahunBerdiri)],
    ["Alamat", [p.alamat, sekolah.kota].filter(Boolean).join(", ")],
    ["Telepon", p.telepon],
    ["Email", p.email],
  ];
  const terisi = identitas.filter(([, v]) => v);
  const belum = identitas.filter(([, v]) => !v).map(([k]) => k);

  return (
    <>
      <PageHeader judul="Profil Sekolah" label="Profil" deskripsi={p.slogan || `Informasi resmi tentang ${sekolah.nama}.`} foto={{ src: "/images/gedung.jpg", alt: "Gedung utama SMA Negeri 22 Bandung" }} />

      <section className="lgt-bagian">
        <div className="lgt-wadah">
          <SectionHeading label="Mengenal sekolah" judul="Semua tentang SMAN 22." teks={p.pernyataan || undefined} />
          <div className="lgt-kisi mt-8">
            {SUBHALAMAN.map((s) => (
              <InfoCard key={s.href} href={s.href} foto={s.foto} alt="" label={s.label} judul={s.judul} deskripsi={s.deskripsi} />
            ))}
          </div>
        </div>
      </section>

      <section id="identitas" className="lgt-bagian lgt-bagian-soft scroll-mt-24">
        <div className="lgt-wadah">
          <SectionHeading label="Identitas" judul="Data resmi sekolah." />
          <dl className="nilai-daftar mt-8 sm:grid-cols-2">
            {terisi.map(([k, v]) => (
              <div key={k} className={k === "Alamat" ? "sm:col-span-2" : ""}>
                <dt className="label-mono">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {belum.length > 0 && <p className="mt-4 text-[0.9375rem] text-[var(--muted)]">{belum.join(", ")} sedang dilengkapi.</p>}
        </div>
      </section>

      {mitra.length > 0 && (
        <section className="lgt-bagian">
          <div className="lgt-wadah">
            <SectionHeading label="Kemitraan" judul="Mitra sekolah." />
            <ul className="lgt-akses mt-6 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
              {mitra.map((m) => (
                <li key={m.mitra} className="border-b border-[var(--line)] py-3">
                  <span className="block font-semibold">{m.mitra}</span>
                  <span className="text-sm text-[var(--muted)]">{JENIS_MITRA[m.jenis as keyof typeof JENIS_MITRA] ?? m.jenis}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <CtaBand label="Kunjungi kami" judul="Ingin melihat langsung?" lanjutan="Hubungi sekolah untuk berkunjung." tombol={{ href: "/kontak", teks: "Kontak sekolah" }} />
    </>
  );
}
