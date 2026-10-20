import "server-only";
import { getAgenda, getBerita, getEkskulRingkas, getGaleri, getPengumuman, getProfil, getRekomendasiBuku, getSitus, getVisualAkun } from "@/lib/data";
import { susunBagian, tataEfektif, type Konfigurasi } from "@/lib/tampilan/konfigurasi";
import { SusunanBuku } from "@/components/buku/SusunanBuku";
import type { WidgetInstans } from "@/lib/tampilan/widget";
import { fotoPembukaDari, IsiAgenda, IsiBerita, IsiLayanan, IsiPengumuman, WGaleri, WHero, WKontak, WPerpus, WPrestasi, WProfil, WProgram, type DataBeranda } from "./Widget";

/** Warna penanda bidang per bagian (semantik isi, bukan dekorasi): dipakai tema "Sekolah Berwarna". */
const BIDANG_BAGIAN: Partial<Record<WidgetInstans["jenis"], string>> = {
  program: "kurikulum",
  prestasi: "kesiswaan",
  galeri: "kesiswaan",
  perpus: "elibrary",
  kontak: "humas",
};

/** Muat hanya data yang dibutuhkan widget yang tampil (data sumber tidak pernah disalin ke konfigurasi). */
async function muatData(k: Konfigurasi): Promise<DataBeranda> {
  const tampil = k.beranda.filter((w) => w.tampil);
  const ada = (j: WidgetInstans["jenis"]) => tampil.some((w) => w.jenis === j);
  const widgetBerita = tampil.filter((w) => w.jenis === "berita");
  // berita berkategori disaring dari daftar yang lebih panjang
  const nBerita = Math.max(
    widgetBerita.length ? Math.max(...widgetBerita.map((w) => (w.pengaturan.kategori ? 40 : Number(w.pengaturan.jumlah) || 4))) : 0,
    ada("prestasi") ? 40 : 0, // prestasi disaring dari berita terbit berkategori Prestasi
  );
  const nAgenda = Number(tampil.find((w) => w.jenis === "agenda")?.pengaturan.jumlah) || 4;
  const nBuku = ada("perpus") ? Number(tampil.find((w) => w.jenis === "perpus")?.pengaturan.rekomendasi) || 0 : 0;
  const [situs, profil, berita, agenda, pengumuman, galeri, visual, ekskul, buku] = await Promise.all([
    getSitus(),
    getProfil(),
    nBerita ? getBerita(nBerita) : Promise.resolve([]),
    ada("agenda") ? getAgenda(nAgenda) : Promise.resolve([]),
    ada("pengumuman") ? getPengumuman(6) : Promise.resolve([]),
    ada("galeri") ? getGaleri() : Promise.resolve([]),
    getVisualAkun("beranda"),
    ada("galeri") ? getEkskulRingkas() : Promise.resolve([]),
    getRekomendasiBuku(nBuku),
  ]);
  return { situs, profil, berita, agenda, pengumuman, galeri, visual, ekskul, buku };
}

/**
 * Beranda yang disusun dari konfigurasi tampilan (terbit untuk publik, draf untuk pratinjau).
 * Latar bagian berselang-seling otomatis; pasangan widget yang bersebelahan dirender dua kolom.
 */
export async function SusunanBeranda({ konfig }: { konfig: Konfigurasi }) {
  // tema Buku Tahunan memakai templat bagian tersendiri dengan konfigurasi widget yang sama
  if (konfig.tema === "buku" || konfig.tema === "langit") return <SusunanBuku konfig={konfig} />;
  const d = await muatData(konfig);
  const bagian = susunBagian(konfig);
  const sudahTampil = new Set([...fotoPembukaDari(d).map((f) => f.src), "/images/gedung.jpg"]);
  const tata = (w: WidgetInstans) => tataEfektif(konfig.tema, w) ?? "";
  let urutan = 0;

  return (
    <div className="lp">
      {bagian.map((kelompok) => {
        const [a, b] = kelompok;
        if (a.jenis === "hero") return <WHero key={a.id} d={d} tata={tata(a)} slideshow={konfig.slideshow} />;

        let isi: React.ReactNode = null;
        let label = a.id;
        if (b && a.jenis === "pengumuman" && b.jenis === "layanan") {
          const layanan = <IsiLayanan d={d} p={b.pengaturan} tata={tata(b)} />;
          isi = (
            <div className={`lp-wadah grid gap-8 ${layanan ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]" : ""}`}>
              <IsiPengumuman d={d} p={a.pengaturan} id={`judul-${a.id}`} />
              {layanan}
            </div>
          );
          label = `judul-${a.id}`;
        } else if (b && a.jenis === "berita" && b.jenis === "agenda") {
          isi = (
            <div className="lp-wadah grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <IsiBerita d={d} p={a.pengaturan} tata={tata(a)} id={`judul-${a.id}`} />
              <div className="lg:pt-[4.25rem]">
                <IsiAgenda d={d} p={b.pengaturan} kolom />
              </div>
            </div>
          );
          label = `judul-${a.id}`;
        } else {
          switch (a.jenis) {
            case "pengumuman":
              isi = (
                <div className="lp-wadah">
                  <IsiPengumuman d={d} p={a.pengaturan} id={`judul-${a.id}`} />
                </div>
              );
              label = `judul-${a.id}`;
              break;
            case "layanan": {
              const l = <IsiLayanan d={d} p={a.pengaturan} tata={tata(a)} />;
              isi = l && <div className="lp-wadah">{l}</div>;
              break;
            }
            case "profil":
              isi = <WProfil d={d} p={a.pengaturan} tata={tata(a)} paralaks={a.pengaturan.paralaks !== false && konfig.gerak === "dinamis"} />;
              label = "judul-kenal";
              break;
            case "berita":
              isi = (
                <div className="lp-wadah">
                  <IsiBerita d={d} p={a.pengaturan} tata={tata(a)} id={`judul-${a.id}`} />
                </div>
              );
              label = `judul-${a.id}`;
              break;
            case "agenda":
              isi = (
                <div className="lp-wadah">
                  <IsiAgenda d={d} p={a.pengaturan} kolom={false} />
                </div>
              );
              label = "judul-agenda";
              break;
            case "prestasi":
              isi = <WPrestasi d={d} p={a.pengaturan} />;
              label = "judul-prestasi";
              break;
            case "program":
              isi = <WProgram p={a.pengaturan} tata={tata(a)} />;
              label = "judul-program";
              break;
            case "galeri":
              isi = <WGaleri d={d} p={a.pengaturan} tata={tata(a)} sudahTampil={sudahTampil} />;
              label = "judul-siswa";
              break;
            case "perpus":
              isi = <WPerpus d={d} p={a.pengaturan} />;
              label = "judul-perpus";
              break;
            case "kontak":
              isi = <WKontak d={d} p={a.pengaturan} />;
              label = "judul-kontak";
              break;
          }
        }
        if (!isi) return null; // widget tanpa data yang memilih disembunyikan (mis. galeri kosong)
        const putih = urutan++ % 2 === 1;
        return (
          <section key={kelompok.map((w) => w.id).join("+")} className={`bagian ${putih ? "bagian-putih" : ""} bagian-${a.jenis}`} aria-labelledby={label} data-widget={kelompok.map((w) => w.jenis).join("+")} data-bidang={BIDANG_BAGIAN[a.jenis]}>
            {isi}
          </section>
        );
      })}
    </div>
  );
}
