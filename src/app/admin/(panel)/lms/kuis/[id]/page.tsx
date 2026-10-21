import Link from "next/link";
import { notFound } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { AiSoal, FormKuis, FormSoal, type DataSoal } from "@/components/lms/Form";
import { wajibLogin } from "@/lib/admin/auth";
import { penugasanSaya } from "@/lib/admin/lms-data";
import { uuid } from "@/lib/admin/schema";
import { aiAktif } from "@/lib/ai";
import { keLokalWIB, waktuWIB } from "@/lib/lms";
import { arsipLms, hapusSoal } from "../../../../actions-lms";

export const metadata = { title: "Kuis" };

type Rekap = { siswa_id: string; nama: string; kelas: string; mulai_pada: string | null; selesai_pada: string | null; benar: number | null; total: number | null; skor: number | null };

export default async function DetailKuis({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesan?: string; ubah?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase } = await wajibLogin();
  const { saya, list } = await penugasanSaya(supabase);
  const { data: k } = await supabase.from("kuis").select("id, pegawai_id, mapel_id, judul, petunjuk, mulai, selesai, durasi_menit, acak, tampil_hasil, terbit, kuis_kelas(kelas_id)").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!k || k.pegawai_id !== saya) notFound();
  const [{ data: soal }, { data: rekap }] = await Promise.all([
    supabase.from("kuis_soal").select("id, pertanyaan, pilihan, kunci, pembahasan, bobot, urutan").eq("kuis_id", id).order("urutan"),
    supabase.rpc("rekap_kuis", { p_kuis: id }),
  ]);
  const daftar = (soal ?? []) as DataSoal[];
  const hasil = (rekap ?? []) as Rekap[];
  const terkunci = hasil.some((r) => r.mulai_pada);
  const selesai = hasil.filter((r) => r.selesai_pada);
  const rata = selesai.length ? selesai.reduce((a, r) => a + Number(r.skor ?? 0), 0) / selesai.length : null;
  const ubah = sp.ubah ? daftar.find((s) => s.id === sp.ubah) : undefined;
  const kelasMapel = list.filter((x) => x.mapel_id === k.mapel_id).map((x) => ({ id: x.kelas_id, nama: x.kelas }));

  return (
    <>
      <JudulHalaman judul={k.judul} deskripsi={`${waktuWIB(k.mulai)} – ${waktuWIB(k.selesai)} WIB · ${k.durasi_menit} menit · ${daftar.length} soal${k.terbit ? "" : " · DRAF"}`}
        aksi={<form action={arsipLms}><input type="hidden" name="jenis" value="kuis" /><input type="hidden" name="id" value={k.id} /><button className="rounded-full px-4 py-2.5 text-sm font-semibold text-blue-teks ring-1 ring-blue/30">Arsipkan</button></form>} />
      <Notifikasi kode={sp.pesan} />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Kartu>
            <h2 id="soal" className="mb-3 text-2xl">Soal ({daftar.length})</h2>
            {terkunci && <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">Sudah ada siswa yang mengerjakan — soal dikunci agar penilaian adil.</p>}
            {daftar.length === 0 ? <p className="text-sm text-black/50">Belum ada soal.</p> : (
              <ol className="space-y-3">
                {daftar.map((s, i) => (
                  <li key={s.id} className="rounded-xl bg-soft p-3 text-sm">
                    <div className="flex gap-3">
                      <p className="flex-1 font-medium">{i + 1}. {s.pertanyaan} {s.bobot > 1 && <span className="text-xs text-black/50">(bobot {s.bobot})</span>}</p>
                      {!terkunci && (
                        <span className="flex gap-2 text-xs font-semibold">
                          <Link href={`?ubah=${s.id}#form-soal`} className="text-blue-teks underline">Ubah</Link>
                          <form action={hapusSoal}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="kuis_id" value={k.id} /><button className="text-blue-teks underline">Hapus</button></form>
                        </span>
                      )}
                    </div>
                    {s.pilihan.map((p, j) => <p key={j} className={j === s.kunci ? "font-semibold text-emerald-800" : "text-black/70"}>{String.fromCharCode(65 + j)}. {p}{j === s.kunci && " ✓"}</p>)}
                  </li>
                ))}
              </ol>
            )}
          </Kartu>
          {!terkunci && (
            <div className="grid gap-6 2xl:grid-cols-2">
              <Kartu>
                <h2 id="form-soal" className="mb-3 text-xl">{ubah ? "Ubah soal" : "Tambah soal"}</h2>
                <FormSoal key={ubah?.id ?? "baru"} kuis_id={k.id} data={ubah} urutan={daftar.length + 1} />
              </Kartu>
              {aiAktif() && (
                <Kartu className="bg-violet-50 ring-violet-200">
                  <h2 className="mb-3 text-xl">Buat soal dengan AI</h2>
                  <AiSoal kuis_id={k.id} />
                </Kartu>
              )}
            </div>
          )}
          <Kartu>
            <div className="mb-3 flex flex-wrap items-baseline gap-3">
              <h2 className="flex-1 text-2xl">Hasil</h2>
              <span className="text-sm text-black/60">{selesai.length}/{hasil.length} selesai{rata != null && ` · rata-rata ${rata.toFixed(1)}`}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead><tr className="text-xs uppercase tracking-wider text-black/50"><th className="py-2">Siswa</th><th>Kelas</th><th>Status</th><th className="text-right">Benar</th><th className="text-right">Skor</th></tr></thead>
                <tbody>
                  {hasil.map((r) => (
                    <tr key={r.siswa_id} className="border-t border-black/5">
                      <td className="py-2">{r.nama}</td><td>{r.kelas}</td>
                      <td>{r.selesai_pada ? "Selesai" : r.mulai_pada ? "Sedang mengerjakan" : <span className="text-black/40">Belum</span>}</td>
                      <td className="text-right tabular-nums">{r.benar != null ? `${r.benar}/${r.total}` : "—"}</td>
                      <td className="text-right font-semibold tabular-nums">{r.skor != null ? Number(r.skor) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Kartu>
        </div>
        <Kartu className="self-start">
          <h2 className="mb-4 text-2xl">Pengaturan kuis</h2>
          <FormKuis mapel_id={k.mapel_id} kelas={kelasMapel} mulaiAwal="" selesaiAwal=""
            data={{ id: k.id, judul: k.judul, petunjuk: k.petunjuk, mulai: keLokalWIB(k.mulai), selesai: keLokalWIB(k.selesai), durasi_menit: k.durasi_menit, acak: k.acak, tampil_hasil: k.tampil_hasil, terbit: k.terbit, kelas: (k.kuis_kelas as { kelas_id: string }[]).map((x) => x.kelas_id) }} />
        </Kartu>
      </div>
    </>
  );
}
