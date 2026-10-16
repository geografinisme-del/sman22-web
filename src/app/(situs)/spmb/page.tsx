import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { spmb } from "@/content/sekolah";
import { getProfil } from "@/lib/data";

export const metadata: Metadata = {
  title: "SPMB",
  description: "Informasi Sistem Penerimaan Murid Baru SMA Negeri 22 Bandung.",
};

/** Teks bertanda "[ISI ...]" belum diisi — jangan ditampilkan ke publik */
const terisi = (daftar: string[]) => daftar.filter((t) => t.trim() && !/^\[ISI/i.test(t.trim()));

/** Gambaran umum tahapan SPMB (ketentuan rinci mengikuti pengumuman resmi Dinas Pendidikan Jawa Barat) */
const ALUR = [
  { judul: "Cek informasi resmi", teks: "Pelajari jalur, kuota, dan jadwal dari Dinas Pendidikan Provinsi Jawa Barat." },
  { judul: "Daftar daring", teks: "Isi formulir dan unggah berkas di situs SPMB resmi provinsi." },
  { judul: "Verifikasi berkas", teks: "Panitia memeriksa berkas; pantau status pendaftaran secara berkala." },
  { judul: "Pengumuman", teks: "Hasil seleksi diumumkan sesuai jadwal resmi." },
  { judul: "Daftar ulang", teks: "Calon murid yang diterima melakukan daftar ulang di sekolah." },
];

export default async function Spmb() {
  const profil = await getProfil();
  const kontak = [profil.telepon, profil.email].filter(Boolean);
  const jalur = terisi(spmb.jalur);
  const syarat = terisi(spmb.persyaratan);
  // status berdasarkan data yang tersedia: aktif bila tautan resmi & rincian sudah diisi
  const aktif = Boolean(spmb.tautanResmi && (jalur.length || syarat.length));

  return (
    <div className="halaman-bidang" data-bidang="spmb">
      <PageHeader judul={`SPMB ${spmb.tahun}`} deskripsi="Sistem Penerimaan Murid Baru SMA Negeri 22 Bandung.">
        <p className="flex flex-wrap items-center gap-3">
          <span className="label-status">{aktif ? "Pendaftaran dibuka" : "Persiapan — belum diumumkan"}</span>
          {spmb.tautanResmi && (
            <a href={spmb.tautanResmi} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              Buka situs SPMB resmi
            </a>
          )}
        </p>
      </PageHeader>

      <section className="bagian">
        <div className="lp-wadah">
          <div className="blok-pengumuman bacaan">
            <p className="font-semibold">{aktif ? `Informasi SPMB ${spmb.tahun}` : `Jadwal dan ketentuan SPMB ${spmb.tahun} belum diumumkan`}</p>
            <p className="mt-1 text-[#3b414b]">{spmb.catatan}</p>
          </div>

          {(jalur.length > 0 || syarat.length > 0) && (
            <div className="mt-10 grid gap-10 md:grid-cols-2">
              {jalur.length > 0 && (
                <div>
                  <h2>Jalur pendaftaran</h2>
                  <ul className="mt-3 divide-y divide-[#e5e1da] border-y border-[#e5e1da]">
                    {jalur.map((j) => (
                      <li key={j} className="py-3">
                        {j}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {syarat.length > 0 && (
                <div>
                  <h2>Persyaratan</h2>
                  <ul className="mt-3 divide-y divide-[#e5e1da] border-y border-[#e5e1da]">
                    {syarat.map((p) => (
                      <li key={p} className="py-3">
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section id="tahapan" className="bagian bagian-putih scroll-mt-24">
        <div className="lp-wadah">
          <h2>Gambaran umum tahapan</h2>
          <p className="mt-1 text-[#5b6270]">Ketentuan rinci mengikuti pengumuman resmi tahun berjalan.</p>
          <ol className="mt-5 grid gap-x-6 border-t-2 border-[#1f2328] sm:grid-cols-2 lg:grid-cols-5">
            {ALUR.map((a, i) => (
              <li key={a.judul} className="border-b border-[#e5e1da] py-4 lg:border-b-0 lg:pr-2">
                <span className="text-sm font-bold tabular-nums text-[var(--tema-utama)]">Langkah {i + 1}</span>
                <h3 className="mt-1">{a.judul}</h3>
                <p className="mt-1 text-[0.9375rem] text-[#3b414b]">{a.teks}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bagian">
        <div className="lp-wadah">
          <h2>Butuh bantuan?</h2>
          <p className="bacaan mt-2 text-[#3b414b]">
            {kontak.length
              ? `Hubungi panitia SPMB melalui ${kontak.join(" atau ")}${profil.jamLayanan ? ` (${profil.jamLayanan})` : ""}.`
              : "Hubungi tata usaha sekolah pada jam layanan, atau kirim pertanyaan melalui formulir pengaduan."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/kontak" className="btn">
              Kontak sekolah
            </Link>
            <Link href="/pengaduan" className="btn">
              Kirim pertanyaan
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
