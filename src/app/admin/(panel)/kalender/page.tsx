import Link from "next/link";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormKegiatan } from "@/components/kalender/FormKegiatan";
import { bulanBerikut, KalenderBulan, LegendaKegiatan, namaBulan } from "@/components/kalender/Bulan";
import { hariIniWIB } from "@/lib/admin/absensi";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { JENIS_KEGIATAN, jamKegiatan, KOLOM_KEGIATAN, rentangTanggal, SASARAN, type Kegiatan } from "@/lib/kalender";
import { hapusKegiatan } from "../../actions-kalender";

export const metadata = { title: "Kalender Sekolah" };

export default async function Kalender({ searchParams }: { searchParams: Promise<{ bulan?: string; ubah?: string; pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const kelola = punya(akses, "kalender.kelola");
  const hariIni = hariIniWIB();
  const bulan = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.bulan ?? "") ? sp.bulan! : hariIni.slice(0, 7);
  const awal = `${bulan}-01`;
  const akhir = `${bulanBerikut(bulan, 1)}-01`;

  const [{ data: keg }, { data: libur }, ubah] = await Promise.all([
    supabase.from("kegiatan_kalender").select(KOLOM_KEGIATAN).is("deleted_at", null).lte("mulai", akhir).gte("selesai", bulanBerikut(bulan, -1) + "-20").order("mulai"),
    supabase.from("hari_libur").select("tanggal, keterangan").gte("tanggal", bulanBerikut(bulan, -1) + "-20").lte("tanggal", bulanBerikut(bulan, 1) + "-10"),
    kelola && sp.ubah && uuid.safeParse(sp.ubah).success
      ? supabase.from("kegiatan_kalender").select(KOLOM_KEGIATAN).eq("id", sp.ubah).maybeSingle().then((r) => r.data as Kegiatan | null)
      : Promise.resolve(null),
  ]);
  const kegiatan = (keg ?? []) as Kegiatan[];
  const diBulan = kegiatan.filter((k) => k.mulai < akhir && k.selesai >= awal);
  const petaLibur = new Map((libur ?? []).map((l) => [l.tanggal as string, l.keterangan as string]));

  return (
    <>
      <JudulHalaman
        judul="Kalender Sekolah"
        deskripsi="Kegiatan akademik, ujian, rapat, dan libur. Kegiatan “Umum” tampil di website; tanggal tanpa KBM otomatis menjadi hari libur absensi."
        aksi={<a href="/kalender.ics" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15 hover:bg-black/5">Langganan (iCal)</a>}
      />
      <Notifikasi kode={sp.pesan} />
      <div className={`grid gap-6 ${kelola ? "xl:grid-cols-[1fr_380px]" : ""}`}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Link href={`?bulan=${bulanBerikut(bulan, -1)}`} className="rounded-full px-3 py-1.5 ring-1 ring-black/15 hover:bg-black/5" aria-label="Bulan sebelumnya">←</Link>
            <h2 className="min-w-44 text-center text-2xl capitalize">{namaBulan(bulan)}</h2>
            <Link href={`?bulan=${bulanBerikut(bulan, 1)}`} className="rounded-full px-3 py-1.5 ring-1 ring-black/15 hover:bg-black/5" aria-label="Bulan berikutnya">→</Link>
            {bulan !== hariIni.slice(0, 7) && <Link href="?" className="ml-2 text-sm text-blue-teks underline">Bulan ini</Link>}
          </div>
          <LegendaKegiatan />
          <KalenderBulan bulan={bulan} kegiatan={kegiatan} libur={petaLibur} hariIni={hariIni} tautan={kelola ? (k) => `?bulan=${bulan}&ubah=${k.id}#form` : undefined} />

          <Kartu>
            <h2 className="mb-3 text-2xl">Daftar kegiatan bulan ini</h2>
            {diBulan.length === 0 ? (
              <p className="text-sm text-black/50">Belum ada kegiatan.</p>
            ) : (
              <ul className="divide-y divide-black/5">
                {diBulan.map((k) => (
                  <li key={k.id} className="flex flex-wrap items-start gap-3 py-3 text-sm">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${JENIS_KEGIATAN[k.jenis].warna}`}>{JENIS_KEGIATAN[k.jenis].label}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{k.judul}</span>
                      <span className="block text-black/60">
                        {rentangTanggal(k.mulai, k.selesai)}
                        {jamKegiatan(k) && ` · ${jamKegiatan(k)}`}
                        {k.lokasi && ` · ${k.lokasi}`}
                      </span>
                      {k.keterangan && <span className="mt-1 block whitespace-pre-line text-black/60">{k.keterangan}</span>}
                      <span className="mt-1 block text-xs text-black/40">
                        {SASARAN[k.sasaran].split(" — ")[0]}
                        {k.kbm_libur && " · tanpa KBM"}
                      </span>
                    </span>
                    {kelola && (
                      <span className="flex gap-2">
                        <Link href={`?bulan=${bulan}&ubah=${k.id}#form`} className="rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-black/15 hover:bg-black/5">Ubah</Link>
                        <form action={hapusKegiatan}>
                          <input type="hidden" name="id" value={k.id} />
                          <input type="hidden" name="bulan" value={bulan} />
                          <button type="submit" className="rounded-full px-3 py-1.5 text-xs font-semibold text-blue-teks ring-1 ring-blue/30 hover:bg-red-50">Hapus</button>
                        </form>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Kartu>
        </div>

        {kelola && (
          <Kartu className="self-start xl:sticky xl:top-8">
            <h2 id="form" className="mb-4 text-2xl">{ubah ? "Ubah kegiatan" : "Tambah kegiatan"}</h2>
            {ubah && <Link href={`?bulan=${bulan}`} className="mb-4 inline-block text-sm text-blue-teks underline">+ Tambah baru saja</Link>}
            <FormKegiatan key={ubah?.id ?? "baru"} data={ubah ?? undefined} tanggalAwal={bulan === hariIni.slice(0, 7) ? hariIni : awal} />
          </Kartu>
        )}
      </div>
    </>
  );
}
