import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { sekolah } from "@/content/sekolah";
import { getProfil } from "@/lib/data";
import { JENIS_MITRA } from "@/lib/humas";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabasePublik } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Profil Sekolah" };

const BAGIAN = [
  ["#identitas", "Identitas"],
  ["#visi-misi", "Visi & misi"],
  ["#sejarah", "Sejarah"],
  ["#sambutan", "Sambutan kepala sekolah"],
] as const;

export default async function Profil() {
  const p = await getProfil();
  const { data: mitraData } = supabaseAktif ? await supabasePublik().rpc("mitra_publik") : { data: [] };
  const mitra = (mitraData ?? []) as { mitra: string; jenis: string }[];
  // hanya isian resmi yang sudah terisi yang ditampilkan; sisanya disebut ringkas
  const identitas: [string, string][] = [
    ["Nama sekolah", sekolah.nama],
    ["NPSN", p.npsn],
    ["Akreditasi", p.akreditasi],
    ["Kepala sekolah", p.kepalaSekolah],
    ["Tahun berdiri", String(sekolah.tahunBerdiri)],
    ["Alamat", [p.alamat, sekolah.kota].filter(Boolean).join(", ")],
    ["Telepon", p.telepon],
    ["Email", p.email],
  ];
  const terisi = identitas.filter(([, v]) => v);
  const belum = identitas.filter(([, v]) => !v).map(([k]) => k);

  return (
    <div className="lp">
      <PageHeader
        judul="Profil Sekolah"
        deskripsi={p.slogan || `Informasi resmi tentang ${sekolah.nama}.`}
        foto={{ src: "/images/gedung.jpg", alt: "Gedung utama SMA Negeri 22 Bandung" }}
      >
        <nav aria-label="Bagian halaman" className="flex flex-wrap gap-x-5 gap-y-2">
          {BAGIAN.map(([href, label]) => (
            <a key={href} href={href} className="tautan">
              {label}
            </a>
          ))}
        </nav>
      </PageHeader>

      <section id="identitas" className="bagian scroll-mt-20">
        <div className="lp-wadah">
          <h2>Identitas sekolah</h2>
          <dl className="mt-5 grid border-t border-[#e5e1da] sm:grid-cols-2">
            {terisi.map(([k, v]) => (
              <div key={k} className={`grid gap-1 border-b border-[#e5e1da] py-3 sm:grid-cols-[150px_1fr] sm:pr-6 ${k === "Alamat" ? "sm:col-span-2" : ""}`}>
                <dt className="text-[0.9375rem] text-[#5b6270]">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          {belum.length > 0 && <p className="mt-3 text-[0.9375rem] text-[#5b6270]">{belum.join(", ")} sedang dilengkapi.</p>}
        </div>
      </section>

      <section id="visi-misi" className="bagian bagian-putih scroll-mt-20">
        <div className="lp-wadah grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div>
            <h2>Visi</h2>
            {p.visi ? <p className="mt-3 text-[1.1875rem] font-semibold leading-relaxed">{p.visi}</p> : <p className="mt-3 text-[#3b414b]">Visi resmi sekolah sedang dilengkapi.</p>}
          </div>
          <div>
            <h2>Misi</h2>
            {p.misi.length > 0 ? (
              <ol className="mt-3 divide-y divide-[#e5e1da] border-y border-[#e5e1da]">
                {p.misi.map((m, i) => (
                  <li key={m} className="flex gap-4 py-3">
                    <span className="w-6 shrink-0 font-bold tabular-nums text-[var(--tema-utama)]">{i + 1}</span>
                    <span className="text-[#3b414b]">{m}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-[#3b414b]">Misi resmi sekolah sedang dilengkapi.</p>
            )}
          </div>
        </div>
      </section>

      <section id="sejarah" className="bagian scroll-mt-20">
        <div className="lp-wadah">
          <h2>Sejarah singkat</h2>
          {p.sejarah.length > 0 ? (
            <div className="bacaan mt-3 space-y-4 text-[1.0625rem] text-[#3b414b]">
              {p.sejarah.map((t, i) => (
                <p key={i}>{t}</p>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[#3b414b]">Sekolah berdiri pada {sekolah.tahunBerdiri}. Uraian sejarah lengkap sedang dilengkapi.</p>
          )}
        </div>
      </section>

      <section id="sambutan" className="bagian bagian-putih scroll-mt-20">
        <div className="lp-wadah grid items-start gap-8 sm:grid-cols-[200px_1fr] md:grid-cols-[240px_1fr]">
          <figure className="max-w-[240px]">
            <div className="foto relative aspect-[425/600] border border-[#e5e1da] bg-white">
              <Image src={p.fotoKepalaSekolah} alt={`Foto ${p.kepalaSekolah}`} fill sizes="240px" className="object-cover object-top" />
            </div>
            <figcaption className="mt-2">
              <span className="block font-semibold">{p.kepalaSekolah}</span>
              <span className="text-sm text-[#5b6270]">Kepala Sekolah</span>
            </figcaption>
          </figure>
          <div>
            <h2>Sambutan kepala sekolah</h2>
            {p.sambutanKutipan || p.sambutanParagraf.length ? (
              <>
                {p.sambutanKutipan && <p className="mt-3 border-l-4 border-[var(--tema-utama)] pl-4 text-[1.1875rem] font-semibold leading-relaxed">{p.sambutanKutipan}</p>}
                {p.sambutanParagraf[0] && <p className="bacaan mt-4 text-[#3b414b]">{p.sambutanParagraf[0]}</p>}
                <Link href="/sambutan" className="tautan mt-4 inline-block">
                  Baca sambutan lengkap
                </Link>
              </>
            ) : (
              <p className="mt-3 text-[#3b414b]">Naskah sambutan kepala sekolah sedang dilengkapi.</p>
            )}
          </div>
        </div>
      </section>

      {mitra.length > 0 && (
        <section className="bagian">
          <div className="lp-wadah">
            <h2>Mitra sekolah</h2>
            <ul className="mt-4 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              {mitra.map((m) => (
                <li key={m.mitra} className="border-b border-[#e5e1da] py-3">
                  <span className="block font-semibold">{m.mitra}</span>
                  <span className="text-sm text-[#5b6270]">{JENIS_MITRA[m.jenis as keyof typeof JENIS_MITRA] ?? m.jenis}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
