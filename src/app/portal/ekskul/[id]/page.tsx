import Link from "next/link";
import { notFound } from "next/navigation";
import { FormKegiatanOrg, FormLpj, FormPengajuan, FormPresensiOrg, FormProker } from "@/components/ekskul/Form";
import { hapusKegiatanOrg, prosesPengajuan } from "@/app/admin/actions-ekskul";
import { HAK_JABATAN, JABATAN, JENIS_KEGIATAN, STATUS_PENGAJUAN, STATUS_PROKER, type ItemAnggaran } from "@/lib/ekskul";
import { Lencana, rupiah, waktuWIB } from "@/lib/lms";
import { tgl } from "@/lib/perpus";
import { konteksPortal } from "../../data";

export const metadata = { title: "Organisasi" };

export default async function OrgPortal({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesan?: string; galat?: string; presensi?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await konteksPortal();
  const [{ data: o }, { data: jab }, { data: hk }, { data: hp }, { data: hpr }, { data: hpj }] = await Promise.all([
    supabase.from("organisasi").select("id, nama, warna, jadwal_rutin, tempat").eq("id", id).maybeSingle(),
    supabase.rpc("jabatan_org", { p_org: id }),
    supabase.rpc("hak_org", { p_org: id, p_aksi: "kegiatan" }),
    supabase.rpc("hak_org", { p_org: id, p_aksi: "presensi" }),
    supabase.rpc("hak_org", { p_org: id, p_aksi: "proker" }),
    supabase.rpc("hak_org", { p_org: id, p_aksi: "pengajuan" }),
  ]);
  if (!o) notFound();
  const kembali = `/portal/ekskul/${id}`;
  const [{ data: ang }, { data: kg }, { data: pk }, { data: pj }] = await Promise.all([
    supabase.rpc("anggota_org", { p_org: id }),
    supabase.from("kegiatan_org").select("id, judul, jenis, mulai, selesai, tempat, deskripsi").eq("organisasi_id", id).order("mulai", { ascending: false }).limit(30),
    supabase.from("program_kerja").select("id, judul, tujuan, target_waktu, indikator, anggaran, status, evaluasi").eq("organisasi_id", id).order("created_at"),
    hpj ? supabase.from("pengajuan_kegiatan").select("*").eq("organisasi_id", id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);
  const anggota = ((ang ?? []) as { siswa_id: string; nama: string; kelas: string; jabatan: string; status: string }[]).filter((a) => a.status === "aktif");
  const pres = hp && sp.presensi ? (kg ?? []).find((k) => k.id === sp.presensi) : undefined;
  const { data: pr } = pres ? await supabase.from("presensi_org").select("siswa_id, status").eq("kegiatan_id", pres.id) : { data: [] };
  const pengajuan = (pj ?? []) as { id: string; judul: string; tujuan: string; mulai: string; selesai: string; tempat: string; sasaran_peserta: number; risiko: string; mitigasi: string; kebutuhan_sarpras: string; anggaran: ItemAnggaran[]; sumber_dana: string; status: string; catatan_reviu: string; total_anggaran: number; lpj_ringkasan: string; lpj_realisasi: number | null; lpj_peserta: number | null; lpj_tautan: string }[];
  return (
    <div className="space-y-6">
      <div className="h-2 rounded-full" style={{ background: o.warna }} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1"><h1 className="text-3xl">{o.nama}</h1>
          <p className="text-sm text-[var(--muted)]">{jab ? `Jabatan Anda: ${JABATAN[jab as string]} — hak: ${HAK_JABATAN[jab as string]}` : "Anggota"}{o.jadwal_rutin && ` · ${o.jadwal_rutin}`}</p></div>
        <Link href="/portal/ekskul" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15">← Ekskul</Link>
      </div>
      {sp.pesan && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Tersimpan.</p>}
      {sp.galat && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{sp.galat}</p>}

      {pres && (
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h2 className="text-2xl">Presensi: {pres.judul}</h2>
          <p className="mb-3 text-sm text-[var(--muted)]">{waktuWIB(pres.mulai, true)}</p>
          <FormPresensiOrg org={id} kegiatan={pres.id} anggota={anggota} awal={Object.fromEntries((pr ?? []).map((x) => [x.siswa_id, x.status]))} />
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-2xl">Kegiatan</h2>
        {(kg ?? []).length === 0 ? <p className="rounded-2xl bg-white p-4 text-sm text-[var(--muted)] ring-1 ring-black/5">Belum ada kegiatan.</p> : (
          <ul className="divide-y divide-black/5 rounded-2xl bg-white px-4 text-sm ring-1 ring-black/5">{(kg ?? []).map((k) => (
            <li key={k.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="flex-1"><strong>{k.judul}</strong> <span className="text-[var(--muted)]">· {JENIS_KEGIATAN[k.jenis]} · {waktuWIB(k.mulai, true)}{k.tempat && ` · ${k.tempat}`}</span></span>
              {hp && <Link href={`?presensi=${k.id}`} className="text-xs font-semibold text-blue-teks underline">Presensi</Link>}
              {hk && <form action={hapusKegiatanOrg}><input type="hidden" name="id" value={k.id} /><input type="hidden" name="organisasi_id" value={id} /><input type="hidden" name="kembali" value={kembali} /><button className="text-xs font-semibold text-blue-teks underline">Hapus</button></form>}
            </li>))}</ul>
        )}
        {hk && <details className="rounded-2xl bg-white p-4 ring-1 ring-black/5"><summary className="cursor-pointer font-semibold">+ Kegiatan baru</summary><div className="mt-3"><FormKegiatanOrg org={id} /></div></details>}
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl">Program kerja</h2>
        {(pk ?? []).length === 0 ? <p className="rounded-2xl bg-white p-4 text-sm text-[var(--muted)] ring-1 ring-black/5">Belum ada.</p> : (pk ?? []).map((p) => (
          <div key={p.id} className="rounded-2xl bg-white p-4 text-sm ring-1 ring-black/5">
            <p><strong>{p.judul}</strong> <span className="text-[var(--muted)]">· {STATUS_PROKER[p.status]}{p.target_waktu && ` · ${p.target_waktu}`}</span></p>
            {p.tujuan && <p className="text-[var(--muted)]">{p.tujuan}</p>}
            {hpr && <details className="mt-1"><summary className="cursor-pointer text-xs font-semibold text-blue-teks">Perbarui</summary><div className="mt-2"><FormProker org={id} d={{ ...p, anggaran: Number(p.anggaran) }} /></div></details>}
          </div>
        ))}
        {hpr && <details className="rounded-2xl bg-white p-4 ring-1 ring-black/5"><summary className="cursor-pointer font-semibold">+ Program baru</summary><div className="mt-3"><FormProker org={id} /></div></details>}
      </section>

      {hpj && (
        <section id="pengajuan" className="space-y-3">
          <h2 className="text-2xl">Pengajuan kegiatan</h2>
          {pengajuan.map((a) => (
            <details key={a.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5" open={["draf", "revisi"].includes(a.status)}>
              <summary className="flex cursor-pointer flex-wrap items-center gap-2"><span className="flex-1 font-semibold">{a.judul}</span><span className="text-sm text-[var(--muted)]">{tgl(a.mulai)} · {rupiah(Number(a.total_anggaran))}</span><Lencana s={a.status} peta={STATUS_PENGAJUAN} /></summary>
              <div className="mt-3 space-y-3 border-t border-black/5 pt-3">
                {a.catatan_reviu && <p className="rounded-xl bg-amber-50 p-3 text-sm">Catatan peninjau: {a.catatan_reviu}</p>}
                {["draf", "revisi"].includes(a.status) && <>
                  <FormPengajuan org={id} d={a} kembali={kembali} />
                  <form action={prosesPengajuan}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="kembali" value={kembali} />
                    <button name="aksi" value="ajukan" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">Ajukan ke pembina</button></form>
                </>}
                {a.status === "disetujui" && <><p className="text-sm font-semibold">Setelah kegiatan, isi LPJ:</p><FormLpj id={a.id} d={a} /></>}
                {!["draf", "revisi", "disetujui"].includes(a.status) && <p className="text-sm text-[var(--muted)]">{STATUS_PENGAJUAN[a.status]?.label}.</p>}
              </div>
            </details>
          ))}
          <details className="rounded-2xl bg-white p-4 ring-1 ring-black/5"><summary className="cursor-pointer font-semibold">+ Pengajuan baru</summary><div className="mt-3"><FormPengajuan org={id} kembali={kembali} /></div></details>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-2xl">Anggota ({anggota.length})</h2>
        <ul className="grid gap-1 rounded-2xl bg-white p-4 text-sm ring-1 ring-black/5 sm:grid-cols-2">{anggota.map((a) => <li key={a.siswa_id}>{a.nama} <span className="text-[var(--muted)]">{a.kelas}{a.jabatan !== "anggota" && ` · ${JABATAN[a.jabatan]}`}</span></li>)}</ul>
      </section>
    </div>
  );
}
