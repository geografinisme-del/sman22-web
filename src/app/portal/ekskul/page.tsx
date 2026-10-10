import Link from "next/link";
import { FormDaftar } from "@/components/ekskul/Form";
import { mundurEkskul } from "@/app/admin/actions-ekskul";
import { hariIniWIB } from "@/lib/admin/absensi";
import { JABATAN, JENIS_ORG, STATUS_DAFTAR, type IsianTambahan } from "@/lib/ekskul";
import { Lencana, waktuWIB } from "@/lib/lms";
import { tgl } from "@/lib/perpus";
import { konteksPortal } from "../data";

export const metadata = { title: "Ekskul & OSIS" };
type O = { id: string; nama: string; jenis: string; warna: string; deskripsi: string; jadwal_rutin: string; kuota: number; syarat: string; tingkat_boleh: string[]; daftar_mulai: string | null; daftar_selesai: string | null; field_tambahan: IsianTambahan[] };
type Porto = { keanggotaan: { organisasi: string; organisasi_id: string; warna: string; tahun: string; jabatan: string; bidang: string; status: string }[]; kehadiran: { organisasi: string; kegiatan: number; hadir: number }[];
  sertifikat: { id: string; kode: string; judul: string; organisasi: string; tanggal: string; dicabut: boolean }[]; prestasi: { nama: string; tingkat: string; peringkat: string; organisasi: string | null }[] };

