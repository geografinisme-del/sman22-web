/**
 * Komponen widget beranda (server). Setiap widget hanya menampilkan konten dari modul sumbernya;
 * pengaturan widget (judul, jumlah, tata letak) berasal dari konfigurasi tampilan yang sudah dibersihkan.
 * Data kosong ditangani di masing-masing widget sesuai `DEFINISI_WIDGET[jenis].kosong`.
 */
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { FotoPembuka, type Foto } from "@/components/beranda/FotoPembuka";
import { SorotProgram, type ItemProgram } from "@/components/beranda/SorotProgram";
import { FotoParalaks } from "@/components/gerak/FotoParalaks";
import { Gambar } from "@/components/Gambar";
import { Ikon } from "@/components/Ikon";
import { FOTO_PROGRAM, KEBIASAAN_7KAIH, PANCAWALUYA } from "@/content/program";
import { kehidupanSekolah, programUnggulan, sekolah } from "@/content/sekolah";
import type { AgendaItem, BeritaItem, BukuRingkas, EkskulRingkas, FotoItem, PengumumanItem, Profil, Situs, VisualAkunItem } from "@/lib/data";
import { formatTanggal } from "@/lib/format";
import { slugProgram } from "@/lib/program";

export type DataBeranda = {
  situs: Situs;
  profil: Profil;
  berita: BeritaItem[];
  agenda: AgendaItem[];
  pengumuman: PengumumanItem[];
  galeri: FotoItem[];
  visual: VisualAkunItem[];
  ekskul: EkskulRingkas[];
  buku: BukuRingkas[];
};

type P = Record<string, unknown>;
const teks = (v: unknown, bawaan: string) => (typeof v === "string" && v.trim() ? v.trim() : bawaan);
const angka = (v: unknown, bawaan: number) => (typeof v === "number" ? v : bawaan);
const KOSONG = "rounded-[10px] border border-dashed border-[#cfc8bd] bg-white px-5 py-4 text-[#3b414b]";

const sintetis = (src: string) => src.includes("/images/hero/model-sintetis");

/** Foto pembuka: slide CMS (bukan ilustrasi sintetis) → visual beranda → foto asli bawaan. */
export function fotoPembukaDari(d: DataBeranda): Foto[] {
  const cms = d.situs.hero.slide.filter((s) => s.gambar && !sintetis(s.gambar)).map((s) => ({ src: s.gambar, alt: s.alt, fokus: s.fokus }));
  if (cms.length) return cms;
  const visual = d.visual.filter((v) => v.jenis === "gambar").map((v) => ({ src: v.berkas, alt: v.keterangan || `Kegiatan di ${sekolah.nama}` }));
  if (visual.length) return visual;
  return [{ src: "/images/keluarga-besar.jpg", alt: "Keluarga besar SMA Negeri 22 Bandung di halaman sekolah", fokus: "50% 55%" }];
}

function KepalaBagian({ id, judul, tautan, sub }: { id: string; judul: string; tautan?: { href: string; label: string }; sub?: string }) {
  return (
    <div className="bagian-kepala" data-muncul>
      <div>
        <h2 id={id}>{judul}</h2>
        {sub && <p className="mt-1">{sub}</p>}
      </div>
      {tautan && (
        <Link href={tautan.href} className="tautan">
          {tautan.label}
        </Link>
      )}
    </div>
  );
}

/* ---------------- 1. Pembuka ---------------- */

