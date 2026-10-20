import Link from "next/link";
import { JudulHalaman, Kartu, KosongAdmin, Notifikasi } from "@/components/admin/ui";
import { FormProjek, type DataProjek } from "@/components/kurikulum/Form";
import { NavKurikulum } from "@/components/kurikulum/Nav";
import { hariIniWIB } from "@/lib/admin/absensi";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { daftarGuru, petaNamaPegawai } from "@/lib/admin/nama";
import { DIMENSI, semesterSekarang, type Dimensi } from "@/lib/kurikulum";
import { rentangTanggal } from "@/lib/kalender";
import { statusProjek } from "../../actions-kurikulum";

export const metadata = { title: "Projek Kokurikuler" };

const STATUS: Record<string, string> = { rencana: "Rencana", berjalan: "Berjalan", selesai: "Selesai" };
type Projek = DataProjek & { status: string; projek_kelas: { kelas_id: string; fasilitator_id: string | null; kelas: { nama: string } | null }[] };

export default async function Kokurikuler({ searchParams }: { searchParams: Promise<{ ubah?: string; pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const kelola = punya(akses, "kurikulum.kelola");
  const { data: saya } = await supabase.rpc("pegawai_saya");
  const { data: ta } = await supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle();
  const [{ data: pj }, guru, { data: kelas }] = await Promise.all([
    ta ? supabase.from("projek_kokurikuler").select("id, judul, tema, dimensi, deskripsi, tingkat, semester, koordinator_id, mulai, selesai, alokasi_jp, status, projek_kelas(kelas_id, fasilitator_id, kelas(nama))")
      .eq("tahun_ajaran_id", ta.id).is("deleted_at", null).order("mulai") : Promise.resolve({ data: [] }),
    kelola ? daftarGuru(supabase) : Promise.resolve([]),
    kelola && ta ? supabase.from("kelas").select("id, nama, tingkat").eq("tahun_ajaran_id", ta.id).is("deleted_at", null).order("tingkat").order("nama") : Promise.resolve({ data: [] }),
  ]);
  const list = (pj ?? []) as unknown as Projek[];
  const nama = await petaNamaPegawai(supabase, list.flatMap((p) => [p.koordinator_id, ...p.projek_kelas.map((k) => k.fasilitator_id)]));
  const ubah = kelola && sp.ubah ? list.find((p) => p.id === sp.ubah) : undefined;

  return (
    <>
      <JudulHalaman judul="Projek Kokurikuler" deskripsi="Projek penguatan profil lulusan (P5/kokurikuler) per tingkat: tema, dimensi, kelas, fasilitator, dan jadwal. Tampil juga di portal siswa." />
      <NavKurikulum />
      <Notifikasi kode={sp.pesan} />
      <div className={`grid gap-6 ${kelola ? "xl:grid-cols-[1fr_420px]" : ""}`}>
        <div className="space-y-4">
          {list.length === 0 ? <KosongAdmin teks="Belum ada projek di tahun ajaran ini." /> : list.map((p) => {
            const koor = p.koordinator_id === saya;
            return (
              <Kartu key={p.id}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-[0.15em] text-black/50">Kelas {p.tingkat} · smt {p.semester} · {p.tema}</p>
                    <h2 className="text-2xl">{p.judul}</h2>
                    <p className="text-sm text-black/60">{rentangTanggal(p.mulai, p.selesai)}{p.alokasi_jp ? ` · ${p.alokasi_jp} JP` : ""} · koordinator {p.koordinator_id ? nama.get(p.koordinator_id) : "—"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${p.status === "berjalan" ? "bg-emerald-100 text-emerald-900" : p.status === "selesai" ? "bg-black/5 text-black/60" : "bg-amber-100 text-amber-900"}`}>{STATUS[p.status]}</span>
                </div>
                <ul className="mt-3 flex flex-wrap gap-1.5">{p.dimensi.map((d) => <li key={d} className="rounded-full bg-soft px-2.5 py-0.5 text-xs text-ink ring-1 ring-line">{DIMENSI[d as Dimensi] ?? d}</li>)}</ul>
                {p.deskripsi && <p className="mt-3 whitespace-pre-line text-sm text-black/70">{p.deskripsi}</p>}
                {p.projek_kelas.length > 0 && (
                  <p className="mt-3 text-sm"><span className="text-black/50">Kelas & fasilitator: </span>
                    {p.projek_kelas.map((k) => `${k.kelas?.nama}${k.fasilitator_id ? ` (${nama.get(k.fasilitator_id)})` : ""}`).join(", ")}</p>
                )}
                {(kelola || koor) && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-black/5 pt-3 text-xs font-semibold">
                    {Object.entries(STATUS).filter(([k]) => k !== p.status).map(([k, v]) => (
                      <form key={k} action={statusProjek}><input type="hidden" name="id" value={p.id} /><button name="status" value={k} className="rounded-full px-3 py-1.5 ring-1 ring-black/15 hover:bg-black/5">Tandai {v.toLowerCase()}</button></form>
                    ))}
                    {kelola && <Link href={`?ubah=${p.id}#form`} className="rounded-full px-3 py-1.5 ring-1 ring-black/15">Ubah</Link>}
                    {kelola && <form action={statusProjek}><input type="hidden" name="id" value={p.id} /><button name="arsip" value="1" className="rounded-full px-3 py-1.5 text-blue-teks ring-1 ring-blue/30">Arsip</button></form>}
                  </div>
                )}
              </Kartu>
            );
          })}
        </div>
        {kelola && (
          <Kartu className="self-start">
            <h2 id="form" className="mb-4 text-2xl">{ubah ? "Ubah projek" : "Projek baru"}</h2>
            {ubah && <Link href="?" className="mb-3 inline-block text-sm text-blue-teks underline">+ Projek baru saja</Link>}
            <FormProjek key={ubah?.id ?? "baru"} data={ubah ? { ...ubah, kelas: ubah.projek_kelas } : undefined} guru={guru} kelas={(kelas ?? []) as { id: string; nama: string; tingkat: string }[]} semester={semesterSekarang(hariIniWIB())} />
          </Kartu>
        )}
      </div>
    </>
  );
}
