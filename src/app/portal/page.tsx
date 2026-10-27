import Link from "next/link";
import { STATUS_SISWA_ABSEN, awalBulan, hariIniWIB, type KodeAbsen } from "@/lib/admin/absensi";
import { getPengumuman } from "@/lib/data";
import { formatTanggal } from "@/lib/format";
import { konteksPortal } from "./data";
import { catatanContoh, rekapContoh, WALI_CONTOH } from "./contoh";

export const metadata = { title: "Beranda" };

type Rekap = { sakit: number; izin: number; alpa: number; terlambat: number; pulang_cepat: number; hari_efektif: number; persen_hadir: number | null };
type Disiplin = { siswa_id: string; jenis: string; jumlah: number; label: string; dikonfirmasi: boolean };

export default async function BerandaPortal() {
  const { supabase, anak, contoh } = await konteksPortal();
  const hari = hariIniWIB();
  const [disiplinRes, pengumuman, { data: sv }] = await Promise.all([supabase.rpc("status_disiplin"), getPengumuman(3), supabase.rpc("survei_aktif")]);
  const survei = ((sv ?? []) as { id: string; judul: string; sudah: boolean }[]).filter((x) => !x.sudah);
  const disiplin = (disiplinRes.data ?? []) as Disiplin[];

  const kartu = await Promise.all(
    anak.map(async (a) => {
      // pratinjau: kehadiran contoh (fiktif) — tidak ada query data siswa
      if (contoh) return { a, r: rekapContoh(a.id) as Rekap, terakhir: catatanContoh(a.id, hari), wali: WALI_CONTOH, jp: [] };
      const [{ data: rekap }, { data: terakhir }, { data: wali }, { data: jp }] = await Promise.all([
        a.kelas_id ? supabase.rpc("rekap_absensi_kelas", { p_kelas: a.kelas_id, p_dari: awalBulan(hari), p_sampai: hari }) : Promise.resolve({ data: [] }),
        supabase.from("absensi_siswa").select("tanggal, status, keterangan").eq("siswa_id", a.id).order("tanggal", { ascending: false }).limit(5),
        a.kelas_id ? supabase.from("kelas_ringkasan").select("wali_kelas").eq("id", a.kelas_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("absensi_jp").select("tanggal, status, keterangan, jadwal:jadwal_id(jp_ke, penugasan:penugasan_id(mapel:mapel_id(nama)))").eq("siswa_id", a.id).gte("tanggal", awalBulan(hari)).order("tanggal", { ascending: false }).limit(8),
      ]);
      const r = ((rekap ?? []) as (Rekap & { siswa_id: string })[]).find((x) => x.siswa_id === a.id);
      type BarisJp = { tanggal: string; status: string; keterangan: string; jadwal: { jp_ke: number; penugasan: { mapel: { nama: string } | null } | null } | null };
      return { a, r, terakhir: terakhir ?? [], wali: (wali as { wali_kelas?: string } | null)?.wali_kelas ?? null, jp: (jp ?? []) as unknown as BarisJp[] };
    }),
  );

  return (
    <div className="space-y-6">
      {survei.map((x) => (
        <Link key={x.id} href={`/survei/${x.id}`} className="flex items-center gap-3 rounded-2xl bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-200">
          <span className="flex-1"><strong>Survei:</strong> {x.judul}</span><span className="font-semibold underline">Isi sekarang →</span>
        </Link>
      ))}
      {anak.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-[var(--muted)] ring-1 ring-black/5">
          Akun Anda belum terhubung dengan data siswa. Silakan hubungi wali kelas atau tata usaha.
        </p>
      )}
      {kartu.map(({ a, r, terakhir, wali, jp }) => {
        const sp = disiplin.filter((d) => d.siswa_id === a.id);
        const perlu = sp.filter((d) => !d.dikonfirmasi);
        return (
          <section key={a.id} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
            <div className="bg-ink/85 px-5 py-5 text-white">
              <p className="text-3xl leading-tight">{a.nama}</p>
              <p className="mt-1 text-sm text-white/70">
                {a.kelas ? `Kelas ${a.kelas}` : "Belum ada kelas"}
                {wali && ` · Wali kelas: ${wali}`}
                {a.nisn && ` · NISN ${a.nisn}`}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-semibold text-[var(--muted)]">Kehadiran bulan ini</p>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center sm:grid-cols-5">
                <div className="col-span-4 rounded-2xl bg-emerald-50 p-3 sm:col-span-1">
                  <p className="text-4xl text-emerald-800">{r?.persen_hadir == null ? "—" : `${r.persen_hadir}%`}</p>
                  <p className="text-xs text-emerald-800">hadir ({r?.hari_efektif ?? 0} hari)</p>
                </div>
                {[
                  ["Sakit", r?.sakit],
                  ["Izin", r?.izin],
                  ["Alpa", r?.alpa],
                  ["Terlambat", r?.terlambat],
                ].map(([l, n]) => (
                  <div key={l as string} className="rounded-2xl bg-soft p-3">
                    <p className={`text-3xl ${l === "Alpa" && Number(n) > 0 ? "text-red-700" : ""}`}>{n ?? 0}</p>
                    <p className="text-xs text-[var(--muted)]">{l}</p>
                  </div>
                ))}
              </div>

              {perlu.length > 0 && (
                <div role="alert" className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
                  <strong>Perhatian:</strong> {perlu.map((p) => `${p.label} (${p.jumlah}× ${p.jenis})`).join(", ")}. Sekolah akan menghubungi Bapak/Ibu.
                </div>
              )}
              {sp.some((d) => d.dikonfirmasi) && (
                <p className="mt-3 text-sm text-[var(--muted)]">Sudah ditindaklanjuti: {sp.filter((d) => d.dikonfirmasi).map((d) => d.label).join(", ")}</p>
              )}

              <p className="mt-6 text-xs font-semibold text-[var(--muted)]">Catatan terakhir</p>
              {terakhir.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--muted)]">Belum ada catatan ketidakhadiran. Bagus!</p>
              ) : (
                <ul className="mt-2 divide-y divide-black/5 text-sm">
                  {terakhir.map((t) => (
                    <li key={t.tanggal} className="flex items-center justify-between gap-3 py-2">
                      <span>{formatTanggal(t.tanggal, { weekday: "short" })}{t.keterangan && <span className="text-[var(--muted)]"> · {t.keterangan}</span>}</span>
                      <span className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold text-white ${STATUS_SISWA_ABSEN[t.status as KodeAbsen].warna}`}>
                        {STATUS_SISWA_ABSEN[t.status as KodeAbsen].label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {jp.length > 0 && (
                <>
                  <p className="mt-6 text-xs font-semibold text-[var(--muted)]">Catatan per jam pelajaran (bulan ini)</p>
                  <ul className="mt-2 divide-y divide-black/5 text-sm">
                    {jp.map((x, i) => (
                      <li key={i} className="flex justify-between gap-3 py-2">
                        <span>{formatTanggal(x.tanggal, { weekday: "short" })} · JP {x.jadwal?.jp_ke} {x.jadwal?.penugasan?.mapel?.nama}{x.keterangan && <span className="text-[var(--muted)]"> · {x.keterangan}</span>}</span>
                        <span className="shrink-0 font-semibold">{({ S: "Sakit", I: "Izin", A: "Tidak di kelas", T: "Terlambat", D: "Dispensasi" } as Record<string, string>)[x.status]}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <Link href={`/portal/anak/${a.id}`} className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">
                Lihat kalender kehadiran →
              </Link>
            </div>
          </section>
        );
      })}

      {pengumuman.length > 0 && (
        <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
          <h2 className="text-2xl">Pengumuman sekolah</h2>
          <ul className="mt-3 space-y-3">
            {pengumuman.map((p) => (
              <li key={p.id} className="text-sm">
                <p className="font-semibold">{p.penting && <span className="mr-2 rounded bg-lime px-1.5 text-xs">PENTING</span>}{p.judul}</p>
                {p.isi && <p className="text-[var(--muted)]">{p.isi}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
