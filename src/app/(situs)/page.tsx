import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FotoPembuka, type Foto } from "@/components/beranda/FotoPembuka";
import { Gambar } from "@/components/Gambar";
import { Ikon } from "@/components/Ikon";
import { FOTO_PROGRAM, KEBIASAAN_7KAIH, PANCAWALUYA } from "@/content/program";
import { kehidupanSekolah, programUnggulan, sekolah } from "@/content/sekolah";
import { getAgenda, getBerita, getEkskulRingkas, getGaleri, getPengumuman, getProfil, getSitus, getVisualAkun } from "@/lib/data";
import { formatTanggal } from "@/lib/format";
import { slugProgram } from "@/lib/program";

const sintetis = (src: string) => src.includes("/images/hero/model-sintetis");

export default async function Beranda() {
  const [situs, profil, berita, agenda, pengumuman, galeri, visual, ekskul] = await Promise.all([
    getSitus(),
    getProfil(),
    getBerita(4),
    getAgenda(4),
    getPengumuman(6),
    getGaleri(),
    getVisualAkun("beranda"),
    getEkskulRingkas(),
  ]);

  // foto pembuka: foto CMS (bukan ilustrasi sintetis) → visual beranda → foto asli bawaan
  const fotoCms: Foto[] = situs.hero.slide.filter((s) => s.gambar && !sintetis(s.gambar)).map((s) => ({ src: s.gambar, alt: s.alt, fokus: s.fokus }));
  const fotoVisual: Foto[] = visual.filter((v) => v.jenis === "gambar").map((v) => ({ src: v.berkas, alt: v.keterangan || `Kegiatan di ${sekolah.nama}` }));
  const fotoPembuka: Foto[] = fotoCms.length
    ? fotoCms
    : fotoVisual.length
      ? fotoVisual
      : [{ src: "/images/keluarga-besar.jpg", alt: "Keluarga besar SMA Negeri 22 Bandung di halaman sekolah", fokus: "50% 55%" }];

  const subjudul = [situs.hero.judulAwal, situs.hero.judulMiring, situs.hero.judulAkhir].filter(Boolean).join(" ");
  const infoPenting = [...pengumuman].sort((a, b) => Number(b.penting) - Number(a.penting)).slice(0, 3);
  const layanan = situs.tema.beranda.bento.filter((k) => k.judul && k.tautan).slice(0, 6);
  const fakta = [
    { label: "Berdiri", isi: String(sekolah.tahunBerdiri) },
    { label: "Kepala sekolah", isi: profil.kepalaSekolah },
    { label: "Akreditasi", isi: profil.akreditasi },
    { label: "NPSN", isi: profil.npsn },
  ].filter((f) => f.isi);
  // foto kegiatan untuk "Kehidupan siswa": hindari mengulang foto yang sudah tampil di atas
  const sudahTampil = new Set([...fotoPembuka.map((f) => f.src), "/images/gedung.jpg"]);
  const fotoKehidupan = (galeri.length ? galeri.filter((g) => g.gambar).map((g) => ({ src: g.gambar, judul: g.judul })) : kehidupanSekolah.map((k) => ({ src: k.gambar, judul: k.judul })))
    .filter((f) => !sudahTampil.has(f.src))
    .slice(0, 4);
  const [utama, ...beritaLain] = berita;
  const [p7kaih, pGerbang, ...programLain] = programUnggulan;
  const kontak = [
    { label: "Alamat", isi: [profil.alamat, sekolah.kota].filter(Boolean).join(", ") },
    { label: "Telepon", isi: profil.telepon },
    { label: "Email", isi: profil.email },
    { label: "Jam layanan", isi: profil.jamLayanan },
  ].filter((k) => k.isi);
  const peta = `https://www.google.com/maps?q=${encodeURIComponent(sekolah.mapsQuery)}&output=embed`;

  return (
    <div className="lp">
      {/* 1. Pembuka */}
      <section className="pembuka" aria-labelledby="judul-sekolah">
        <div className="lp-wadah pembuka-grid">
          <div>
            <p className="eyebrow">Kota Bandung, Jawa Barat</p>
            <h1 id="judul-sekolah" className="mt-3">
              {sekolah.nama}
            </h1>
            {subjudul && <p className="pembuka-sub">{subjudul}</p>}
            {situs.hero.teks && <p className="pembuka-teks">{situs.hero.teks}</p>}
            <div className="pembuka-aksi">
              <Link href="/spmb" className="btn btn-primary">
                Informasi SPMB
              </Link>
              <Link href="/profil" className="btn">
                Kenali Sekolah
              </Link>
            </div>
          </div>
          <FotoPembuka foto={fotoPembuka} />
        </div>
      </section>

      {/* 2. Pengumuman penting & akses layanan */}
      <section className="bagian" aria-labelledby="judul-info">
        <div className="lp-wadah grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <div>
            <div className="bagian-kepala mb-4">
              <h2 id="judul-info">Pengumuman</h2>
              <Link href="/agenda" className="tautan">
                Semua pengumuman
              </Link>
            </div>
            {infoPenting.length ? (
              <ul className="blok-pengumuman daftar-garis">
                {infoPenting.map((p) => (
                  <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm text-[#5b6270]">
                      {p.penting && <span className="label-status">Penting</span>}
                      <time dateTime={p.tanggal}>{formatTanggal(p.tanggal)}</time>
                    </p>
                    <p className="mt-1 font-semibold">{p.judul}</p>
                    {p.isi && <p className="mt-1 line-clamp-2 text-[0.9375rem] text-[#3b414b]">{p.isi}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="blok-pengumuman text-[#3b414b]">Belum ada pengumuman terbaru.</p>
            )}
          </div>
          <div>
            <div className="mb-4">
              <h2>{situs.tema.beranda.bentoJudul || "Akses layanan"}</h2>
              {situs.tema.beranda.bentoTeks && <p className="mt-1 text-[#5b6270]">{situs.tema.beranda.bentoTeks}</p>}
            </div>
            <nav aria-label="Akses layanan" className="layanan-kisi">
              {layanan.map((k) => (
                <Link key={k.tautan + k.judul} href={k.tautan}>
                  <span className="ikon-layanan" aria-hidden>
                    <Ikon nama={k.ikon || "BookOpen"} size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{k.judul}</span>
                    {k.teks && <span className="mt-0.5 block text-[0.9375rem] leading-snug text-[#5b6270]">{k.teks}</span>}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </section>

      {/* 3. Pengenalan singkat */}
      <section className="bagian bagian-putih" aria-labelledby="judul-kenal">
        <div className="lp-wadah grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
          <figure>
            <div className="foto relative aspect-[3/2]">
              <Image src="/images/gedung.jpg" alt="Gedung utama SMA Negeri 22 Bandung" fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" style={{ objectPosition: "50% 60%" }} />
            </div>
            <figcaption className="keterangan-foto">Gedung utama SMA Negeri 22 Bandung</figcaption>
          </figure>
          <div>
            <h2 id="judul-kenal">Mengenal sekolah kami</h2>
            {profil.pernyataan && <p className="bacaan mt-3 text-[1.0625rem] text-[#3b414b]">{profil.pernyataan}</p>}
            {fakta.length > 0 && (
              <dl className="fakta">
                {fakta.map((f) => (
                  <div key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>{f.isi}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
              <Link href="/profil" className="tautan">
                Profil sekolah
              </Link>
              <Link href="/sambutan" className="tautan">
                Sambutan kepala sekolah
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Berita & kegiatan */}
      <section className="bagian" aria-labelledby="judul-berita">
        <div className="lp-wadah">
          <div className="bagian-kepala">
            <h2 id="judul-berita">Berita dan kegiatan</h2>
            <Link href="/berita" className="tautan">
              Semua berita
            </Link>
          </div>
          {!utama && agenda.length === 0 ? (
            <p className="rounded-[10px] border border-dashed border-[#cfc8bd] bg-white px-5 py-4 text-[#3b414b]">Belum ada berita dan agenda yang diterbitkan.</p>
          ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div>
              {utama ? (
                <>
                  <Link href={`/berita/${utama.slug}`} className="group grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <Gambar src={utama.gambar} alt={utama.judul} sizes="(min-width: 640px) 30vw, 100vw" className="aspect-[3/2] rounded-[10px]" />
                    <div>
                      <p className="text-sm text-[#5b6270]">
                        {utama.kategori} · <time dateTime={utama.tanggal}>{formatTanggal(utama.tanggal)}</time>
                      </p>
                      <h3 className="mt-1 text-[1.25rem] group-hover:text-[var(--tema-utama)] group-hover:underline">{utama.judul}</h3>
                      {utama.ringkasan && <p className="mt-2 line-clamp-3 text-[#3b414b]">{utama.ringkasan}</p>}
                    </div>
                  </Link>
                  {beritaLain.length > 0 && (
                    <ul className="daftar-garis mt-6 border-t border-[#e5e1da]">
                      {beritaLain.map((b) => (
                        <li key={b.slug}>
                          <Link href={`/berita/${b.slug}`} className="group flex items-baseline justify-between gap-4 py-3">
                            <span className="font-semibold group-hover:text-[var(--tema-utama)] group-hover:underline">{b.judul}</span>
                            <time dateTime={b.tanggal} className="shrink-0 text-sm text-[#5b6270]">
                              {formatTanggal(b.tanggal, { year: undefined })}
                            </time>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="rounded-[10px] border border-dashed border-[#cfc8bd] bg-white px-5 py-4 text-[#3b414b]">Belum ada berita yang diterbitkan.</p>
              )}
            </div>
            <div>
              <h3 className="text-[1.125rem]">Agenda terdekat</h3>
              {agenda.length ? (
                <ul className="daftar-garis mt-3 border-y border-[#e5e1da]">
                  {agenda.map((a) => (
                    <li key={a.id} className="flex gap-4 py-3">
                      <time dateTime={a.tanggal} className="w-14 shrink-0 text-center">
                        <span className="block text-[1.375rem] font-bold leading-none tabular-nums">{formatTanggal(a.tanggal, { day: "numeric", month: undefined, year: undefined })}</span>
                        <span className="text-sm text-[#5b6270]">{formatTanggal(a.tanggal, { day: undefined, month: "short", year: undefined })}</span>
                      </time>
                      <div className="min-w-0">
                        <p className="font-semibold leading-snug">{a.judul}</p>
                        {(a.waktu || a.tempat) && <p className="text-sm text-[#5b6270]">{[a.waktu, a.tempat].filter(Boolean).join(" · ")}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[#3b414b]">Belum ada agenda terjadwal.</p>
              )}
              <Link href="/agenda" className="tautan mt-4 inline-block">
                Kalender kegiatan
              </Link>
            </div>
          </div>
          )}
        </div>
      </section>

      {/* 5. Program & pembiasaan karakter */}
      <section className="bagian bagian-putih" aria-labelledby="judul-program">
        <div className="lp-wadah">
          <div className="bagian-kepala">
            <div>
              <h2 id="judul-program">Program dan pembiasaan karakter</h2>
              <p className="mt-1">Kebiasaan baik yang dijalani siswa setiap hari di sekolah.</p>
            </div>
            <Link href="/program" className="tautan">
              Semua program
            </Link>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <article className="grid gap-5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <figure>
                <div className="foto relative aspect-[4/3] sm:aspect-[3/4]">
                  <Image src={FOTO_PROGRAM["7KAIH"].src} alt={FOTO_PROGRAM["7KAIH"].alt} fill sizes="(min-width: 640px) 22vw, 100vw" className="object-cover" />
                </div>
                <figcaption className="keterangan-foto">{FOTO_PROGRAM["7KAIH"].keterangan}</figcaption>
              </figure>
              <div>
                <h3>{p7kaih.nama}</h3>
                <p className="mt-2 text-[#3b414b]">{p7kaih.ringkas}</p>
                <ol className="kebiasaan mt-4">
                  {KEBIASAAN_7KAIH.map((k) => (
                    <li key={k}>{k}</li>
                  ))}
                </ol>
                <Link href={`/program/${slugProgram(p7kaih)}`} className="tautan mt-4 inline-block">
                  Tentang 7KAIH
                </Link>
              </div>
            </article>

            <article>
              <h3>{pGerbang.nama}</h3>
              <p className="mt-2 text-[#3b414b]">Lima nilai pendidikan karakter Jawa Barat yang diterapkan dalam kegiatan sekolah.</p>
              <dl className="nilai-daftar mt-4">
                {PANCAWALUYA.map((n) => (
                  <div key={n.nilai}>
                    <dt>{n.nilai}</dt>
                    <dd>{n.arti}</dd>
                  </div>
                ))}
              </dl>
              <Link href={`/program/${slugProgram(pGerbang)}`} className="tautan mt-4 inline-block">
                Tentang Gerbang Pancawaluya
              </Link>

              <ul className="daftar-garis mt-6 border-y border-[#e5e1da]">
                {programLain.map((p) => (
                  <li key={p.nama}>
                    <Link href={`/program/${slugProgram(p)}`} className="group flex items-start justify-between gap-4 py-3">
                      <span>
                        <span className="block font-semibold group-hover:text-[var(--tema-utama)] group-hover:underline">{p.nama}</span>
                        <span className="block text-[0.9375rem] text-[#5b6270]">{p.ringkas}</span>
                      </span>
                      <ArrowRight size={18} aria-hidden className="mt-1 shrink-0 text-[#5b6270]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* 6. Kehidupan siswa, ekskul & galeri */}
      <section className="bagian" aria-labelledby="judul-siswa">
        <div className="lp-wadah">
          <div className="bagian-kepala">
            <h2 id="judul-siswa">Kehidupan siswa</h2>
            <Link href="/galeri" className="tautan">
              Galeri kegiatan
            </Link>
          </div>
          <div className={`grid gap-8 ${ekskul.length ? "lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]" : ""}`}>
            <ul className={`grid grid-cols-2 gap-3 sm:gap-4 ${ekskul.length ? "" : "lg:grid-cols-4"}`}>
              {fotoKehidupan.map((f) => (
                <li key={f.src}>
                  <figure>
                    <div className="foto relative aspect-[4/3]">
                      <Image src={f.src} alt={f.judul} fill sizes="(min-width: 1060px) 30vw, 50vw" className="object-cover" />
                    </div>
                    <figcaption className="keterangan-foto">{f.judul}</figcaption>
                  </figure>
                </li>
              ))}
            </ul>
            {ekskul.length > 0 && (
              <div>
                <h3 className="text-[1.125rem]">Ekstrakurikuler & organisasi</h3>
                <ul className="daftar-garis mt-3 border-y border-[#e5e1da]">
                  {ekskul.slice(0, 8).map((e) => (
                    <li key={e.slug}>
                      <Link href={`/ekskul/${e.slug}`} className="group flex items-baseline justify-between gap-4 py-2.5">
                        <span className="font-semibold group-hover:text-[var(--tema-utama)] group-hover:underline">{e.nama}</span>
                        {e.bidang && <span className="shrink-0 text-sm text-[#5b6270]">{e.bidang}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="/ekskul" className="tautan mt-4 inline-block">
                  Semua ekskul & OSIS
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 7. Kontak & lokasi */}
      <section className="bagian bagian-putih" aria-labelledby="judul-kontak">
        <div className="lp-wadah grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div>
            <h2 id="judul-kontak">Kontak dan lokasi</h2>
            {kontak.length ? (
              <dl className="mt-4 space-y-3">
                {kontak.map((k) => (
                  <div key={k.label}>
                    <dt className="text-sm text-[#5b6270]">{k.label}</dt>
                    <dd className="font-medium">{k.isi}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-[#3b414b]">Kontak resmi sedang dilengkapi.</p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/kontak" className="btn">
                Halaman kontak
              </Link>
              <Link href="/pengaduan" className="btn">
                Kirim pengaduan
              </Link>
            </div>
          </div>
          <div className="foto relative min-h-[280px] border border-[#e5e1da]">
            <iframe
              title={`Peta lokasi ${sekolah.nama}`}
              src={peta}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
