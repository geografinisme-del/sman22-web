import type { Metadata } from "next";
import { CtaBand, SectionHeading } from "@/components/langit/Komponen";
import { PageHeader } from "@/components/ui";
import { spmb } from "@/content/sekolah";
import { getProfil, getSpmbInfo } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

export const metadata: Metadata = {
  title: "SPMB",
  description: "Informasi Sistem Penerimaan Murid Baru SMA Negeri 22 Bandung.",
};

/** Teks bertanda "[ISI ...]" belum diisi — jangan ditampilkan ke publik */
const terisi = (daftar: string[]) => daftar.filter((t) => t.trim() && !/^\[ISI/i.test(t.trim()));

/** Gambaran umum tahapan bila jadwal resmi belum diisi di CMS (ketentuan rinci mengikuti Dinas Pendidikan Jawa Barat) */
const ALUR = [
  { judul: "Cek informasi resmi", teks: "Pelajari jalur, kuota, dan jadwal dari Dinas Pendidikan Provinsi Jawa Barat." },
  { judul: "Daftar daring", teks: "Isi formulir dan unggah berkas di situs SPMB resmi provinsi." },
  { judul: "Verifikasi berkas", teks: "Panitia memeriksa berkas; pantau status pendaftaran secara berkala." },
  { judul: "Pengumuman & daftar ulang", teks: "Hasil seleksi diumumkan sesuai jadwal resmi; yang diterima melakukan daftar ulang di sekolah." },
];

export default async function Spmb() {
  const [profil, info] = await Promise.all([getProfil(), getSpmbInfo()]);
  const kontak = [profil.telepon, profil.email].filter(Boolean);
  const jalur = terisi(spmb.jalur);
  const syarat = terisi(spmb.persyaratan);
  const tautanResmi = info?.tautanJalur || spmb.tautanResmi;
  const tahun = info?.tahun || spmb.tahun;
  // status: aktif menurut CMS SPMB; bila belum ada, aktif bila tautan resmi & rincian sudah diisi
  const aktif = info ? info.aktif : Boolean(spmb.tautanResmi && (jalur.length || syarat.length));
  const langkah = info?.jadwal.length ? info.jadwal.map((j) => ({ judul: j.langkah, teks: j.tanggal ? formatTanggal(j.tanggal) : "" })) : ALUR;
  const bantuan = kontak.length
    ? `Hubungi panitia SPMB melalui ${kontak.join(" atau ")}${profil.jamLayanan ? ` (${profil.jamLayanan})` : ""}.`
    : "Hubungi tata usaha sekolah pada jam layanan, atau kirim pertanyaan melalui formulir pengaduan.";
  const faq = [
    { t: "Di mana pendaftaran dilakukan?", j: "Pendaftaran dilakukan daring melalui situs SPMB resmi Dinas Pendidikan Provinsi Jawa Barat, bukan melalui situs sekolah." },
    { t: "Kapan jadwal SPMB dimulai?", j: aktif ? "Lihat jadwal pada tahapan di atas dan situs SPMB resmi." : "Jadwal mengikuti pengumuman resmi tahun berjalan dan akan dicantumkan di halaman ini setelah diumumkan." },
    { t: "Siapa yang bisa saya hubungi?", j: bantuan },
  ];

  return (
    <>
      <PageHeader judul={`SPMB ${tahun}`} label={aktif ? "Pendaftaran dibuka" : "Persiapan — belum diumumkan"} deskripsi={info?.ringkasan || "Sistem Penerimaan Murid Baru SMA Negeri 22 Bandung."}>
        {tautanResmi && (
          <a href={tautanResmi} target="_blank" rel="noopener noreferrer" className="lgt-pil-tombol lgt-pil-lime">
            Buka situs SPMB resmi
          </a>
        )}
      </PageHeader>

      <section className="lgt-bagian">
        <div className="lgt-wadah">
          <div className="blok-pengumuman max-w-[860px]">
            <p className="font-semibold">{aktif ? `Informasi SPMB ${tahun}` : `Jadwal dan ketentuan SPMB ${tahun} belum diumumkan`}</p>
            <p className="mt-1 text-[var(--muted)]">{spmb.catatan}</p>
          </div>
          {(jalur.length > 0 || syarat.length > 0) && (
            <div className="lgt-kisi-2 lgt-kisi-renggang mt-14">
              {jalur.length > 0 && (
                <div>
                  <SectionHeading label="Jalur" judul="Jalur pendaftaran." />
                  <ul className="lgt-akses mt-6">
                    {jalur.map((j) => (
                      <li key={j} className="border-b border-[var(--line)] py-3 font-semibold">
                        {j}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {syarat.length > 0 && (
                <div>
                  <SectionHeading label="Syarat" judul="Persyaratan." />
                  <ul className="lgt-akses mt-6">
                    {syarat.map((p) => (
                      <li key={p} className="border-b border-[var(--line)] py-3">
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

      <section id="tahapan" className="lgt-bagian lgt-bagian-soft scroll-mt-24">
        <div className="lgt-wadah">
          <SectionHeading label="Tahapan" judul={info?.jadwal.length ? "Jadwal resmi." : "Gambaran umum tahapan."} teks="Ketentuan rinci mengikuti pengumuman resmi tahun berjalan." />
          <ol className="lgt-nomor-kisi mt-8">
            {langkah.map((a) => (
              <li key={a.judul} className="lgt-nomor">
                <strong>{a.judul}</strong>
                {a.teks && <span>{a.teks}</span>}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="lgt-bagian" aria-labelledby="judul-faq">
        <div className="lgt-wadah lgt-kisi-2 lgt-kisi-renggang">
          <SectionHeading id="judul-faq" label="Tanya jawab" judul="Pertanyaan yang sering diajukan." />
          <div className="lgt-faq">
            {faq.map((f) => (
              <details key={f.t}>
                <summary>{f.t}</summary>
                <p>{f.j}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <CtaBand label="Butuh bantuan?" judul="Tanya panitia SPMB." lanjutan="Kami siap membantu." tombol={{ href: "/kontak", teks: "Kontak sekolah" }} />
    </>
  );
}
