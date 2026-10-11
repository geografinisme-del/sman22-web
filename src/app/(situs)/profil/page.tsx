import type { Metadata } from "next";
import { Gambar } from "@/components/Gambar";
import { Reveal } from "@/components/Reveal";
import { Kosong, PageHeader, Section } from "@/components/ui";
import { sambutan, sekolah } from "@/content/sekolah";
import { getProfil } from "@/lib/data";
import { JENIS_MITRA } from "@/lib/humas";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabasePublik } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Profil Sekolah" };

const BAGIAN = [
  ["#sambutan", "Sambutan"],
  ["#visi-misi", "Visi & Misi"],
  ["#sejarah", "Sejarah & Identitas"],
] as const;

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
    ["Telepon", p.telepon],
    ["Email", p.email],
    ["Alamat", [p.alamat, sekolah.kota].filter(Boolean).join(", ")],
  ];
  const ringkas = [
    { nilai: String(new Date().getFullYear() - sekolah.tahunBerdiri), label: "tahun berkarya" },
    ...(p.akreditasi ? [{ nilai: p.akreditasi, label: "akreditasi" }] : []),
    ...p.statistik.filter((s) => s.nilai && s.label !== "Tahun berdiri").slice(0, 2).map((s) => ({ nilai: s.nilai, label: s.label.toLowerCase() })),
  ];

  return (
    <>
      <PageHeader label="Tentang kami" judul="Profil Sekolah" deskripsi={p.slogan || "Mengenal SMA Negeri 22 Bandung: sambutan, visi-misi, sejarah, dan identitas sekolah."}>
        <div className="flex flex-wrap items-center gap-3">
          {ringkas.map((r) => (
            <span key={r.label} className="inline-flex items-baseline gap-2 rounded-full bg-[#f3f0fc] px-4 py-2">
              <strong className="font-serif text-xl font-medium text-[#284fd7]">{r.nilai}</strong>
              <span className="text-xs text-[#5e6074]">{r.label}</span>
            </span>
          ))}
        </div>
        <nav aria-label="Bagian halaman" className="mt-5 flex flex-wrap gap-2">
          {BAGIAN.map(([href, label]) => (
            <a key={href} href={href} className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-[#284fd7]/20 transition hover:bg-[#284fd7] hover:text-white">
              {label}
            </a>
          ))}
        </nav>
      </PageHeader>

      {/* Sambutan */}
      <section id="sambutan" className="lp-wadah scroll-mt-24 py-10 sm:py-14">
        <div className="grid items-center gap-10 md:grid-cols-[minmax(240px,340px)_1fr] lg:gap-16">
          <Reveal className="relative mx-auto w-full max-w-[300px] md:max-w-none">
            <span aria-hidden className="absolute -inset-x-3 bottom-0 top-[22%] rounded-[45%_50%_40%_35%] bg-[#ebe5fa]" />
            <span aria-hidden className="absolute inset-x-[8%] bottom-[4%] top-[34%] rounded-full bg-[#284fd7]" />
            <Gambar
              src={p.fotoKepalaSekolah}
              alt={`Foto ${p.kepalaSekolah}`}
              sizes="340px"
              className="kartu-gambar relative aspect-[4/5] rounded-[999px_999px_28px_28px] bg-transparent shadow-[0_30px_60px_-30px_rgb(32_37_44/0.45)]"
            />
            <div className="absolute -bottom-4 left-4 right-4 rotate-[-2deg] rounded-xl border border-[#e3dfd6] bg-[#fffdf7] px-4 py-3 shadow-sm">
              <p className="font-serif text-lg leading-tight">{p.kepalaSekolah}</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#6a6154]">Kepala Sekolah</p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#284fd7]">{sambutan.judul}</p>
            <blockquote className="mt-3 font-serif text-[clamp(1.8rem,3.2vw,2.75rem)] italic leading-[1.12] tracking-[-0.02em]">
              “{p.sambutanKutipan || "Selamat datang di keluarga besar SMA Negeri 22 Bandung."}”
            </blockquote>
            {p.sambutanParagraf.length > 0 ? (
              <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-[#4f5763]">
                {p.sambutanParagraf.map((t, i) => (
                  <p key={i}>{t}</p>
                ))}
              </div>
            ) : (
              <div className="mt-6">
                <Kosong teks="Naskah sambutan lengkap segera diperbarui." sub="Admin dapat mengisinya di menu Profil Sekolah." />
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* Visi & Misi */}
      <Section judul="Visi" miring="& Misi" label="Arah sekolah" className="pt-4!">
        <div id="visi-misi" className="grid scroll-mt-28 gap-5 lg:grid-cols-[5fr_7fr]">
          <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#284fd7] to-[#51419c] p-8 text-white sm:p-10">
            <span aria-hidden className="putar-pelan absolute -right-6 -top-8 text-[120px] leading-none text-white/10">✳</span>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Visi</p>
            <p className="relative mt-4 font-serif text-[clamp(1.6rem,2.6vw,2.2rem)] leading-[1.18]">{p.visi || "Visi sekolah segera diperbarui."}</p>
          </div>
          <div className="kartu p-6 sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#51419c]">Misi</p>
            {p.misi.length > 0 ? (
              <ol className="mt-4 divide-y divide-[#eeecf5]">
                {p.misi.map((m, i) => (
                  <li key={m} className="group flex gap-4 py-3 transition hover:pl-2">
                    <span className="font-serif text-2xl italic leading-none text-[#73698f] transition group-hover:text-[#284fd7]">{String(i + 1).padStart(2, "0")}</span>
                    <span className="pt-0.5 text-[#3d4450]">{m}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-[#626a76]">Misi sekolah segera diperbarui.</p>
            )}
          </div>
        </div>
      </Section>

      {/* Sejarah & identitas berdampingan */}
      <Section judul="Sejarah" miring="& identitas" label="Sejak 1989" className="pt-4!">
        <div id="sejarah" className="grid scroll-mt-28 items-start gap-5 lg:grid-cols-2">
          <div className="kartu p-6 sm:p-8">
            <p className="font-serif text-6xl italic leading-none text-[#ebe5fa]" aria-hidden>
              {sekolah.tahunBerdiri}
            </p>
            <div className="-mt-4 space-y-4 text-[16px] leading-relaxed text-[#4f5763]">
              {p.sejarah.length > 0 ? p.sejarah.map((t, i) => <p key={i}>{t}</p>) : <p>Sejarah singkat sekolah segera diperbarui.</p>}
            </div>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            {identitas.map(([k, v]) => (
              <div key={k} className={`kartu kartu-hidup px-5 py-4 ${k === "Alamat" ? "sm:col-span-2" : ""}`}>
                <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#646c7a]">{k}</dt>
                <dd className={`mt-1 ${v ? "text-[#20252c]" : "text-[#9aa1ab]"}`}>{v || "Segera diperbarui"}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      {mitra.length > 0 && (
        <Section judul="Mitra" miring="sekolah" className="pt-0!">
          <div className="pita-info kartu py-4 ring-1 ring-[#e6e3f0]">
            <div className="pita-jalan">
              {[0, 1].map((salinan) => (
                <ul key={salinan} aria-hidden={salinan === 1 || undefined} className="flex shrink-0 gap-3 pr-3">
                  {mitra.map((m) => (
                    <li key={m.mitra} className="shrink-0 rounded-full bg-[#f3f0fc] px-5 py-2.5">
                      <span className="font-medium">{m.mitra}</span>{" "}
                      <span className="text-sm text-[#626a76]">· {JENIS_MITRA[m.jenis as keyof typeof JENIS_MITRA] ?? m.jenis}</span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </Section>
      )}
    </>
  );
}
