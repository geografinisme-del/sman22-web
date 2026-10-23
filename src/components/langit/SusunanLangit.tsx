import "server-only";
import { getAgenda, getBerita, getGaleri, getKartuBeranda, getPengumuman, getPrestasi, getProfil, getRekomendasiBuku, getSitus, getSpmbInfo, getTur, getVisualAkun } from "@/lib/data";
import { susunBagian, type Konfigurasi } from "@/lib/tampilan/konfigurasi";
import { tautanELearning } from "@/content/menu";
import { fotoKode } from "@/lib/foto-slot";
import { AksesKontak, KabarSekolah, KehidupanSiswa, PengumumanAgenda, PrestasiBeranda, RekomendasiBuku, TentangKami } from "./Bagian";
import { BentoAngka } from "./BentoAngka";
import { CtaSpmb } from "./CtaSpmb";
import { HeroLangit } from "./HeroLangit";
import { TurSekolah } from "./TurSekolah";

const sintetis = (src: string) => src.includes("/images/hero/model-sintetis");

/**
 * Beranda "Langit cerah": urutan & visibilitas mengikuti konfigurasi widget (Admin → Tema & Tampilan);
 * setiap bagian mengambil data dari modul sumbernya dan disembunyikan bila datanya kosong.
 */
export async function SusunanLangit({ konfig }: { konfig: Konfigurasi }) {
  const tampil = konfig.beranda.filter((w) => w.tampil);
  const ada = (j: string) => tampil.some((w) => w.jenis === j);
  const [situs, profil, kartu, tur, berita, agenda, pengumuman, galeri, visual, prestasi, spmb, buku, fotoTentang] = await Promise.all([
    getSitus(),
    getProfil(),
    ada("hero") ? getKartuBeranda() : Promise.resolve([]),
    ada("tur") ? getTur() : Promise.resolve([]),
    ada("berita") ? getBerita(8) : Promise.resolve([]),
    ada("agenda") ? getAgenda(30) : Promise.resolve([]),
    ada("pengumuman") ? getPengumuman(6) : Promise.resolve([]),
    ada("galeri") ? getGaleri() : Promise.resolve([]),
    ada("angka") ? getVisualAkun("beranda") : Promise.resolve([]),
    ada("prestasi") ? getPrestasi(12) : Promise.resolve([]),
    ada("spmb") ? getSpmbInfo() : Promise.resolve(null),
    ada("perpus") ? getRekomendasiBuku(4) : Promise.resolve([]),
    fotoKode("beranda.tentang", { src: "/images/gedung.jpg", alt: "Gedung utama SMA Negeri 22 Bandung", sementara: false }),
  ]);

  // foto kartu biru "dalam angka": slide hero CMS → visual beranda → foto keluarga besar
  const fotoAngka =
    situs.hero.slide.filter((s) => s.gambar && !sintetis(s.gambar)).map((s) => ({ src: s.gambar, alt: s.alt }))[0] ??
    visual.filter((v) => v.jenis === "gambar").map((v) => ({ src: v.berkas, alt: v.keterangan || "Kegiatan di SMA Negeri 22 Bandung" }))[0] ?? {
      src: "/images/keluarga-besar.jpg",
      alt: "Keluarga besar SMA Negeri 22 Bandung di halaman sekolah",
    };

  return (
    <div className="lp">
      {susunBagian(konfig).map((k) => {
        const kunci = k.map((w) => w.id).join("+");
        const isi = bagian(k);
        // penanda widget (dipakai pratinjau admin & uji alur)
        return isi ? (
          <div key={kunci} data-widget={k.map((w) => w.jenis).join("+")}>
            {isi}
          </div>
        ) : null;
      })}
    </div>
  );

  function bagian(k: ReturnType<typeof susunBagian>[number]) {
    const [a] = k;
    const pasang = (j: string) => k.find((w) => w.jenis === j)?.pengaturan;
    switch (a.jenis) {
      case "hero":
        return <HeroLangit kartu={kartu} adaTur={tur.length > 0} />;
      case "tur":
        return <TurSekolah titik={tur} />;
      case "angka":
        return <BentoAngka profil={profil} foto={fotoAngka} />;
      case "berita":
        return <KabarSekolah berita={berita} p={a.pengaturan} />;
      case "pengumuman":
      case "agenda":
        return <PengumumanAgenda pengumuman={pengumuman} agenda={agenda} pP={pasang("pengumuman")} pA={pasang("agenda")} />;
      case "spmb":
        return <CtaSpmb spmb={spmb} />;
      case "prestasi":
        return <PrestasiBeranda prestasi={prestasi} profil={profil} p={a.pengaturan} />;
      case "galeri":
      case "program":
        return <KehidupanSiswa galeri={galeri} p={pasang("galeri") ?? {}} program={pasang("program")} />;
      case "layanan":
      case "kontak":
        return <AksesKontak layanan={situs.tema.beranda.bento} profil={profil} pL={pasang("layanan")} pK={pasang("kontak")} eLearning={tautanELearning(situs.layanan)} />;
      case "profil":
        return <TentangKami profil={profil} p={a.pengaturan} foto={fotoTentang} />;
      case "perpus":
        return <RekomendasiBuku buku={buku} p={a.pengaturan} />;
      default:
        return null;
    }
  }
}
