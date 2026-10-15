import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Section } from "@/components/ui";
import { JENIS_KONTRIBUSI } from "@/lib/alumni";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabasePublik } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Alumni", description: "Jejaring alumni SMAN 22 Bandung: cerita, acara, dan kontribusi." };
export const revalidate = 300;
type C = { id: string; judul: string; isi: string; foto_url: string; nama: string; tahun_lulus: number; institusi: string };
type R = { cukup: boolean; alumni: number; responden?: number; persen_kuliah?: number; persen_bekerja?: number };

export default async function Alumni() {
  const sb = supabaseAktif ? supabasePublik() : null;
  const [r, c, a, k] = sb ? await Promise.all([sb.rpc("ringkasan_alumni_publik"), sb.rpc("cerita_alumni_publik", { p_batas: 6 }), sb.rpc("acara_alumni_publik"), sb.rpc("kontribusi_publik")])
    : [{ data: null }, { data: [] }, { data: [] }, { data: [] }];
  const ring = (r.data ?? { cukup: false, alumni: 0 }) as R;
  const cerita = (c.data ?? []) as C[];
  const acara = (a.data ?? []) as { id: string; judul: string; deskripsi: string; mulai: string; tempat: string }[];
  const kontribusi = (k.data ?? []) as { nama: string; jenis: string; deskripsi: string; tanggal: string }[];
  return (
    <>
      <PageHeader judul="Alumni" deskripsi="Tetap terhubung dengan sekolah dan adik-adik kelas: berbagi cerita, peluang, dan pengalaman." />
      <Section>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl bg-[var(--tema-utama)] p-8 text-white">
            <p className="font-serif text-3xl">Gabung jejaring alumni</p>
            <p className="mt-2 text-white/80">Daftar sekali, data diverifikasi sekolah. Anda mengatur sendiri apa yang terlihat oleh alumni lain.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/alumni/daftar" className="rounded-lg bg-white px-5 py-2.5 font-semibold text-brand-900">Daftar alumni</Link>
              <Link href="/admin/login" className="rounded-lg px-5 py-2.5 font-semibold ring-1 ring-white/40">Masuk area alumni</Link>
            </div>
          </div>
          <div className="kartu p-6 ">
            <p className="text-sm uppercase tracking-widest text-black/50">Tracer study</p>
            <p className="mt-1 font-serif text-4xl">{ring.alumni.toLocaleString("id-ID")}</p><p className="text-sm text-black/60">alumni terdaftar</p>
            {ring.cukup ? (
              <p className="mt-3 text-sm">Dari {ring.responden} responden: <strong>{ring.persen_kuliah}%</strong> melanjutkan kuliah, <strong>{ring.persen_bekerja}%</strong> bekerja/berwirausaha.</p>
            ) : <p className="mt-3 text-sm text-black/50">Statistik tampil setelah cukup banyak alumni mengisi.</p>}
          </div>
        </div>
      </Section>
      {cerita.length > 0 && (
        <Section judul="Cerita alumni" className="!pt-0">
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{cerita.map((x) => (
            <li key={x.id} className="overflow-hidden kartu">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {x.foto_url && <img src={x.foto_url} alt="" className="aspect-[16/9] w-full object-cover" referrerPolicy="no-referrer" loading="lazy" />}
              <div className="p-5"><h3 className="font-serif text-2xl">{x.judul}</h3>
                <p className="mt-2 line-clamp-5 whitespace-pre-line text-sm text-black/70">{x.isi}</p>
                <p className="mt-3 text-sm font-semibold">{x.nama} <span className="font-normal text-black/50">· angkatan {x.tahun_lulus}{x.institusi && ` · ${x.institusi}`}</span></p></div>
            </li>))}</ul>
        </Section>
      )}
      {(acara.length > 0 || kontribusi.length > 0) && (
        <Section className="!pt-0">
          <div className="grid gap-8 lg:grid-cols-2">
            {acara.length > 0 && <div><h2 className="mb-3 font-serif text-3xl">Acara alumni</h2>
              <ul className="space-y-2">{acara.map((x) => <li key={x.id} className="rounded-xl bg-white p-4 ring-1 ring-black/5"><strong>{x.judul}</strong><p className="text-sm text-black/60">{new Date(x.mulai).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" })}{x.tempat && ` · ${x.tempat}`}</p></li>)}</ul></div>}
            {kontribusi.length > 0 && <div><h2 className="mb-3 font-serif text-3xl">Terima kasih, alumni</h2>
              <ul className="space-y-2">{kontribusi.map((x, i) => <li key={i} className="rounded-xl bg-white p-4 text-sm ring-1 ring-black/5"><strong>{x.nama}</strong> · {JENIS_KONTRIBUSI[x.jenis]}<p className="text-black/60">{x.deskripsi}</p></li>)}</ul></div>}
          </div>
        </Section>
      )}
    </>
  );
}
