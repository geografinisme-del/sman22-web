import { redirect } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormKegiatanPojok, FormPojok, type DataPojok } from "@/components/perpus/Literasi";
import { NavPerpus } from "@/components/perpus/Nav";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { hariIniWIB } from "@/lib/admin/absensi";
import { daftarStaf } from "@/lib/admin/nama";
import { tgl } from "@/lib/perpus";

export const metadata = { title: "Pojok Baca" };
type K = { id: string; pojok_id: string; tanggal: string; kegiatan: string; peserta: number; tautan_dokumentasi: string };

export default async function Pojok({ searchParams }: { searchParams: Promise<{ pesan?: string; ubah?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const bina = punya(akses, "perpus.kelola") || punya(akses, "literasi.kelola");
  const { data: saya } = await supabase.rpc("pegawai_saya");
  const [{ data: pj }, { data: keg }, { data: eks }, guru, { data: kls }] = await Promise.all([
    supabase.from("pojok_baca").select("id, nama, lokasi, kelas_id, penanggung_jawab_id, deskripsi, aktif").is("deleted_at", null).order("nama"),
    supabase.from("kegiatan_pojok").select("id, pojok_id, tanggal, kegiatan, peserta, tautan_dokumentasi").order("tanggal", { ascending: false }).limit(300),
    supabase.from("eksemplar").select("pojok_id").not("pojok_id", "is", null).in("status", ["tersedia", "dipinjam"]),
    daftarStaf(supabase),
    supabase.from("kelas").select("id, nama, tahun_ajaran!inner(aktif)").eq("tahun_ajaran.aktif", true).order("nama"),
  ]);
  const pojok = (pj ?? []) as DataPojok[];
  const milik = pojok.filter((p) => bina || p.penanggung_jawab_id === saya);
  if (!bina && !punya(akses, "perpus.lihat") && milik.length === 0) redirect("/admin?pesan=tanpa-akses");
  const kegiatan = (keg ?? []) as K[];
  const nama = new Map(guru.map((g) => [g.id, g.nama]));
  const kelas = ((kls ?? []) as { id: string; nama: string }[]).map((k) => ({ id: k.id, nama: k.nama }));
  const namaKelas = new Map(kelas.map((k) => [k.id, k.nama]));
  const koleksi = (id: string) => (eks ?? []).filter((e) => e.pojok_id === id).length;
  const hari = hariIniWIB();
  return (
    <>
      <JudulHalaman judul="Pojok Baca" deskripsi="Pojok baca kelas & sudut literasi: lokasi, penanggung jawab, koleksi (eksemplar yang ditempatkan), dan jurnal kegiatan." />
      <NavPerpus kelola={punya(akses, "perpus.kelola")} />
      <Notifikasi kode={sp.pesan} />
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          {(bina ? pojok : milik).length === 0 && <Kartu><p className="text-black/50">Belum ada pojok baca.</p></Kartu>}
          {(bina || punya(akses, "perpus.lihat") ? pojok : milik).map((p) => {
            const kg = kegiatan.filter((k) => k.pojok_id === p.id);
            const boleh = bina || p.penanggung_jawab_id === saya;
            return (
              <Kartu key={p.id} className={p.aktif ? "" : "opacity-60"}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1">
                    <p className="font-semibold">{p.nama}{!p.aktif && " (nonaktif)"}</p>
                    <p className="text-sm text-black/60">{[p.lokasi, p.kelas_id ? namaKelas.get(p.kelas_id) : "", p.penanggung_jawab_id ? `PJ ${nama.get(p.penanggung_jawab_id) ?? "—"}` : "", `${koleksi(p.id)} eksemplar`].filter(Boolean).join(" · ")}</p>
                    {p.deskripsi && <p className="mt-1 text-sm">{p.deskripsi}</p>}
                  </div>
                  {bina && <a href={`?ubah=${p.id}`} className="rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-black/15">Ubah</a>}
                </div>
                <details className="mt-3 text-sm" open={kg.length > 0 && kg.length <= 3}>
                  <summary className="cursor-pointer font-semibold">Kegiatan ({kg.length})</summary>
                  <ul className="mt-2 divide-y divide-black/5">{kg.slice(0, 20).map((k) => (
                    <li key={k.id} className="flex gap-3 py-1.5"><span className="w-24 shrink-0 text-black/50">{tgl(k.tanggal)}</span><span className="flex-1">{k.kegiatan}{k.peserta > 0 && ` · ${k.peserta} peserta`}</span>
                      {k.tautan_dokumentasi && <a href={k.tautan_dokumentasi} target="_blank" rel="noreferrer" className="text-brand-700 underline">dokumentasi</a>}</li>
                  ))}</ul>
                  {boleh && <div className="mt-3 border-t border-black/5 pt-3"><FormKegiatanPojok pojok_id={p.id} hari={hari} /></div>}
                </details>
              </Kartu>
            );
          })}
        </div>
        {bina && (
          <Kartu className="self-start">
            <h2 className="mb-4 font-serif text-2xl">{sp.ubah ? "Ubah pojok baca" : "Pojok baca baru"}</h2>
            <FormPojok key={sp.ubah ?? "baru"} d={pojok.find((p) => p.id === sp.ubah)} guru={guru} kelas={kelas} />
            <p className="mt-3 text-xs text-black/50">Koleksi ditempatkan lewat Katalog → buku → pilih lokasi eksemplar.</p>
          </Kartu>
        )}
      </div>
    </>
  );
}
