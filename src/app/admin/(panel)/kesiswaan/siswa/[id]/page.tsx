import { notFound, redirect } from "next/navigation";
import { JudulHalaman, Kartu, Lencana, Notifikasi } from "@/components/admin/ui";
import { TombolCetak } from "@/components/jadwal/Bantu";
import { FormPembinaan, FormRujuk } from "@/components/kesiswaan/Form";
import { hariIniWIB } from "@/lib/admin/absensi";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { BIDANG, JENIS_BINA, PERINGKAT, STATUS_LAPORAN, TINGKAT } from "@/lib/kesiswaan/label";
import { formatTanggal } from "@/lib/format";
import { batalkanPelanggaran } from "../../../../actions-kesiswaan";

export const metadata = { title: "Rapor Perkembangan Siswa" };

export default async function RaporSiswa({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesan?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, akses } = await wajibLogin();
  const [{ data: boleh }, { data: bina }] = await Promise.all([
    supabase.rpc("boleh_lihat_kesiswaan", { sid: id }),
    supabase.rpc("boleh_bina", { sid: id }),
  ]);
  if (!boleh && !bina) redirect("/admin?pesan=tanpa-akses");
  const [{ data: s }, { data: rekap }, { data: pel }, { data: pre }, { data: pembinaan }, { data: sp1 }] = await Promise.all([
    supabase.from("siswa_kelas_aktif").select("id, nama, nisn, kelas").eq("id", id).maybeSingle(),
    supabase.rpc("rekap_poin"),
    supabase.from("pelanggaran_siswa").select("id, tanggal, nama_pelanggaran, kategori, poin, kronologi, status, catatan_verifikasi, bukti_path").eq("siswa_id", id).order("tanggal", { ascending: false }),
    supabase.from("prestasi_siswa").select("id, tanggal, nama_kegiatan, bidang, tingkat, peringkat, poin, status, bukti_path").eq("siswa_id", id).order("tanggal", { ascending: false }),
    supabase.from("pembinaan_siswa").select("id, tanggal, jenis, uraian, tindak_lanjut, status").eq("siswa_id", id).order("tanggal", { ascending: false }),
    supabase.rpc("status_disiplin"),
  ]);
  if (!s) notFound();
  const r = ((rekap ?? []) as { siswa_id: string; poin_pelanggaran: number; poin_prestasi: number; poin_bersih: number; tindakan: string | null }[]).find((x) => x.siswa_id === id);
  const disiplin = ((sp1 ?? []) as { siswa_id: string; label: string; jenis: string; jumlah: number; dikonfirmasi: boolean }[]).filter((d) => d.siswa_id === id);
  const kelola = punya(akses, "kesiswaan.kelola");
  const hari = hariIniWIB();

  return (
    <>
      <JudulHalaman judul={s.nama} deskripsi={`Rapor perkembangan · ${s.kelas ? `Kelas ${s.kelas}` : "tanpa kelas"}${s.nisn ? ` · NISN ${s.nisn}` : ""} · tahun ajaran aktif`} aksi={<TombolCetak />} />
      <Notifikasi kode={sp.pesan} />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Poin pelanggaran", r?.poin_pelanggaran ?? 0, "text-red-700"],
          ["Poin prestasi", r?.poin_prestasi ?? 0, "text-emerald-700"],
          ["Poin dihitung", r?.poin_bersih ?? 0, ""],
          ["Tindak lanjut", r?.tindakan ?? "—", "text-amber-800 text-2xl"],
        ].map(([l, n, w]) => (
          <div key={l as string} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <p className={`font-serif text-4xl leading-tight ${w}`}>{n}</p>
            <p className="mt-1 text-sm text-black/60">{l}</p>
          </div>
        ))}
      </div>
      {disiplin.length > 0 && (
        <p className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Dari absensi: {disiplin.map((d) => `${d.label} (${d.jumlah}× ${d.jenis}${d.dikonfirmasi ? ", sudah ditindaklanjuti" : ""})`).join("; ")}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-serif text-2xl">Prestasi</h2>
          {!pre?.length ? <p className="text-sm text-black/50">Belum ada.</p> : (
            <ul className="space-y-2">
              {pre.map((p) => (
                <li key={p.id} className="rounded-xl bg-white p-3 text-sm ring-1 ring-black/5">
                  <div className="flex justify-between gap-2"><strong>🏆 {p.nama_kegiatan}</strong><Lencana warna={p.status === "terverifikasi" ? "hijau" : p.status === "diajukan" ? "kuning" : "abu"}>{STATUS_LAPORAN[p.status]}</Lencana></div>
                  <p className="text-black/60">{PERINGKAT[p.peringkat]} · {TINGKAT[p.tingkat]} · {BIDANG[p.bidang]} · {formatTanggal(p.tanggal)} · {p.poin} poin</p>
                  {p.bukti_path && <a href={`/berkas/prestasi/${p.id}`} target="_blank" rel="noopener" className="text-xs text-brand-700 underline print:hidden">piagam</a>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="mb-3 font-serif text-2xl">Pelanggaran</h2>
          {!pel?.length ? <p className="text-sm text-black/50">Tidak ada catatan.</p> : (
            <ul className="space-y-2">
              {pel.map((p) => (
                <li key={p.id} className="rounded-xl bg-white p-3 text-sm ring-1 ring-black/5">
                  <div className="flex justify-between gap-2"><strong>{p.nama_pelanggaran}</strong><Lencana warna={p.status === "terverifikasi" ? "kuning" : "abu"}>{STATUS_LAPORAN[p.status]}</Lencana></div>
                  <p className="text-black/60">{formatTanggal(p.tanggal)} · {p.kategori} · {p.poin} poin</p>
                  <p className="mt-1 text-black/70">{p.kronologi}</p>
                  {p.catatan_verifikasi && <p className="text-xs text-black/50">Catatan: {p.catatan_verifikasi}</p>}
                  {kelola && p.status === "terverifikasi" && (
                    <form action={batalkanPelanggaran} className="mt-2 flex gap-2 print:hidden">
                      <input type="hidden" name="id" value={p.id} /><input type="hidden" name="siswa_id" value={id} />
                      <input name="catatan" placeholder="Alasan pembatalan" aria-label="Alasan pembatalan" className="flex-1 rounded-lg border border-black/10 px-2 py-1 text-xs" />
                      <button className="text-xs text-merah underline">batalkan</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-10">
        <h2 className="mb-3 font-serif text-2xl">Pembinaan</h2>
        {!pembinaan?.length ? <p className="text-sm text-black/50">Belum ada catatan pembinaan.</p> : (
          <ol className="relative space-y-3 border-l-2 border-brand-100 pl-5">
            {pembinaan.map((b) => (
              <li key={b.id} className="text-sm">
                <p className="font-semibold">{JENIS_BINA[b.jenis]} <span className="font-normal text-black/50">· {formatTanggal(b.tanggal)} · {b.status}</span></p>
                <p className="text-black/70">{b.uraian}</p>
                {b.tindak_lanjut && <p className="text-black/60">Tindak lanjut: {b.tindak_lanjut}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      {bina && (
        <div className="mt-10 grid gap-6 print:hidden lg:grid-cols-2">
          <Kartu><h3 className="mb-3 font-serif text-2xl">Catat pembinaan</h3><FormPembinaan siswaId={id} hariIni={hari} /></Kartu>
          <Kartu><h3 className="mb-3 font-serif text-2xl">Rujuk ke BK</h3><FormRujuk siswaId={id} /></Kartu>
        </div>
      )}
    </>
  );
}
