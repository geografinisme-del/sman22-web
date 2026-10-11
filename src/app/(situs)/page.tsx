import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Flower2,
  GraduationCap,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Hero } from "@/components/Hero";
import { Reveal } from "@/components/Reveal";
import { programUnggulan } from "@/content/sekolah";
import { getAgenda, getBerita, getGaleri, getPengumuman, getSitus } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

const NILAI = [
  { Ikon: GraduationCap, judul: "Belajar dengan tujuan", teks: "Mengembangkan pengetahuan, karakter, dan potensi diri." },
  { Ikon: Users, judul: "Tumbuh bersama", teks: "Menghubungkan siswa, guru, dan seluruh warga sekolah." },
  { Ikon: Flower2, judul: "Memberi dampak", teks: "Kebiasaan baik hari ini, perubahan berarti untuk masa depan." },
];

const TEMA_PROGRAM = [
  { latar: "#ebe5fa", tinta: "#51419c" },
  { latar: "#e6ecff", tinta: "#284fd7" },
  { latar: "#f9f3e9", tinta: "#785726" },
];

const LAYANAN_PORTAL = [
  { Ikon: LayoutDashboard, label: "Dashboard personal" },
  { Ikon: CalendarCheck, label: "Absensi harian" },
  { Ikon: ClipboardList, label: "Tugas & jadwal pelajaran" },
  { Ikon: ShieldCheck, label: "Akses sesuai kewenangan" },
];

