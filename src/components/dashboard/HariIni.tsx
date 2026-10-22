import Link from "next/link";
import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertTriangle, ArrowRight, CircleCheck } from "lucide-react";
import { GrafikTidakHadir } from "@/components/dashboard/GrafikTidakHadir";
import { awalBulan, geserTanggal, hariIniWIB } from "@/lib/admin/absensi";
import { JENIS_KEGIATAN, KOLOM_KEGIATAN, rentangTanggal, type Kegiatan } from "@/lib/kalender";
import { berperan, punya, type Akses } from "@/lib/admin/auth";
import { trenTidakHadir } from "@/lib/dashboard";
import { hitungBersama, pegawaiSaya, statusDisiplin, tahunAjaranAktif, tugasPerluNilai, tukarUntukSaya, type Hitungan, type NamaHitungan } from "@/lib/admin/hitungan";
import { statistikSingkat } from "@/lib/admin/statistik-singkat";

const NAMA_HARI = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

/** jumlah dari kueri; null bila kueri gagal (jangan tampilkan sebagai nol) */
const n = (r: Hitungan) => (r.error ? null : (r.count ?? 0));

/** Panel ringkasan: permukaan putih, judul 18px, tindakan di kanan. */
export function Panel({ judul, aksi, children, className = "" }: { judul: string; aksi?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-[10px] border border-[var(--line)] bg-white p-5 ${className}`} aria-label={judul}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-semibold text-[var(--ink)]">{judul}</h2>
        {aksi}
      </div>
      {children}
    </section>
  );
}

/** Pesan keadaan (kosong, belum diatur, libur, gagal) — ringkas, tidak setinggi grafik. */
export function Keadaan({ jenis, children, aksi }: { jenis: "info" | "gagal"; children: ReactNode; aksi?: ReactNode }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm ${jenis === "gagal" ? "bg-red-50 text-red-900" : "bg-[var(--soft)] text-[var(--muted)]"}`} role={jenis === "gagal" ? "alert" : undefined}>
      <span className="flex items-start gap-2">
        {jenis === "gagal" && <AlertTriangle size={16} aria-hidden className="mt-0.5 shrink-0" />}
        <span>{children}</span>
      </span>
      {aksi}
    </div>
  );
}

const cobaLagi = (
  <a href="/admin" className="font-semibold underline underline-offset-2">
    Coba lagi
  </a>
);

function Angka({ nilai, label, catatan }: { nilai: number; label: string; catatan?: string }) {
  return (
    <div>
      <dt className="text-sm text-[var(--muted)]">{label}</dt>
      <dd className="mt-0.5 text-[1.625rem] font-semibold leading-none tabular-nums text-[var(--ink)]">
        {nilai}
        {catatan && <span className="ml-2 align-middle text-xs font-semibold text-[#8a4b00]">{catatan}</span>}
      </dd>
    </div>
  );
}

