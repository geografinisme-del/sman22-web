import Link from "next/link";
import { redirect } from "next/navigation";
import { JudulHalaman, KosongAdmin, Notifikasi } from "@/components/admin/ui";
import { NavJadwal } from "@/components/jadwal/NavJadwal";
import { hariIniWIB, STATUS_PEGAWAI_ABSEN, tanggalValid } from "@/lib/admin/absensi";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { jamPendek, JENIS_PERUBAHAN } from "@/lib/admin/jadwal";
import { muatEntri, muatJam, muatPerubahan, namaUntukPerubahan, teksPerubahan } from "@/lib/admin/jadwal-data";
import { formatTanggal } from "@/lib/format";
import { hapusPerubahan } from "../../../actions-jadwal";
import { FormPerubahan } from "./FormPerubahan";

export const metadata = { title: "Guru Pengganti" };

export default async function GuruPengganti({ searchParams }: { searchParams: Promise<{ tanggal?: string; guru?: string; pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  if (!punya(akses, "jadwal.pengganti") && !punya(akses, "jadwal.kelola")) redirect("/admin?pesan=tanpa-akses");
  const tanggal = tanggalValid(sp.tanggal) ? sp.tanggal : hariIniWIB();
  const hari = ((new Date(tanggal + "T00:00:00Z").getUTCDay() + 6) % 7) + 1;

  const [jam, entri, perubahan, { data: halangan }, { data: libur }, { data: ruang }] = await Promise.all([
    muatJam(supabase),
    muatEntri(supabase, "hari", hari),
    muatPerubahan(supabase, tanggal),
    supabase.rpc("guru_berhalangan", { p_tanggal: tanggal }),
    supabase.from("hari_libur").select("keterangan").eq("tanggal", tanggal).maybeSingle(),
    supabase.from("ruang").select("id, nama").is("deleted_at", null).order("nama"),
  ]);
  const nama = await namaUntukPerubahan(supabase, perubahan);
  const ubahDi = new Map(perubahan.map((p) => [p.jadwal_id, p]));
  const waktu = new Map(jam.filter((j) => j.hari === hari && j.jp_ke).map((j) => [j.jp_ke!, `${jamPendek(j.jam_mulai)}–${jamPendek(j.jam_selesai)}`]));
  const guruHariIni = [...new Map(entri.filter((e) => e.pegawai_id).map((e) => [e.pegawai_id!, e.guru ?? "—"])).entries()].sort((a, b) => a[1].localeCompare(b[1], "id"));
  const berhalangan = (halangan ?? []) as { pegawai_id: string; nama: string; status: keyof typeof STATUS_PEGAWAI_ABSEN; keterangan: string }[];
  const guruPilih = sp.guru && guruHariIni.some(([id]) => id === sp.guru) ? sp.guru : undefined;
  const slotGuru = guruPilih ? entri.filter((e) => e.pegawai_id === guruPilih).sort((a, b) => a.jp_ke - b.jp_ke) : [];
  const tersedia = Object.fromEntries(
    await Promise.all(
      slotGuru.filter((e) => !ubahDi.has(e.id)).map(async (e) => [e.id, ((await supabase.rpc("guru_tersedia", { p_jadwal: e.id, p_tanggal: tanggal })).data ?? []) as { id: string; nama: string; jp_hari_itu: number }[]] as const),
    ),
  );
  const entriPeta = new Map(entri.map((e) => [e.id, e]));
  const url = (g?: string) => `/admin/jadwal/pengganti?tanggal=${tanggal}${g ? `&guru=${g}` : ""}`;

  return (
    <>
      <JudulHalaman judul="Guru Pengganti" deskripsi="Atur pengganti atau tugas mandiri saat guru berhalangan. Perubahan langsung tampil di jadwal guru, siswa, dan orang tua untuk tanggal itu." />
      <NavJadwal akses={akses} aktif="/admin/jadwal/pengganti" />
      <Notifikasi kode={sp.pesan} />

      <form className="mb-5 flex flex-wrap items-end gap-2">
        <label className="text-sm font-semibold">Tanggal
          <input type="date" name="tanggal" defaultValue={tanggal} className="mt-1 block rounded-xl border border-black/15 bg-white px-3 py-2 font-normal" />
        </label>
        <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Buka</button>
        <span className="ml-2 self-center text-sm text-black/60">{formatTanggal(tanggal, { weekday: "long" })}</span>
      </form>

      {libur ? (
        <KosongAdmin teks={`Hari libur: ${libur.keterangan}`} />
      ) : !waktu.size ? (
        <KosongAdmin teks="Tidak ada jam pelajaran pada hari ini." />
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <h2 className="font-semibold">Guru berhalangan (dari Kehadiran Guru)</h2>
            {berhalangan.length === 0 ? (
              <p className="mt-1 text-sm text-black/50">Belum ada guru yang tercatat sakit/izin/dinas/cuti pada tanggal ini. Pilih guru secara manual di bawah.</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {berhalangan.map((b) => {
                  const jp = entri.filter((e) => e.pegawai_id === b.pegawai_id);
                  const sudah = jp.filter((e) => ubahDi.has(e.id)).length;
                  return (
                    <li key={b.pegawai_id}>
                      <Link href={url(b.pegawai_id)} className={`inline-block rounded-full px-3 py-1.5 text-sm ring-1 ${guruPilih === b.pegawai_id ? "bg-ink text-white" : sudah < jp.length ? "bg-amber-50 ring-amber-300" : "bg-emerald-50 ring-emerald-200"}`}>
                        {b.nama} · {STATUS_PEGAWAI_ABSEN[b.status]} · {sudah}/{jp.length} JP teratasi
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <form className="mt-4 flex flex-wrap items-end gap-2">
              <input type="hidden" name="tanggal" value={tanggal} />
              <select name="guru" defaultValue={guruPilih ?? ""} aria-label="Pilih guru" className="w-72 rounded-xl border border-black/15 bg-white px-3 py-2">
                <option value="">— pilih guru yang berhalangan —</option>
                {guruHariIni.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
              </select>
              <button className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15">Tampilkan jamnya</button>
            </form>
          </section>

          {guruPilih && (
            <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
              <h2 className="text-2xl">Jam mengajar {guruHariIni.find(([id]) => id === guruPilih)?.[1]}</h2>
              <ul className="mt-3 divide-y divide-black/5">
                {slotGuru.map((e) => {
                  const p = ubahDi.get(e.id);
                  const label = `JP ${e.jp_ke} ${e.kelas}`;
                  return (
                    <li key={e.id} className="py-3">
                      <p className="mb-2 text-sm"><strong>JP {e.jp_ke}</strong> <span className="text-black/50">{waktu.get(e.jp_ke)}</span> · {e.kelas} · {e.mapel}</p>
                      {p ? (
                        <p className="text-sm text-emerald-800">✓ {teksPerubahan(p, nama)}{p.catatan && ` — ${p.catatan}`}</p>
                      ) : (
                        <FormPerubahan jadwalId={e.id} tanggal={tanggal} tersedia={tersedia[e.id] ?? []} ruang={ruang ?? []} label={label} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-2xl">Semua perubahan tanggal ini</h2>
            {perubahan.length === 0 ? <p className="text-sm text-black/50">Belum ada.</p> : (
              <ul className="space-y-2">
                {perubahan
                  .map((p) => ({ p, e: entriPeta.get(p.jadwal_id) }))
                  .sort((a, b) => (a.e?.jp_ke ?? 0) - (b.e?.jp_ke ?? 0))
                  .map(({ p, e }) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-black/5">
                      <span>
                        <strong>JP {e?.jp_ke}</strong> · {e?.kelas} · {e?.mapel} <span className="text-black/50">({e?.guru})</span>
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">{JENIS_PERUBAHAN[p.jenis]}</span>
                        <span className="block text-black/70">{teksPerubahan(p, nama)}{p.catatan && ` — ${p.catatan}`}</span>
                      </span>
                      <form action={hapusPerubahan}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="kembali" value={url(guruPilih)} />
                        <button className="text-xs text-blue-teks underline">batalkan</button>
                      </form>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
