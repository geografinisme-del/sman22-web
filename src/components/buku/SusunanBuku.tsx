import "server-only";
import fs from "node:fs";
import path from "node:path";
import { WPerpus, WProfil } from "@/components/widget/Widget";
import { getAgenda, getBerita, getEkskulRingkas, getGaleri, getPengumuman, getPrestasi, getProfil, getRekomendasiBuku, getSitus, getSpmbInfo, getVisualAkun } from "@/lib/data";
import { susunBagian, type Konfigurasi } from "@/lib/tampilan/konfigurasi";
import { tautanELearning } from "@/content/menu";
import { GerakBuku } from "./GerakBuku";
import { BkAksesKontak, BkAngka, BkHero, BkKabar, BkKehidupan, BkPengumumanAgenda, BkPrestasi, BkSpmb } from "./Buku";
import type { FotoHero } from "./HeroFoto";

const sintetis = (src: string) => src.includes("/images/hero/model-sintetis");
/** Video hero sementara hanya dipakai bila berkasnya benar-benar ada (lihat public/media/placeholder/MEDIA_PLAN.md). */
const VIDEO_HERO = "/media/placeholder/hero-loop.mp4";
const adaVideoHero = () => {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", VIDEO_HERO));
  } catch {
    return false;
  }
};

/**
 * Beranda tema "Buku Tahunan": urutan & visibilitas mengikuti konfigurasi widget (Admin → Tema & Tampilan);
 * setiap bagian mengambil data dari modul sumbernya dan disembunyikan bila datanya kosong.
 */
export async function SusunanBuku({ konfig }: { konfig: Konfigurasi }) {
  const tampil = konfig.beranda.filter((w) => w.tampil);
  const ada = (j: string) => tampil.some((w) => w.jenis === j);
  const [situs, profil, berita, agenda, pengumuman, galeri, visual, prestasi, spmb, buku] = await Promise.all([
    getSitus(),
    getProfil(),
    ada("berita") ? getBerita(8) : Promise.resolve([]),
    ada("agenda") ? getAgenda(30) : Promise.resolve([]),
    ada("pengumuman") ? getPengumuman(6) : Promise.resolve([]),
    ada("galeri") ? getGaleri() : Promise.resolve([]),
    getVisualAkun("beranda"),
    ada("prestasi") ? getPrestasi(12) : Promise.resolve([]),
    ada("spmb") ? getSpmbInfo() : Promise.resolve(null),
    ada("perpus") ? getRekomendasiBuku(4) : Promise.resolve([]),
  ]);
  const ekskul = ada("profil") ? await getEkskulRingkas() : [];

  const fotoHero: FotoHero[] = (() => {
    const cms = situs.hero.slide
      .filter((s) => s.gambar && !sintetis(s.gambar))
      .map((s) => ({
        src: s.gambar,
        alt: s.alt,
        fokus: s.fokus,
        sementara: s.sementara,
      }));
    if (cms.length) return cms;
    const vis = visual
      .filter((v) => v.jenis === "gambar")
      .map((v) => ({
        src: v.berkas,
        alt: v.keterangan || `Kegiatan di SMA Negeri 22 Bandung`,
      }));
    if (vis.length) return vis;
    return [
      {
        src: "/images/keluarga-besar.jpg",
        alt: "Keluarga besar SMA Negeri 22 Bandung di halaman sekolah",
        fokus: "50% 55%",
      },
    ];
  })();
  const fakta = profil.slogan || situs.hero.teks;
  const d = {
    situs,
    profil,
    berita,
    agenda,
    pengumuman,
    galeri,
    visual,
    ekskul,
    buku,
  };

  return (
    <GerakBuku>
      {susunBagian(konfig).map((k) => {
        const kunci = k.map((w) => w.id).join("+");
        const isi = bagian(k);
        // penanda widget (dipakai pratinjau admin & uji alur), sama dengan susunan tema lain
        return isi ? (
          <div key={kunci} data-widget={k.map((w) => w.jenis).join("+")}>
            {isi}
          </div>
        ) : null;
      })}
    </GerakBuku>
  );

  function bagian(k: ReturnType<typeof susunBagian>[number]) {
    const [a, b] = k;
    const kunci = k.map((w) => w.id).join("+");
    const pasang = (j: string) => k.find((w) => w.jenis === j)?.pengaturan;
    switch (a.jenis) {
      case "hero":
        return <BkHero key={kunci} foto={fotoHero} video={adaVideoHero() ? VIDEO_HERO : undefined} fakta={fakta} />;
      case "angka":
        return <BkAngka key={kunci} profil={profil} />;
      case "berita":
        return <BkKabar key={kunci} berita={berita} p={a.pengaturan} />;
      case "pengumuman":
      case "agenda":
        return <BkPengumumanAgenda key={kunci} pengumuman={pengumuman} agenda={agenda} pP={pasang("pengumuman")} pA={pasang("agenda")} />;
      case "spmb":
        return <BkSpmb key={kunci} spmb={spmb} p={a.pengaturan} />;
      case "prestasi":
        return <BkPrestasi key={kunci} prestasi={prestasi} profil={profil} p={a.pengaturan} />;
      case "galeri":
      case "program":
        return <BkKehidupan key={kunci} galeri={galeri} p={pasang("galeri") ?? {}} program={pasang("program")} />;
      case "layanan":
      case "kontak":
        return <BkAksesKontak key={kunci} layanan={situs.tema.beranda.bento} profil={profil} pL={pasang("layanan")} pK={pasang("kontak")} eLearning={tautanELearning(situs.layanan)} />;
      case "profil":
        return (
          <section key={kunci} className="bagian" aria-labelledby="judul-kenal">
            <WProfil d={d} p={a.pengaturan} tata="foto-kiri" paralaks={false} />
          </section>
        );
      case "perpus":
        return (
          <section key={kunci} className="bagian" aria-labelledby="judul-perpus">
            <WPerpus d={d} p={a.pengaturan} />
          </section>
        );
      default:
        void b;
        return null;
    }
  }
}