export default async function EkskulPortal({ searchParams }: { searchParams: Promise<{ pesan?: string; galat?: string }> }) {
  const sp = await searchParams;
  const { supabase, anak, ortu } = await konteksPortal();
  const hari = hariIniWIB();
  const [{ data: org }, { data: daf }, { data: cfg }, ...porto] = await Promise.all([
    supabase.from("organisasi").select("id, nama, jenis, warna, deskripsi, jadwal_rutin, kuota, syarat, tingkat_boleh, daftar_mulai, daftar_selesai, field_tambahan").eq("aktif", true).is("deleted_at", null).order("nama"),
    supabase.from("pendaftaran_ekskul").select("id, siswa_id, status, catatan, organisasi_id, tahun_ajaran!inner(aktif)").eq("tahun_ajaran.aktif", true),
    supabase.from("pengaturan_ekskul").select("maks_pilihan").eq("id", 1).maybeSingle(),
    ...anak.map((a) => supabase.rpc("portofolio_ekskul", { p_siswa: a.id })),
  ]);
  const semua = (org ?? []) as O[];
  const nama = new Map(semua.map((o) => [o.id, o]));
  const daftar = (daf ?? []) as unknown as { id: string; siswa_id: string; status: string; catatan: string; organisasi_id: string }[];
  const orgAktif = [...new Set(porto.flatMap((p) => ((p.data ?? { keanggotaan: [] }) as Porto).keanggotaan.filter((k) => k.status === "aktif").map((k) => k.organisasi_id)))];
  const { data: kg } = orgAktif.length
    ? await supabase.from("kegiatan_org").select("id, organisasi_id, judul, jenis, mulai, tempat").in("organisasi_id", orgAktif).gte("mulai", new Date(Date.parse(`${hari}T00:00:00+07:00`)).toISOString()).order("mulai").limit(10)
    : { data: [] };
  return (
    <div className="space-y-8">
      <div><h1 className="font-serif text-3xl">Ekskul & OSIS</h1><p className="text-sm text-black/60">Pendaftaran, kegiatan, kehadiran, dan sertifikat{ortu ? " anak" : ""}.</p></div>
      {sp.pesan && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{sp.pesan === "terdaftar" ? "Pendaftaran terkirim. Pembina akan memeriksa; hasilnya muncul di notifikasi." : "Tersimpan."}</p>}
      {sp.galat && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{sp.galat}</p>}
      {anak.map((a, i) => {
        const p = (porto[i]?.data ?? { keanggotaan: [], kehadiran: [], sertifikat: [], prestasi: [] }) as Porto;
        const tingkat = (a.kelas ?? "").split("-")[0];
        const milik = daftar.filter((d) => d.siswa_id === a.id);
        const sudah = new Set(milik.filter((d) => !["mundur", "ditolak"].includes(d.status)).map((d) => d.organisasi_id));
        const terbuka = semua.filter((o) => o.daftar_mulai && hari >= o.daftar_mulai && hari <= (o.daftar_selesai ?? o.daftar_mulai) && o.tingkat_boleh.includes(tingkat) && !sudah.has(o.id));
        const aktif = p.keanggotaan.filter((k) => k.status === "aktif");
        return (
          <section key={a.id} className="space-y-4">
            {ortu && <h2 className="font-serif text-2xl">{a.nama}</h2>}
            {aktif.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">{aktif.map((k) => {
                const h = p.kehadiran.find((x) => x.organisasi === k.organisasi);
                return (
                  <Link key={k.organisasi_id} href={`/portal/ekskul/${k.organisasi_id}`} className="block overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 hover:ring-black/20">
                    <div className="h-1.5" style={{ background: k.warna }} />
                    <div className="p-4"><p className="font-semibold">{k.organisasi}</p>
                      <p className="text-sm text-black/60">{JABATAN[k.jabatan]}{k.bidang && ` · ${k.bidang}`} · kehadiran {h?.kegiatan ? `${Math.round((100 * h.hadir) / h.kegiatan)}% (${h.hadir}/${h.kegiatan})` : "—"}</p></div>
                  </Link>);
              })}</div>
            )}
            {milik.filter((d) => d.status !== "diterima").length > 0 && (
              <ul className="space-y-2">{milik.filter((d) => d.status !== "diterima").map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-4 text-sm ring-1 ring-black/5">
                  <span className="flex-1 font-medium">Pendaftaran {nama.get(d.organisasi_id)?.nama}</span><Lencana s={d.status} peta={STATUS_DAFTAR} />
                  {d.catatan && <span className="w-full text-black/60">{d.catatan}</span>}
                  {!ortu && ["menunggu", "daftar_tunggu"].includes(d.status) && <form action={mundurEkskul}><input type="hidden" name="id" value={d.id} /><button className="text-xs font-semibold text-merah underline">Batalkan</button></form>}
                </li>))}</ul>
            )}
            {!ortu && terbuka.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-serif text-2xl">Pendaftaran dibuka</h2>
                {terbuka.map((o) => (
                  <details key={o.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
                    <summary className="flex cursor-pointer items-center gap-3 p-4"><span className="h-8 w-1.5 rounded" style={{ background: o.warna }} /><span className="flex-1"><strong>{o.nama}</strong> <span className="text-sm text-black/50">· {JENIS_ORG[o.jenis]} · sampai {tgl(o.daftar_selesai ?? o.daftar_mulai!)}{o.kuota ? ` · kuota ${o.kuota}` : ""}</span></span></summary>
                    <div className="space-y-3 border-t border-black/5 p-4">
                      {o.deskripsi && <p className="text-sm text-black/70">{o.deskripsi.slice(0, 400)}</p>}
                      {o.jadwal_rutin && <p className="text-sm"><strong>Jadwal:</strong> {o.jadwal_rutin}</p>}
                      {o.syarat && <p className="text-sm"><strong>Syarat:</strong> {o.syarat}</p>}
                      <FormDaftar org={o.id} isian={o.field_tambahan} maks={o.jenis === "ekskul" ? cfg?.maks_pilihan ?? 2 : 1} />
                    </div>
                  </details>
                ))}
              </div>
            )}
            {p.sertifikat.length > 0 && (
              <div><h2 className="mb-2 font-serif text-2xl">Sertifikat</h2>
                <ul className="divide-y divide-black/5 rounded-2xl bg-white px-4 text-sm ring-1 ring-black/5">{p.sertifikat.map((c) => (
                  <li key={c.id} className={`flex flex-wrap items-center gap-2 py-2 ${c.dicabut ? "opacity-50" : ""}`}><span className="flex-1">{c.judul} <span className="text-black/50">· {c.organisasi} · {tgl(c.tanggal)}</span></span>
                    {!c.dicabut && <a href={`/cetak/sertifikat/${c.id}`} target="_blank" className="font-semibold text-brand-700 underline">Unduh / cetak</a>}</li>))}</ul></div>
            )}
            {p.keanggotaan.length > aktif.length && (
              <details className="rounded-2xl bg-white p-4 text-sm ring-1 ring-black/5"><summary className="cursor-pointer font-semibold">Riwayat organisasi (portofolio)</summary>
                <ul className="mt-2">{p.keanggotaan.map((k, j) => <li key={j}>{k.tahun} · {k.organisasi} · {JABATAN[k.jabatan]}{k.status === "keluar" && " (keluar)"}</li>)}</ul>
                {p.prestasi.length > 0 && <ul className="mt-2 border-t border-black/5 pt-2">{p.prestasi.map((x, j) => <li key={j}>🏆 {x.nama} ({x.peringkat}, {x.tingkat}){x.organisasi && ` · ${x.organisasi}`}</li>)}</ul>}
              </details>
            )}
          </section>
        );
      })}
      {(kg ?? []).length > 0 && (
        <section><h2 className="mb-2 font-serif text-2xl">Kegiatan mendatang</h2>
          <ul className="divide-y divide-black/5 rounded-2xl bg-white px-4 text-sm ring-1 ring-black/5">{(kg ?? []).map((k) => (
            <li key={k.id} className="py-2"><strong>{k.judul}</strong> <span className="text-black/50">· {nama.get(k.organisasi_id)?.nama} · {waktuWIB(k.mulai, true)}{k.tempat && ` · ${k.tempat}`}</span></li>))}</ul></section>
      )}
    </div>
  );
}