export default async function Beranda() {
  const [situs, berita, agenda, pengumuman, galeri] = await Promise.all([
    getSitus(),
    getBerita(3),
    getAgenda(1),
    getPengumuman(4),
    getGaleri(),
  ]);

  const terbaru = [
    {
      label: "Agenda",
      href: "/agenda",
      judul: agenda[0]?.judul,
      teks: agenda[0] ? [formatTanggal(agenda[0].tanggal), agenda[0].waktu, agenda[0].tempat].filter(Boolean).join(" · ") : "",
    },
    { label: "Pengumuman", href: "/agenda", judul: pengumuman[0]?.judul, teks: pengumuman[0]?.isi ?? "" },
    { label: "Galeri", href: "/galeri", judul: galeri[0]?.judul, teks: galeri.length ? `${galeri.length} foto kegiatan sekolah` : "" },
  ];

  return (
    <div className="lp lp-halaman pt-[68px] min-[761px]:pt-20">
      <div className="lp-wadah">
        <Hero hero={situs.hero} info={pengumuman.map((p) => ({ judul: p.judul, isi: p.isi }))} />
      </div>

      {/* Nilai sekolah */}
      <section id="nilai" className="lp-wadah feature-strip scroll-mt-24" aria-label="Nilai sekolah">
        {NILAI.map(({ Ikon, judul, teks }, i) => (
          <Reveal className="feature-item" key={judul} delay={i * 120}>
            <span className="value-number" aria-hidden>
              0{i + 1}
            </span>
            <div>
              <Ikon size={22} aria-hidden />
              <h2>{judul}</h2>
              <p>{teks}</p>
            </div>
          </Reveal>
        ))}
      </section>

      {/* Program sekolah */}
      <section className="section landing-programs scroll-mt-20" id="program" aria-labelledby="judul-program">
        <div className="lp-wadah">
          <Reveal className="section-head">
            <div>
              <p className="eyebrow">01 / Lebih dari ruang kelas</p>
              <h2 id="judul-program">
                Kebiasaan baik.
                <br />
                <em>Kemungkinan besar.</em>
              </h2>
            </div>
            <p>Belajar bukan hanya tentang hari ini. Kenali ruang untuk membangun karakter, berkarya, dan memberi arti.</p>
          </Reveal>
          <div className="program-grid">
            {programUnggulan.map((p, i) => {
              const tema = TEMA_PROGRAM[i % TEMA_PROGRAM.length];
              return (
                <Reveal as="article" className="program-card" key={p.nama} delay={(i % 3) * 120}>
                  <div className="program-cover" style={{ background: tema.latar, color: tema.tinta }}>
                    <span className="tag">Program sekolah</span>
                    <span className="big" aria-hidden>
                      {p.kode}
                    </span>
                    <span className="cover-number" aria-hidden>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="program-copy">
                    <h3>{p.nama}</h3>
                    <p>{p.ringkas}</p>
                    <Link href="/profil" aria-label={`Kenali ${p.nama}`}>
                      Kenali program <ArrowUpRight size={16} aria-hidden />
                    </Link>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Portal */}
      <section className="lp-wadah section" aria-labelledby="judul-portal">
        <Reveal className="portal-banner">
          <div>
            <p className="eyebrow">02 / Satu pintu, terhubung</p>
            <h2 id="judul-portal">
              Sekolah dalam
              <br />
              <em>genggaman.</em>
            </h2>
            <p>Informasi, kehadiran, tugas, dan layanan sekolah hadir dalam satu ruang yang terhubung — untuk siswa, orang tua, dan guru.</p>
            <Link className="btn btn-primary portal-cta" href="/masuk">
              Masuk portal sekolah <ArrowUpRight size={16} aria-hidden />
            </Link>
          </div>
          <div className="mini-window" aria-label="Layanan portal">
            <div className="panel-title">
              <strong>PORTAL 22</strong>
              <span className="badge">Warga sekolah</span>
            </div>
            {LAYANAN_PORTAL.map(({ Ikon, label }) => (
              <div className="mini-row" key={label}>
                <Ikon size={19} aria-hidden />
                <span>{label}</span>
                <ArrowUpRight size={13} className="mini-arrow" aria-hidden />
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Berita */}
      <section className="lp-wadah section pt-0!" id="berita" aria-labelledby="judul-berita">
        <Reveal className="section-head">
          <div>
            <p className="eyebrow">03 / Kabar dari sekolah</p>
            <h2 id="judul-berita">
              Cerita yang terus <em>tumbuh.</em>
            </h2>
          </div>
          <Link className="btn btn-link" href="/berita">
            Semua berita <ArrowUpRight size={16} aria-hidden />
          </Link>
        </Reveal>
        {berita.length ? (
          <div className="program-grid">
            {berita.map((b, i) => (
              <Reveal as="article" className="panel news-card" key={b.slug} delay={i * 120}>
                <p className="eyebrow">{b.kategori || "Berita sekolah"}</p>
                <p className="news-meta">{formatTanggal(b.tanggal)}</p>
                <h3>{b.judul}</h3>
                <p className="muted text-[13px]">{b.ringkasan}</p>
                <Link href={`/berita/${b.slug}`} className="btn btn-link mt-4 self-start" aria-label={`Baca ${b.judul}`}>
                  Baca cerita <ArrowUpRight size={15} aria-hidden />
                </Link>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="news-empty">
            <BookOpen size={29} aria-hidden />
            <div>
              <h3>Berita sedang disiapkan.</h3>
              <p>Berita dan pengumuman hadir setelah diterbitkan oleh sekolah.</p>
            </div>
          </div>
        )}
      </section>

      {/* Informasi terbaru */}
      <section className="lp-wadah section pt-0!" aria-labelledby="judul-terbaru">
        <Reveal className="section-head">
          <div>
            <p className="eyebrow">04 / Informasi terbaru</p>
            <h2 id="judul-terbaru">
              Yang sedang <em>berjalan.</em>
            </h2>
          </div>
        </Reveal>
        <div className="program-grid">
          {terbaru.map(({ label, href, judul, teks }, i) => (
            <Reveal as="article" className="panel" key={label} delay={i * 120}>
              <p className="eyebrow">{label}</p>
              <h3 className="mt-2">{judul || `${label} sedang disiapkan`}</h3>
              <p className="muted mt-1 text-[13px]">{judul ? teks : "Konten resmi akan hadir setelah diterbitkan sekolah."}</p>
              <Link className="btn btn-link mt-4 self-start" href={href}>
                Lihat {label.toLowerCase()} <ArrowUpRight size={16} aria-hidden />
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
