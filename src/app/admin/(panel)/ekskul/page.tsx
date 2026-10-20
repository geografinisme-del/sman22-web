import Link from "next/link";
import { redirect } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormOrganisasi, FormPengaturanEkskul } from "@/components/ekskul/Form";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { JENIS_ORG } from "@/lib/ekskul";

export const metadata = { title: "Ekskul & OSIS" };
type S = { id: string; nama: string; jenis: string; warna: string; anggota: number; menunggu: number; daftar_tunggu: number; kegiatan: number; kehadiran: number | null; pengajuan_aktif: number };

export default async function Ekskul({ searchParams }: { searchParams: Promise<{ pesan?: string; baru?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const kelola = punya(akses, "ekskul.kelola");
  const [{ data }, { data: cfg }] = await Promise.all([supabase.rpc("statistik_ekskul"), supabase.from("pengaturan_ekskul").select("maks_pilihan").eq("id", 1).maybeSingle()]);
  const list = (data ?? []) as S[];
  if (!kelola && !punya(akses, "ekskul.lihat") && list.length === 0) redirect("/admin?pesan=tanpa-akses");
  return (
    <>
      <JudulHalaman judul="Ekskul, OSIS & Kegiatan" deskripsi={kelola ? "Semua organisasi siswa memakai mesin yang sama: pendaftaran, anggota, kegiatan & presensi, program kerja, pengajuan kegiatan, sertifikat." : "Organisasi yang Anda bina."}
        aksi={<div className="flex gap-2"><Link href="/admin/ekskul/pengajuan" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15">Pengajuan kegiatan</Link>{kelola && <Link href="?baru=1" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">+ Organisasi</Link>}</div>} />
      <Notifikasi kode={sp.pesan} />
      {kelola && sp.baru && <Kartu className="mb-6 max-w-3xl"><h2 className="mb-4 text-2xl">Organisasi baru</h2><FormOrganisasi kelola /></Kartu>}
      {list.length === 0 ? <Kartu><p className="text-black/50">Belum ada organisasi.</p></Kartu> : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/ekskul/${o.id}`} className="block overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 hover:ring-black/20">
                <div className="h-2" style={{ background: o.warna }} />
                <div className="p-5">
                  <p className="text-xs uppercase tracking-widest text-black/50">{JENIS_ORG[o.jenis]}</p>
                  <p className="text-2xl">{o.nama}</p>
                  <p className="mt-2 text-sm text-black/70">{o.anggota} anggota · {o.kegiatan} kegiatan · kehadiran {o.kehadiran == null ? "—" : `${o.kehadiran}%`}</p>
                  <p className="mt-1 flex flex-wrap gap-2 text-xs">
                    {o.menunggu > 0 && <span className="rounded bg-amber-100 px-1.5 font-semibold text-amber-900">{o.menunggu} pendaftar menunggu</span>}
                    {o.daftar_tunggu > 0 && <span className="rounded bg-sky-100 px-1.5 text-sky-900">{o.daftar_tunggu} daftar tunggu</span>}
                    {o.pengajuan_aktif > 0 && <span className="rounded bg-violet-100 px-1.5 text-violet-900">{o.pengajuan_aktif} pengajuan</span>}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {kelola && cfg && <Kartu className="mt-6 max-w-2xl"><h2 className="mb-3 text-xl">Aturan pendaftaran</h2><FormPengaturanEkskul maks={cfg.maks_pilihan} /><p className="mt-2 text-xs text-black/50">Berlaku untuk jenis Ekstrakurikuler; OSIS/MPK/komunitas tidak dihitung.</p></Kartu>}
    </>
  );
}
