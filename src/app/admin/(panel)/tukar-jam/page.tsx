import { JudulHalaman, Kartu, KosongAdmin, Notifikasi } from "@/components/admin/ui";
import { FormTukar } from "@/components/jadwal/FormTukar";
import { geserTanggal, hariIniWIB } from "@/lib/admin/absensi";
import { wajibBoleh } from "@/lib/admin/auth";
import { BOLEH } from "@/lib/admin/akses-modul";
import { uuid } from "@/lib/admin/schema";
import { muatTukar, STATUS_TUKAR, type BarisTukar } from "@/lib/admin/tukar";
import { batalkanTukar, jawabTukar } from "../../actions-tukar";

export const metadata = { title: "Tukar Jam" };

const KOLOM_SLOT = "id, hari, jp_ke, kelas, mapel";
type Slot = { id: string; hari: number; jp_ke: number; kelas: string; mapel: string };

function Status({ s }: { s: string }) {
  const x = STATUS_TUKAR[s];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${x?.warna ?? ""}`}>{x?.label ?? s}</span>;
}

function Rincian({ t }: { t: BarisTukar }) {
  return (
    <div className="text-sm">
      <p><span className="text-black/50">{t.pemohon} melepas:</span> {t.slotPemohon}</p>
      {t.slotMitra && <p><span className="text-black/50">{t.mitra} melepas:</span> {t.slotMitra}</p>}
      <p className="text-black/60">Alasan: {t.alasan}</p>
      {t.catatan_mitra && <p className="text-black/60">Jawaban {t.mitra}: {t.catatan_mitra}</p>}
      {t.catatan_putusan && <p className="text-black/60">Kurikulum: {t.catatan_putusan}</p>}
    </div>
  );
}

export default async function TukarJam({ searchParams }: { searchParams: Promise<{ mitra?: string; pesan?: string; galat?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await wajibBoleh(BOLEH.mengajar);
  const { data: saya } = await supabase.rpc("pegawai_saya");
  if (!saya)
    return (
      <>
        <JudulHalaman judul="Tukar Jam" />
        <KosongAdmin teks="Akun Anda belum ditautkan ke data guru. Minta super admin menautkannya di menu Pengguna & Peran." />
      </>
    );
  const mitra = sp.mitra && uuid.safeParse(sp.mitra).success ? sp.mitra : "";
  const hariIni = hariIniWIB();
  const [{ data: guru }, { data: slotSaya }, { data: slotMitra }, { data: libur }, daftar] = await Promise.all([
    supabase.rpc("guru_berakun"),
    supabase.from("jadwal_lengkap").select(KOLOM_SLOT).eq("tahun_aktif", true).eq("pegawai_id", saya).order("hari").order("jp_ke"),
    mitra ? supabase.from("jadwal_lengkap").select(KOLOM_SLOT).eq("tahun_aktif", true).eq("pegawai_id", mitra).order("hari").order("jp_ke") : Promise.resolve({ data: [] }),
    supabase.from("hari_libur").select("tanggal").gte("tanggal", hariIni).lte("tanggal", geserTanggal(hariIni, 30)),
    muatTukar(supabase, (q) => q),
  ]);
  // tanggal yang bisa dipilih per hari (30 hari ke depan, tanpa hari libur)
  const tglLibur = new Set((libur ?? []).map((l) => l.tanggal as string));
  const tanggal: Record<number, { nilai: string; label: string }[]> = {};
  for (let i = 0; i <= 30; i++) {
    const t = geserTanggal(hariIni, i);
    const h = ((new Date(t + "T00:00:00Z").getUTCDay() + 6) % 7) + 1;
    if (tglLibur.has(t) || h === 7) continue;
    (tanggal[h] ??= []).push({ nilai: t, label: new Date(t + "T00:00:00Z").toLocaleDateString("id-ID", { day: "numeric", month: "long", timeZone: "UTC" }) + (i === 0 ? " (hari ini)" : "") });
  }

  const masuk = daftar.filter((t) => t.mitra_id === saya && t.status === "menunggu_mitra");
  const milikSaya = daftar.filter((t) => t.pemohon_id === saya);
  const lainnya = daftar.filter((t) => t.mitra_id === saya && t.status !== "menunggu_mitra");

  return (
    <>
      <JudulHalaman judul="Tukar Jam" deskripsi="Ajukan tukar jam mengajar atau minta digantikan guru lain. Alur: guru tujuan menerima → kurikulum menyetujui → jadwal hari itu berubah otomatis." />
      <Notifikasi kode={sp.pesan} />
      {sp.galat && <p role="alert" className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">{sp.galat}</p>}

      {masuk.length > 0 && (
        <Kartu className="mb-6 ring-2 ring-lime">
          <h2 className="mb-3 text-2xl">Permintaan untuk Anda</h2>
          <ul className="space-y-4">
            {masuk.map((t) => (
              <li key={t.id} className="rounded-xl bg-soft p-4">
                <p className="mb-1 font-semibold">{t.pemohon} {t.slotMitra ? "mengajak tukar jam" : "meminta Anda menggantikan"}</p>
                <Rincian t={t} />
                <form action={jawabTukar} className="mt-3 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={t.id} />
                  <input name="catatan" maxLength={300} placeholder="Catatan (opsional)" aria-label="Catatan" className="min-w-48 flex-1 rounded-xl border border-black/15 bg-white px-3 py-2 text-sm" />
                  <button name="terima" value="1" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Terima</button>
                  <button name="terima" value="0" className="rounded-full px-4 py-2 text-sm font-semibold text-blue-teks ring-1 ring-blue/30">Tolak</button>
                </form>
              </li>
            ))}
          </ul>
        </Kartu>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Kartu>
          <h2 className="mb-4 text-2xl">Ajukan baru</h2>
          {(slotSaya ?? []).length === 0 ? (
            <p className="text-sm text-black/50">Anda belum punya jam mengajar di jadwal tahun ajaran aktif.</p>
          ) : (
            <FormTukar guru={(guru ?? []) as { id: string; nama: string }[]} mitra={mitra} slotSaya={(slotSaya ?? []) as Slot[]} slotMitra={(slotMitra ?? []) as Slot[]} tanggal={tanggal} />
          )}
        </Kartu>
        <Kartu>
          <h2 className="mb-3 text-2xl">Pengajuan saya</h2>
          {milikSaya.length === 0 ? <p className="text-sm text-black/50">Belum ada.</p> : (
            <ul className="divide-y divide-black/5">
              {milikSaya.map((t) => (
                <li key={t.id} className="space-y-1.5 py-3">
                  <div className="flex items-center gap-2"><Status s={t.status} /><span className="text-sm font-semibold">dengan {t.mitra}</span></div>
                  <Rincian t={t} />
                  {(t.status === "menunggu_mitra" || t.status === "menunggu_kurikulum") && (
                    <form action={batalkanTukar}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="text-xs font-semibold text-blue-teks underline">Batalkan</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          {lainnya.length > 0 && (
            <>
              <h3 className="mb-2 mt-6 font-semibold">Yang pernah Anda jawab</h3>
              <ul className="divide-y divide-black/5">
                {lainnya.map((t) => (
                  <li key={t.id} className="space-y-1.5 py-3">
                    <div className="flex items-center gap-2"><Status s={t.status} /><span className="text-sm font-semibold">dari {t.pemohon}</span></div>
                    <Rincian t={t} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Kartu>
      </div>
    </>
  );
}
