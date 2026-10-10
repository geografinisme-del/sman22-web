import Link from "next/link";
import { Fragment } from "react";
import { notFound, redirect } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormKegiatanOrg, FormOrganisasi, FormPengajuan, FormPresensiOrg, FormProker, FormSertifikat, type DataOrg } from "@/components/ekskul/Form";
import { aturPembina, cabutSertifikat, hapusKegiatanOrg, putuskanPendaftaran, tautkanPrestasi, ubahAnggota } from "@/app/admin/actions-ekskul";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { hariIniWIB } from "@/lib/admin/absensi";
import { daftarStaf } from "@/lib/admin/nama";
import { uuid } from "@/lib/admin/schema";
import { JABATAN, JENIS_KEGIATAN, JENIS_ORG, JENIS_SERTIF, STATUS_DAFTAR, STATUS_PENGAJUAN, STATUS_PROKER, type IsianTambahan } from "@/lib/ekskul";
import { Lencana, keLokalWIB, rupiah, waktuWIB } from "@/lib/lms";
import { tgl } from "@/lib/perpus";

export const metadata = { title: "Organisasi" };
const TAB = [["anggota", "Anggota"], ["pendaftaran", "Pendaftaran"], ["kegiatan", "Kegiatan & presensi"], ["proker", "Program kerja"], ["pengajuan", "Pengajuan kegiatan"], ["sertifikat", "Sertifikat & prestasi"], ["profil", "Profil & pembina"]] as const;
type A = { id: string; siswa_id: string; nama: string; kelas: string; jabatan: string; bidang: string; status: string; bergabung: string };