/** Bagian atas Ringkasan: tindakan yang menunggu, kehadiran hari ini, guru & pegawai, kesiswaan, kalender. */
export async function BagianHariIni({ supabase, akses }: { supabase: SupabaseClient; akses: Akses }) {
  const hari = hariIniWIB();
  const iso = ((new Date(hari + "T00:00:00Z").getUTCDay() + 6) % 7) + 1;
  const awal = new Date(Date.parse(`${hari}T00:00:00+07:00`)).toISOString();
  const q = (t: string) => supabase.from(t).select("*", { count: "exact", head: true });
  const kosong: Promise<Hitungan> = Promise.resolve({ count: 0, error: null });
  const wali = berperan(akses, "wali_kelas");
  const lihatSiswa = punya(akses, "absensi.lihat");
  const lihatGuru = punya(akses, "absensi_pegawai.lihat");
  // hitungan yang sama dengan badge menu dibagi dengan layout (satu query per permintaan)
  const bersama = (syarat: boolean, nama: NamaHitungan) => (syarat ? hitungBersama(supabase, nama) : kosong);

  // id pegawai & tahun ajaran (dipakai bersama layout/halaman), lalu SEMUA query lain berjalan bersamaan
  const [pid, taRes] = await Promise.all([pegawaiSaya(supabase), tahunAjaranAktif(supabase)]);
  const ta = taRes.data;
  const jadwalSaya = pid
    ? Promise.resolve(supabase.from("jadwal_lengkap").select("id").eq("pegawai_id", pid).eq("hari", iso).eq("tahun_aktif", true)).then((r) => ({ data: (r.data ?? []) as { id: string }[], error: r.error }))
    : Promise.resolve({ data: [] as { id: string }[], error: null });
  // jurnal hari ini langsung menyusul jadwal (rantai sendiri, tidak menahan query lain)
  const jurnalHariIni = jadwalSaya.then((j) => (j.data.length ? q("jurnal_jp").eq("tanggal", hari).in("jadwal_id", j.data.map((x) => x.id)) : kosong));
  const bolehKes = punya(akses, "kesiswaan.lihat");
  // angka statistik (bukan tindakan): cache singkat per akun
  const statistik = statistikSingkat(supabase, akses, "hari-ini", async (db) => {
    const jumlah = (r: { count: number | null; error: unknown }): Hitungan => ({ count: r.count, error: r.error ? true : null });
    const hit = (t: string) => db.from(t).select("*", { count: "exact", head: true });
    const [tren, totalPeg, totalKelas, prestasiBulan, pelanggaranBulan] = await Promise.all([
      lihatSiswa ? trenTidakHadir(db) : Promise.resolve([]),
      lihatGuru ? hit("pegawai").eq("status", "aktif").is("deleted_at", null).then(jumlah) : kosong,
      lihatSiswa && ta ? hit("kelas").eq("tahun_ajaran_id", ta.id).is("deleted_at", null).then(jumlah) : kosong,
      bolehKes ? hit("prestasi_siswa").eq("status", "terverifikasi").gte("tanggal", awalBulan(hari)).then(jumlah) : kosong,
      bolehKes ? hit("pelanggaran_siswa").eq("status", "terverifikasi").gte("tanggal", awalBulan(hari)).then(jumlah) : kosong,
    ]);
    return { tren, totalPeg, totalKelas, kes: bolehKes ? ([prestasiBulan, pelanggaranBulan] as const) : null };
  });

  const [
    berita, izinPeg, koreksi, izinOrtu, pel, pre, rujukan, gagalKirim, disiplin, jadwal, jurnal,
    tukarMasuk, tukarKur, kalender, perangkat, supervisi, revisi, perluNilai, pinjam, rusak,
    aduanBaru, aduanLewat, telatPerpus, tamu, daftarAlumni, evalMutu, revisiMutu, mintaBk, sesiBk, ajuEkskul,
    aturRes, liburRes, kbmRes, absHari, kelasDicek, pegHari, stat,
  ] = await Promise.all([
    bersama(punya(akses, "konten.terbitkan"), "beritaDiajukan"),
    bersama(punya(akses, "izin_pegawai.setujui"), "izinPegawaiMenunggu"),
    bersama(punya(akses, "absensi.kelola"), "koreksiMenunggu"),
    bersama(punya(akses, "absensi.kelola") || wali, "izinOrtuMenunggu"),
    bersama(punya(akses, "kesiswaan.kelola"), "pelanggaranBaru"),
    bersama(punya(akses, "kesiswaan.kelola"), "prestasiDiajukan"),
    bersama(punya(akses, "bk.rujukan"), "rujukanBaru"),
    punya(akses, "pengguna.kelola") ? q("antrian_kirim").eq("status", "gagal") : kosong,
    punya(akses, "disiplin.kelola") ? statusDisiplin(supabase) : Promise.resolve({ data: [] as { dikonfirmasi: boolean }[], error: null }),
    jadwalSaya,
    jurnalHariIni,
    pid ? tukarUntukSaya(supabase, pid) : kosong,
    bersama(punya(akses, "jadwal.kelola"), "tukarMenungguKurikulum"),
    supabase.from("kegiatan_kalender").select(KOLOM_KEGIATAN).is("deleted_at", null).gte("selesai", hari).lte("mulai", geserTanggal(hari, 14)).order("mulai").limit(6),
    bersama(punya(akses, "kurikulum.kelola"), "perangkatDiajukan"),
    pid ? q("supervisi_akademik").eq("supervisor_id", pid).eq("status", "terjadwal").lte("tanggal", hari) : kosong,
    pid ? q("perangkat_ajar").eq("pegawai_id", pid).eq("status", "revisi").is("deleted_at", null) : kosong,
    pid ? tugasPerluNilai(supabase, pid) : kosong,
    bersama(punya(akses, "sarpras.kelola"), "peminjamanDiajukan"),
    bersama(punya(akses, "sarpras.kelola"), "kerusakanBaru"),
    hitungBersama(supabase, "aduanBaru"),
    q("pengaduan").in("status", ["baru", "diproses"]).lt("tenggat", hari),
    punya(akses, "perpus.kelola") ? q("pinjaman_buku").is("kembali_pada", null).lt("jatuh_tempo", hari) : kosong,
    pid ? q("buku_tamu").eq("bertemu_id", pid).is("keluar", null).gte("masuk", awal) : kosong,
    bersama(punya(akses, "alumni.kelola"), "alumniMenunggu"),
    bersama(punya(akses, "mutu.kelola") || punya(akses, "mutu.audit"), "mutuDiajukan"),
    pid ? supabase.from("evaluasi_indikator").select("id, indikator_mutu!inner(pemilik_id)", { count: "exact", head: true }).eq("persetujuan", "revisi").eq("indikator_mutu.pemilik_id", pid) : kosong,
    bersama(punya(akses, "bk.konseling"), "konselingBaru"),
    punya(akses, "bk.konseling") && pid ? q("sesi_konseling").eq("konselor_id", pid).eq("status", "terjadwal").gte("mulai", awal).lt("mulai", new Date(Date.parse(awal) + 864e5).toISOString()) : kosong,
    bersama(punya(akses, "ekskul.kelola"), "kegiatanMenungguKelola"),
    // status hari ini: hari sekolah, libur, atau belum diatur
    supabase.from("pengaturan_absensi").select("hari_sekolah").eq("id", 1).maybeSingle(),
    supabase.from("hari_libur").select("keterangan").eq("tanggal", hari).maybeSingle(),
    supabase.from("kegiatan_kalender").select("judul").is("deleted_at", null).eq("kbm_libur", true).lte("mulai", hari).gte("selesai", hari).limit(1),
    lihatSiswa ? supabase.from("absensi_siswa").select("status").eq("tanggal", hari) : Promise.resolve({ data: [], error: null }),
    lihatSiswa ? q("absensi_kelas_harian").eq("tanggal", hari) : kosong,
    lihatGuru ? supabase.from("absensi_pegawai").select("status, jam_masuk").eq("tanggal", hari) : Promise.resolve({ data: [], error: null }),
    statistik,
  ]);
  const { tren, totalPeg, totalKelas, kes } = stat;
  const idJadwal = jadwal.data.map((j) => j.id);
  const spBelum = disiplin.error ? null : disiplin.data.filter((d) => !d.dikonfirmasi).length;
  const jamBelum = jadwal.error || jurnal.error ? null : Math.max(0, idJadwal.length - (jurnal.count ?? 0));

  const daftarTugas: { n: number | null; t: string; href: string; tombol: string }[] = [
    { n: n(berita), t: "Berita menunggu persetujuan", href: "/admin/persetujuan", tombol: "Tinjau" },
    { n: n(izinPeg), t: "Pengajuan izin/cuti guru", href: "/admin/izin-pegawai", tombol: "Proses" },
    { n: n(izinOrtu), t: "Izin/sakit dari orang tua", href: "/admin/izin-ortu", tombol: "Proses" },
    { n: n(koreksi), t: "Pengajuan koreksi absensi", href: "/admin/absensi/pengajuan", tombol: "Periksa" },
    { n: n(pel) === null || n(pre) === null ? null : (n(pel) ?? 0) + (n(pre) ?? 0), t: "Laporan pelanggaran/prestasi perlu verifikasi", href: "/admin/kesiswaan", tombol: "Verifikasi" },
    { n: n(rujukan), t: "Rujukan BK baru", href: "/admin/rujukan-bk", tombol: "Buka" },
    { n: spBelum, t: "SP/panggilan orang tua belum ditindaklanjuti", href: "/admin/absensi/disiplin", tombol: "Tindak lanjuti" },
    { n: jamBelum, t: "Jam mengajar hari ini belum diabsen/dijurnal", href: "/admin/jadwal-saya", tombol: "Isi jurnal" },
    { n: n(tukarMasuk), t: "Permintaan tukar jam untuk Anda", href: "/admin/tukar-jam", tombol: "Tanggapi" },
    { n: n(tukarKur), t: "Tukar jam menunggu persetujuan", href: "/admin/jadwal/tukar", tombol: "Tinjau" },
    { n: n(perangkat), t: "Perangkat ajar menunggu diperiksa", href: "/admin/perangkat-ajar/review", tombol: "Periksa" },
    { n: n(revisi), t: "Perangkat ajar Anda perlu revisi", href: "/admin/perangkat-ajar", tombol: "Revisi" },
    { n: n(supervisi), t: "Supervisi akademik yang perlu Anda nilai", href: "/admin/supervisi", tombol: "Nilai" },
    { n: n(perluNilai), t: "Tugas siswa menunggu dinilai", href: "/admin/lms", tombol: "Nilai" },
    { n: n(pinjam), t: "Peminjaman ruang/barang menunggu persetujuan", href: "/admin/sarpras/peminjaman", tombol: "Tinjau" },
    { n: n(rusak), t: "Laporan kerusakan baru", href: "/admin/sarpras/kerusakan", tombol: "Buka" },
    { n: n(tamu), t: "Tamu menunggu Anda", href: "/admin/buku-tamu", tombol: "Lihat" },
    { n: n(mintaBk), t: "Permintaan layanan BK baru", href: "/admin/bk", tombol: "Buka" },
    { n: n(daftarAlumni), t: "Pendaftaran alumni menunggu verifikasi", href: "/admin/alumni/pendaftaran", tombol: "Verifikasi" },
    { n: n(evalMutu), t: "Evaluasi indikator mutu menunggu tinjauan", href: "/admin/mutu", tombol: "Tinjau" },
    { n: n(revisiMutu), t: "Evaluasi indikator mutu Anda perlu revisi", href: "/admin/mutu", tombol: "Revisi" },
    { n: n(sesiBk), t: "Sesi BK Anda hari ini", href: "/admin/bk", tombol: "Lihat" },
    { n: n(ajuEkskul), t: "Pengajuan kegiatan/LPJ organisasi siswa menunggu persetujuan", href: "/admin/ekskul/pengajuan", tombol: "Tinjau" },
    { n: n(aduanBaru), t: "Pengaduan baru", href: "/admin/pengaduan?status=baru", tombol: "Tanggapi" },
    { n: n(aduanLewat), t: "Pengaduan melewati tenggat", href: "/admin/pengaduan", tombol: "Tanggapi" },
    { n: n(telatPerpus), t: "Buku perpustakaan terlambat dikembalikan", href: "/admin/perpus/laporan", tombol: "Lihat" },
    { n: n(gagalKirim), t: "Notifikasi WhatsApp/email gagal terkirim", href: "/admin/notifikasi/kanal", tombol: "Periksa" },
  ];
  const tugas = daftarTugas.filter((x) => (x.n ?? 0) > 0);
  const tugasGagal = daftarTugas.filter((x) => x.n === null).length;

  const hariSekolah = (aturRes.data?.hari_sekolah as number[] | undefined) ?? null;
  const liburKet = liburRes.data?.keterangan ?? (kbmRes.data ?? [])[0]?.judul ?? null;
  const statusHari: { jenis: "sekolah" | "libur" | "bukan" | "belum-diatur"; teks: string } = liburKet
    ? { jenis: "libur", teks: `Hari ini libur: ${liburKet}.` }
    : aturRes.error || !hariSekolah
      ? { jenis: "belum-diatur", teks: "Hari sekolah belum diatur di Pengaturan Absensi." }
      : !hariSekolah.includes(iso)
        ? { jenis: "bukan", teks: `Hari ini ${NAMA_HARI[iso]}, bukan hari sekolah.` }
        : { jenis: "sekolah", teks: "" };

  const a = absHari as { data: { status: string }[] | null; error: unknown };
  const pRes = pegHari as { data: { status: string; jam_masuk: string | null }[] | null; error: unknown };
  const p = pRes.data ?? [];
  const hit = (s: string) => (a.data ?? []).filter((x) => x.status === s).length;
  const siswaGagal = Boolean(taRes.error || a.error || kelasDicek.error || totalKelas.error);
  const dicek = n(kelasDicek) ?? 0;
  const jumlahKelas = n(totalKelas) ?? 0;
  const adaTren = (tren as Awaited<ReturnType<typeof trenTidakHadir>>).some((t) => t.total > 0);
  const agenda = (kalender.data ?? []) as Kegiatan[];
  const bolehAturAbsen = punya(akses, "absensi.atur");
  const bolehInduk = punya(akses, "data_induk.kelola");

  return (
    <>
      {/* 1. Tindakan yang memerlukan perhatian */}
      <Panel judul="Perlu ditindaklanjuti" className="lg:col-span-3">
        {tugasGagal > 0 && (
          <div className="mb-3">
            <Keadaan jenis="gagal" aksi={cobaLagi}>
              {tugasGagal} daftar tindakan gagal dimuat, sehingga daftar di bawah mungkin belum lengkap.
            </Keadaan>
          </div>
        )}
        {tugas.length ? (
          <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {tugas.map((x) => (
              <li key={x.href + x.t} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="min-w-9 rounded-md bg-[#fdf1d6] px-2 py-0.5 text-center text-sm font-semibold tabular-nums text-[#7a5300]">{x.n}</span>
                  <span className="text-[0.9375rem] text-[var(--ink)]">{x.t}</span>
                </span>
                <Link href={x.href} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold hover:border-[var(--muted)]">
                  {x.tombol} <ArrowRight size={15} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : tugasGagal === 0 ? (
          <p className="flex items-center gap-2 text-[0.9375rem] text-[var(--muted)]">
            <CircleCheck size={18} aria-hidden className="text-emerald-700" /> Tidak ada yang menunggu tindakan Anda saat ini.
          </p>
        ) : null}
      </Panel>

      {/* 2. Kehadiran siswa hari ini */}
      {lihatSiswa && (
        <Panel
          judul="Kehadiran siswa hari ini"
          className="lg:col-span-2"
          aksi={
            <Link href="/admin/absensi/jp" className="text-sm font-semibold underline underline-offset-2">
              Absensi per jam pelajaran
            </Link>
          }
        >
          {siswaGagal ? (
            <Keadaan jenis="gagal" aksi={cobaLagi}>
              Data kehadiran siswa gagal dimuat.
            </Keadaan>
          ) : !ta ? (
            <Keadaan jenis="info" aksi={bolehInduk ? <Link href="/admin/tahun-ajaran" className="font-semibold underline underline-offset-2">Atur tahun ajaran</Link> : undefined}>
              Tahun ajaran aktif belum diatur.
            </Keadaan>
          ) : jumlahKelas === 0 ? (
            <Keadaan jenis="info" aksi={bolehInduk ? <Link href="/admin/kelas" className="font-semibold underline underline-offset-2">Tambah kelas</Link> : undefined}>
              Data kelas belum tersedia untuk tahun ajaran {ta.nama}.
            </Keadaan>
          ) : statusHari.jenis !== "sekolah" ? (
            <Keadaan jenis="info" aksi={statusHari.jenis === "belum-diatur" && bolehAturAbsen ? <Link href="/admin/absensi/pengaturan" className="font-semibold underline underline-offset-2">Atur hari sekolah</Link> : undefined}>
              {statusHari.teks}
            </Keadaan>
          ) : (
            <>
              <p className="text-[0.9375rem]">
                <strong className="tabular-nums">{dicek}</strong> dari <strong className="tabular-nums">{jumlahKelas}</strong> kelas sudah diabsen
                {dicek < jumlahKelas && <span className="text-[#8a4b00]"> · {jumlahKelas - dicek} kelas belum</span>}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--line)]" aria-hidden>
                <div className="h-full rounded-full bg-[var(--muted)]" style={{ width: `${Math.round((dicek / jumlahKelas) * 100)}%` }} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-[var(--line)] pt-4 sm:grid-cols-4">
                <Angka nilai={hit("S")} label="Sakit" />
                <Angka nilai={hit("I")} label="Izin" />
                <Angka nilai={hit("A")} label="Alpa" catatan={hit("A") ? "perlu dicek" : undefined} />
                <Angka nilai={hit("T")} label="Terlambat" />
              </dl>
            </>
          )}
          {!siswaGagal && adaTren && (
            <div className="mt-5 border-t border-[var(--line)] pt-4">
              <GrafikTidakHadir data={tren as Awaited<ReturnType<typeof trenTidakHadir>>} />
            </div>
          )}
          <Link href="/admin/absensi" className="mt-4 inline-block text-sm font-semibold underline underline-offset-2">
            Buka absensi siswa
          </Link>
        </Panel>
      )}

      {/* 3. Guru & pegawai hari ini */}
      {lihatGuru && (
        <Panel judul="Guru & pegawai hari ini" className={lihatSiswa ? "" : "lg:col-span-2"}>
          {pRes.error || totalPeg.error ? (
            <Keadaan jenis="gagal" aksi={cobaLagi}>
              Data kehadiran pegawai gagal dimuat.
            </Keadaan>
          ) : (n(totalPeg) ?? 0) === 0 ? (
            <Keadaan jenis="info" aksi={bolehInduk ? <Link href="/admin/pegawai" className="font-semibold underline underline-offset-2">Tambah pegawai</Link> : undefined}>
              Data guru & pegawai belum tersedia.
            </Keadaan>
          ) : statusHari.jenis !== "sekolah" && p.length === 0 ? (
            <Keadaan jenis="info">{statusHari.teks}</Keadaan>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Angka nilai={p.filter((x) => x.jam_masuk && x.status === "H").length} label="Hadir tepat waktu" />
              <Angka nilai={p.filter((x) => x.status === "T").length} label="Terlambat" />
              <Angka nilai={p.filter((x) => ["S", "I", "DL", "C"].includes(x.status)).length} label="Izin/sakit/dinas/cuti" />
              <Angka nilai={Math.max(0, (n(totalPeg) ?? 0) - p.length)} label="Belum presensi" />
            </dl>
          )}
          <Link href="/admin/absensi/guru" className="mt-4 inline-block text-sm font-semibold underline underline-offset-2">
            Buka kehadiran guru
          </Link>
        </Panel>
      )}

      {/* 4. Kesiswaan bulan ini */}
      {kes && (
        <Panel judul="Kesiswaan bulan ini">
          {kes[0].error || kes[1].error ? (
            <Keadaan jenis="gagal" aksi={cobaLagi}>
              Data kesiswaan gagal dimuat.
            </Keadaan>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Angka nilai={n(kes[0]) ?? 0} label="Prestasi terverifikasi" />
              <Angka nilai={n(kes[1]) ?? 0} label="Pelanggaran terverifikasi" />
            </dl>
          )}
          <Link href="/admin/kesiswaan" className="mt-4 inline-block text-sm font-semibold underline underline-offset-2">
            Buka kesiswaan
          </Link>
        </Panel>
      )}

      {/* kalender dua minggu ke depan (hanya bila ada kegiatan) */}
      {agenda.length > 0 && (
        <Panel
          judul="Kalender 2 minggu ke depan"
          aksi={
            <Link href="/admin/kalender" className="text-sm font-semibold underline underline-offset-2">
              Kalender
            </Link>
          }
        >
          <ul className="divide-y divide-[var(--line)]">
            {agenda.map((k) => (
              <li key={k.id} className="flex items-start gap-2.5 py-2 text-sm">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${JENIS_KEGIATAN[k.jenis].titik}`} aria-hidden />
                <span>
                  <span className="block font-semibold">{k.judul}</span>
                  <span className="text-[var(--muted)]">
                    {JENIS_KEGIATAN[k.jenis].label} · {rentangTanggal(k.mulai, k.selesai)}
                    {k.kbm_libur && " · tanpa KBM"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
