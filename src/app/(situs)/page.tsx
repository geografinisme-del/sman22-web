import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { HeroSinema } from "@/components/sinema/HeroSinema";
import { SeksiGelap } from "@/components/sinema/SeksiGelap";
import "@/components/sinema/sinema.css";
import { programUnggulan, sekolah } from "@/content/sekolah";
import { getAgenda, getBerita, getEkskulRingkas, getGaleri, getPengumuman, getProfil, getSitus, getVisualAkun } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

const TEMA_PROGRAM = [
  { latar: "#ebe5fa", tinta: "#51419c" },
  { latar: "#e6ecff", tinta: "#284fd7" },
  { latar: "#f9f3e9", tinta: "#785726" },
];

export default async function Beranda() {
  const [situs, berita, agenda, pengumuman, galeri, visual, ekskul, profil] = await Promise.all([
    getSitus(),
    getBerita(3),
    getAgenda(1),
    getPengumuman(4),
    getGaleri(),
    getVisualAkun("beranda"),
    getEkskulRingkas(),
    getProfil(),
  ]);
  const tahunBerkarya = new Date().getFullYear() - sekolah.tahunBerdiri;
  const stat = [
    { nilai: String(sekolah.tahunBerdiri), label: "Tahun berdiri" },
    { nilai: `${tahunBerkarya}`, label: "Tahun berkarya" },
    ...profil.statistik.filter((x) => x.nilai && x.label !== "Tahun berdiri").map((x) => ({ nilai: x.nilai, label: x.label })),
  ];
  const pita = ekskul.length
    ? ekskul.map((e) => ({ nama: e.nama, sub: e.bidang, href: `/ekskul/${e.slug}` }))
    : programUnggulan.map((p) => ({ nama: p.nama, sub: "Program sekolah", href: "/profil" }));
  const fotoGaleri = galeri.map((g) => g.gambar).filter(Boolean);

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
    <div className="lp lp-halaman">
      <HeroSinema hero={situs.hero} visual={visual} program={programUnggulan.map((p) => p.nama)} stat={stat} />

      <SeksiGelap
        d={{
          pita,
          program: programUnggulan[0],
          tahunBerkarya,
          tahunBerdiri: sekolah.tahunBerdiri,
          beritaTerbaru: berita[0] ? { judul: berita[0].judul, slug: berita[0].slug, tanggal: formatTanggal(berita[0].tanggal) } : undefined,
          jumlahEkskul: ekskul.length,
          fotoUtama: fotoGaleri[0] ?? "/images/kegiatan-aula.jpg",
          fotoGaleri: fotoGaleri[1] ?? "/images/apel-lapangan.jpg",
          jumlahFoto: galeri.length,
          kepalaSekolah: profil.kepalaSekolah,
        }}
      />

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
