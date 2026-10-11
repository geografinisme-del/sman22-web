import type { Metadata } from "next";
import Link from "next/link";
import { Kosong, PageHeader, Section } from "@/components/ui";
import { BIDANG_ORG, JENIS_ORG } from "@/lib/ekskul";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabasePublik } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Ekstrakurikuler & OSIS", description: "Ekstrakurikuler, OSIS, dan organisasi siswa SMAN 22 Bandung." };
export const revalidate = 300;
type O = { id: string; jenis: string; nama: string; slug: string; singkatan: string; bidang: string; deskripsi: string; logo_url: string; warna: string; jadwal_rutin: string; jumlah_anggota: number; pendaftaran_buka: boolean };

export default async function DaftarEkskul() {
  const { data } = supabaseAktif ? await supabasePublik().rpc("organisasi_publik") : { data: [] };
  const list = (data ?? []) as O[];
  return (
    <>
      <PageHeader judul="Ekstrakurikuler & OSIS" deskripsi="Wadah siswa mengembangkan minat, bakat, dan kepemimpinan." />
      <Section>
        {list.length === 0 ? <Kosong teks="Daftar organisasi segera tersedia." /> : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((o) => (
              <li key={o.id}>
                <Link href={`/ekskul/${o.slug}`} className="group block h-full overflow-hidden kartu transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-center gap-3 p-5 text-white" style={{ background: o.warna }}>
                    {o.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.logo_url} alt="" className="h-12 w-12 rounded-full bg-white object-contain p-1" referrerPolicy="no-referrer" loading="lazy" />
                    ) : <span className="grid h-12 w-12 place-items-center rounded-full bg-white/20 font-serif text-xl">{(o.singkatan || o.nama).slice(0, 2)}</span>}
                    <div><p className="text-xs uppercase tracking-widest opacity-80">{JENIS_ORG[o.jenis]} · {BIDANG_ORG[o.bidang]}</p><h2 className="font-serif text-2xl leading-tight">{o.nama}</h2></div>
                  </div>
                  <div className="p-5">
                    <p className="line-clamp-3 text-sm text-black/70">{o.deskripsi || "—"}</p>
                    <p className="mt-3 text-xs text-black/50">{o.jadwal_rutin}{o.jadwal_rutin && " · "}{o.jumlah_anggota} anggota</p>
                    {o.pendaftaran_buka && <p className="mt-2 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">Pendaftaran dibuka — daftar lewat portal siswa</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
