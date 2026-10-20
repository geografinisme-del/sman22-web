/**
 * Bagian beranda & halaman "Langit cerah" (server; terbaca tanpa JS). Bagian tanpa data disembunyikan.
 * Dipakai beranda (SusunanLangit) dan halaman dalam (Prestasi, Pengumuman, Agenda) agar tampilannya sama.
 */
import { MediaSlot } from "@/components/MediaSlot";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, GraduationCap, LayoutGrid, MapPin, MessageSquare, MonitorPlay, Sparkles, Users } from "lucide-react";
import type { ComponentType } from "react";
import { InfoCard, SectionHeading, StatCard } from "./Komponen";
import { SaringTingkat } from "./SaringTingkat";
import { kehidupanSekolah, programUnggulan, sekolah } from "@/content/sekolah";
import type { AgendaItem, BeritaItem, BukuRingkas, FotoItem, PengumumanItem, Prestasi, Profil } from "@/lib/data";
import { formatTanggal } from "@/lib/format";
import { slugProgram } from "@/lib/program";
import type { KartuBento } from "@/lib/tema";

type P = Record<string, unknown>;
const teks = (v: unknown, bawaan: string) => (typeof v === "string" && v.trim() ? v.trim() : bawaan);
const angka = (v: unknown, bawaan: number) => (typeof v === "number" ? v : bawaan);
export const hariIniWib = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Tanggal besar bergaya kalender (hari + bulan mono). */
export function TanggalBesar({ tanggal }: { tanggal: string }) {
  const [, b, h] = tanggal.slice(0, 10).split("-");
  return (
    <span className="lgt-tgl" aria-hidden>
      <strong>{Number(h)}</strong>
      <span>{BULAN[Number(b) - 1]}</span>
    </span>
  );
}

