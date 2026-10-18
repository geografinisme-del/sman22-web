/**
 * Tema "Buku Tahunan" — bagian beranda bergaya majalah/koran sekolah (server; terbaca tanpa JavaScript).
 * Aturan: bagian tanpa data DISEMBUNYIKAN (tidak ada "Belum ada…"), tanpa kotak abu placeholder, tanpa kartu
 * berwarna per item, tanggal selalu "12 Oktober 2026", keterangan foto tidak berulang.
 */
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, GraduationCap, LayoutGrid, MessageSquare, Users } from "lucide-react";
import type { ComponentType } from "react";
import { MediaSlot } from "@/components/MediaSlot";
import { KEBIASAAN_7KAIH } from "@/content/program";
import { kehidupanSekolah, programUnggulan, sekolah } from "@/content/sekolah";
import type { AgendaItem, BeritaItem, FotoItem, PengumumanItem, Prestasi, Profil, SpmbInfo } from "@/lib/data";
import { formatTanggal } from "@/lib/format";
import { slugProgram } from "@/lib/program";
import type { KartuBento } from "@/lib/tema";
import { GeserGaleri } from "./GeserGaleri";
import { HeroFoto, type FotoHero } from "./HeroFoto";
import { SaringTingkat } from "./SaringTingkat";

type P = Record<string, unknown>;
const teks = (v: unknown, bawaan: string) => (typeof v === "string" && v.trim() ? v.trim() : bawaan);
const angka = (v: unknown, bawaan: number) => (typeof v === "number" ? v : bawaan);
const hariIni = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); // WIB

