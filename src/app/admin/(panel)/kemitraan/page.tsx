import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormMitra, type DataMitra } from "@/components/humas/Form";
import { arsipKemitraan } from "@/app/admin/actions-humas";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { hariIniWIB } from "@/lib/admin/absensi";
import { daftarStaf } from "@/lib/admin/nama";
import { JENIS_MITRA } from "@/lib/humas";
import { tgl } from "@/lib/perpus";

export const metadata = { title: "Kemitraan" };

export default async function Kemitraan({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const kelola = punya(akses, "humas.kelola");
  const [{ data }, guru] = await Promise.all([
    supabase.from("kemitraan").select("*").is("deleted_at", null).order("berakhir", { ascending: true, nullsFirst: false }),
    daftarStaf(supabase),
  ]);
  const list = (data ?? []) as DataMitra[];
  const nama = new Map(guru.map((g) => [g.id, g.nama]));
  const hari = hariIniWIB();
  const batas = new Date(Date.parse(hari) + 30 * 864e5).toISOString().slice(0, 10);
  return (
    <>
      <JudulHalaman judul="Kemitraan & MoU" deskripsi="Daftar kerja sama sekolah dengan perguruan tinggi, industri, pemerintah, dan komunitas. Humas diingatkan 30 hari sebelum MoU berakhir." />
      <Notifikasi kode={sp.pesan} />
      <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
        <div className="space-y-3">
          {list.length === 0 && <Kartu><p className="text-black/50">Belum ada data kemitraan.</p></Kartu>}
          {list.map((m) => {
            const habis = m.berakhir && m.berakhir < hari;
            const segera = m.berakhir && !habis && m.berakhir <= batas;
            return (
              <Kartu key={m.id} className={segera ? "ring-amber-300" : habis ? "opacity-70" : ""}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1">
                    <p className="font-semibold"><a href={`/admin/kemitraan/${m.id}`} className="hover:underline">{m.mitra}</a> <span className="ml-1 rounded bg-soft px-1.5 text-xs font-medium">{JENIS_MITRA[m.jenis as keyof typeof JENIS_MITRA]}</span>{m.tampil_publik && <span className="ml-1 rounded bg-emerald-50 px-1.5 text-xs text-emerald-800">di website</span>}</p>
                    {m.ruang_lingkup && <p className="mt-1 text-sm text-black/70">{m.ruang_lingkup}</p>}
                    <p className="mt-1 text-xs text-black/50">
                      {m.nomor_dokumen || "tanpa nomor"} · {m.mulai ? tgl(m.mulai) : "?"} – {m.berakhir ? tgl(m.berakhir) : "tanpa batas"}
                      {m.pic_id && ` · PIC ${nama.get(m.pic_id) ?? "—"}`}{m.kontak_mitra && ` · ${m.kontak_mitra}`}
                    </p>
                    {segera && <p className="mt-1 text-sm font-semibold text-amber-800">Segera berakhir — siapkan perpanjangan.</p>}
                    {habis && <p className="mt-1 text-sm font-semibold text-blue-teks">Sudah berakhir.</p>}
                  </div>
                  <div className="flex gap-2 text-sm">
                    {m.tautan_dokumen && <a href={m.tautan_dokumen} target="_blank" rel="noreferrer" className="rounded-full px-3 py-1.5 font-semibold ring-1 ring-black/15">Dokumen ↗</a>}
                    <a href={`/admin/kemitraan/${m.id}`} className="rounded-full px-3 py-1.5 font-semibold ring-1 ring-black/15">{kelola ? "Detail & ubah" : "Detail"}</a>
                    {kelola && <form action={arsipKemitraan}><input type="hidden" name="id" value={m.id} /><button className="rounded-full px-3 py-1.5 font-semibold text-blue-teks ring-1 ring-blue/30">Arsipkan</button></form>}
                  </div>
                </div>
              </Kartu>
            );
          })}
        </div>
        {kelola && (
          <Kartu className="self-start">
            <h2 className="mb-4 text-2xl">Tambah kemitraan</h2>
            <FormMitra guru={guru} />
          </Kartu>
        )}
      </div>
    </>
  );
}