/* ---------------- Kabar dari sekolah ---------------- */
export function KabarSekolah({ berita, p = {} }: { berita: BeritaItem[]; p?: P }) {
  const daftar = berita.slice(0, Math.max(1, angka(p.jumlah, 4)));
  if (!daftar.length) return null;
  const [utama, ...lain] = daftar;
  return (
    <section className="lgt-bagian" aria-labelledby="judul-kabar">
      <div className="lgt-wadah">
        <SectionHeading id="judul-kabar" label="Kabar dari sekolah" judul={teks(p.judul, "Cerita terbaru dari SMAN 22.")} aksi={{ href: "/berita", label: "Semua berita" }} />
        <div className="lgt-kabar mt-8">
          <InfoCard href={`/berita/${utama.slug}`} foto={utama.gambar} alt={utama.judul} sementara={utama.gambarSementara} label={[utama.kategori, formatTanggal(utama.tanggal)].filter(Boolean).join(" · ")} judul={utama.judul} deskripsi={utama.ringkasan} aksi="Baca" rasio="lebar" />
          {lain.length > 0 && (
            <ul className="lgt-kabar-daftar">
              {lain.map((b) => (
                <li key={b.id}>
                  <Link href={`/berita/${b.slug}`} className="lgt-baris-kabar">
                    {b.gambar && <MediaSlot src={b.gambar} alt="" ratio="4/3" sizes="120px" isPlaceholder={b.gambarSementara} className="lgt-baris-foto" />}
                    <span className="min-w-0">
                      <span className="lgt-kartu-label">{[b.kategori, formatTanggal(b.tanggal)].filter(Boolean).join(" · ")}</span>
                      <span className="lgt-baris-judul">{b.judul}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Pengumuman & agenda ---------------- */
export function DaftarPengumuman({ pengumuman, batas, lengkap }: { pengumuman: PengumumanItem[]; batas?: number; lengkap?: boolean }) {
  const daftar = batas ? pengumuman.slice(0, batas) : pengumuman;
  return (
    <ul className="lgt-daftar-tgl">
      {daftar.map((x) => (
        <li key={x.id} id={`pengumuman-${x.id}`} className="target-sorot scroll-mt-28">
          <TanggalBesar tanggal={x.tanggal} />
          <div className="min-w-0">
            <p className="lgt-daftar-judul">
              {x.judul} {(x.penting || x.prioritas) && <span className="label-status ml-1">Penting</span>}
            </p>
            {x.isi && <p className={`lgt-daftar-isi ${lengkap ? "whitespace-pre-line" : "line-clamp-3"}`}>{x.isi}</p>}
            <p className="sr-only">Tanggal {formatTanggal(x.tanggal)}</p>
            {lengkap && x.poster && (
              <a href={x.poster.url} target="_blank" rel="noopener noreferrer" className="mt-3 block max-w-sm">
                {/* eslint-disable-next-line @next/next/no-img-element -- poster utuh dari CMS */}
                <img src={x.poster.url} alt={x.poster.alt} loading="lazy" className="max-h-[420px] w-full rounded-[14px] border border-[var(--line)] bg-[var(--soft)] object-contain" />
                <span className="sr-only">(buka poster ukuran penuh di tab baru)</span>
              </a>
            )}
            {x.tautan && (
              <a href={x.tautan.url} className="lgt-tautan-panah mt-2" {...(x.tautan.url.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {x.tautan.label || "Selengkapnya"} <span aria-hidden>→</span>
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
export function DaftarAgenda({ agenda }: { agenda: AgendaItem[] }) {
  return (
    <ul className="lgt-daftar-tgl">
      {agenda.map((a) => (
        <li key={a.id}>
          <TanggalBesar tanggal={a.tanggal} />
          <div className="min-w-0">
            <p className="lgt-daftar-judul">{a.judul}</p>
            <p className="lgt-daftar-isi">{[formatTanggal(a.tanggal), a.waktu, a.tempat].filter(Boolean).join(" · ")}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
export function PengumumanAgenda({ pengumuman, agenda, pP, pA }: { pengumuman: PengumumanItem[]; agenda: AgendaItem[]; pP?: P; pA?: P }) {
  const hari = hariIniWib();
  const kiri = pP ? pengumuman.slice(0, angka(pP.jumlah, 3)) : [];
  const kanan = pA ? agenda.filter((a) => a.tanggal.slice(0, 10) >= hari).slice(0, angka(pA.jumlah, 4)) : [];
  if (!kiri.length && !kanan.length) return null;
  return (
    <section className="lgt-bagian lgt-bagian-soft" aria-label="Pengumuman dan agenda">
      <div className={`lgt-wadah ${kiri.length && kanan.length ? "lgt-kisi-2 lgt-kisi-renggang" : ""}`}>
        {kiri.length > 0 && (
          <div>
            <SectionHeading label="Pengumuman" judul={teks(pP?.judul, "Informasi resmi sekolah.")} aksi={{ href: "/pengumuman", label: "Semua pengumuman" }} />
            <div className="mt-6">
              <DaftarPengumuman pengumuman={kiri} />
            </div>
          </div>
        )}
        {kanan.length > 0 && (
          <div>
            <SectionHeading label="Agenda" judul={teks(pA?.judul, "Kegiatan terdekat.")} aksi={{ href: "/agenda", label: "Kalender kegiatan" }} />
            <div className="mt-6">
              <DaftarAgenda agenda={kanan} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- Prestasi ---------------- */
export function TabelPrestasi({ prestasi }: { prestasi: Prestasi[] }) {
  const tingkat = [...new Set(prestasi.map((x) => x.tingkat))];
  return (
    <SaringTingkat tingkat={tingkat}>
      <div className="lgt-gulir-tabel">
        <table>
          <thead>
            <tr>
              <th scope="col">Peringkat</th>
              <th scope="col">Lomba</th>
              <th scope="col">Siswa / tim</th>
              <th scope="col">Tingkat</th>
              <th scope="col">Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {prestasi.map((x) => (
              <tr key={x.id} data-tingkat={x.tingkat.replace(/[^A-Za-z]/g, "")}>
                <td className="font-bold text-[var(--blue-teks)]">{x.peringkat}</td>
                <td className="font-semibold">{x.namaLomba}</td>
                <td>{x.namaSiswa}</td>
                <td>
                  <span className="lgt-pil-tingkat">{x.tingkat}</span>
                </td>
                <td className="whitespace-nowrap text-[var(--muted)]">{formatTanggal(x.tanggal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SaringTingkat>
  );
}
export function PrestasiBeranda({ prestasi, profil, p = {} }: { prestasi: Prestasi[]; profil: Profil; p?: P }) {
  const daftar = prestasi.slice(0, angka(p.jumlah, 6));
  const alumni = profil.alumniPtn;
  if (!daftar.length && !alumni.jumlah) return null;
  return (
    <section className="lgt-bagian" aria-labelledby="judul-prestasi">
      <div className="lgt-wadah">
        <SectionHeading id="judul-prestasi" label="Prestasi siswa" judul={teks(p.judul, "Capaian yang membanggakan.")} aksi={daftar.length ? { href: "/prestasi", label: "Semua prestasi" } : undefined} />
        <div className={`mt-8 ${daftar.length && alumni.jumlah ? "lgt-prestasi" : ""}`}>
          {daftar.length > 0 && <TabelPrestasi prestasi={daftar} />}
          {alumni.jumlah && <StatCard warna="lime" label={`Lulusan${alumni.tahun ? ` ${alumni.tahun}` : ""}`} angka={alumni.jumlah} keterangan={alumni.keterangan ? `alumni diterima di perguruan tinggi negeri. ${alumni.keterangan}` : "alumni diterima di perguruan tinggi negeri."} />}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Kehidupan siswa + program unggulan ---------------- */
export function ProgramUnggulan() {
  return (
    <ol className="lgt-nomor-kisi">
      {programUnggulan.map((x) => (
        <li key={x.kode} className="contents">
          <Link href={`/program/${slugProgram(x)}`} className="lgt-nomor">
            <strong>{x.nama}</strong>
            <span>{x.ringkas}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
export function KehidupanSiswa({ galeri, p = {}, program }: { galeri: FotoItem[]; p?: P; program?: P }) {
  const sumber = galeri.length
    ? galeri.filter((g) => g.gambar).map((g) => ({ src: g.gambar, judul: g.judul, sementara: g.sementara }))
    : kehidupanSekolah.map((k) => ({ src: k.gambar, judul: `${k.judul} — ${k.keterangan.toLowerCase()}`, sementara: false }));
  // keterangan foto tidak berulang
  const unik: typeof sumber = [];
  for (const f of sumber) if (!unik.some((u) => u.judul.trim().toLowerCase() === f.judul.trim().toLowerCase() || u.src === f.src)) unik.push(f);
  const foto = unik.slice(0, angka(p.jumlah, 5));
  if (!foto.length && !program) return null;
  return (
    <section className="lgt-bagian" aria-labelledby="judul-siswa">
      <div className="lgt-wadah">
        <SectionHeading id="judul-siswa" label="Kehidupan siswa" judul={teks(p.judul, "Belajar, berkarya, dan tumbuh bersama.")} aksi={{ href: "/galeri", label: "Galeri kegiatan" }} />
        {foto.length > 0 && (
          <ul className={`lgt-mozaik lgt-mozaik-${foto.length} mt-8`}>
            {foto.map((f, i) => (
              <li key={f.src}>
                <figure>
                  <MediaSlot src={f.src} alt="" ratio="isi" isPlaceholder={f.sementara} sizes={i === 0 ? "(min-width: 900px) 50vw, 100vw" : "(min-width: 900px) 25vw, 50vw"} className="lgt-mozaik-foto" />
                  <figcaption>{f.judul}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}
        {program && (
          <div className="mt-14">
            <p className="label-mono lgt-label-titik mb-5">Program unggulan</p>
            <ProgramUnggulan />
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- Akses cepat & kontak ---------------- */
const IKON: [RegExp, ComponentType<{ size?: number; "aria-hidden"?: boolean; strokeWidth?: number }>][] = [
  [/spmb/, GraduationCap],
  [/portal/, LayoutGrid],
  [/perpustakaan|e-library/, BookOpen],
  [/e-?learning|pembelajaran/, MonitorPlay],
  [/program/, Sparkles],
  [/pengaduan/, MessageSquare],
  [/ekskul/, Users],
  [/agenda/, CalendarDays],
];
export function AksesKontak({ layanan, profil, pL, pK, eLearning }: { layanan: KartuBento[]; profil: Profil; pL?: P; pK?: P; eLearning: string }) {
  const belajar = [
    { judul: "Program & karakter", tautan: "/program" },
    { judul: "E-Learning", tautan: eLearning },
  ];
  const sudah = new Set(belajar.map((b) => b.tautan));
  const lay = layanan.filter((k) => k.judul && k.tautan && !/e-?learning/i.test(k.judul) && !sudah.has(k.tautan)).filter((k, i, a) => a.findIndex((x) => x.tautan === k.tautan) === i);
  const kelompok = pL ? [{ judul: "Pembelajaran", isi: belajar }, { judul: "Layanan", isi: lay.slice(0, angka(pL.jumlah, 6)) }].filter((g) => g.isi.length) : [];
  const kontak = [
    { label: "Alamat", isi: [profil.alamat, sekolah.kota].filter(Boolean).join(", ") },
    { label: "Jam layanan", isi: profil.jamLayanan },
    { label: "Telepon", isi: profil.telepon },
    { label: "Surel", isi: profil.email },
  ].filter((k) => k.isi);
  if (!kelompok.length && !pK) return null;
  return (
    <section className="lgt-bagian lgt-bagian-soft" aria-label="Akses cepat dan kontak">
      <div className={`lgt-wadah ${kelompok.length && pK ? "lgt-kisi-2 lgt-kisi-renggang" : ""}`}>
        {kelompok.length > 0 && (
          <div>
            <SectionHeading label="Akses cepat" judul={teks(pL?.judul, "Yang paling sering dicari.")} />
            {kelompok.map((g) => (
              <div key={g.judul} className="mt-6">
                <p className="label-mono text-[var(--muted)]">{g.judul}</p>
                <ul className="lgt-akses mt-2">
                  {g.isi.map((k) => {
                    const I = IKON.find(([r]) => r.test(k.tautan) || r.test(k.judul.toLowerCase()))?.[1] ?? ArrowRight;
                    return (
                      <li key={k.tautan + k.judul}>
                        <Link href={k.tautan}>
                          <span className="lgt-akses-ikon">
                            <I size={18} aria-hidden strokeWidth={1.8} />
                          </span>
                          <span className="flex-1">{k.judul}</span>
                          <ArrowRight size={18} aria-hidden className="ikon-geser" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
        {pK && (
          <div>
            <SectionHeading label="Kunjungi kami" judul={teks(pK.judul, "Datang dan berkenalan.")} />
            {kontak.length > 0 && (
              <dl className="lgt-kontak mt-6">
                {kontak.map((k) => (
                  <div key={k.label}>
                    <dt className="label-mono">{k.label}</dt>
                    <dd>{k.isi}</dd>
                  </div>
                ))}
              </dl>
            )}
            {pK.peta !== false && (
              <div className="lgt-peta">
                <iframe title={`Peta lokasi ${sekolah.nama}`} src={`https://www.google.com/maps?q=${encodeURIComponent(sekolah.mapsQuery)}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                <a className="lgt-peta-buka" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sekolah.mapsQuery)}`} target="_blank" rel="noopener noreferrer">
                  <MapPin size={16} aria-hidden /> Buka di Google Maps
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- Tentang kami (widget profil) ---------------- */
export function TentangKami({ profil, p = {} }: { profil: Profil; p?: P }) {
  const isi = profil.pernyataan || profil.visi;
  if (!isi) return null;
  return (
    <section className="lgt-bagian" aria-labelledby="judul-tentang">
      <div className="lgt-wadah lgt-kisi-2 lgt-kisi-renggang items-center">
        <div>
          <SectionHeading id="judul-tentang" label="Tentang kami" judul={teks(p.judul, profil.slogan || "Mengenal SMA Negeri 22 Bandung.")} teks={isi} />
          <Link href="/profil" className="lgt-tautan-panah mt-6">
            Profil sekolah <span aria-hidden>→</span>
          </Link>
        </div>
        <MediaSlot src="/images/gedung.jpg" alt="Gedung utama SMA Negeri 22 Bandung" ratio="4/3" sizes="(min-width: 900px) 50vw, 100vw" className="lgt-foto-besar" />
      </div>
    </section>
  );
}

/* ---------------- E-Library (widget perpus) ---------------- */
export function RekomendasiBuku({ buku, p = {} }: { buku: BukuRingkas[]; p?: P }) {
  if (!buku.length) return null;
  return (
    <section className="lgt-bagian" aria-labelledby="judul-perpus">
      <div className="lgt-wadah">
        <SectionHeading id="judul-perpus" label="E-Library" judul={teks(p.judul, "Rekomendasi pustakawan.")} aksi={{ href: "/perpustakaan", label: "Buka katalog" }} />
        <div className="lgt-kisi mt-8">
          {buku.map((b) => (
            <InfoCard key={b.id} href={`/perpustakaan/${b.id}`} foto={b.sampul || undefined} alt={`Sampul ${b.judul}`} label={b.kategori} judul={b.judul} deskripsi={[b.pengarang, b.tersedia > 0 ? `${b.tersedia} tersedia` : "Sedang dipinjam"].filter(Boolean).join(" · ")} aksi="Lihat" />
          ))}
        </div>
      </div>
    </section>
  );
}