export function WHero({ d, tata, slideshow }: { d: DataBeranda; tata: string; slideshow: { gaya: "manual" | "otomatis"; detik: number } }) {
  const foto = fotoPembukaDari(d);
  const subjudul = [d.situs.hero.judulAwal, d.situs.hero.judulMiring, d.situs.hero.judulAkhir].filter(Boolean).join(" ");
  const penuh = tata === "penuh";
  const isi = (
    <div className="pembuka-isi">
      <p className="eyebrow">Kota Bandung, Jawa Barat</p>
      <h1 id="judul-sekolah" className="mt-3">
        {sekolah.nama}
      </h1>
      {subjudul && <p className="pembuka-sub">{subjudul}</p>}
      {d.situs.hero.teks && <p className="pembuka-teks">{d.situs.hero.teks}</p>}
      <div className="pembuka-aksi">
        <Link href="/spmb" className="btn btn-primary">
          Informasi SPMB
          <ArrowRight size={18} aria-hidden className="ikon-geser" />
        </Link>
        <Link href="/profil" className="btn">
          Kenali Sekolah
        </Link>
      </div>
    </div>
  );
  if (penuh)
    return (
      <section className="pembuka pembuka-penuh" aria-labelledby="judul-sekolah">
        <FotoPembuka foto={foto} tata="penuh" otomatis={slideshow.gaya === "otomatis"} detik={slideshow.detik} />
        <div className="lp-wadah pembuka-penuh-isi">{isi}</div>
      </section>
    );
  return (
    <section className="pembuka" aria-labelledby="judul-sekolah">
      <div className="lp-wadah pembuka-grid">
        {isi}
        <FotoPembuka foto={foto} otomatis={slideshow.gaya === "otomatis"} detik={slideshow.detik} />
      </div>
    </section>
  );
}

/* ---------------- 2. Pengumuman & akses layanan ---------------- */

