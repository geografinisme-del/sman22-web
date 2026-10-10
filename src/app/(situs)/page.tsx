import Image from "next/image";
import Link from "next/link";
import { Hero } from "@/components/Hero";
import { Reveal } from "@/components/Reveal";
import { Angka } from "@/components/motion/Angka";
import { DaftarPratinjau } from "@/components/motion/DaftarPratinjau";
import { GeserSamping } from "@/components/motion/GeserSamping";
import { LencanaPutar } from "@/components/motion/LencanaPutar";
import { Parallax } from "@/components/motion/Parallax";
import { PitaFoto } from "@/components/motion/PitaFoto";
import { Sorot } from "@/components/motion/Sorot";
import { TeksSorot } from "@/components/motion/TeksSorot";
import { WarnaLatar } from "@/components/motion/WarnaLatar";
import { latar } from "@/components/motion/latar";
import { Kosong } from "@/components/ui";
import { kehidupanSekolah, programUnggulan, sambutan, sekolah } from "@/content/sekolah";
import { getAgenda, getBerita, getGaleri, getPengumuman, getProfil, getSitus } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

/* Palet beranda: tiap bagian punya nada sendiri, latar halaman mengalir di antaranya */
const WARNA = {
  krem: "#f2eee9",
  kobaltTua: "#16245e",
  lavender: "#dcd5f3",
  kertas: "#faf7f1",
  persik: "#f5d2b8",
  sage: "#dbe2cf",
  kobalt: "#2541b2",
};

/* Kartu program bergantian warna + bentuk sederhana sebagai penanda, bukan ikon generik */
const NADA_PROGRAM = ["bg-mentega", "bg-lavender", "bg-persik", "bg-sage", "bg-kertas"];
const BENTUK = [
  <circle key="a" cx="60" cy="60" r="52" />,
  <path key="b" d="M8 112V60a52 52 0 0 1 104 0v52Z" />,
  <path key="c" d="M60 4l12 36 38-4-30 24 18 34-38-18-38 18 18-34L10 36l38 4Z" />,
  <g key="d"><circle cx="32" cy="32" r="26" /><circle cx="88" cy="32" r="26" /><circle cx="32" cy="88" r="26" /><circle cx="88" cy="88" r="26" /></g>,
  <path key="e" d="M8 60a52 52 0 0 1 104 0Z M8 72h104v12H8Z" />,
];

