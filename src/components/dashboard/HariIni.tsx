import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GrafikTidakHadir } from "@/components/dashboard/GrafikTidakHadir";
import { awalBulan, geserTanggal, hariIniWIB } from "@/lib/admin/absensi";
import { JENIS_KEGIATAN, KOLOM_KEGIATAN, rentangTanggal, type Kegiatan } from "@/lib/kalender";
import { berperan, punya, type Akses } from "@/lib/admin/auth";
import { trenTidakHadir } from "@/lib/dashboard";

const n = (r: { count: number | null }) => r.count ?? 0;

function Kpi({ nilai, label, href, nada }: { nilai: number | string; label: string; href?: string; nada?: "peringatan" }) {
  const isi = (
    <>
      <p className={`font-serif text-4xl leading-none tabular-nums ${nada ? "text-amber-700" : ""}`}>{nilai}</p>
      <p className="mt-2 text-sm text-black/60">{label}</p>
    </>
  );
  return href ? <Link href={href} className="block rounded-2xl bg-white p-4 ring-1 ring-black/5 hover:ring-brand-600">{isi}</Link> : <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">{isi}</div>;
}

/** Bagian atas Ringkasan: hal yang perlu ditindaklanjuti & kondisi hari ini, sesuai peran */
export async function BagianHariIni({ supabase, akses }: { supabase: SupabaseClient; akses: Akses }) {
  const hari = hariIniWIB();
  const iso = ((new Date(hari + "T00:00:00Z").getUTCDay() + 6) % 7) + 1;
  const q = (t: string) => supabase.from(t).select("*", { count: "exact", head: true });
  const kosong = Promise.resolve({ count: 0 });
  const wali = berperan(akses, "wali_kelas");

  const { data: pid } = await supabase.rpc("pegawai_saya");
  const [berita, izinPeg, koreksi, izinOrtu, pel, pre, rujukan, gagal, disiplin, jadwalSaya] = await Promise.all([
    punya(akses, "konten.terbitkan") ? q("berita").eq("status", "diajukan").is("deleted_at", null) : kosong,
    punya(akses, "izin_pegawai.setujui") ? q("pengajuan_izin_pegawai").eq("status", "menunggu") : kosong,
    punya(akses, "absensi.kelola") ? q("pengajuan_koreksi").eq("status", "menunggu") : kosong,
    punya(akses, "absensi.kelola") || wali ? q("izin_ortu").eq("status", "menunggu") : kosong,
    punya(akses, "kesiswaan.kelola") ? q("pelanggaran_siswa").eq("status", "dilaporkan") : kosong,
    punya(akses, "kesiswaan.kelola") ? q("prestasi_siswa").eq("status", "diajukan") : kosong,
    punya(akses, "bk.rujukan") ? q("rujukan_bk").eq("status", "baru") : kosong,
    punya(akses, "pengguna.kelola") ? q("antrian_kirim").eq("status", "gagal") : kosong,
    punya(akses, "disiplin.kelola") ? supabase.rpc("status_disiplin") : Promise.resolve({ data: [] }),
    pid ? supabase.from("jadwal_lengkap").select("id").eq("pegawai_id", pid).eq("hari", iso).eq("tahun_aktif", true) : Promise.resolve({ data: [] }),
  ]);
  const [tukarMasuk, tukarKur, { data: agenda }, perangkat, supervisi, revisi, perluNilai, pinjam, rusak] = await Promise.all([
    pid ? q("pengajuan_tukar_jadwal").eq("mitra_id", pid).eq("status", "menunggu_mitra") : kosong,
    punya(akses, "jadwal.kelola") ? q("pengajuan_tukar_jadwal").eq("status", "menunggu_kurikulum") : kosong,
    supabase.from("kegiatan_kalender").select(KOLOM_KEGIATAN).is("deleted_at", null).gte("selesai", hari).lte("mulai", geserTanggal(hari, 14)).order("mulai").limit(6),
    punya(akses, "kurikulum.kelola") ? q("perangkat_ajar").eq("status", "diajukan").is("deleted_at", null) : kosong,
    pid ? q("supervisi_akademik").eq("supervisor_id", pid).eq("status", "terjadwal").lte("tanggal", hari) : kosong,
    pid ? q("perangkat_ajar").eq("pegawai_id", pid).eq("status", "revisi").is("deleted_at", null) : kosong,
    pid ? supabase.from("pengumpulan_tugas").select("id, tugas!inner(pegawai_id)", { count: "exact", head: true }).eq("status", "dikumpulkan").eq("tugas.pegawai_id", pid) : kosong,
    punya(akses, "sarpras.kelola") ? q("peminjaman").eq("status", "diajukan") : kosong,
    punya(akses, "sarpras.kelola") ? q("laporan_kerusakan").eq("status", "dilaporkan") : kosong,
  ]);
  const awal = new Date(Date.parse(`${hari}T00:00:00+07:00`)).toISOString();
  const [aduanBaru, aduanLewat, telatPerpus, tamu] = await Promise.all([
    q("pengaduan").eq("status", "baru"),
    q("pengaduan").in("status", ["baru", "diproses"]).lt("tenggat", hari),
    punya(akses, "perpus.kelola") ? q("pinjaman_buku").is("kembali_pada", null).lt("jatuh_tempo", hari) : kosong,
    pid ? q("buku_tamu").eq("bertemu_id", pid).is("keluar", null).gte("masuk", awal) : kosong,
  ]);
  const [daftarAlumni, evalMutu, revisiMutu] = await Promise.all([
    punya(akses, "alumni.kelola") ? q("pendaftaran_alumni").eq("status", "menunggu") : kosong,
    punya(akses, "mutu.kelola") || punya(akses, "mutu.audit") ? q("evaluasi_indikator").eq("persetujuan", "diajukan") : kosong,
    pid ? supabase.from("evaluasi_indikator").select("id, indikator_mutu!inner(pemilik_id)", { count: "exact", head: true }).eq("persetujuan", "revisi").eq("indikator_mutu.pemilik_id", pid) : kosong,
  ]);
  const [mintaBk, sesiBk, ajuEkskul] = await Promise.all([
    punya(akses, "bk.konseling") ? q("permintaan_konseling").eq("status", "baru") : kosong,
    punya(akses, "bk.konseling") && pid ? q("sesi_konseling").eq("konselor_id", pid).eq("status", "terjadwal").gte("mulai", awal).lt("mulai", new Date(Date.parse(awal) + 864e5).toISOString()) : kosong,
    punya(akses, "ekskul.kelola") ? q("pengajuan_kegiatan").in("status", ["disetujui_pembina", "lpj_diajukan"]) : kosong,
  ]);
  const idJadwal = ((jadwalSaya as { data: { id: string }[] | null }).data ?? []).map((j) => j.id);
  const { count: jurnalAda } = idJadwal.length ? await q("jurnal_jp").eq("tanggal", hari).in("jadwal_id", idJadwal) : { count: 0 };
  const spBelum = (((disiplin as { data: unknown }).data ?? []) as { dikonfirmasi: boolean }[]).filter((d) => !d.dikonfirmasi).length;

  const tugas = [
    { n: n(berita), t: "berita menunggu persetujuan", href: "/admin/persetujuan" },
    { n: n(izinPeg), t: "pengajuan izin/cuti guru", href: "/admin/izin-pegawai" },
    { n: n(izinOrtu), t: "izin/sakit dari orang tua", href: "/admin/izin-ortu" },
    { n: n(koreksi), t: "pengajuan koreksi absensi", href: "/admin/absensi/pengajuan" },
    { n: n(pel) + n(pre), t: "laporan pelanggaran/prestasi perlu verifikasi", href: "/admin/kesiswaan" },
    { n: n(rujukan), t: "rujukan BK baru", href: "/admin/rujukan-bk" },
    { n: spBelum, t: "SP/panggilan orang tua belum ditindaklanjuti", href: "/admin/absensi/disiplin" },
    { n: Math.max(0, idJadwal.length - (jurnalAda ?? 0)), t: "jam mengajar hari ini belum diabsen/dijurnal", href: "/admin/jadwal-saya" },
    { n: n(tukarMasuk), t: "permintaan tukar jam untuk Anda", href: "/admin/tukar-jam" },
    { n: n(tukarKur), t: "tukar jam menunggu persetujuan", href: "/admin/jadwal/tukar" },
    { n: n(perangkat), t: "perangkat ajar menunggu diperiksa", href: "/admin/perangkat-ajar/review" },
    { n: n(revisi), t: "perangkat ajar Anda perlu revisi", href: "/admin/perangkat-ajar" },
    { n: n(supervisi), t: "supervisi akademik yang perlu Anda nilai", href: "/admin/supervisi" },
    { n: n(perluNilai), t: "tugas siswa menunggu dinilai", href: "/admin/lms" },
    { n: n(pinjam), t: "peminjaman ruang/barang menunggu persetujuan", href: "/admin/sarpras/peminjaman" },
    { n: n(rusak), t: "laporan kerusakan baru", href: "/admin/sarpras/kerusakan" },
    { n: n(tamu), t: "tamu menunggu Anda", href: "/admin/buku-tamu" },
    { n: n(mintaBk), t: "permintaan layanan BK baru", href: "/admin/bk" },
    { n: n(daftarAlumni), t: "pendaftaran alumni menunggu verifikasi", href: "/admin/alumni/pendaftaran" },
    { n: n(evalMutu), t: "evaluasi indikator mutu menunggu tinjauan", href: "/admin/mutu" },
    { n: n(revisiMutu), t: "evaluasi indikator mutu Anda perlu revisi", href: "/admin/mutu" },
    { n: n(sesiBk), t: "sesi BK Anda hari ini", href: "/admin/bk" },
    { n: n(ajuEkskul), t: "pengajuan kegiatan/LPJ organisasi siswa menunggu persetujuan", href: "/admin/ekskul/pengajuan" },
    { n: n(aduanBaru), t: "pengaduan baru", href: "/admin/pengaduan?status=baru" },
    { n: n(aduanLewat), t: "pengaduan melewati tenggat", href: "/admin/pengaduan" },
    { n: n(telatPerpus), t: "buku perpustakaan terlambat dikembalikan", href: "/admin/perpus/laporan" },
    { n: n(gagal), t: "notifikasi WhatsApp/email gagal terkirim", href: "/admin/notifikasi/kanal" },
  ].filter((x) => x.n > 0);

  // kondisi hari ini
  const lihatSiswa = punya(akses, "absensi.lihat");
  const lihatGuru = punya(akses, "absensi_pegawai.lihat");
  const [absHari, kelasDicek, totalKelas, tren, pegHari, totalPeg, kes] = await Promise.all([
    lihatSiswa ? supabase.from("absensi_siswa").select("status").eq("tanggal", hari) : Promise.resolve({ data: [] }),
    lihatSiswa ? q("absensi_kelas_harian").eq("tanggal", hari) : kosong,
    lihatSiswa ? supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle().then(async ({ data }) => (data ? q("kelas").eq("tahun_ajaran_id", data.id).is("deleted_at", null) : { count: 0 })) : kosong,
    lihatSiswa ? trenTidakHadir(supabase) : Promise.resolve([]),
    lihatGuru ? supabase.from("absensi_pegawai").select("status, jam_masuk").eq("tanggal", hari) : Promise.resolve({ data: [] }),
    lihatGuru ? q("pegawai").eq("status", "aktif").is("deleted_at", null) : kosong,
    punya(akses, "kesiswaan.lihat")
      ? Promise.all([q("prestasi_siswa").eq("status", "terverifikasi").gte("tanggal", awalBulan(hari)), q("pelanggaran_siswa").eq("status", "terverifikasi").gte("tanggal", awalBulan(hari))])
      : Promise.resolve(null),
  ]);
  const hit = (list: { status: string }[] | null, s: string) => (list ?? []).filter((x) => x.status === s).length;
  const a = (absHari as { data: { status: string }[] | null }).data;
  const p = (pegHari as { data: { status: string; jam_masuk: string | null }[] | null }).data ?? [];

  return (
    <div className="mb-10 space-y-8">
      <section aria-labelledby="tugas">
        <h2 id="tugas" className="mb-3 font-serif text-3xl">Perlu ditindaklanjuti</h2>
        {!tugas.length ? (
          <p className="rounded-2xl bg-emerald-50 px-5 py-4 text-sm text-emerald-900 ring-1 ring-emerald-200">Semua beres. Tidak ada yang menunggu Anda saat ini.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {tugas.map((x) => (
              <li key={x.href}>
                <Link href={x.href} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5 hover:ring-brand-600">
                  <span className="grid h-9 min-w-9 place-items-center rounded-full bg-amber-100 px-2 font-semibold text-amber-900">{x.n}</span>
                  <span className="text-sm">{x.t} →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(agenda ?? []).length > 0 && (
        <section aria-labelledby="agenda-dekat">
          <h2 id="agenda-dekat" className="mb-3 font-serif text-3xl">Kalender 2 minggu ke depan</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {((agenda ?? []) as Kegiatan[]).map((k) => (
              <li key={k.id}>
                <Link href={`/admin/kalender?bulan=${k.mulai.slice(0, 7)}`} className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-black/5 hover:ring-brand-600">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${JENIS_KEGIATAN[k.jenis].titik}`} aria-hidden />
                  <span><span className="block font-semibold">{k.judul}</span><span className="text-black/60">{rentangTanggal(k.mulai, k.selesai)}{k.kbm_libur && " · tanpa KBM"}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lihatSiswa && (
        <section aria-labelledby="siswa-hari-ini">
          <h2 id="siswa-hari-ini" className="mb-3 font-serif text-3xl">Kehadiran siswa hari ini</h2>
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <li><Kpi nilai={`${n(kelasDicek)}/${n(totalKelas as { count: number | null })}`} label="kelas sudah diabsen" href="/admin/absensi" nada={n(kelasDicek) < n(totalKelas as { count: number | null }) ? "peringatan" : undefined} /></li>
              <li><Kpi nilai={hit(a, "S")} label="sakit" /></li>
              <li><Kpi nilai={hit(a, "I")} label="izin" /></li>
              <li><Kpi nilai={hit(a, "A")} label="alpa" nada={hit(a, "A") ? "peringatan" : undefined} /></li>
              <li><Kpi nilai={hit(a, "T")} label="terlambat" /></li>
              <li><Kpi nilai="→" label="per jam pelajaran" href="/admin/absensi/jp" /></li>
            </ul>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5"><GrafikTidakHadir data={tren as Awaited<ReturnType<typeof trenTidakHadir>>} /></div>
          </div>
        </section>
      )}

      {lihatGuru && (
        <section aria-labelledby="guru-hari-ini">
          <h2 id="guru-hari-ini" className="mb-3 font-serif text-3xl">Guru & pegawai hari ini</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <li><Kpi nilai={p.filter((x) => x.jam_masuk && x.status === "H").length} label="hadir tepat waktu" href="/admin/absensi/guru" /></li>
            <li><Kpi nilai={p.filter((x) => x.status === "T").length} label="terlambat" /></li>
            <li><Kpi nilai={p.filter((x) => ["S", "I", "DL", "C"].includes(x.status)).length} label="izin/sakit/dinas/cuti" /></li>
            <li><Kpi nilai={Math.max(0, n(totalPeg) - p.length)} label="belum presensi" nada="peringatan" /></li>
          </ul>
        </section>
      )}

      {kes && (
        <section aria-labelledby="kesiswaan-bulan">
          <h2 id="kesiswaan-bulan" className="mb-3 font-serif text-3xl">Kesiswaan bulan ini</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <li><Kpi nilai={n(kes[0])} label="prestasi terverifikasi" href="/admin/kesiswaan" /></li>
            <li><Kpi nilai={n(kes[1])} label="pelanggaran terverifikasi" href="/admin/kesiswaan" /></li>
          </ul>
        </section>
      )}
    </div>
  );
}