export function IsiPengumuman({ d, p, id }: { d: DataBeranda; p: P; id: string }) {
  const daftar = d.pengumuman.slice(0, angka(p.jumlah, 3));
  return (
    <div>
      <div className="bagian-kepala mb-4" data-muncul>
        <h2 id={id}>{teks(p.judul, "Pengumuman")}</h2>
        <Link href="/agenda" className="tautan">
          Semua pengumuman
        </Link>
      </div>
      {daftar.length ? (
        <ul className="blok-pengumuman daftar-garis" data-muncul>
          {daftar.map((x) => (
            <li key={x.id} className="py-3 first:pt-0 last:pb-0">
              <p className="flex flex-wrap items-center gap-2 text-sm text-[#5b6270]">
                {(x.penting || x.prioritas) && <span className="label-status">Penting</span>}
                <time dateTime={x.tanggal}>{formatTanggal(x.tanggal)}</time>
              </p>
              <p className="mt-1 font-semibold">
                <Link href={`/agenda#pengumuman-${x.id}`} className="hover:text-[var(--tema-utama)] hover:underline">
                  {x.judul}
                </Link>
              </p>
              {x.isi && <p className="mt-1 line-clamp-2 text-[0.9375rem] text-[#3b414b]">{x.isi}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="blok-pengumuman text-[#3b414b]" data-muncul>
          Belum ada pengumuman terbaru.
        </p>
      )}
    </div>
  );
}

export function IsiLayanan({ d, p, tata }: { d: DataBeranda; p: P; tata: string }) {
  const daftar = d.situs.tema.beranda.bento.filter((k) => k.judul && k.tautan).slice(0, angka(p.jumlah, 6));
  if (!daftar.length) return null;
  return (
    <div>
      <div className="mb-4" data-muncul>
        <h2>{teks(p.judul, d.situs.tema.beranda.bentoJudul || "Akses layanan")}</h2>
        {d.situs.tema.beranda.bentoTeks && <p className="mt-1 text-[#5b6270]">{d.situs.tema.beranda.bentoTeks}</p>}
      </div>
      <nav aria-label="Akses layanan" className={tata === "daftar" ? "layanan-daftar" : "layanan-kisi"} data-muncul="kelompok">
        {daftar.map((k) => (
          <Link key={k.tautan + k.judul} href={k.tautan}>
            <span className="ikon-layanan" aria-hidden>
              <Ikon nama={k.ikon || "BookOpen"} size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{k.judul}</span>
              {k.teks && <span className="mt-0.5 block text-[0.9375rem] leading-snug text-[#5b6270]">{k.teks}</span>}
            </span>
            <ArrowRight size={18} aria-hidden className="ikon-geser mt-0.5 shrink-0 text-[#5b6270]" />
          </Link>
        ))}
      </nav>
    </div>
  );
}

/* ---------------- 3. Profil singkat ---------------- */

export function WProfil({ d, p, tata, paralaks }: { d: DataBeranda; p: P; tata: string; paralaks: boolean }) {
  const fakta = [
    { label: "Berdiri", isi: String(sekolah.tahunBerdiri) },
    { label: "Kepala sekolah", isi: d.profil.kepalaSekolah },
    { label: "Akreditasi", isi: d.profil.akreditasi },
    { label: "NPSN", isi: d.profil.npsn },
  ].filter((f) => f.isi);
  const gambar = <Image src="/images/gedung.jpg" alt="Gedung utama SMA Negeri 22 Bandung" fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" style={{ objectPosition: "50% 60%" }} />;
  return (
    <div className="lp-wadah grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
      <figure className={tata === "foto-kanan" ? "md:order-last" : ""}>
        <div className="foto relative aspect-[3/2]" data-muncul="foto">
          {paralaks ? <FotoParalaks>{gambar}</FotoParalaks> : gambar}
        </div>
        <figcaption className="keterangan-foto">Gedung utama SMA Negeri 22 Bandung</figcaption>
      </figure>
      <div data-muncul>
        <h2 id="judul-kenal">{teks(p.judul, "Mengenal sekolah kami")}</h2>
        {d.profil.pernyataan && <p className="bacaan mt-3 text-[1.0625rem] text-[#3b414b]">{d.profil.pernyataan}</p>}
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
  );
}

/* ---------------- 4. Berita & agenda ---------------- */

export function IsiBerita({ d, p, tata, id }: { d: DataBeranda; p: P; tata: string; id: string }) {
  const kategori = teks(p.kategori, "").toLowerCase();
  const daftar = d.berita.filter((b) => !kategori || b.kategori.toLowerCase() === kategori).slice(0, angka(p.jumlah, 4));
  const [utama, ...lain] = daftar;
  const judul = teks(p.judul, kategori ? `Berita ${p.kategori as string}` : "Berita dan kegiatan");
  return (
    <div>
      <KepalaBagian id={id} judul={judul} tautan={{ href: "/berita", label: "Semua berita" }} />
      {!utama ? (
        <p className={KOSONG} data-muncul>
          Belum ada berita yang diterbitkan.
        </p>
      ) : tata === "daftar" ? (
        <ul className="daftar-garis border-y border-[#e5e1da]" data-muncul="kelompok">
          {daftar.map((b) => (
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
      ) : (
        <div data-muncul="kelompok">
          <Link href={`/berita/${utama.slug}`} className="group grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Gambar src={utama.gambar} alt={utama.judul} sizes="(min-width: 640px) 30vw, 100vw" className="gambar-zoom aspect-[3/2] rounded-[10px]" />
            <div>
              <p className="text-sm text-[#5b6270]">
                {utama.kategori} · <time dateTime={utama.tanggal}>{formatTanggal(utama.tanggal)}</time>
              </p>
              <h3 className="mt-1 text-[1.25rem] group-hover:text-[var(--tema-utama)] group-hover:underline">{utama.judul}</h3>
              {utama.ringkasan && <p className="mt-2 line-clamp-3 text-[#3b414b]">{utama.ringkasan}</p>}
            </div>
          </Link>
          {lain.length > 0 && (
            <ul className="mt-6 grid gap-4 border-t border-[#e5e1da] pt-5 sm:grid-cols-3">
              {lain.map((b) => (
                <li key={b.slug}>
                  <Link href={`/berita/${b.slug}`} className="group grid grid-cols-[96px_minmax(0,1fr)] gap-3 sm:grid-cols-1">
                    <Gambar src={b.gambar} alt="" sizes="(min-width: 640px) 18vw, 96px" className="gambar-zoom aspect-[4/3] rounded-lg" />
                    <span className="min-w-0">
                      <time dateTime={b.tanggal} className="block text-sm text-[#5b6270]">
                        {formatTanggal(b.tanggal, { year: undefined })}
                      </time>
                      <span className="line-clamp-3 font-semibold leading-snug group-hover:text-[var(--tema-utama)] group-hover:underline">{b.judul}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function IsiAgenda({ d, p, kolom }: { d: DataBeranda; p: P; kolom: boolean }) {
  const daftar = d.agenda.slice(0, angka(p.jumlah, 4));
  const judul = teks(p.judul, "Agenda terdekat");
  return (
    <div data-muncul>
      {kolom ? <h3 className="text-[1.125rem]">{judul}</h3> : <KepalaBagian id="judul-agenda" judul={judul} />}
      {daftar.length ? (
        <ul className={`daftar-garis border-y border-[#e5e1da] ${kolom ? "mt-3" : "sm:grid sm:grid-cols-2 sm:gap-x-8 sm:[&>*+*]:border-t-0"}`}>
          {daftar.map((a) => (
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
  );
}

/* ---------------- 5. Program ---------------- */

export function WProgram({ p, tata }: { p: P; tata: string }) {
  const isi: Record<string, React.ReactNode> = {
    "7KAIH": (
      <ol className="kebiasaan">
        {KEBIASAAN_7KAIH.map((k) => (
          <li key={k}>{k}</li>
        ))}
      </ol>
    ),
    GP: (
      <dl className="nilai-daftar">
        {PANCAWALUYA.map((n) => (
          <div key={n.nilai}>
            <dt>{n.nilai}</dt>
            <dd>{n.arti}</dd>
          </div>
        ))}
      </dl>
    ),
  };
  const item: ItemProgram[] = programUnggulan.map((x) => ({
    kode: x.kode,
    nama: x.nama,
    ringkas: x.ringkas,
    href: `/program/${slugProgram(x)}`,
    tautan: x.kode === "7KAIH" ? "Tentang 7KAIH" : `Tentang ${x.nama}`,
    isi: isi[x.kode],
    foto: FOTO_PROGRAM[x.kode],
  }));
  // program tanpa dokumentasi sendiri memakai foto suasana sekolah (keterangan menyebut isi fotonya)
  const fotoUmum = { src: "/images/apel-lapangan.jpg", alt: "Siswa mengikuti apel pagi di lapangan sekolah", keterangan: "Apel pagi di lapangan sekolah" };
  return (
    <div className="lp-wadah">
      <KepalaBagian id="judul-program" judul={teks(p.judul, "Program dan pembiasaan karakter")} sub="Kebiasaan baik yang dijalani siswa setiap hari di sekolah." tautan={{ href: "/program", label: "Semua program" }} />
      {tata === "daftar" ? (
        <ul className="grid gap-x-8 border-t border-[#e5e1da] sm:grid-cols-2" data-muncul="kelompok">
          {item.map((x) => (
            <li key={x.kode} className="border-b border-[#e5e1da]">
              <Link href={x.href} className="group flex items-start justify-between gap-4 py-4">
                <span>
                  <span className="block text-[1.0625rem] font-semibold group-hover:text-[var(--tema-utama)] group-hover:underline">{x.nama}</span>
                  <span className="mt-0.5 block text-[0.9375rem] text-[#5b6270]">{x.ringkas}</span>
                </span>
                <ArrowRight size={18} aria-hidden className="ikon-geser mt-1 shrink-0 text-[#5b6270]" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <SorotProgram item={item} fotoUmum={fotoUmum} />
      )}
    </div>
  );
}

/* ---------------- 6. Galeri & kehidupan siswa ---------------- */

export function WGaleri({ d, p, tata, sudahTampil }: { d: DataBeranda; p: P; tata: string; sudahTampil: Set<string> }) {
  const sumber = d.galeri.length ? d.galeri.filter((g) => g.gambar).map((g) => ({ src: g.gambar, judul: g.judul })) : kehidupanSekolah.map((k) => ({ src: k.gambar, judul: k.judul }));
  const foto = sumber.filter((f) => !sudahTampil.has(f.src)).slice(0, angka(p.jumlah, 4));
  const ekskul = p.ekskul === false ? [] : d.ekskul;
  if (!foto.length && !ekskul.length) return null;
  return (
    <div className="lp-wadah">
      <KepalaBagian id="judul-siswa" judul={teks(p.judul, "Kehidupan siswa")} tautan={{ href: "/galeri", label: "Galeri kegiatan" }} />
      <div className={`grid gap-8 ${ekskul.length ? "lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]" : ""}`}>
        {foto.length > 0 && (
          <ul className={tata === "kisi" ? "galeri-kisi grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" : "mozaik"} data-muncul="kelompok">
            {foto.map((f, i) => (
              <li key={f.src}>
                <figure>
                  <div className={tata === "kisi" ? "foto relative aspect-[4/3]" : "foto mozaik-foto"}>
                    <Image src={f.src} alt={f.judul} fill sizes={tata !== "kisi" && i === 0 ? "(min-width: 1060px) 34vw, 100vw" : "(min-width: 1060px) 20vw, 50vw"} className="object-cover" />
                  </div>
                  <figcaption className="keterangan-foto">{f.judul}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}
        {ekskul.length > 0 && (
          <div data-muncul>
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
  );
}

/* ---------------- 7. Pencarian e-library ---------------- */

export function WPerpus({ d, p }: { d: DataBeranda; p: P }) {
  return (
    <div className="lp-wadah">
      <div className="perpus-widget" data-muncul>
        <div>
          <h2 id="judul-perpus">{teks(p.judul, "E-Library sekolah")}</h2>
          <p className="mt-1 text-[#3b414b]">Cari buku di katalog perpustakaan dan cek ketersediaannya sebelum datang.</p>
          <form action="/perpustakaan" role="search" className="perpus-cari mt-4">
            <label htmlFor="cari-buku-beranda" className="sr-only">
              Cari buku
            </label>
            <Search size={18} aria-hidden className="perpus-cari-ikon" />
            <input id="cari-buku-beranda" name="q" type="search" placeholder="Judul, pengarang, atau ISBN" autoComplete="off" />
            <button type="submit" className="btn btn-primary">
              Cari
            </button>
          </form>
        </div>
        {d.buku.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-[#5b6270]">Rekomendasi pustakawan</p>
            <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4" data-muncul="kelompok">
              {d.buku.map((b) => (
                <li key={b.id}>
                  <Link href={`/perpustakaan/${b.id}`} className="group block">
                    <span className="sampul-buku">
                      {b.sampul ? (
                        // eslint-disable-next-line @next/next/no-img-element -- sampul dari katalog (domain beragam)
                        <img src={b.sampul} alt="" loading="lazy" referrerPolicy="no-referrer" />
                      ) : (
                        <span aria-hidden>{b.judul.match(/[\p{L}\p{N}]/u)?.[0] ?? "?"}</span>
                      )}
                    </span>
                    <span className="mt-1.5 line-clamp-2 text-[0.9375rem] font-semibold leading-snug group-hover:text-[var(--tema-utama)] group-hover:underline">{b.judul}</span>
                    <span className="text-sm text-[#5b6270]">{b.tersedia ? `${b.tersedia} tersedia` : "Sedang dipinjam"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- 8. Kontak & lokasi ---------------- */

export function WKontak({ d, p }: { d: DataBeranda; p: P }) {
  const kontak = [
    { label: "Alamat", isi: [d.profil.alamat, sekolah.kota].filter(Boolean).join(", ") },
    { label: "Telepon", isi: d.profil.telepon },
    { label: "Email", isi: d.profil.email },
    { label: "Jam layanan", isi: d.profil.jamLayanan },
  ].filter((k) => k.isi);
  const peta = p.peta !== false;
  return (
    <div className={`lp-wadah grid gap-8 ${peta ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]" : ""}`}>
      <div data-muncul>
        <h2 id="judul-kontak">{teks(p.judul, "Kontak dan lokasi")}</h2>
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
      {peta && (
        <div className="foto relative min-h-[280px] border border-[#e5e1da]">
          <iframe
            title={`Peta lokasi ${sekolah.nama}`}
            src={`https://www.google.com/maps?q=${encodeURIComponent(sekolah.mapsQuery)}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full"
          />
        </div>
      )}
    </div>
  );
}
