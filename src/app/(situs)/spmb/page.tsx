import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Info } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { Kosong, PageHeader, Section } from "@/components/ui";
import { spmb } from "@/content/sekolah";
import { getProfil } from "@/lib/data";

export const metadata: Metadata = {
  title: "SPMB",
  description: "Informasi Sistem Penerimaan Murid Baru SMA Negeri 22 Bandung.",
};

/** Teks bertanda "[ISI ...]" belum diisi — jangan ditampilkan ke publik */
const terisi = (daftar: string[]) => daftar.filter((t) => t.trim() && !/^\[ISI/i.test(t.trim()));

const ALUR = [
  { judul: "Cek informasi", teks: "Pelajari jalur, kuota, dan jadwal resmi dari Dinas Pendidikan Jawa Barat." },
  { judul: "Daftar daring", teks: "Isi formulir dan unggah berkas di situs SPMB resmi provinsi." },
  { judul: "Verifikasi", teks: "Panitia memeriksa berkas; pantau status pendaftaran secara berkala." },
  { judul: "Pengumuman", teks: "Lihat hasil seleksi sesuai jadwal resmi." },
  { judul: "Daftar ulang", teks: "Calon murid yang diterima melakukan daftar ulang di sekolah." },
];

export default async function Spmb() {
  const profil = await getProfil();
  const kontak = [profil.telepon, profil.email].filter(Boolean).join(" atau ");
  const jalur = terisi(spmb.jalur);
  const syarat = terisi(spmb.persyaratan);

  return (
    <>
      <PageHeader label="Penerimaan murid baru" judul={`SPMB ${spmb.tahun}`} deskripsi="Sistem Penerimaan Murid Baru SMA Negeri 22 Bandung.">
        <div className="flex flex-wrap gap-3">
          {spmb.tautanResmi && (
            <a href={spmb.tautanResmi} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              Buka situs SPMB resmi <ArrowUpRight size={16} aria-hidden />
            </a>
          )}
          <a href="#alur" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-[var(--tema-utama)]/20 transition hover:bg-[var(--tema-utama)] hover:text-white">
            Lihat alur pendaftaran
          </a>
        </div>
      </PageHeader>

      <div className="lp-wadah pt-8">
        <Reveal className="flex gap-3 rounded-2xl border border-[#e3ab2a]/40 bg-[#fffaf0] p-5 text-[15px] text-[#5b4a22]">
          <Info size={20} aria-hidden className="mt-0.5 shrink-0 text-[#b7841c]" />
          <p>{spmb.catatan}</p>
        </Reveal>
      </div>

      <Section judul="Alur" miring="pendaftaran" label="Langkah demi langkah" className="pb-4!">
        <ol id="alur" className="grid scroll-mt-28 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ALUR.map((a, i) => (
            <li key={a.judul} className="kartu kartu-hidup group relative p-5">
              <span className="font-serif text-4xl italic leading-none text-[#ebe5fa] transition group-hover:text-[var(--tema-utama)]">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 font-semibold">{a.judul}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#626a76]">{a.teks}</p>
              {i < ALUR.length - 1 && <span aria-hidden className="absolute -right-2 top-1/2 hidden h-px w-4 bg-[#c7cff3] lg:block" />}
            </li>
          ))}
        </ol>
      </Section>

      <Section judul="Jalur" miring="& persyaratan" className="pt-6!">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="kartu p-6 sm:p-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--tema-utama)]">Jalur pendaftaran</p>
            {jalur.length ? (
              <ul className="mt-4 space-y-2">
                {jalur.map((j) => (
                  <li key={j} className="flex gap-3 rounded-xl bg-[#f6f5fc] px-4 py-3">
                    <span aria-hidden className="text-[#bd7c30]">✳</span> {j}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[#626a76]">Diumumkan bersama jadwal resmi.</p>
            )}
          </div>
          <div className="kartu p-6 sm:p-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#51419c]">Persyaratan</p>
            {syarat.length ? (
              <ul className="mt-4 space-y-2">
                {syarat.map((p) => (
                  <li key={p} className="flex gap-3 rounded-xl bg-[#f6f5fc] px-4 py-3">
                    <span aria-hidden className="text-[var(--tema-utama)]">✓</span> {p}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[#626a76]">Diumumkan bersama jadwal resmi.</p>
            )}
          </div>
        </div>
      </Section>

      <section className="lp-wadah pb-14">
        <Reveal className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[var(--tema-utama)] to-[#51419c] p-8 text-white sm:p-10">
          <span aria-hidden className="putar-pelan absolute -right-8 -top-10 text-[150px] leading-none text-white/10">✳</span>
          <h2 className="relative font-serif text-[clamp(1.7rem,3vw,2.4rem)] tracking-[-0.02em]">Butuh bantuan?</h2>
          <p className="relative mt-2 max-w-xl text-white/80">
            {kontak ? <>Hubungi panitia SPMB di {kontak}{profil.jamLayanan && ` (${profil.jamLayanan})`}.</> : "Hubungi tata usaha sekolah pada jam layanan."}
          </p>
          <div className="relative mt-5 flex flex-wrap gap-3">
            <Link href="/kontak" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[var(--tema-utama)] transition hover:bg-[#f2c14e] hover:text-[#121831]">
              Kontak sekolah
            </Link>
            <Link href="/pengaduan" className="rounded-full px-5 py-2.5 text-sm font-semibold ring-1 ring-white/40 transition hover:bg-white/10">
              Kirim pertanyaan
            </Link>
          </div>
        </Reveal>
        {!jalur.length && !syarat.length && !spmb.tautanResmi && (
          <div className="mt-5">
            <Kosong teks="Rincian SPMB tahun ini belum terbit." sub="Halaman ini diperbarui begitu jadwal resmi diumumkan." />
          </div>
        )}
      </section>
    </>
  );
}
