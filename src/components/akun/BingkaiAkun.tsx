import Image from "next/image";
import type { ReactNode } from "react";
import { Brand } from "@/components/Header";
import { getVisualAkun } from "@/lib/data";
import "@/components/beranda/beranda.css";

/**
 * Bingkai halaman akun (masuk, lupa sandi, verifikasi dua langkah, sandi baru).
 * Desktop: identitas sekolah + satu foto asli (kiri) dan formulir (kanan, maks. 440px).
 * Ponsel: identitas ringkas lalu formulir; panel foto disembunyikan; tinggi tidak dikunci.
 * Foto memakai visual "Halaman masuk" dari Admin → Tampilan Website bila ada, selain itu foto gedung.
 */
export async function BingkaiAkun({
  judul,
  deskripsi,
  children,
  bawah,
  tanpaFoto = false,
}: {
  judul: string;
  deskripsi?: ReactNode;
  children: ReactNode;
  /** bantuan & tautan kembali, ditampilkan tepat di bawah formulir */
  bawah?: ReactNode;
  /** sembunyikan panel foto (mis. verifikasi dua langkah) */
  tanpaFoto?: boolean;
}) {
  const visual = tanpaFoto ? [] : await getVisualAkun("akun");
  const pilihan = visual.find((v) => v.jenis === "gambar") ?? visual.find((v) => v.poster);
  const foto = pilihan
    ? { src: pilihan.jenis === "gambar" ? pilihan.berkas : (pilihan.poster ?? ""), alt: pilihan.keterangan || "SMA Negeri 22 Bandung" }
    : { src: "/images/gedung.jpg", alt: "Gedung utama SMA Negeri 22 Bandung" };

  return (
    <main className="lp akun-halaman">
      <div className={tanpaFoto ? "flex min-h-screen flex-col" : "akun-grid"}>
        {!tanpaFoto && (
          <section aria-label="Identitas sekolah" className="akun-identitas">
            <div>
              <Brand sub="Portal Sekolah" />
            </div>
            <figure className="flex flex-1 flex-col">
              <div className="akun-foto">
                {foto.src && <Image src={foto.src} alt={foto.alt} fill priority sizes="50vw" className="object-cover" />}
              </div>
              <figcaption className="keterangan-foto">{foto.alt}</figcaption>
            </figure>
          </section>
        )}

        <section className="akun-form-sisi flex-1">
          <div className="akun-kartu">
            <div className={tanpaFoto ? "mb-8" : "mb-8 min-[1061px]:hidden"}>
              <Brand sub="Portal Sekolah" />
            </div>
            <h1>{judul}</h1>
            {deskripsi && <div className="mt-2 text-[1rem] leading-relaxed text-[#3b414b]">{deskripsi}</div>}
            {children}
            {bawah && <div className="akun-bawah mt-6 space-y-3 border-t border-[#e5e1da] pt-5 text-[0.9375rem]">{bawah}</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
