import type { Metadata } from "next";
import { Gambar } from "@/components/Gambar";
import { PageHeader, Section } from "@/components/ui";
import { sambutan, sekolah } from "@/content/sekolah";
import { getProfil } from "@/lib/data";
import { JENIS_MITRA } from "@/lib/humas";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabasePublik } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Profil Sekolah" };

const BELUM = <span className="text-black/40">Segera diperbarui</span>;

export default async function Profil() {
  const p = await getProfil();
  const { data: mitraData } = supabaseAktif ? await supabasePublik().rpc("mitra_publik") : { data: [] };
  const mitra = (mitraData ?? []) as { mitra: string; jenis: string }[];
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

  return (
    <>
      <PageHeader label="Tentang kami" judul="Profil Sekolah" deskripsi={p.slogan || undefined} />

      <Section judul={sambutan.judul}>
        <div className="grid gap-8 md:grid-cols-[1fr_2fr] md:gap-14">
          <Gambar
            src={p.fotoKepalaSekolah}
            alt={`Foto ${p.kepalaSekolah}`}
            className="mx-auto aspect-[4/5] w-full max-w-[260px] rounded-[2rem] bg-krem md:max-w-none"
          />
          <div className="space-y-4 text-lg leading-relaxed text-black/70">
            {p.sambutanKutipan && <p className="font-serif text-3xl italic leading-tight text-tinta">“{p.sambutanKutipan}”</p>}
            {p.sambutanParagraf.length > 0 ? p.sambutanParagraf.map((t, i) => <p key={i}>{t}</p>) : <p>{BELUM}</p>}
            <p className="pt-2 font-semibold text-tinta">{p.kepalaSekolah}</p>
          </div>
        </div>
      </Section>

      <Section judul="Visi & Misi" className="!pt-0">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-brand-900 p-8 text-white">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-accent-400">Visi</h3>
            <p className="mt-3 font-serif text-3xl leading-tight">{p.visi || "Segera diperbarui"}</p>
          </div>
          <div className="rounded-2xl bg-white p-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-merah">Misi</h3>
            {p.misi.length > 0 ? (
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-black/70">
                {p.misi.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ol>
            ) : (
              <p className="mt-3">{BELUM}</p>
            )}
          </div>
        </div>
      </Section>

      <Section judul="Sejarah Singkat" className="!pt-0">
        <div className="max-w-3xl space-y-4 text-lg leading-relaxed text-black/70">
          {p.sejarah.length > 0 ? p.sejarah.map((t, i) => <p key={i}>{t}</p>) : <p>{BELUM}</p>}
        </div>
      </Section>

      <Section judul="Identitas Sekolah" className="!pt-0">
        <dl className="overflow-hidden rounded-2xl bg-white">
          {identitas.map(([k, v]) => (
            <div key={k} className="grid gap-1 border-b border-black/5 px-5 py-4 last:border-0 sm:grid-cols-[200px_1fr]">
              <dt className="text-sm font-medium text-black/50">{k}</dt>
              <dd className="text-tinta">{v || BELUM}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {mitra.length > 0 && (
        <Section judul="Mitra Sekolah" className="!pt-0">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mitra.map((m) => (
              <li key={m.mitra} className="rounded-2xl bg-white px-5 py-4"><p className="font-medium">{m.mitra}</p><p className="text-sm text-black/50">{JENIS_MITRA[m.jenis as keyof typeof JENIS_MITRA] ?? m.jenis}</p></li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
