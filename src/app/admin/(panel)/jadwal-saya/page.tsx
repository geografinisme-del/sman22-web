import Link from "next/link";
import { JudulHalaman, KosongAdmin } from "@/components/admin/ui";
import { TombolCetak } from "@/components/jadwal/Bantu";
import { JadwalMingguan } from "@/components/jadwal/JadwalMingguan";
import { geserTanggal, hariIniWIB } from "@/lib/admin/absensi";
import { wajibLogin } from "@/lib/admin/auth";
import { jamPendek, namaHari, type Entri } from "@/lib/admin/jadwal";
import { muatEntri, muatJam, muatPerubahan, namaUntukPerubahan, teksPerubahan } from "@/lib/admin/jadwal-data";
import { formatTanggal } from "@/lib/format";

export const metadata = { title: "Jadwal Saya" };

export default async function JadwalSaya() {
  const { supabase } = await wajibLogin();
  const { data: saya } = await supabase.rpc("pegawai_saya");
  if (!saya) return (
    <>
      <JudulHalaman judul="Jadwal Saya" />
      <KosongAdmin teks="Akun Anda belum ditautkan ke data guru. Minta super admin menautkannya di menu Pengguna & Peran." />
    </>
  );
  const hari = hariIniWIB();
  const isoHari = ((new Date(hari + "T00:00:00Z").getUTCDay() + 6) % 7) + 1;
  const [jam, entri, perubahanHariIni, { data: menggantikan }, { data: ta }] = await Promise.all([
    muatJam(supabase),
    muatEntri(supabase, "pegawai_id", saya as string),
    muatPerubahan(supabase, hari),
    supabase.from("perubahan_jadwal").select("id, jadwal_id, tanggal, catatan").eq("pegawai_pengganti_id", saya).gte("tanggal", hari).lte("tanggal", geserTanggal(hari, 13)).order("tanggal"),
    supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle(),
  ]);
  const { data: libur } = await supabase.from("hari_libur").select("keterangan").eq("tanggal", hari).maybeSingle();
  const { data: piket } = ta ? await supabase.from("piket_guru").select("hari").eq("pegawai_id", saya).eq("tahun_ajaran_id", ta.id) : { data: [] };
  const nama = await namaUntukPerubahan(supabase, perubahanHariIni);
  const idHariIni = [...entri.filter((e) => e.hari === isoHari).map((e) => e.id), ...(menggantikan ?? []).filter((m) => m.tanggal === hari).map((m) => m.jadwal_id)];
  const { data: sudahJurnal } = idHariIni.length
    ? await supabase.from("jurnal_jp").select("jadwal_id").eq("tanggal", hari).in("jadwal_id", idHariIni)
    : { data: [] };
  const terisi = new Set((sudahJurnal ?? []).map((x) => x.jadwal_id));
  const catatan = Object.fromEntries(perubahanHariIni.filter((p) => entri.some((e) => e.id === p.jadwal_id)).map((p) => [p.jadwal_id, teksPerubahan(p, nama)]));

  const idGanti = (menggantikan ?? []).map((m) => m.jadwal_id);
  const { data: slotGanti } = idGanti.length
    ? await supabase.from("jadwal_lengkap").select("id, hari, jp_ke, kelas, mapel, guru, jam_mulai, jam_selesai").in("id", idGanti)
    : { data: [] };
  const petaGanti = new Map(((slotGanti ?? []) as (Entri & { jam_mulai: string; jam_selesai: string })[]).map((s) => [s.id, s]));
  const waktu = new Map(jam.filter((j) => j.jp_ke).map((j) => [`${j.hari}-${j.jp_ke}`, `${jamPendek(j.jam_mulai)}–${jamPendek(j.jam_selesai)}`]));

  // daftar hari ini: jadwal sendiri + tugas menggantikan hari ini
  const hariIni = [
    ...entri.filter((e) => e.hari === isoHari).map((e) => ({ id: e.id, jp: e.jp_ke, teks: `${e.kelas} · ${e.mapel}${e.ruang ? ` · ${e.ruang}` : ""}`, ket: catatan[e.id], absen: !catatan[e.id] })),
    ...(menggantikan ?? []).filter((m) => m.tanggal === hari).map((m) => {
      const s = petaGanti.get(m.jadwal_id);
      return { id: m.jadwal_id, jp: s?.jp_ke ?? 0, teks: `${s?.kelas} · ${s?.mapel}`, ket: `Menggantikan ${s?.guru ?? ""}${m.catatan ? ` — ${m.catatan}` : ""}`, absen: true };
    }),
  ].sort((a, b) => a.jp - b.jp);

  return (
    <>
      <JudulHalaman judul="Jadwal Saya" deskripsi={`${entri.length} JP per minggu${piket?.length ? ` · Piket hari ${piket.map((p) => namaHari(p.hari)).join(", ")}` : ""}`} aksi={<div className="flex gap-2 print:hidden"><Link href="/admin/tukar-jam" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15 hover:bg-black/5">Tukar jam</Link><TombolCetak /></div>} />

      <section className="mb-8 rounded-2xl bg-white p-5 ring-1 ring-black/5 print:hidden">
        <h2 className="font-serif text-2xl">Hari ini · {formatTanggal(hari, { weekday: "long" })}</h2>
        {libur && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 ring-1 ring-red-200">Hari ini libur: {libur.keterangan}</p>}
        {piket?.some((p) => p.hari === isoHari) && <p className="mt-2 inline-block rounded-full bg-accent-400/30 px-3 py-1 text-sm font-semibold">Anda bertugas piket hari ini</p>}
        {hariIni.length === 0 ? <p className="mt-2 text-sm text-black/50">Tidak ada jam mengajar hari ini.</p> : (
          <ul className="mt-3 divide-y divide-black/5">
            {hariIni.map((h, i) => (
              <li key={i} className={`flex gap-4 py-2.5 text-sm ${h.ket ? "font-medium" : ""}`}>
                <span className="w-28 shrink-0 text-black/50">JP {h.jp} · {waktu.get(`${isoHari}-${h.jp}`)}</span>
                <span className="flex-1">{h.teks}{h.ket && <span className="block text-amber-800">{h.ket}</span>}</span>
                {h.absen && (
                  <Link href={`/admin/absen-jp/${h.id}`} className={`shrink-0 self-center rounded-full px-3 py-1.5 text-xs font-semibold ${terisi.has(h.id) ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-brand-900 text-white"}`}>
                    {terisi.has(h.id) ? "✓ Absen & jurnal" : "Absen kelas"}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
        {(menggantikan ?? []).some((m) => m.tanggal > hari) && (
          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm ring-1 ring-amber-200">
            <p className="font-semibold">Tugas menggantikan berikutnya</p>
            <ul className="mt-1 space-y-0.5">
              {(menggantikan ?? []).filter((m) => m.tanggal > hari).map((m) => {
                const s = petaGanti.get(m.jadwal_id);
                return <li key={m.id}>{formatTanggal(m.tanggal, { weekday: "short" })} · JP {s?.jp_ke} · {s?.kelas} {s?.mapel} (menggantikan {s?.guru})</li>;
              })}
            </ul>
          </div>
        )}
      </section>

      <JadwalMingguan jam={jam} entri={entri} mode="guru" hariIni={isoHari} catatan={catatan} />
    </>
  );
}
