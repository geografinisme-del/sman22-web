import type { Metadata } from "next";
import { MediaSlot } from "@/components/MediaSlot";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Section } from "@/components/ui";
import { BIDANG_ORG, JENIS_KEGIATAN, JENIS_ORG } from "@/lib/ekskul";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabasePublik } from "@/lib/supabase/public";

export const revalidate = 300;
type D = { id: string; jenis: string; nama: string; singkatan: string; bidang: string; deskripsi: string; logo_url: string; warna: string; jadwal_rutin: string; tempat: string; syarat: string;
  galeri: string[]; tingkat_boleh: string[]; daftar_mulai: string | null; daftar_selesai: string | null; pembina: string[]; jumlah_anggota: number;
  prestasi: { nama: string; tingkat: string; peringkat: string; tanggal: string }[]; agenda: { judul: string; jenis: string; mulai: string; tempat: string }[] };
const PERINGKAT: Record<string, string> = { juara1: "Juara 1", juara2: "Juara 2", juara3: "Juara 3", harapan: "Harapan", finalis: "Finalis", peserta: "Peserta" };

async function ambil(slug: string) {
  if (!supabaseAktif || !/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  const { data } = await supabasePublik().rpc("organisasi_publik_detail", { p_slug: slug });
  return (data as D | null) ?? null;
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = await ambil((await params).slug);
  return { title: d?.nama ?? "Ekskul", description: d?.deskripsi.slice(0, 150) };
}

export default async function ProfilEkskul({ params }: { params: Promise<{ slug: string }> }) {
  const d = await ambil((await params).slug);
  if (!d) notFound();
  const hari = new Date().toISOString().slice(0, 10);
  const buka = d.daftar_mulai && hari >= d.daftar_mulai && hari <= (d.daftar_selesai ?? d.daftar_mulai);
  return (
    <>
      <header className="text-white" style={{ background: d.warna }}>
        <div className="mx-auto flex max-w-7xl items-center gap-5 px-5 py-14 sm:px-8">
          {d.logo_url ? (
            <MediaSlot src={d.logo_url} alt={`Logo ${d.nama}`} ratio="1/1" fit="contain" sizes="96px" className="h-24 w-24 shrink-0 rounded-full bg-white p-2" />
          ) : <span className="grid h-24 w-24 place-items-center rounded-full bg-white/20 text-4xl">{(d.singkatan || d.nama).slice(0, 2)}</span>}
          <div><p className="text-xs opacity-80">{JENIS_ORG[d.jenis]} · {BIDANG_ORG[d.bidang]}</p><h1 className="text-4xl sm:text-5xl">{d.nama}</h1></div>
        </div>
      </header>
      <Section>
        <Link href="/ekskul" className="mb-6 inline-block text-sm underline">← Semua organisasi</Link>
        <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
          <div className="space-y-8">
            <p className="whitespace-pre-line text-lg leading-relaxed text-[var(--muted)]">{d.deskripsi || "Profil segera diperbarui."}</p>
            {d.agenda.length > 0 && (
              <div><h2 className="mb-3 text-2xl">Agenda</h2>
                <ul className="space-y-2">{d.agenda.map((a, i) => <li key={i} className="rounded-xl bg-white p-4 text-sm ring-1 ring-black/5"><strong>{a.judul}</strong> <span className="text-[var(--muted)]">· {JENIS_KEGIATAN[a.jenis]} · {new Date(a.mulai).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" })}{a.tempat && ` · ${a.tempat}`}</span></li>)}</ul></div>
            )}
            {d.prestasi.length > 0 && (
              <div><h2 className="mb-3 text-2xl">Prestasi</h2>
                <ul className="space-y-1">{d.prestasi.map((p, i) => <li key={i} className="text-sm"><span className="font-semibold" style={{ color: d.warna }}>{PERINGKAT[p.peringkat] ?? p.peringkat}</span> {p.nama} <span className="text-[var(--muted)]">· tingkat {p.tingkat} · {new Date(p.tanggal + "T00:00:00Z").getUTCFullYear()}</span></li>)}</ul></div>
            )}
            {d.galeri.length > 0 && (
              <div><h2 className="mb-3 text-2xl">Galeri</h2>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{d.galeri.map((g, i) => (
                  <li key={i}><MediaSlot src={g} alt={`Kegiatan ${d.nama} ${i + 1}`} ratio="4/3" sizes="(min-width: 640px) 33vw, 50vw" className="rounded-xl" /></li>))}</ul></div>
            )}
          </div>
          <aside className="space-y-3 self-start kartu p-6 text-sm">
            <p><span className="text-[var(--muted)]">Jadwal:</span> {d.jadwal_rutin || "—"}</p>
            <p><span className="text-[var(--muted)]">Tempat:</span> {d.tempat || "—"}</p>
            <p><span className="text-[var(--muted)]">Pembina:</span> {d.pembina.join(", ") || "—"}</p>
            <p><span className="text-[var(--muted)]">Anggota:</span> {d.jumlah_anggota}</p>
            <p><span className="text-[var(--muted)]">Untuk kelas:</span> {d.tingkat_boleh.join(", ")}</p>
            {d.syarat && <p className="whitespace-pre-line"><span className="text-[var(--muted)]">Syarat:</span> {d.syarat}</p>}
            {buka ? <Link href="/masuk" className="mt-2 block rounded-lg px-5 py-3 text-center font-semibold text-white" style={{ background: d.warna }}>Daftar lewat portal siswa</Link>
              : <p className="text-[var(--muted)]">Pendaftaran sedang ditutup.</p>}
          </aside>
        </div>
      </Section>
    </>
  );
}
