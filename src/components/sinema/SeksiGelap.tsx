import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarCheck, ClipboardList, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/Reveal";

export type DataSeksiGelap = {
  pita: { nama: string; sub: string; href: string }[];
  program: { nama: string; ringkas: string };
  tahunBerkarya: number;
  tahunBerdiri: number;
  beritaTerbaru?: { judul: string; slug: string; tanggal: string };
  jumlahEkskul: number;
  fotoUtama: string;
  fotoGaleri: string;
  jumlahFoto: number;
  kepalaSekolah: string;
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

function Pita({ isi, balik }: { isi: DataSeksiGelap["pita"]; balik?: boolean }) {
  return (
    <div className={`pita-baris ${balik ? "balik" : ""}`}>
      {[0, 1].map((salinan) =>
        isi.map((x) => (
          <Link key={`${salinan}-${x.nama}`} href={x.href} className="pita-item" tabIndex={salinan ? -1 : undefined} aria-hidden={salinan ? true : undefined}>
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

/** Lanjutan gelap setelah hero: pita kegiatan dua arah + kisi bento kaca, lalu memudar ke bagian terang. */
export function SeksiGelap({ d }: { d: DataSeksiGelap }) {
  const tengah = Math.ceil(d.pita.length / 2);
  const atas = d.pita.slice(0, tengah);
  const bawah = d.pita.length > 3 ? d.pita.slice(tengah) : d.pita;
  return (
    <section className="gelap-lanjut lp" aria-labelledby="judul-bento">
      {d.pita.length > 0 && (
        <div aria-label="Kegiatan & program sekolah">
          <p className="pita-judul">Ruang tumbuh warga SMAN 22</p>
          <div className="pita-wadah">
            <Pita isi={atas.length < 6 ? [...atas, ...atas] : atas} />
            <Pita isi={bawah.length < 6 ? [...bawah, ...bawah] : bawah} balik />
          </div>
        </div>
      )}

      <div className="lp-wadah">
        <Reveal className="bento-judul">
          <h2 id="judul-bento">
            Satu sekolah,
            <br />
            <em>banyak cerita.</em>
          </h2>
          <p>Jelajahi program, layanan, dan kabar terbaru SMA Negeri 22 Bandung — semuanya terhubung dalam satu pintu.</p>
        </Reveal>

        <div className="bento">
          <Link href="/profil" className="bento-kartu bento-besar bento-foto">
            <Image src={d.fotoUtama} alt="" fill sizes="(min-width: 1000px) 50vw, 100vw" className="object-cover" />
            <span className="panah" aria-hidden>
              <ArrowUpRight size={18} />
            </span>
            <span className="label">Program unggulan</span>
            <h3>{d.program.nama}</h3>
            <p>{d.program.ringkas}</p>
          </Link>

          <Link href="/profil" className="bento-kartu">
            <span className="panah" aria-hidden>
              <ArrowUpRight size={18} />
            </span>
            <span className="bento-angka">{d.tahunBerkarya}</span>
            <p>tahun berkarya, sejak {d.tahunBerdiri}</p>
          </Link>

          <Link href="/masuk" className="bento-kartu">
            <span className="panah" aria-hidden>
              <ArrowUpRight size={18} />
            </span>
            <ul className="bento-daftar">
              {PORTAL.map(({ Ikon, label }) => (
                <li key={label}>
                  <Ikon size={16} aria-hidden className="text-[#b9a6ff]" /> {label}
                </li>
              ))}
            </ul>
            <span className="label">Portal 22</span>
            <h3>Sekolah dalam genggaman</h3>
          </Link>

          <Link href="/galeri" className="bento-kartu bento-foto">
            <Image src={d.fotoGaleri} alt="" fill sizes="(min-width: 1000px) 25vw, 100vw" className="object-cover" />
            <span className="panah" aria-hidden>
              <ArrowUpRight size={18} />
            </span>
            <span className="label">Galeri</span>
            <h3>{d.jumlahFoto ? `${d.jumlahFoto} momen kegiatan` : "Momen kegiatan"}</h3>
          </Link>

          <Link href="/spmb" className="bento-kartu">
            <span className="panah" aria-hidden>
              <ArrowUpRight size={18} />
            </span>
            <span className="label">Penerimaan murid baru</span>
            <h3>Mari bergabung bersama keluarga besar SMAN 22.</h3>
          </Link>

          <Link href={d.beritaTerbaru ? `/berita/${d.beritaTerbaru.slug}` : "/berita"} className="bento-kartu bento-lebar">
            <span className="panah" aria-hidden>
              <ArrowUpRight size={18} />
            </span>
            <span className="label">Kabar terbaru{d.beritaTerbaru ? ` · ${d.beritaTerbaru.tanggal}` : ""}</span>
            <h3>{d.beritaTerbaru?.judul ?? "Berita & prestasi sekolah"}</h3>
          </Link>

          <Link href="/ekskul" className="bento-kartu">
            <span className="panah" aria-hidden>
              <ArrowUpRight size={18} />
            </span>
            {d.jumlahEkskul > 0 && <span className="bento-angka">{d.jumlahEkskul}</span>}
            <span className="label">Ekskul & OSIS</span>
            <h3>Temukan wadah bakatmu</h3>
          </Link>

          <Link href="/profil#sambutan" className="bento-kartu">
            <span className="panah" aria-hidden>
              <ArrowUpRight size={18} />
            </span>
            <span className="label">Sambutan</span>
            <h3>Pesan kepala sekolah</h3>
            {d.kepalaSekolah && <p>{d.kepalaSekolah}</p>}
          </Link>
        </div>
      </div>
    </section>
  );
}