function Kepala({ id, judul, tautan, gelap }: { id: string; judul: string; tautan?: { href: string; label: string }; gelap?: boolean }) {
  return (
    <div className={`bk-kepala ${gelap ? "bk-kepala-gelap" : ""}`}>
      <h2 id={id}>{judul}</h2>
      <span className="bk-garis-emas" aria-hidden />
      {tautan && (
        <Link href={tautan.href} className="bk-tautan">
          {tautan.label} <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}

/* ---------------- 1. Hero ---------------- */
export function BkHero({ foto, video, fakta }: { foto: FotoHero[]; video?: string; fakta: string }) {
  return (
    <section className="bk-hero" aria-labelledby="judul-sekolah">
      <HeroFoto foto={foto} video={video} />
      <div className="lp-wadah bk-hero-isi">
        <p className="bk-label bk-label-terang">Kota Bandung · Sejak {sekolah.tahunBerdiri}</p>
        <h1 id="judul-sekolah">
          <span className="bk-masker">
            <span className="bk-baris">SMA Negeri</span>
          </span>{" "}
          <span className="bk-masker">
            <span className="bk-baris">22 Bandung</span>
          </span>
        </h1>
        {fakta && <p className="bk-hero-fakta">{fakta}</p>}
        <div className="bk-hero-aksi">
          <Link href="/spmb" className="bk-tombol" prefetch={false}>
            Informasi SPMB
          </Link>
          <Link href="/profil" className="bk-tautan-terang" prefetch={false}>
            Kenali sekolah kami <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 2. Pita angka ---------------- */
/** "1200" → "1.200", "1200+" → "1.200+"; teks lain dibiarkan. */
export function formatAngka(v: string) {
  const m = v.trim().match(/^(\d[\d.\s]*)(\+?)$/);
  if (!m) return v.trim();
  return Number(m[1].replace(/[.\s]/g, "")).toLocaleString("id-ID") + m[2];
}
export function BkAngka({ profil }: { profil: Profil }) {
  const nilai = profil.statistik.filter((s) => s.nilai).map((s) => ({ label: s.label === "Tahun berdiri" ? "Tahun berdiri" : s.label, nilai: s.label === "Tahun berdiri" ? s.nilai : formatAngka(s.nilai) }));
  if (profil.alumniPtn.jumlah) nilai.push({ label: `Alumni diterima PTN${profil.alumniPtn.tahun ? ` ${profil.alumniPtn.tahun}` : ""}`, nilai: formatAngka(profil.alumniPtn.jumlah) });
  const tampil = nilai.slice(0, 4);
  if (tampil.length < 2) return null; // hanya tahun berdiri → pita disembunyikan
  return (
    <section className="bk-angka" aria-label="Sekolah dalam angka">
      <dl className="lp-wadah bk-angka-isi">
        {tampil.map((n) => (
          <div key={n.label}>
            <dd className="bk-angka-nilai" data-angka={n.nilai} data-hitung={n.label === "Tahun berdiri" ? undefined : ""}>
              {n.nilai}
            </dd>
            <dt>{n.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ---------------- 3. Kabar dari sekolah ---------------- */
export function BkKabar({ berita, p }: { berita: BeritaItem[]; p: P }) {
  const daftar = berita.slice(0, Math.max(1, angka(p.jumlah, 5)));
  if (!daftar.length) return null;
  const [utama, ...lain] = daftar;
  return (
    <section className="bk-bagian" aria-labelledby="judul-kabar">
      <div className="lp-wadah">
        <Kepala id="judul-kabar" judul={teks(p.judul, "Kabar dari Sekolah")} tautan={{ href: "/berita", label: "Semua berita" }} />
        <div className={`bk-kabar ${lain.length ? "" : "bk-kabar-tunggal"}`}>
          <article className="bk-kabar-utama">
            <Link href={`/berita/${utama.slug}`} className="group block">
              {utama.gambar && <MediaSlot src={utama.gambar} alt={utama.judul} ratio="3/2" isPlaceholder={utama.gambarSementara} sizes="(min-width: 1024px) 56vw, 100vw" className="bk-foto-berita" />}
              <p className="bk-kategori mt-4">
                {utama.kategori || "Berita"} · <time dateTime={utama.tanggal}>{formatTanggal(utama.tanggal, { day: undefined })}</time>
              </p>
              <h3 className="bk-judul-utama">{utama.judul}</h3>
              {utama.ringkasan && <p className="mt-3 text-[var(--color-ink-muted)]">{utama.ringkasan}</p>}
            </Link>
          </article>
          {lain.length > 0 && (
            <ul className="bk-kabar-daftar">
              {lain.slice(0, 4).map((b) => (
                <li key={b.slug}>
                  <Link href={`/berita/${b.slug}`} className="group block">
                    <p className="bk-kategori">{b.kategori || "Berita"}</p>
                    <h3 className="bk-judul-kecil">{b.judul}</h3>
                    <time dateTime={b.tanggal} className="bk-tanggal">
                      {formatTanggal(b.tanggal)}
                    </time>
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

/* ---------------- 4. Pengumuman + agenda ---------------- */
function KolomPengumuman({ pengumuman, p }: { pengumuman: PengumumanItem[]; p: P }) {
  const daftar = pengumuman.slice(0, angka(p.jumlah, 3));
  if (!daftar.length) return null;
  return (
    <div>
      <h2 id="judul-pengumuman" className="bk-h2-kecil">
        {teks(p.judul, "Pengumuman")}
      </h2>
      <ul className="bk-daftar">
        {daftar.map((x) => (
          <li key={x.id} className="bk-pengumuman">
            <time dateTime={x.tanggal} className="bk-kalender" aria-label={formatTanggal(x.tanggal)}>
              <span>{formatTanggal(x.tanggal, { day: undefined, year: undefined, month: "short" }).replace(".", "")}</span>
              <strong>{formatTanggal(x.tanggal, { month: undefined, year: undefined })}</strong>
            </time>
            <div className="min-w-0">
              <h3 className="bk-judul-baris">
                <Link href={`/agenda#pengumuman-${x.id}`}>{x.judul}</Link>
              </h3>
              {x.isi && <p className="bk-ringkas line-clamp-2">{x.isi}</p>}
            </div>
          </li>
        ))}
      </ul>
      <Link href="/agenda" className="bk-tautan mt-4 inline-block">
        Semua pengumuman <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
function KolomAgenda({ agenda, p }: { agenda: AgendaItem[]; p: P }) {
  const hari = hariIni();
  const daftar = agenda.filter((a) => a.tanggal.slice(0, 10) >= hari).slice(0, angka(p.jumlah, 4));
  if (!daftar.length) return null;
  return (
    <div>
      <h2 id="judul-agenda" className="bk-h2-kecil">
        {teks(p.judul, "Agenda terdekat")}
      </h2>
      <ul className="bk-daftar">
        {daftar.map((a) => (
          <li key={a.id} className="bk-agenda">
            <time dateTime={a.tanggal} className="bk-agenda-tgl">
              {formatTanggal(a.tanggal, { year: undefined, month: "short" }).replace(".", "")}
            </time>
            <div className="min-w-0">
              <h3 className="bk-judul-baris">{a.judul}</h3>
              {(a.tempat || a.waktu) && <p className="bk-ringkas">{[a.tempat, a.waktu].filter(Boolean).join(" · ")}</p>}
            </div>
          </li>
        ))}
      </ul>
      <Link href="/agenda" className="bk-tautan mt-4 inline-block">
        Kalender kegiatan <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
export function BkPengumumanAgenda({ pengumuman, agenda, pP, pA }: { pengumuman: PengumumanItem[]; agenda: AgendaItem[]; pP?: P; pA?: P }) {
  const kiri = pP ? <KolomPengumuman pengumuman={pengumuman} p={pP} /> : null;
  const kanan = pA ? <KolomAgenda agenda={agenda} p={pA} /> : null;
  // komponen mengembalikan null bila kosong → periksa datanya langsung
  const adaKiri = Boolean(pP) && pengumuman.length > 0;
  const adaKanan = Boolean(pA) && agenda.some((a) => a.tanggal.slice(0, 10) >= hariIni());
  if (!adaKiri && !adaKanan) return null;
  return (
    <section className="bk-bagian bk-latar-dalam" aria-label="Pengumuman dan agenda">
      <div className={`lp-wadah bk-dua ${adaKiri && adaKanan ? "" : "bk-satu"}`}>
        {adaKiri && kiri}
        {adaKanan && kanan}
      </div>
    </section>
  );
}

/* ---------------- 5. SPMB ---------------- */
export function BkSpmb({ spmb, p }: { spmb: SpmbInfo | null; p: P }) {
  if (!spmb?.aktif) return null;
  const judul = teks(p.judul, spmb.judul || `Bergabung dengan keluarga besar ${sekolah.nama}`);
  return (
    <section className="bk-spmb" aria-labelledby="judul-spmb">
      <svg className="bk-spmb-22" viewBox="0 0 520 300" aria-hidden>
        <text x="0" y="270" className="bk-spmb-22-teks">
          22
        </text>
      </svg>
      <div className="lp-wadah relative">
        <p className="bk-label bk-label-emas">SPMB {spmb.tahun}</p>
        <h2 id="judul-spmb" className="bk-spmb-judul">
          {judul}
        </h2>
        {spmb.ringkasan && <p className="bk-spmb-ringkas">{spmb.ringkasan}</p>}
        {spmb.jadwal.length > 0 && (
          <ol className="bk-garis-waktu">
            {spmb.jadwal.map((j, n) => (
              <li key={j.langkah + n}>
                <span className="bk-garis-nomor">{String(n + 1).padStart(2, "0")}</span>
                <strong>{j.langkah}</strong>
                {j.tanggal && <time dateTime={j.tanggal}>{formatTanggal(j.tanggal)}</time>}
              </li>
            ))}
          </ol>
        )}
        <div className="bk-spmb-aksi">
          <Link href={spmb.tautanJalur || "/spmb"} className="bk-tombol bk-tombol-kertas">
            Lihat jalur dan syarat
          </Link>
          {spmb.tautanTanya && (
            <a href={spmb.tautanTanya} className="bk-tombol bk-tombol-garis" {...(spmb.tautanTanya.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
              Tanya panitia
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 6. Prestasi & alumni ---------------- */
export function BkPrestasi({ prestasi, profil, p }: { prestasi: Prestasi[]; profil: Profil; p: P }) {
  const daftar = prestasi.slice(0, angka(p.jumlah, 4) + 4);
  const alumni = profil.alumniPtn;
  if (!daftar.length && !alumni.jumlah) return null;
  const tingkat = [...new Set(daftar.map((x) => x.tingkat))];
  return (
    <section className="bk-bagian" aria-labelledby="judul-prestasi">
      <div className="lp-wadah">
        <Kepala id="judul-prestasi" judul={teks(p.judul, "Prestasi Siswa")} />
        <div className={`bk-prestasi ${daftar.length && alumni.jumlah ? "" : "bk-satu"}`}>
          {daftar.length > 0 && (
            <SaringTingkat tingkat={tingkat}>
              <ul className="bk-daftar">
                {daftar.map((x) => (
                  <li key={x.id} className="pr-baris" data-tingkat={x.tingkat.replace(/[^A-Za-z]/g, "")}>
                    {x.foto && <MediaSlot src={x.foto} alt={`Dokumentasi ${x.namaLomba}`} ratio="1/1" isPlaceholder={x.fotoSementara} sizes="72px" className="pr-foto" />}
                    <span className="pr-peringkat">{x.peringkat}</span>
                    <span className="min-w-0">
                      <strong className="block">{x.namaLomba}</strong>
                      <span className="bk-ringkas">{[x.namaSiswa, formatTanggal(x.tanggal)].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="pr-tingkat">{x.tingkat}</span>
                  </li>
                ))}
              </ul>
            </SaringTingkat>
          )}
          {alumni.jumlah && (
            <aside className="bk-alumni" aria-label="Alumni diterima perguruan tinggi negeri">
              {alumni.tahun && <p className="bk-label">Lulusan {alumni.tahun}</p>}
              <p className="bk-alumni-angka">{formatAngka(alumni.jumlah)}</p>
              <p className="font-bold">alumni diterima di perguruan tinggi negeri</p>
              {alumni.keterangan && <p className="bk-ringkas mt-2">{alumni.keterangan}</p>}
              <Link href="/alumni" className="bk-tautan mt-4 inline-block">
                Lihat daftar <span aria-hidden>→</span>
              </Link>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 7. Kehidupan siswa (+ program) ---------------- */
export function BkKehidupan({ galeri, p, program }: { galeri: FotoItem[]; p: P; program?: P }) {
  const sumber = galeri.length
    ? galeri.filter((g) => g.gambar).map((g) => ({ src: g.gambar, judul: g.judul, sementara: g.sementara }))
    : kehidupanSekolah.map((k) => ({ src: k.gambar, judul: `${k.judul} — ${k.keterangan.toLowerCase()}`, sementara: false }));
  // keterangan wajib unik: foto dengan keterangan yang sama dilewati
  const unik: typeof sumber = [];
  for (const f of sumber) if (!unik.some((u) => u.judul.trim().toLowerCase() === f.judul.trim().toLowerCase() || u.src === f.src)) unik.push(f);
  const foto = unik.slice(0, 5);
  if (!foto.length && !program) return null;
  return (
    <section className="bk-gelap" aria-labelledby="judul-siswa">
      <div className="lp-wadah">
        <Kepala id="judul-siswa" judul={teks(p.judul, "Kehidupan Siswa")} tautan={{ href: "/galeri", label: "Galeri kegiatan" }} gelap />
        {foto.length > 0 && (
          <GeserGaleri jumlah={foto.length}>
            {foto.map((f, n) => (
              <li key={f.src}>
                <MediaSlot src={f.src} alt={f.judul} caption={f.judul} ratio="isi" isPlaceholder={f.sementara} sizes={n === 0 ? "(min-width: 1024px) 34vw, 85vw" : "(min-width: 1024px) 22vw, 85vw"} />
              </li>
            ))}
          </GeserGaleri>
        )}
        {program && (
          <ol className="bk-program">
            {programUnggulan.map((x, n) => (
              <li key={x.kode}>
                <Link href={`/program/${slugProgram(x)}`} className="group block">
                  <span className="bk-program-nomor">{String(n + 1).padStart(2, "0")}</span>
                  <strong>{x.nama}</strong>
                  {x.kode === "7KAIH" && <span className="sr-only">: {KEBIASAAN_7KAIH.join(", ")}</span>}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

/* ---------------- 8. Akses cepat + kontak ---------------- */
const IKON: [RegExp, ComponentType<{ size?: number; "aria-hidden"?: boolean; strokeWidth?: number }>][] = [
  [/spmb/, GraduationCap],
  [/portal/, LayoutGrid],
  [/perpustakaan|e-library/, BookOpen],
  [/pengaduan/, MessageSquare],
  [/ekskul/, Users],
  [/agenda/, CalendarDays],
];
export function BkAksesKontak({ layanan, profil, pL, pK }: { layanan: KartuBento[]; profil: Profil; pL?: P; pK?: P }) {
  const daftar = pL ? layanan.filter((k) => k.judul && k.tautan).slice(0, angka(pL.jumlah, 6)) : [];
  const kontak = [
    { label: "Alamat", isi: [profil.alamat, sekolah.kota].filter(Boolean).join(", ") },
    { label: "Jam layanan", isi: profil.jamLayanan },
    { label: "Telepon", isi: profil.telepon },
    { label: "Surel", isi: profil.email },
  ].filter((k) => k.isi);
  const adaKontak = Boolean(pK);
  if (!daftar.length && !adaKontak) return null;
  return (
    <section className="bk-bagian" aria-label="Akses cepat dan kontak">
      <div className={`lp-wadah bk-dua ${daftar.length && adaKontak ? "" : "bk-satu"}`}>
        {daftar.length > 0 && (
          <div>
            <h2 className="bk-h2-kecil">{teks(pL?.judul, "Akses cepat")}</h2>
            <ul className="bk-akses">
              {daftar.map((k) => {
                const I = IKON.find(([r]) => r.test(k.tautan))?.[1] ?? ArrowRight;
                return (
                  <li key={k.tautan + k.judul}>
                    <Link href={k.tautan}>
                      <I size={20} aria-hidden strokeWidth={1.6} />
                      <span>{k.judul}</span>
                      <span aria-hidden className="bk-akses-panah">
                        →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {adaKontak && (
          <div>
            <h2 className="bk-h2-kecil">{teks(pK?.judul, "Kunjungi kami")}</h2>
            {kontak.length > 0 && (
              <dl className="bk-kontak">
                {kontak.map((k) => (
                  <div key={k.label}>
                    <dt className="bk-label">{k.label}</dt>
                    <dd>{k.isi}</dd>
                  </div>
                ))}
              </dl>
            )}
            {pK?.peta !== false && (
              <div className="bk-peta">
                <iframe
                  title={`Peta lokasi ${sekolah.nama}`}
                  src={`https://www.google.com/maps?q=${encodeURIComponent(sekolah.mapsQuery)}&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