export default async function Beranda() {
  const [situs, profil, beritaTerbaru, agendaTerdekat, infoBerjalan, galeri] = await Promise.all([
    getSitus(),
    getProfil(),
    getBerita(4),
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
  const kabar = beritaTerbaru[0] ? { judul: beritaTerbaru[0].judul, href: `/berita/${beritaTerbaru[0].slug}` } : undefined;

  return (
    <WarnaLatar awal={WARNA.krem}>
      <Hero hero={situs.hero} kabar={kabar} />

      {/* Pita pengumuman — sedikit miring, seperti selotip */}
      {infoBerjalan.length > 0 && (
        <div className="relative z-10 -my-2 overflow-hidden py-6">
          <div className="-mx-4 -rotate-[1.5deg] bg-mentega py-3 text-tinta shadow-[0_10px_30px_-15px_rgb(0_0_0/0.4)]">
            <div className="marquee flex w-max gap-12 whitespace-nowrap font-display text-sm font-medium sm:text-base">
              {[0, 1].map((salinan) => (
                <div key={salinan} aria-hidden={salinan === 1} className="flex gap-12">
                  {[...infoBerjalan, ...infoBerjalan].map((p, i) => (
                    <span key={i} className="flex items-center gap-3">
                      <span aria-hidden>✺</span>
                      <strong className="font-semibold">{p.judul}</strong> {p.isi}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pernyataan besar + angka */}
      <section {...latar(WARNA.krem)}>
        <div className="mx-auto max-w-[90rem] px-5 py-20 sm:px-10 sm:py-32">
          <Reveal className="grid gap-6 lg:grid-cols-[180px_1fr] lg:gap-16">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-merah">
              <span className="h-2 w-2 rounded-full bg-merah" /> Tentang kami
            </p>
            <TeksSorot
              teks={profil.pernyataan}
              className="max-w-5xl font-serif text-[2.1rem] leading-[1.12] tracking-tight sm:text-5xl lg:text-[4.2rem]"
            />
          </Reveal>
          <dl className="mt-16 grid grid-cols-2 gap-3 sm:mt-24 lg:grid-cols-4">
            {[
              { nilai: String(tahunBerkarya), label: "Tahun berkarya", nada: "bg-white/70" },
              { nilai: String(sekolah.tahunBerdiri), label: "Tahun berdiri", nada: "bg-lavender/70" },
              ...statTampil.map((s, i) => ({ nilai: s.nilai, label: s.label, nada: ["bg-sage/80", "bg-persik/70", "bg-mentega/70"][i % 3] })),
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 110} className={`flex min-h-44 flex-col justify-between rounded-[1.75rem] p-6 sm:min-h-56 sm:p-8 ${s.nada}`}>
                <dt className="text-sm text-black/60">{s.label}</dt>
                <dd className="font-display text-6xl font-semibold leading-none tracking-[-0.05em] sm:text-7xl">
                  <Angka nilai={s.nilai} />
                </dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      {/* Program unggulan — bergeser ke samping mengikuti scroll */}
      <section {...latar(WARNA.kobaltTua)} className="grain overflow-x-clip text-white" aria-labelledby="judul-program">
        <GeserSamping
          kepala={
            <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-4 px-5 sm:px-10 lg:flex-row lg:items-end lg:justify-between">
              <h2 id="judul-program" className="font-display text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-7xl lg:text-[4.5rem]">
                Program yang <em className="font-serif font-normal italic text-mentega">membentuk</em>
                <br /> keseharian kami
              </h2>
              <p className="max-w-sm text-white/65">
                Bukan sekadar daftar kegiatan — ini kebiasaan yang dijalani bersama setiap hari oleh siswa, guru, dan orang tua.
              </p>
            </div>
          }
        >
          {programUnggulan.map((p, i) => (
            <article
              key={p.nama}
              className={`group relative flex h-[26rem] w-[80vw] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[2rem] p-7 text-tinta sm:w-[24rem] lg:h-[52vh] lg:max-h-[30rem] lg:w-[28rem] lg:p-9 ${NADA_PROGRAM[i % NADA_PROGRAM.length]} ${i % 2 ? "lg:translate-y-10" : ""}`}
            >
              <div className="flex items-start justify-between">
                <span className="font-display text-sm font-semibold tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <svg aria-hidden viewBox="0 0 120 120" className="h-20 w-20 fill-tinta/85 transition duration-700 group-hover:rotate-[25deg] group-hover:scale-110 lg:h-28 lg:w-28">
                  {BENTUK[i % BENTUK.length]}
                </svg>
              </div>
              <div>
                <h3 className="font-display text-3xl font-semibold leading-[1.02] tracking-[-0.03em] lg:text-[2.6rem]">{p.nama}</h3>
                <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-black/65">{p.ringkas}</p>
              </div>
            </article>
          ))}
          <Link
            href="/ekskul"
            className="group flex h-[26rem] w-[70vw] shrink-0 snap-start flex-col items-start justify-end rounded-[2rem] p-7 ring-1 ring-white/25 transition hover:bg-white/5 sm:w-[20rem] lg:h-[52vh] lg:max-h-[30rem] lg:p-9"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-white text-2xl text-tinta transition duration-500 group-hover:-rotate-45">→</span>
            <span className="mt-6 font-display text-3xl font-semibold leading-tight tracking-[-0.03em]">Ekskul & OSIS</span>
            <span className="mt-2 text-white/60">Temukan kegiatan yang cocok untukmu.</span>
          </Link>
        </GeserSamping>
      </section>

      {/* Sambutan kepala sekolah */}
      <section {...latar(WARNA.lavender)}>
        <PitaFoto foto={fotoPita} />
        <div className="mx-auto grid max-w-[90rem] items-center gap-12 px-5 pb-20 pt-6 sm:px-10 sm:pb-32 lg:grid-cols-[5fr_7fr] lg:gap-24">
          <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
            <Reveal efek="tirai" className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-brand-900">
              <Parallax kekuatan={10} className="absolute inset-0">
                <Image
                  src={profil.fotoKepalaSekolah}
                  alt={`Foto ${profil.kepalaSekolah}, Kepala ${sekolah.nama}`}
                  fill
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  className="object-cover object-top"
                />
              </Parallax>
            </Reveal>
            <div className="absolute -bottom-6 -right-2 rounded-2xl bg-tinta px-5 py-4 text-white shadow-xl sm:-right-6">
              <p className="font-display text-xl font-semibold leading-tight tracking-tight">{profil.kepalaSekolah}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-[0.2em] text-white/60">Kepala Sekolah</p>
            </div>
          </div>
          <Reveal delay={150} className="pt-6 lg:pt-0">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-kobalt">{sambutan.judul}</p>
            <blockquote className="mt-6 font-serif text-4xl italic leading-[1.08] tracking-tight sm:text-6xl">
              “{profil.sambutanKutipan || "Selamat datang di keluarga besar SMA Negeri 22 Bandung."}”
            </blockquote>
            {profil.sambutanParagraf.length > 0 && (
              <div className="mt-8 max-w-xl space-y-4 text-lg leading-relaxed text-black/70">
                {profil.sambutanParagraf.slice(0, 2).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}
            <Link
              href="/profil"
              className="group mt-10 inline-flex items-center gap-3 rounded-full bg-tinta py-2 pl-6 pr-2 text-sm font-semibold text-white transition hover:bg-kobalt"
            >
              Profil sekolah
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-tinta transition duration-500 group-hover:-rotate-45">→</span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Kehidupan di sekolah — susunan majalah */}
      <section {...latar(WARNA.kertas)}>
        <div className="mx-auto max-w-[90rem] px-5 py-20 sm:px-10 sm:py-32">
          <div className="mb-10 flex flex-col justify-between gap-6 sm:mb-14 sm:flex-row sm:items-end">
            <h2 className="font-display text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-7xl">
              Hari-hari <em className="font-serif font-normal italic text-kobalt">di sekolah</em>
            </h2>
            <Link href="/galeri" className="group inline-flex items-center gap-2 self-start rounded-full px-5 py-2.5 text-sm font-medium ring-1 ring-black/15 transition hover:bg-tinta hover:text-white sm:self-auto">
              Lihat galeri <span className="panah">→</span>
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:grid-rows-[320px_320px]">
            {kehidupanSekolah.map((k, i) => {
              const tata = [
                "lg:col-span-4 lg:row-span-2 aspect-[4/5] lg:aspect-auto",
                "lg:col-span-5 aspect-[4/3] lg:aspect-auto",
                "lg:col-span-3 aspect-[4/3] lg:aspect-auto",
                "lg:col-span-8 aspect-[16/9] lg:aspect-auto",
              ][i % 4];
              return (
                <Reveal key={k.judul} delay={i * 120} efek="tirai" as="figure" className={`group relative overflow-hidden rounded-[2rem] bg-brand-900 ${tata}`}>
                  <Parallax kekuatan={12} className="absolute inset-0">
                    <Image
                      src={k.gambar}
                      alt={k.judul}
                      fill
                      sizes="(min-width: 1024px) 50vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition duration-[1.2s] ease-out group-hover:scale-105"
                    />
                  </Parallax>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-black/0" />
                  <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white sm:p-7">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.25em] text-white/70">{k.keterangan}</p>
                      <p className="mt-1 font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{k.judul}</p>
                    </div>
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs tabular-nums backdrop-blur">{String(i + 1).padStart(2, "0")}</span>
                  </figcaption>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Berita — judul besar, foto muncul mengikuti kursor */}
      <section {...latar(WARNA.persik)}>
        <div className="mx-auto max-w-[90rem] px-5 py-20 sm:px-10 sm:py-32">
          <div className="mb-10 flex flex-col justify-between gap-6 sm:mb-14 sm:flex-row sm:items-end">
            <h2 className="font-display text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-7xl">
              Kabar <em className="font-serif font-normal italic text-merah">terbaru</em>
            </h2>
            <Link href="/berita" className="group inline-flex items-center gap-2 self-start rounded-full px-5 py-2.5 text-sm font-medium ring-1 ring-black/15 transition hover:bg-tinta hover:text-white sm:self-auto">
              Semua berita <span className="panah">→</span>
            </Link>
          </div>
          {beritaTerbaru.length === 0 ? (
            <Kosong teks="Belum ada berita." />
          ) : (
            <DaftarPratinjau
              item={beritaTerbaru.map((b) => ({
                href: `/berita/${b.slug}`,
                judul: b.judul,
                meta: `${b.kategori} · ${formatTanggal(b.tanggal)}`,
                gambar: b.gambar ?? "",
              }))}
            />
          )}
        </div>
      </section>

      {/* Agenda + layanan */}
      <section {...latar(WARNA.sage)}>
        <div className="mx-auto grid max-w-[90rem] gap-16 px-5 py-20 sm:px-10 sm:py-32 lg:grid-cols-[5fr_6fr] lg:gap-20">
          <div>
            <div className="flex items-end justify-between">
              <h2 className="font-display text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-6xl">Agenda</h2>
              <Link href="/agenda" className="text-sm font-medium underline-offset-4 hover:underline">
                Semua agenda <span className="panah">→</span>
              </Link>
            </div>
            {agendaTerdekat.length === 0 ? (
              <div className="mt-8">
                <Kosong teks="Belum ada agenda." />
              </div>
            ) : (
              <ul className="mt-8 space-y-2">
                {agendaTerdekat.map((a, i) => (
                  <Reveal as="li" key={a.id} delay={i * 90} className="flex items-center gap-5 rounded-[1.5rem] bg-white/55 p-4 transition hover:bg-white sm:p-5">
                    <div className="grid h-16 w-16 shrink-0 place-content-center rounded-2xl bg-tinta text-center text-white">
                      <p className="font-display text-2xl font-semibold leading-none">{formatTanggal(a.tanggal, { day: "numeric", month: undefined, year: undefined })}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-mentega">
                        {formatTanggal(a.tanggal, { day: undefined, month: "short", year: undefined })}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium leading-snug">{a.judul}</p>
                      {(a.waktu || a.tempat) && <p className="mt-1 text-sm text-black/55">{[a.waktu, a.tempat].filter(Boolean).join(" · ")}</p>}
                    </div>
                  </Reveal>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="font-display text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-6xl">Layanan</h2>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {situs.layanan.map((l, i) => {
                const isi = (
                  <>
                    <span className="flex items-start justify-between gap-4">
                      <span className="font-display text-xl font-semibold leading-tight tracking-tight">{l.nama}</span>
                      {l.url && (
                        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full ring-1 ring-current/20 transition duration-500 group-hover:-rotate-45">
                          →
                        </span>
                      )}
                    </span>
                    <span className="mt-6 block text-sm opacity-60">{l.url ? l.keterangan : `${l.keterangan} · Segera hadir`}</span>
                  </>
                );
                const kelas = "group flex h-full flex-col justify-between rounded-[1.5rem] bg-kertas p-6 transition duration-300";
                return (
                  <Reveal as="li" key={l.nama} delay={i * 80}>
                    {l.url ? (
                      <Sorot className="h-full rounded-[1.5rem]">
                        <Link href={l.url} className={`${kelas} hover:-translate-y-1 hover:bg-tinta hover:text-white hover:shadow-xl`}>
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
      <section {...latar(WARNA.kobalt)} className="grain relative isolate overflow-hidden text-white">
        <div aria-hidden className="overflow-hidden pt-16 sm:pt-24">
          <div className="marquee flex w-max whitespace-nowrap font-display text-[22vw] font-semibold leading-[0.85] tracking-[-0.05em] text-white/[0.09] sm:text-[14vw]">
            {[0, 1].map((s) => (
              <span key={s} className="pr-[4vw]">
                Daftar · Tumbuh · Bersinar ·
              </span>
            ))}
          </div>
        </div>
        <div className="mx-auto flex max-w-[90rem] flex-col gap-12 px-5 pb-20 pt-4 sm:px-10 sm:pb-28 lg:flex-row lg:items-end lg:justify-between">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-mentega">Penerimaan murid baru</p>
            <h2 className="mt-5 max-w-4xl font-display text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-7xl lg:text-8xl">
              Mari bergabung bersama <em className="font-serif font-normal italic text-mentega">keluarga besar</em> SMAN 22.
            </h2>
          </Reveal>
          <Reveal delay={200} className="shrink-0">
            <Link href="/spmb" aria-label="Informasi SPMB" className="group block rounded-full">
              <LencanaPutar teks="Informasi SPMB · Daftar sekarang · " className="h-44 w-44 text-white sm:h-52 sm:w-52">
                <span className="grid h-20 w-20 place-items-center rounded-full bg-mentega text-3xl text-tinta transition duration-500 group-hover:scale-110 group-hover:-rotate-45 sm:h-24 sm:w-24">
                  →
                </span>
              </LencanaPutar>
            </Link>
          </Reveal>
        </div>
      </section>
    </WarnaLatar>
  );
}
