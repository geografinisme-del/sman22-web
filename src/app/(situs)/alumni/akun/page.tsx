import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { keluar } from "@/app/admin/actions";
import { rsvpAcara } from "@/app/admin/actions-alumni";
import { FormCerita, FormKontribusi, FormMentor, FormPeluang, FormProfilAlumni, type DataProfil } from "@/components/alumni/Form";
import { Section } from "@/components/ui";
import { getAkses } from "@/lib/admin/auth";
import { JENIS_PELUANG, STATUS_KEGIATAN, STATUS_MODERASI } from "@/lib/alumni";
import { Lencana } from "@/lib/lms";

export const metadata: Metadata = { title: "Area Alumni", robots: { index: false } };
export const dynamic = "force-dynamic";
const TAB = [["profil", "Profil & privasi"], ["direktori", "Direktori"], ["acara", "Acara"], ["peluang", "Peluang"], ["survei", "Tracer study"], ["berbagi", "Berbagi"]] as const;
type D = { id: string; nama: string; tahun_lulus: number; jurusan: string | null; kota: string | null; status_kegiatan: string | null; institusi: string | null; bidang: string | null; jabatan: string | null; tautan_profesional: string | null; bio: string | null; email: string | null; telepon: string | null };

export default async function AreaAlumni({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; tahun?: string; pesan?: string; galat?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await getAkses();
  if (!supabase || !user) redirect("/portal-digital/masuk/gtk?lanjut=%2Falumni%2Fakun");
  const { data: p } = await supabase.from("profil_alumni").select("*").eq("user_id", user.id).is("deleted_at", null).maybeSingle();
  if (!p || !p.terverifikasi) {
    return <Section><div className="max-w-xl kartu p-6"><h1 className="text-3xl">Area Alumni</h1><p className="mt-2 text-[var(--muted)]">Akun ini belum terhubung dengan profil alumni terverifikasi. Bila Anda alumni, <Link href="/alumni/daftar" className="underline">daftar di sini</Link>.</p></div></Section>;
  }
  const tab = TAB.some(([k]) => k === sp.tab) ? sp.tab! : "profil";
  return (
    <Section>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex-1"><p className="text-sm text-[var(--muted)]">Area Alumni · angkatan {p.tahun_lulus}</p><h1 className="text-4xl">{p.nama}</h1></div>
        <form data-keluar-akun="" action={keluar}><button className="rounded-lg px-4 py-2 text-sm font-semibold ring-1 ring-black/15">Keluar</button></form>
      </div>
      {sp.pesan && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Tersimpan.</p>}
      {sp.galat && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{sp.galat}</p>}
      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1 text-sm">{TAB.map(([k, l]) => (
        <Link key={k} href={`?tab=${k}`} className={`shrink-0 rounded-lg px-4 py-2 font-semibold ${tab === k ? "bg-[var(--tema-utama)] text-white" : "bg-white ring-1 ring-black/10"}`}>{l}</Link>))}</nav>
      {tab === "profil" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="kartu p-6"><FormProfilAlumni d={p as DataProfil} /></div>
          <aside className="space-y-2 self-start rounded-2xl bg-[var(--soft)] p-5 text-sm text-[var(--muted)]">
            <p className="font-semibold text-black">Data yang dikunci sekolah</p><p>Nama, tahun lulus, dan email login. Hubungi sekolah bila ada kekeliruan.</p>
            <p>Disetujui kebijakan privasi: {p.setuju_privasi_pada ? new Date(p.setuju_privasi_pada).toLocaleDateString("id-ID", { dateStyle: "long" }) : "—"} (versi {p.versi_privasi || "—"}).</p>
          </aside>
        </div>
      )}
      {tab === "direktori" && <Direktori />}
      {tab === "acara" && <Acara />}
      {tab === "peluang" && <Peluang />}
      {tab === "survei" && <Survei />}
      {tab === "berbagi" && <Berbagi />}
    </Section>
  );

  async function Direktori() {
    const { data } = await supabase!.rpc("direktori_alumni", { p_cari: (sp.q ?? "").slice(0, 60), p_tahun: Number(sp.tahun) || null });
    const list = (data ?? []) as D[];
    return (
      <div className="space-y-4">
        <form className="flex flex-wrap gap-2"><input type="hidden" name="tab" value="direktori" />
          <input name="q" defaultValue={sp.q} placeholder="Nama, kampus, bidang" aria-label="Cari" className="min-w-56 flex-1 rounded-lg border border-black/15 bg-white px-4 py-2.5" />
          <input name="tahun" defaultValue={sp.tahun} type="number" placeholder="Angkatan" aria-label="Angkatan" className="w-32 rounded-lg border border-black/15 bg-white px-4 py-2.5" />
          <button className="rounded-full bg-ink px-5 py-2.5 font-semibold text-white transition-colors hover:bg-ink/85">Cari</button></form>
        <p className="text-sm text-[var(--muted)]">Hanya alumni yang memilih tampil, dengan kolom yang mereka izinkan. Jangan menyebarkan data ini ke luar.</p>
        {list.length === 0 ? <p className="kartu p-5 text-[var(--muted)]">Tidak ada hasil.</p> : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{list.map((a) => (
            <li key={a.id} className="kartu p-4 text-sm">
              <p className="font-semibold">{a.nama} <span className="font-normal text-[var(--muted)]">· {a.tahun_lulus}{a.jurusan && ` · ${a.jurusan}`}</span></p>
              {a.status_kegiatan && <p>{STATUS_KEGIATAN[a.status_kegiatan]}{a.institusi && ` · ${a.institusi}`}{a.bidang && ` · ${a.bidang}`}</p>}
              {!a.status_kegiatan && a.institusi && <p>{a.institusi}{a.bidang && ` · ${a.bidang}`}</p>}
              {a.jabatan && <p className="text-[var(--muted)]">{a.jabatan}</p>}{a.kota && <p className="text-[var(--muted)]">{a.kota}</p>}
              {a.bio && <p className="mt-1 text-[var(--muted)]">{a.bio}</p>}
              <p className="mt-1 space-x-3">{a.tautan_profesional && <a href={a.tautan_profesional} target="_blank" rel="noreferrer" className="text-[var(--tema-utama)] underline">profil</a>}{a.email && <a href={`mailto:${a.email}`} className="text-[var(--tema-utama)] underline">{a.email}</a>}{a.telepon && <span>{a.telepon}</span>}</p>
            </li>))}</ul>
        )}
      </div>
    );
  }

  async function Acara() {
    const { data } = await supabase!.from("acara_alumni").select("id, judul, deskripsi, mulai, tempat, untuk_angkatan, kuota").gte("mulai", new Date(new Date().getTime() - 864e5).toISOString()).order("mulai");
    const { data: rs } = await supabase!.from("rsvp_acara_alumni").select("acara_id, hadir");
    const rsvp = new Map((rs ?? []).map((r) => [r.acara_id, r.hadir]));
    const list = (data ?? []).filter((a) => !(a.untuk_angkatan as number[]).length || (a.untuk_angkatan as number[]).includes(p!.tahun_lulus));
    return list.length === 0 ? <p className="kartu p-5 text-[var(--muted)]">Belum ada acara.</p> : (
      <ul className="space-y-3">{list.map((a) => (
        <li key={a.id} className="kartu p-5">
          <p className="text-2xl">{a.judul}</p>
          <p className="text-sm text-[var(--muted)]">{new Date(a.mulai).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Jakarta" })}{a.tempat && ` · ${a.tempat}`}</p>
          {a.deskripsi && <p className="mt-2 whitespace-pre-line text-sm">{a.deskripsi}</p>}
          <form action={rsvpAcara} className="mt-3 flex flex-wrap items-center gap-2 text-sm"><input type="hidden" name="acara_id" value={a.id} />
            {rsvp.has(a.id) && <span className="font-semibold">{rsvp.get(a.id) ? "✓ Anda akan hadir" : "Anda tidak hadir"}</span>}
            <button name="hadir" value="1" className="rounded-full bg-ink px-4 py-2 font-semibold text-white transition-colors hover:bg-ink/85">Saya hadir</button>
            <button name="hadir" value="0" className="rounded-lg px-4 py-2 font-semibold ring-1 ring-black/15">Tidak hadir</button></form>
        </li>))}</ul>
    );
  }

  async function Peluang() {
    const { data } = await supabase!.from("peluang").select("id, judul, jenis, penyedia, deskripsi, tautan, tenggat, status").order("created_at", { ascending: false }).limit(100);
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <ul className="space-y-3">{(data ?? []).length === 0 ? <li className="kartu p-5 text-[var(--muted)]">Belum ada peluang.</li> : (data ?? []).map((x) => (
          <li key={x.id} className="kartu p-5">
            <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-[var(--muted)]">{JENIS_PELUANG[x.jenis]}</span>{x.status !== "tayang" && <Lencana s={x.status} peta={STATUS_MODERASI} />}</div>
            <p className="font-semibold">{x.judul}</p><p className="text-sm text-[var(--muted)]">{x.penyedia}{x.tenggat && ` · tenggat ${new Date(x.tenggat + "T00:00:00Z").toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "UTC" })}`}</p>
            {x.deskripsi && <p className="mt-1 text-sm">{x.deskripsi}</p>}
            {x.tautan && <a href={x.tautan} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-semibold text-[var(--tema-utama)] underline">Info lengkap ↗</a>}
          </li>))}</ul>
        <div className="self-start kartu p-5"><h2 className="mb-3 text-2xl">Bagikan peluang</h2><FormPeluang /></div>
      </div>
    );
  }

  async function Survei() {
    const { data } = await supabase!.rpc("survei_aktif");
    const list = ((data ?? []) as { id: string; judul: string; deskripsi: string; sudah: boolean; sasaran: string }[]).filter((x) => x.sasaran === "alumni" || x.sasaran === "publik");
    return list.length === 0 ? <p className="kartu p-5 text-[var(--muted)]">Belum ada tracer study untuk angkatan Anda.</p> : (
      <ul className="space-y-3">{list.map((x) => (
        <li key={x.id} className="kartu p-5"><p className="font-semibold">{x.judul}</p>{x.deskripsi && <p className="text-sm text-[var(--muted)]">{x.deskripsi}</p>}
          {x.sudah ? <p className="mt-2 text-sm font-semibold text-emerald-700">✓ Sudah diisi</p> : <Link href={`/survei/${x.id}`} className="mt-2 inline-block rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/85">Isi sekarang</Link>}</li>))}</ul>
    );
  }

  async function Berbagi() {
    const [{ data: m }, { data: ms }, { data: ce }, { data: ko }] = await Promise.all([
      supabase!.from("mentor_alumni").select("id, bidang, status, kuota").maybeSingle(),
      supabase!.rpc("mentoring_saya"),
      supabase!.from("cerita_alumni").select("id, judul, status, catatan").order("created_at", { ascending: false }),
      supabase!.from("kontribusi_alumni").select("id, jenis, deskripsi, status").order("created_at", { ascending: false }),
    ]);
    const siswa = (ms ?? []) as { id: string; siswa: string; kelas: string; topik: string; status: string; catatan_sekolah: string }[];
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 kartu p-5">
          <h2 className="text-2xl">Mentoring siswa</h2>
          {m ? <p className="text-sm">Bidang: <strong>{m.bidang}</strong> · <Lencana s={m.status} peta={STATUS_MODERASI} /></p> : <FormMentor />}
          {siswa.length > 0 && <ul className="divide-y divide-black/5 text-sm">{siswa.map((x) => <li key={x.id} className="py-2"><strong>{x.siswa}</strong> <span className="text-[var(--muted)]">{x.kelas}</span><p>{x.topik}</p>{x.catatan_sekolah && <p className="text-[var(--muted)]">Sekolah: {x.catatan_sekolah}</p>}</li>)}</ul>}
        </div>
        <div className="space-y-3 kartu p-5">
          <h2 className="text-2xl">Cerita untuk adik kelas</h2>
          {(ce ?? []).map((c) => <p key={c.id} className="text-sm">{c.judul} · <Lencana s={c.status} peta={STATUS_MODERASI} />{c.catatan && <span className="text-[var(--muted)]"> — {c.catatan}</span>}</p>)}
          <details><summary className="cursor-pointer text-sm font-semibold">+ Tulis cerita</summary><div className="mt-3"><FormCerita /></div></details>
        </div>
        <div className="space-y-3 kartu p-5 lg:col-span-2">
          <h2 className="text-2xl">Kontribusi</h2>
          {(ko ?? []).map((k) => <p key={k.id} className="text-sm">{k.deskripsi} · <Lencana s={k.status} peta={STATUS_MODERASI} /></p>)}
          <details><summary className="cursor-pointer text-sm font-semibold">+ Tawarkan kontribusi</summary><div className="mt-3 max-w-xl"><FormKontribusi /></div></details>
        </div>
      </div>
    );
  }
}