export default async function Organisasi({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; pesan?: string; galat?: string; presensi?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, akses } = await wajibLogin();
  const [{ data: o }, { data: bolehKelola }] = await Promise.all([
    supabase.from("organisasi").select("*").eq("id", id).maybeSingle(),
    supabase.rpc("kelola_org", { p_org: id }),
  ]);
  if (!o) notFound();
  const kelola = Boolean(bolehKelola);
  if (!kelola && !punya(akses, "ekskul.lihat")) redirect("/admin?pesan=tanpa-akses");
  const tab = TAB.some(([k]) => k === sp.tab) ? sp.tab! : "anggota";
  const hari = hariIniWIB();
  const { data: ang } = await supabase.rpc("anggota_org", { p_org: id });
  const anggota = (ang ?? []) as A[];
  const aktif = anggota.filter((a) => a.status === "aktif");
  return (
    <>
      <div className="-mx-1 mb-2 h-2 rounded-full" style={{ background: o.warna }} />
      <JudulHalaman judul={o.nama} deskripsi={`${JENIS_ORG[o.jenis]} · ${aktif.length} anggota aktif${o.kuota ? ` / kuota ${o.kuota}` : ""}${o.jadwal_rutin ? ` · ${o.jadwal_rutin}` : ""}`}
        aksi={<div className="flex gap-2"><Link href="/admin/ekskul" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15">← Semua</Link>{o.tampil_publik && <a href={`/ekskul/${o.slug}`} target="_blank" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15">Halaman publik ↗</a>}</div>} />
      <Notifikasi kode={sp.pesan} />
      {sp.galat && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{sp.galat}</p>}
      <nav className="mb-5 flex gap-2 overflow-x-auto pb-1 text-sm">
        {TAB.map(([k, l]) => <Link key={k} href={`?tab=${k}`} className={`shrink-0 rounded-full px-3 py-1.5 font-semibold ${tab === k ? "bg-brand-900 text-white" : "ring-1 ring-black/15"}`}>{l}</Link>)}
      </nav>
      {tab === "anggota" && <Anggota />}
      {tab === "pendaftaran" && <Pendaftaran />}
      {tab === "kegiatan" && <Kegiatan />}
      {tab === "proker" && <Proker />}
      {tab === "pengajuan" && <Pengajuan />}
      {tab === "sertifikat" && <Sertifikat />}
      {tab === "profil" && <Profil />}
    </>
  );

  async function Anggota() {
    const { data: rk } = await supabase.rpc("rekap_kehadiran_org", { p_org: id });
    const hadir = new Map(((rk ?? []) as { siswa_id: string; persen: number | null; kegiatan: number }[]).map((r) => [r.siswa_id, r]));
    return (
      <Kartu>
        {anggota.length === 0 ? <p className="text-sm text-black/50">Belum ada anggota. Terima pendaftar di tab Pendaftaran.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead><tr className="text-xs uppercase tracking-wider text-black/50"><th className="py-2">Nama</th><th>Kelas</th><th>Kehadiran</th><th>Jabatan</th><th /></tr></thead>
              <tbody>{anggota.map((a) => {
                const h = hadir.get(a.siswa_id);
                return (
                  <tr key={a.id} className={`border-t border-black/5 ${a.status === "keluar" ? "opacity-50" : ""}`}>
                    <td className="py-2 font-medium">{a.nama}{a.status === "keluar" && " (keluar)"}</td><td>{a.kelas}</td>
                    <td className="tabular-nums">{h?.persen == null ? "—" : `${h.persen}%`} <span className="text-xs text-black/40">{h?.kegiatan ? `(${h.kegiatan})` : ""}</span></td>
                    <td>{kelola && a.status === "aktif" ? (
                      <form action={ubahAnggota} className="flex flex-wrap gap-1">
                        <input type="hidden" name="id" value={a.id} /><input type="hidden" name="organisasi_id" value={id} />
                        <select name="jabatan" defaultValue={a.jabatan} aria-label={`Jabatan ${a.nama}`} className="rounded-lg border border-black/15 px-2 py-1 text-xs">{Object.entries(JABATAN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                        <input name="bidang" defaultValue={a.bidang} maxLength={60} placeholder="bidang/sie" aria-label="Bidang" className="w-28 rounded-lg border border-black/15 px-2 py-1 text-xs" />
                        <button className="rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-black/15">Simpan</button>
                      </form>) : <span>{JABATAN[a.jabatan]}{a.bidang && ` · ${a.bidang}`}</span>}</td>
                    <td className="text-right">{kelola && a.status === "aktif" && (
                      <form action={ubahAnggota}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="organisasi_id" value={id} /><input type="hidden" name="aksi" value="keluar" />
                        <button className="text-xs font-semibold text-merah underline">Keluarkan</button></form>)}</td>
                  </tr>);
              })}</tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-black/50">Hak pengurus siswa di portal: ketua/wakil — kegiatan, presensi, program kerja, pengajuan; sekretaris — kegiatan, presensi, pengajuan & LPJ; bendahara — anggaran & LPJ; koordinator — kegiatan.</p>
      </Kartu>
    );
  }

  async function Pendaftaran() {
    if (!kelola) return <Kartu><p className="text-sm text-black/50">Hanya pembina/kesiswaan.</p></Kartu>;
    const { data } = await supabase.rpc("pendaftar_org", { p_org: id });
    const list = (data ?? []) as { id: string; nama: string; kelas: string; pilihan: number; alasan: string; jawaban: Record<string, string>; status: string; catatan: string; dibuat: string }[];
    const isian = (o.field_tambahan ?? []) as IsianTambahan[];
    const buka = o.daftar_mulai && hari >= o.daftar_mulai && hari <= (o.daftar_selesai ?? o.daftar_mulai);
    return (
      <div className="space-y-3">
        <p className="text-sm text-black/60">Pendaftaran {buka ? <strong className="text-emerald-700">dibuka</strong> : "ditutup"}{o.daftar_mulai && ` (${tgl(o.daftar_mulai)} – ${tgl(o.daftar_selesai ?? o.daftar_mulai)})`}. Atur di tab Profil. {o.kuota ? `Kuota ${o.kuota}: bila penuh, pendaftar yang diterima masuk daftar tunggu dan naik otomatis saat ada anggota keluar.` : ""}</p>
        {list.length === 0 && <Kartu><p className="text-sm text-black/50">Belum ada pendaftar tahun ini.</p></Kartu>}
        {list.map((d) => (
          <Kartu key={d.id}>
            <div className="flex flex-wrap items-center gap-2"><p className="flex-1 font-semibold">{d.nama} <span className="font-normal text-black/50">· {d.kelas} · pilihan ke-{d.pilihan} · {waktuWIB(d.dibuat)}</span></p><Lencana s={d.status} peta={STATUS_DAFTAR} /></div>
            {d.alasan && <p className="mt-1 text-sm">“{d.alasan}”</p>}
            {isian.length > 0 && <dl className="mt-2 grid grid-cols-[180px_1fr] gap-y-0.5 text-sm">{isian.map((f) => <Fragment key={f.id}><dt className="text-black/50">{f.label}</dt><dd>{d.jawaban[f.id] ?? "—"}</dd></Fragment>)}</dl>}
            {["menunggu", "daftar_tunggu"].includes(d.status) && (
              <form action={putuskanPendaftaran} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={d.id} /><input type="hidden" name="organisasi_id" value={id} />
                <input name="catatan" maxLength={300} placeholder="Catatan untuk siswa (opsional)" aria-label="Catatan" className="min-w-56 flex-1 rounded-xl border border-black/15 px-3 py-2 text-sm" />
                <button name="aksi" value="terima" className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Terima</button>
                <button name="aksi" value="tolak" className="rounded-full px-4 py-2 text-sm font-semibold text-merah ring-1 ring-merah/30">Tolak</button>
              </form>
            )}
          </Kartu>
        ))}
      </div>
    );
  }

  async function Kegiatan() {
    const { data } = await supabase.from("kegiatan_org").select("id, judul, jenis, mulai, selesai, tempat, deskripsi, publik").eq("organisasi_id", id).order("mulai", { ascending: false }).limit(100);
    const list = (data ?? []) as { id: string; judul: string; jenis: string; mulai: string; selesai: string; tempat: string; deskripsi: string; publik: boolean }[];
    const pres = sp.presensi && list.find((k) => k.id === sp.presensi);
    const { data: pr } = pres ? await supabase.from("presensi_org").select("siswa_id, status").eq("kegiatan_id", pres.id) : { data: [] };
    const { data: jml } = await supabase.from("presensi_org").select("kegiatan_id, status").in("kegiatan_id", list.map((k) => k.id));
    const rekap = (k: string) => { const r = (jml ?? []).filter((x) => x.kegiatan_id === k); return r.length ? `${r.filter((x) => x.status === "hadir").length}/${r.length} hadir` : "belum presensi"; };
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-3">
          {pres && (
            <Kartu>
              <h2 className="mb-1 font-serif text-2xl">Presensi: {pres.judul}</h2>
              <p className="mb-3 text-sm text-black/60">{waktuWIB(pres.mulai, true)}</p>
              {aktif.length === 0 ? <p className="text-sm text-black/50">Belum ada anggota aktif.</p> :
                <FormPresensiOrg org={id} kegiatan={pres.id} anggota={aktif} awal={Object.fromEntries((pr ?? []).map((x) => [x.siswa_id, x.status]))} />}
            </Kartu>
          )}
          {list.length === 0 && <Kartu><p className="text-sm text-black/50">Belum ada kegiatan.</p></Kartu>}
          {list.map((k) => (
            <Kartu key={k.id}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1">
                  <p className="font-semibold">{k.judul} <span className="font-normal text-black/50">· {JENIS_KEGIATAN[k.jenis]}{k.publik && " · di website"}</span></p>
                  <p className="text-sm text-black/60">{waktuWIB(k.mulai, true)}{k.tempat && ` · ${k.tempat}`} · {rekap(k.id)}</p>
                </div>
                <Link href={`?tab=kegiatan&presensi=${k.id}`} className="rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-black/15">Presensi</Link>
                {kelola && <form action={hapusKegiatanOrg}><input type="hidden" name="id" value={k.id} /><input type="hidden" name="organisasi_id" value={id} /><button className="rounded-full px-3 py-1.5 text-sm font-semibold text-merah ring-1 ring-merah/30">Hapus</button></form>}
              </div>
              {kelola && <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-brand-700">Ubah</summary><div className="mt-2"><FormKegiatanOrg org={id} d={{ ...k, mulai: keLokalWIB(k.mulai), selesai: keLokalWIB(k.selesai) }} /></div></details>}
            </Kartu>
          ))}
        </div>
        {kelola && <Kartu className="self-start"><h2 className="mb-4 font-serif text-2xl">Kegiatan baru</h2><FormKegiatanOrg org={id} /></Kartu>}
      </div>
    );
  }

  async function Proker() {
    const { data } = await supabase.from("program_kerja").select("id, judul, tujuan, target_waktu, indikator, anggaran, status, evaluasi").eq("organisasi_id", id).order("created_at");
    const list = (data ?? []) as { id: string; judul: string; tujuan: string; target_waktu: string; indikator: string; anggaran: number; status: string; evaluasi: string }[];
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-3">
          {list.length === 0 && <Kartu><p className="text-sm text-black/50">Belum ada program kerja tahun ini.</p></Kartu>}
          {list.map((p) => (
            <Kartu key={p.id}>
              <p className="font-semibold">{p.judul} <span className="font-normal text-black/50">· {STATUS_PROKER[p.status]}{p.target_waktu && ` · ${p.target_waktu}`} · {rupiah(Number(p.anggaran))}</span></p>
              {p.tujuan && <p className="text-sm">{p.tujuan}</p>}
              {p.evaluasi && <p className="mt-1 text-sm text-black/60">Evaluasi: {p.evaluasi}</p>}
              {kelola && <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-brand-700">Ubah / evaluasi</summary><div className="mt-2"><FormProker org={id} d={{ ...p, anggaran: Number(p.anggaran) }} /></div></details>}
            </Kartu>
          ))}
        </div>
        {kelola && <Kartu className="self-start"><h2 className="mb-4 font-serif text-2xl">Program baru</h2><FormProker org={id} /></Kartu>}
      </div>
    );
  }

  async function Pengajuan() {
    const { data } = await supabase.from("pengajuan_kegiatan").select("id, judul, mulai, status, total_anggaran").eq("organisasi_id", id).order("created_at", { ascending: false });
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_520px]">
        <Kartu>
          {(data ?? []).length === 0 ? <p className="text-sm text-black/50">Belum ada pengajuan.</p> : (
            <ul className="divide-y divide-black/5 text-sm">{(data ?? []).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 py-2">
                <Link href={`/admin/ekskul/pengajuan/${a.id}`} className="flex-1 font-medium hover:underline">{a.judul}</Link>
                <span className="text-black/50">{tgl(a.mulai)} · {rupiah(Number(a.total_anggaran))}</span><Lencana s={a.status} peta={STATUS_PENGAJUAN} />
              </li>))}</ul>
          )}
          <p className="mt-3 text-xs text-black/50">Alur: draf → diajukan → disetujui pembina → disetujui kesiswaan → pelaksanaan → LPJ → selesai.</p>
        </Kartu>
        {kelola && <Kartu className="self-start"><h2 className="mb-4 font-serif text-2xl">Pengajuan baru</h2><FormPengajuan org={id} /></Kartu>}
      </div>
    );
  }

  async function Sertifikat() {
    const [{ data: sr }, { data: pr }] = await Promise.all([
      supabase.from("sertifikat_org").select("id, kode, jenis, judul, tanggal, dicabut, siswa(nama)").eq("organisasi_id", id).order("tanggal", { ascending: false }).limit(300),
      kelola ? supabase.rpc("prestasi_anggota_org", { p_org: id }) : Promise.resolve({ data: [] }),
    ]);
    const sert = (sr ?? []) as unknown as { id: string; kode: string; jenis: string; judul: string; tanggal: string; dicabut: boolean; siswa: { nama: string } | null }[];
    const prestasi = (pr ?? []) as { id: string; nama: string; kegiatan: string; tingkat: string; peringkat: string; tanggal: string; tertaut: boolean }[];
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
        <div className="space-y-6">
          <Kartu>
            <h2 className="mb-3 font-serif text-2xl">Sertifikat ({sert.length})</h2>
            {sert.length === 0 ? <p className="text-sm text-black/50">Belum ada.</p> : (
              <ul className="divide-y divide-black/5 text-sm">{sert.map((c) => (
                <li key={c.id} className={`flex flex-wrap items-center gap-2 py-2 ${c.dicabut ? "opacity-50" : ""}`}>
                  <span className="flex-1"><strong>{c.siswa?.nama}</strong> · {c.judul} <span className="text-black/50">({JENIS_SERTIF[c.jenis]}, {tgl(c.tanggal)})</span>{c.dicabut && " — dicabut"}</span>
                  <span className="font-mono text-xs">{c.kode}</span>
                  <a href={`/cetak/sertifikat/${c.id}`} target="_blank" className="text-xs font-semibold text-brand-700 underline">Cetak</a>
                  {kelola && !c.dicabut && <form action={cabutSertifikat}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="organisasi_id" value={id} /><button className="text-xs font-semibold text-merah underline">Cabut</button></form>}
                </li>))}</ul>
            )}
          </Kartu>
          {kelola && (
            <Kartu>
              <h2 className="mb-1 font-serif text-2xl">Prestasi anggota</h2>
              <p className="mb-3 text-sm text-black/60">Prestasi yang sudah diverifikasi kesiswaan. Tautkan ke organisasi agar masuk portofolio & tampil (tanpa nama) di halaman publik.</p>
              {prestasi.length === 0 ? <p className="text-sm text-black/50">Belum ada.</p> : (
                <ul className="divide-y divide-black/5 text-sm">{prestasi.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2 py-2">
                    <span className="flex-1">{p.kegiatan} · {p.peringkat} {p.tingkat} <span className="text-black/50">— {p.nama}, {tgl(p.tanggal)}</span></span>
                    {p.tertaut ? <span className="text-xs text-emerald-700">✓ tertaut</span> : (
                      <form action={tautkanPrestasi}><input type="hidden" name="prestasi_id" value={p.id} /><input type="hidden" name="organisasi_id" value={id} /><button className="text-xs font-semibold text-brand-700 underline">Tautkan</button></form>)}
                  </li>))}</ul>
              )}
            </Kartu>
          )}
        </div>
        {kelola && <Kartu className="self-start"><h2 className="mb-4 font-serif text-2xl">Terbitkan sertifikat</h2><FormSertifikat org={id} anggota={aktif} hari={hari} /></Kartu>}
      </div>
    );
  }

  async function Profil() {
    const [{ data: pb }, staf] = await Promise.all([
      supabase.from("pembina_organisasi").select("pegawai_id").eq("organisasi_id", id),
      daftarStaf(supabase),
    ]);
    const nama = new Map(staf.map((s) => [s.id, s.nama]));
    const pembina = (pb ?? []).map((p) => p.pegawai_id);
    const kelolaSemua = punya(akses, "ekskul.kelola");
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Kartu>{kelola ? <FormOrganisasi d={o as DataOrg} kelola={kelolaSemua} /> : <p className="text-sm text-black/60">{o.deskripsi || "—"}</p>}</Kartu>
        <Kartu className="self-start">
          <h2 className="mb-3 font-serif text-2xl">Pembina</h2>
          <ul className="mb-3 space-y-1 text-sm">{pembina.length === 0 ? <li className="text-black/50">Belum ada.</li> : pembina.map((p) => (
            <li key={p} className="flex items-center gap-2"><span className="flex-1">{nama.get(p) ?? "—"}</span>
              {kelolaSemua && <form action={aturPembina}><input type="hidden" name="organisasi_id" value={id} /><input type="hidden" name="pegawai_id" value={p} /><input type="hidden" name="aksi" value="hapus" /><button className="text-xs font-semibold text-merah underline">Lepas</button></form>}</li>))}</ul>
          {kelolaSemua && (
            <form action={aturPembina} className="flex gap-2">
              <input type="hidden" name="organisasi_id" value={id} />
              <select name="pegawai_id" aria-label="Pilih pembina" className="flex-1 rounded-xl border border-black/15 px-3 py-2 text-sm">{staf.filter((s) => !pembina.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}</select>
              <button className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white">Tambah</button>
            </form>
          )}
        </Kartu>
      </div>
    );
  }
}
