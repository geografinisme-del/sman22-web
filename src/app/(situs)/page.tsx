import Image from "next/image";
import Link from "next/link";
import { Hero } from "@/components/Hero";
import { Reveal } from "@/components/Reveal";
import { Angka } from "@/components/motion/Angka";
import { Parallax } from "@/components/motion/Parallax";
import { PitaFoto } from "@/components/motion/PitaFoto";
import { Sorot } from "@/components/motion/Sorot";
import { TeksSorot } from "@/components/motion/TeksSorot";
import { Gambar } from "@/components/Gambar";
import { Kosong, Section } from "@/components/ui";
import { kehidupanSekolah, programUnggulan, sambutan, sekolah } from "@/content/sekolah";
import { getAgenda, getBerita, getGaleri, getPengumuman, getProfil, getSitus } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

export default async function Beranda() {
  const [situs, profil, beritaTerbaru, agendaTerdekat, infoBerjalan, galeri] = await Promise.all([
    getSitus(),
    getProfil(),
    getBerita(3),
    getAgenda(4),
    getPengumuman(3),
    getGaleri(),
  ]);
  // foto untuk pita bergerak: galeri sekolah, dilengkapi foto kegiatan bawaan
  const fotoPita = [
    ...galeri.slice(0, 14),
    ...kehidupanSekolah.map((k) => ({ id: k.gambar, judul: k.judul, gambar: k.gambar })),
  ].filter((f, i, a) => f.gambar && a.findIndex((x) => x.gambar === f.gambar) === i);
  const statTampil = profil.statistik.filter((s) => s.nilai && s.label !== "Tahun berdiri");
  const tahunBerkarya = new Date().getFullYear() - sekolah.tahunBerdiri;
  const [utama, ...beritaLain] = beritaTerbaru;

  return (
    <>
      <Hero hero={situs.hero} />

      {/* Pita pengumuman berjalan */}
      {infoBerjalan.length > 0 && (
        <div className="overflow-hidden border-b border-black/10 bg-accent-400 py-3 text-brand-900">
          <div className="marquee flex w-max gap-12 whitespace-nowrap text-sm font-medium">
            {[0, 1].map((salinan) => (
              <div key={salinan} aria-hidden={salinan === 1} className="flex gap-12">
                {[...infoBerjalan, ...infoBerjalan].map((p, i) => (
                  <span key={i} className="flex items-center gap-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-merah" />
                    <strong>{p.judul}</strong> — {p.isi}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pernyataan besar + statistik */}
      <Section>
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-merah">Tentang kami</p>
          <TeksSorot
            teks={profil.pernyataan}
            className="mt-6 max-w-5xl font-serif text-3xl leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl"
          />
        </Reveal>
        <dl className="mt-14 grid grid-cols-2 border-t border-black/15 sm:mt-20 lg:grid-cols-4">
          <Reveal className="border-b border-black/15 py-6 pr-4 lg:border-b-0">
            <dd className="font-serif text-6xl leading-none sm:text-7xl"><Angka nilai={tahunBerkarya} /></dd>
            <dt className="mt-3 text-sm text-black/60">Tahun berkarya</dt>
          </Reveal>
          <Reveal delay={120} className="border-b border-black/15 py-6 pr-4 lg:border-b-0">
            <dd className="font-serif text-6xl leading-none sm:text-7xl"><Angka nilai={sekolah.tahunBerdiri} /></dd>
            <dt className="mt-3 text-sm text-black/60">Tahun berdiri</dt>
          </Reveal>
          {statTampil.map((s, i) => (
            <Reveal key={s.label} delay={(i + 2) * 120} className="border-b border-black/15 py-6 pr-4 lg:border-b-0">
              <dd className="font-serif text-6xl leading-none sm:text-7xl"><Angka nilai={s.nilai} /></dd>
              <dt className="mt-3 text-sm text-black/60">{s.label}</dt>
            </Reveal>
          ))}
        </dl>
      </Section>

      {/* Pita foto bergerak */}
      <PitaFoto foto={fotoPita} />

      {/* Sambutan kepala sekolah */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[5fr_7fr] lg:gap-20">
          <Reveal className="relative mx-auto w-full max-w-sm lg:max-w-none">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-krem">
              <Image
                src={profil.fotoKepalaSekolah}
                alt={`Foto ${profil.kepalaSekolah}, Kepala ${sekolah.nama}`}
                fill
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="object-cover object-top"
              />
            </div>
            <div className="absolute -bottom-5 left-5 right-5 rounded-2xl bg-brand-900 px-5 py-4 text-white shadow-xl sm:left-8 sm:right-auto">
              <p className="font-serif text-2xl leading-tight">{profil.kepalaSekolah}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Kepala Sekolah</p>
            </div>
          </Reveal>
          <Reveal delay={150} className="pt-6 lg:pt-0">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-merah">{sambutan.judul}</p>
            <blockquote className="mt-6 font-serif text-4xl italic leading-[1.1] tracking-tight sm:text-5xl">
              “{profil.sambutanKutipan || "Selamat datang di keluarga besar SMA Negeri 22 Bandung."}”
            </blockquote>
            {profil.sambutanParagraf.length > 0 && (
              <div className="mt-8 space-y-4 text-lg leading-relaxed text-black/70">
                {profil.sambutanParagraf.slice(0, 2).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}
            <Link
              href="/profil"
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-tinta px-6 py-3 text-sm font-semibold text-white transition hover:bg-merah"
            >
              Profil sekolah <span className="panah">→</span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Kehidupan di sekolah — susunan majalah */}
      <Section label="Galeri" judul="Kehidupan di sekolah" linkSemua={{ href: "/galeri", label: "Lihat galeri" }}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:grid-rows-[300px_300px]">
          {kehidupanSekolah.map((k, i) => {
            const tata = [
              "lg:col-span-4 lg:row-span-2 aspect-[4/5] lg:aspect-auto",
              "lg:col-span-5 aspect-[4/3] lg:aspect-auto",
              "lg:col-span-3 aspect-[4/3] lg:aspect-auto",
              "lg:col-span-8 aspect-[16/9] lg:aspect-auto",
            ][i % 4];
            return (
              <Reveal key={k.judul} delay={i * 100} as="figure" className={`group relative overflow-hidden rounded-[1.5rem] bg-brand-900 ${tata}`}>
                <Image
                  src={k.gambar}
                  alt={k.judul}
                  fill
                  sizes="(min-width: 1024px) 50vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-[1.2s] ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
                <figcaption className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-white/70">{k.keterangan}</p>
                  <p className="mt-1 font-serif text-3xl leading-tight">{k.judul}</p>
                </figcaption>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* Program sekolah — daftar bernomor */}
      <section className="bg-brand-900 text-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent-400">Program</p>
            <h2 className="mt-2 font-serif text-4xl leading-none tracking-tight sm:text-6xl">
              Program <em className="text-accent-400">unggulan</em> sekolah
            </h2>
          </Reveal>
          <ol className="mt-12 border-t border-white/15">
            {programUnggulan.map((p, i) => (
              <Reveal
                as="li"
                key={p.nama}
                delay={i * 80}
                className="group grid gap-2 border-b border-white/15 py-6 transition-colors hover:bg-white/[0.03] sm:grid-cols-[80px_1fr_1fr] sm:items-baseline sm:gap-8 sm:py-8"
              >
                <span className="text-sm tabular-nums text-white/40 transition-colors group-hover:text-accent-400">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-serif text-3xl leading-tight transition duration-500 group-hover:translate-x-3 group-hover:text-accent-400 sm:text-4xl">{p.nama}</h3>
                <p className="text-white/60">{p.ringkas}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Berita */}
      <Section label="Kabar terbaru" judul="Berita" linkSemua={{ href: "/berita", label: "Semua berita" }}>
        {!utama ? (
          <Kosong teks="Belum ada berita." />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
            <Reveal>
              <Link href={`/berita/${utama.slug}`} className="group block">
                <Gambar src={utama.gambar} alt={utama.judul} sizes="(min-width: 1024px) 60vw, 100vw" className="aspect-[16/10] rounded-[1.5rem]" />
                <p className="mt-5 text-xs uppercase tracking-[0.2em] text-black/50">
                  {utama.kategori} · {formatTanggal(utama.tanggal)}
                </p>
                <h3 className="mt-2 font-serif text-4xl leading-tight tracking-tight group-hover:text-merah">{utama.judul}</h3>
                <p className="mt-3 text-black/60">{utama.ringkasan}</p>
              </Link>
            </Reveal>
            <ul className="divide-y divide-black/10 border-y border-black/10">
              {beritaLain.map((b, i) => (
                <Reveal as="li" key={b.slug} delay={i * 120}>
                  <Link href={`/berita/${b.slug}`} className="group grid grid-cols-[1fr_120px] gap-5 py-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-black/50">
                        {b.kategori} · {formatTanggal(b.tanggal)}
                      </p>
                      <h3 className="mt-2 font-serif text-2xl leading-tight group-hover:text-merah">{b.judul}</h3>
                    </div>
                    <Gambar src={b.gambar} alt={b.judul} sizes="120px" className="aspect-square rounded-xl" />
                  </Link>
                </Reveal>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* Agenda + layanan */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2">
          <div>
            <div className="flex items-end justify-between">
              <h2 className="font-serif text-4xl leading-none tracking-tight sm:text-5xl">Agenda</h2>
              <Link href="/agenda" className="text-sm font-medium underline-offset-4 hover:underline">
                Semua agenda →
              </Link>
            </div>
            {agendaTerdekat.length === 0 ? (
              <div className="mt-8">
                <Kosong teks="Belum ada agenda." />
              </div>
            ) : (
              <ul className="mt-8 border-t border-black/10">
                {agendaTerdekat.map((a, i) => (
                  <Reveal as="li" key={a.id} delay={i * 80} className="flex gap-6 border-b border-black/10 py-5">
                    <div className="w-14 shrink-0 text-center">
                      <p className="font-serif text-4xl leading-none">{formatTanggal(a.tanggal, { day: "numeric", month: undefined, year: undefined })}</p>
                      <p className="mt-1 text-xs uppercase tracking-wider text-merah">
                        {formatTanggal(a.tanggal, { day: undefined, month: "short", year: undefined })}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">{a.judul}</p>
                      {(a.waktu || a.tempat) && <p className="mt-1 text-sm text-black/50">{[a.waktu, a.tempat].filter(Boolean).join(" · ")}</p>}
                    </div>
                  </Reveal>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="font-serif text-4xl leading-none tracking-tight sm:text-5xl">Layanan</h2>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {situs.layanan.map((l, i) => {
                const isi = (
                  <>
                    <p className="font-serif text-2xl leading-tight">{l.nama}</p>
                    <p className="mt-1 text-sm text-black/50">{l.keterangan}</p>
                    <span className="mt-6 inline-block text-xs font-medium uppercase tracking-wider">
                      {l.url ? <>Buka <span className="panah">→</span></> : "Segera hadir"}
                    </span>
                  </>
                );
                const kelas = "block h-full rounded-2xl bg-krem p-6 transition duration-300";
                return (
                  <Reveal as="li" key={l.nama} delay={i * 80}>
                    {l.url ? (
                      <Sorot className="h-full rounded-2xl">
                        <Link href={l.url} className={`${kelas} hover:-translate-y-1 hover:bg-brand-900 hover:text-white hover:shadow-xl`}>
                          {isi}
                        </Link>
                      </Sorot>
                    ) : (
                      <div className={`${kelas} opacity-60`}>{isi}</div>
                    )}
                  </Reveal>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* Ajakan SPMB */}
      <section className="relative isolate overflow-hidden bg-brand-900 text-white">
        <Parallax className="absolute inset-0 -z-10">
          <Image src="/images/apel-lapangan.jpg" alt="" fill sizes="100vw" className="object-cover opacity-30" />
        </Parallax>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-900 via-brand-900/80 to-brand-900/40" />
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent-400">Penerimaan murid baru</p>
            <h2 className="mt-4 max-w-3xl font-serif text-5xl leading-[0.95] tracking-tight sm:text-7xl">
              Mari bergabung bersama <em className="text-accent-400">keluarga besar</em> SMAN 22.
            </h2>
            <Link
              href="/spmb"
              className="mt-10 inline-block rounded-full bg-white px-7 py-4 text-sm font-semibold text-brand-900 transition hover:bg-accent-400"
            >
              Informasi SPMB <span className="panah">→</span>
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
