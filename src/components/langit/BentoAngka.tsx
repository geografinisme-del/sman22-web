import { MediaSlot } from "@/components/MediaSlot";
import type { Profil } from "@/lib/data";
import { sekolah } from "@/content/sekolah";

/** "1200" → "1.200", "1200+" → "1.200+"; teks lain dibiarkan. */
function formatAngka(v: string) {
  const m = v.trim().match(/^(\d[\d.\s]*)(\+?)$/);
  if (!m) return v.trim();
  return Number(m[1].replace(/[.\s]/g, "")).toLocaleString("id-ID") + m[2];
}

/**
 * "SMAN 22 dalam angka" (bento 3 kolom; HP 1 kolom). Semua angka & kutipan dari CMS (profil sekolah);
 * kartu yang datanya kosong tidak ditampilkan, dan seluruh bagian disembunyikan bila tidak ada isi selain tahun.
 */
export function BentoAngka({ profil, foto }: { profil: Profil; foto: { src: string; alt: string } }) {
  const nilai = (label: string) => profil.statistik.find((s) => s.label === label)?.nilai ?? "";
  const siswa = nilai("Peserta didik");
  const ekskul = nilai("Ekstrakurikuler");
  const persen = profil.lulusanPtPersen.replace(",", ".");
  const kutipan = profil.sambutanKutipan;
  const adaAbu = Boolean(persen || kutipan);
  if (!adaAbu && !siswa && !ekskul) return null;

  return (
    <section className="lgt-bagian" aria-labelledby="judul-angka">
      <div className="lgt-wadah">
        <p className="label-mono lgt-label-titik">SMAN 22 dalam angka</p>
        <h2 id="judul-angka" className="lgt-judul-bagian">
          Lebih dari tiga dekade menumbuhkan anak-anak Bandung.
        </h2>
        <div className="lgt-bento">
          <div className="lgt-bento-kartu lgt-bento-biru">
            <MediaSlot src={foto.src} alt="" ratio="isi" sizes="(min-width: 900px) 33vw, 100vw" className="lgt-bento-foto" tunda />
            <div className="lgt-bento-panel">
              <strong className="lgt-bento-angka">{sekolah.tahunBerdiri}</strong>
              <span>Tahun berdiri.</span>
            </div>
          </div>

          {adaAbu && (
            <div className="lgt-bento-kartu lgt-bento-abu">
              {persen && (
                <div>
                  <p className="label-mono">Lulusan melanjutkan ke perguruan tinggi</p>
                  <strong className="lgt-bento-angka">{persen.replace(".", ",")}%</strong>
                </div>
              )}
              {kutipan && (
                <figure className="lgt-bento-kutipan">
                  <blockquote>“{kutipan}”</blockquote>
                  {profil.kepalaSekolah && (
                    <figcaption>
                      <strong>{profil.kepalaSekolah}</strong>
                      {profil.jabatanKepala && <span>{profil.jabatanKepala}</span>}
                    </figcaption>
                  )}
                </figure>
              )}
            </div>
          )}

          {(siswa || ekskul) && (
            <div className="lgt-bento-kolom">
              {siswa && (
                <div className="lgt-bento-kartu lgt-bento-lime">
                  <p className="label-mono">Siswa aktif</p>
                  <strong className="lgt-bento-angka" data-hitung>{formatAngka(siswa)}</strong>
                  <span>Dari kelas X sampai XII</span>
                </div>
              )}
              {ekskul && (
                <div className="lgt-bento-kartu lgt-bento-ink">
                  <p className="label-mono">Ekstrakurikuler</p>
                  <strong className="lgt-bento-angka" data-hitung>{formatAngka(ekskul)}</strong>
                </div>
              )}
            </div>
          )}
        </div>
        <p className="sr-only">Foto latar kartu tahun berdiri: {foto.alt}</p>
      </div>
    </section>
  );
}
