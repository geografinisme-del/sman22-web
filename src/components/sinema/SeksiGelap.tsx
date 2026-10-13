import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarCheck, ClipboardList, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Ikon } from "@/components/Ikon";
import { Reveal } from "@/components/Reveal";
import type { KartuBento, Tema } from "@/lib/tema";

/** Data situs yang mengisi kartu bento secara otomatis */
export type DataOtomatis = {
  tahunBerkarya: number;
  tahunBerdiri: number;
  beritaTerbaru?: { judul: string; slug: string; tanggal: string };
  jumlahEkskul: number;
  jumlahFoto: number;
  kepalaSekolah: string;
  fotoCadangan: string[];
};

const PORTAL = [
  { Ikon: LayoutDashboard, label: "Dashboard personal" },
  { Ikon: CalendarCheck, label: "Absensi & jadwal" },
  { Ikon: ClipboardList, label: "Tugas & nilai" },
  { Ikon: ShieldCheck, label: "Akses sesuai peran" },
];

const singkat = (nama: string) =>
  nama
    .split(/\s+/)
    .filter((k) => /^[A-Za-z0-9]/.test(k))
    .slice(0, 2)
    .map((k) => k[0])
    .join("")
    .toUpperCase();

function Pita({ isi, balik }: { isi: { nama: string; sub: string; href: string }[]; balik?: boolean }) {
  return (
    <div className={`pita-baris ${balik ? "balik" : ""}`}>
      {[0, 1].map((salinan) =>
        isi.map((x, i) => (
          <Link key={`${salinan}-${i}-${x.nama}`} href={x.href} className="pita-item" tabIndex={salinan ? -1 : undefined} aria-hidden={salinan ? true : undefined}>
            <span className="ikon">{singkat(x.nama)}</span>
            <span>
              {x.nama}
              {x.sub && <small>{x.sub}</small>}
            </span>
          </Link>
        )),
      )}
    </div>
  );
}

function Kartu({ k, d, foto }: { k: KartuBento; d: DataOtomatis; foto?: string }) {
  const gambar = k.gambar || foto;
  const href = k.isi === "berita" && d.beritaTerbaru ? `/berita/${d.beritaTerbaru.slug}` : k.tautan || "/";
  const kelas = `bento-kartu ${k.ukuran === "besar" ? "bento-besar" : k.ukuran === "lebar" ? "bento-lebar" : ""} ${gambar ? "bento-foto" : ""}`;
  return (
    <Link href={href} className={kelas}>
      {gambar && <Image src={gambar} alt="" fill sizes={k.ukuran === "besar" ? "(min-width: 1000px) 50vw, 100vw" : "(min-width: 1000px) 25vw, 100vw"} className="object-cover" />}
      <span className="panah" aria-hidden>
        <ArrowUpRight size={18} />
      </span>
      {k.ikon && (
        <span className="bento-ikon">
          <Ikon nama={k.ikon} size={20} />
        </span>
      )}
      {k.isi === "portal" && (
        <ul className="bento-daftar">
          {PORTAL.map(({ Ikon: I, label }) => (
            <li key={label}>
              <I size={16} aria-hidden className="text-[color-mix(in_srgb,var(--tema-aksen)_60%,white)]" /> {label}
            </li>
          ))}
        </ul>
      )}
      {k.isi === "tahun" && <span className="bento-angka">{d.tahunBerkarya}</span>}
      {k.isi === "ekskul" && d.jumlahEkskul > 0 && <span className="bento-angka">{d.jumlahEkskul}</span>}
      {k.label && (
        <span className="label">
          {k.label}
          {k.isi === "berita" && d.beritaTerbaru ? ` · ${d.beritaTerbaru.tanggal}` : ""}
        </span>
      )}
      {(k.judul || k.isi === "berita" || k.isi === "galeri") && (
        <h3>
          {k.isi === "berita" && d.beritaTerbaru
            ? d.beritaTerbaru.judul
            : k.isi === "galeri" && d.jumlahFoto
              ? `${d.jumlahFoto} ${k.judul ? k.judul.toLowerCase() : "momen kegiatan"}`
              : k.judul}
        </h3>
      )}
      {k.isi === "kepsek" && d.kepalaSekolah ? <p>{d.kepalaSekolah}</p> : k.teks && <p>{k.teks}</p>}
    </Link>
  );
}

/** Lanjutan gelap setelah hero: pita kegiatan dua arah + kisi bento kaca (diatur di Tema & Tampilan). */
export function SeksiGelap({
  pita,
  tema,
  d,
}: {
  pita: { nama: string; sub: string; href: string }[];
  tema: Tema["beranda"];
  d: DataOtomatis;
}) {
  const tengah = Math.ceil(pita.length / 2);
  const atas = pita.slice(0, tengah);
  const bawah = pita.length > 3 ? pita.slice(tengah) : pita;
  const isi = (x: typeof pita) => (x.length < 6 ? [...x, ...x, ...x].slice(0, Math.max(6, x.length)) : x);
  // kartu besar & kartu galeri tanpa gambar sendiri memakai foto galeri sekolah (bergiliran)
  const butuh = tema.bento.map((k) => !k.gambar && (k.ukuran === "besar" || k.isi === "galeri"));
  const urutanFoto = butuh.map((b, i) => (b ? butuh.slice(0, i).filter(Boolean).length : -1));
  return (
    <section className="gelap-lanjut lp" aria-labelledby="judul-bento">
      {pita.length > 0 && (
        <div aria-label="Kegiatan & program sekolah">
          {tema.pitaJudul && <p className="pita-judul">{tema.pitaJudul}</p>}
          <div className="pita-wadah">
            <Pita isi={isi(atas)} />
            <Pita isi={isi(bawah)} balik />
          </div>
        </div>
      )}

      <div className="lp-wadah">
        <Reveal className="bento-judul">
          <h2 id="judul-bento">
            {tema.bentoJudul}
            <br />
            <em>{tema.bentoMiring}</em>
          </h2>
          {tema.bentoTeks && <p>{tema.bentoTeks}</p>}
        </Reveal>

        <div className="bento">
          {tema.bento.map((k, i) => (
            <Kartu key={i} k={k} d={d} foto={urutanFoto[i] >= 0 ? d.fotoCadangan[urutanFoto[i] % Math.max(1, d.fotoCadangan.length)] : undefined} />
          ))}
        </div>
      </div>
    </section>
  );
}
