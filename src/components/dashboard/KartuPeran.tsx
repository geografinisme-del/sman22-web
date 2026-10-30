import Link from "next/link";
import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Keadaan, Panel } from "@/components/dashboard/HariIni";
import { geserTanggal, hariIniWIB } from "@/lib/admin/absensi";
import { NAMA_PERAN, type Akses } from "@/lib/admin/auth";
import { kartuUntuk, type KunciKartu } from "@/lib/admin/menu-peran";
import { hitungBersama, pegawaiSaya, statusDisiplin, tahunAjaranAktif, type Hitungan } from "@/lib/admin/hitungan";

/**
 * Kartu Ringkasan SESUAI PERAN (gabungan bila akun punya beberapa peran). Setiap kartu hanya memuat data yang boleh
 * dibaca peran itu (RLS); data yang belum ada tampil sebagai keadaan kosong, bukan galat. Urutan: pimpinan → bidang →
 * BK → perwalian → piket → mengajar. Selama "Lihat sebagai…", data pribadi (jadwal, kelas perwalian) mengikuti akun
 * yang login, sehingga biasanya kosong.
 */

type Db = SupabaseClient;
const kepala = { count: "exact" as const, head: true };
const nol: Promise<Hitungan> = Promise.resolve({ count: 0, error: null });
const angka = (r: Hitungan) => (r.error ? null : (r.count ?? 0));
const ISO_HARI = (hari: string) => ((new Date(hari + "T00:00:00Z").getUTCDay() + 6) % 7) + 1;
const jam = (t: string | null) => (t ? t.slice(0, 5) : "");

/** Satu baris angka berlabel, opsional tautan */
function Baris({ n, label, href, tanda }: { n: number | null; label: string; href?: string; tanda?: boolean }) {
  const isi = (
    <>
      <span className={`min-w-9 rounded-md px-2 py-0.5 text-center text-sm font-semibold tabular-nums ${tanda && (n ?? 0) > 0 ? "bg-[#fdf1d6] text-[#7a5300]" : "bg-[var(--soft)] text-[var(--ink)]"}`}>
        {n ?? "—"}
      </span>
      <span className="text-[0.9375rem]">{label}</span>
    </>
  );
  return (
    <li className="py-2">
      {href ? (
        <Link href={href} className="flex items-center gap-3 hover:underline">
          {isi}
        </Link>
      ) : (
        <span className="flex items-center gap-3">{isi}</span>
      )}
    </li>
  );
}
const Daftar = ({ children }: { children: ReactNode }) => <ul className="divide-y divide-[var(--line)]">{children}</ul>;
const Gagal = () => <Keadaan jenis="gagal">Sebagian data kartu ini gagal dimuat.</Keadaan>;

// ------------------------------------------------------------------------------------------------ pimpinan
async function KartuKepala({ db }: { db: Db }) {
  const hari = hariIniWIB();
  const dari = geserTanggal(hari, -29);
  const [humas, bk, rusak, pinjam, izinPeg, berita, supervisi] = await Promise.all([
    db.rpc("statistik_humas", { p_dari: dari, p_sampai: hari }),
    db.rpc("statistik_bk", { p_dari: dari, p_sampai: hari }),
    db.from("laporan_kerusakan").select("id", kepala).in("status", ["dilaporkan", "diproses"]),
    hitungBersama(db, "peminjamanDiajukan"),
    hitungBersama(db, "izinPegawaiMenunggu"),
    hitungBersama(db, "beritaDiajukan"),
    db.from("supervisi_akademik").select("id", kepala).eq("status", "terjadwal"),
  ]);
  const h = (humas.data ?? {}) as Record<string, number | null>;
  const b = (bk.data ?? {}) as Record<string, number | null>;
  return (
    <Panel judul="Ringkasan semua bidang" aksi={<span className="text-xs text-[var(--muted)]">angka 30 hari · tanpa isi rahasia</span>}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {[
          ["Kasus BK aktif", bk.error ? null : (b.kasus_aktif ?? 0)],
          ["Pengaduan aktif", humas.error ? null : (h.aktif ?? 0)],
          ["Pengaduan lewat tenggat", humas.error ? null : (h.lewat_tenggat ?? 0)],
          ["Kerusakan belum selesai", rusak.error ? null : (rusak.count ?? 0)],
          ["Peminjaman menunggu", angka(pinjam)],
          ["Izin guru menunggu persetujuan Anda", angka(izinPeg)],
          ["Berita menunggu persetujuan", angka(berita)],
          ["Supervisi terjadwal", supervisi.error ? null : (supervisi.count ?? 0)],
        ].map(([label, n]) => (
          <div key={label as string}>
            <dt className="text-sm text-[var(--muted)]">{label}</dt>
            <dd className="mt-0.5 text-[1.5rem] font-semibold tabular-nums">{n ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/** super admin: akun, keamanan & kesehatan notifikasi (operator memakai kartu Tata usaha) */
async function KartuAdmin({ db }: { db: Db }) {
  // sejak kemarin pukul 00.00 WIB
  const sehari = new Date(Date.parse(`${geserTanggal(hariIniWIB(), -1)}T00:00:00+07:00`)).toISOString();
  const [akun, gagalLogin, gagalKirim, antre] = await Promise.all([
    db.from("pengguna").select("user_id, pengguna_peran(peran)").eq("aktif", true).limit(2000),
    db.from("audit_log").select("id", kepala).eq("aksi", "LOGIN_GAGAL").gte("waktu", sehari),
    db.from("antrian_kirim").select("id", kepala).eq("status", "gagal"),
    db.from("antrian_kirim").select("id", kepala).eq("status", "menunggu"),
  ]);
  const tanpaPeran = akun.error ? null : ((akun.data ?? []) as { pengguna_peran: unknown[] }[]).filter((u) => u.pengguna_peran.length === 0).length;
  return (
    <Panel judul="Administrasi sistem">
      <Daftar>
        <Baris n={tanpaPeran} label="Akun menunggu verifikasi (tanpa peran)" href="/admin/pengguna" tanda />
        <Baris n={gagalLogin.error ? null : (gagalLogin.count ?? 0)} label="Percobaan masuk gagal (sejak kemarin)" href="/admin/log" tanda />
        <Baris n={gagalKirim.error ? null : (gagalKirim.count ?? 0)} label="Notifikasi WhatsApp/email gagal" href="/admin/notifikasi/kanal" tanda />
        <Baris n={antre.error ? null : (antre.count ?? 0)} label="Notifikasi dalam antrean" href="/admin/notifikasi/kanal" />
      </Daftar>
    </Panel>
  );
}

// ------------------------------------------------------------------------------------------------ bidang
async function KartuKurikulum({ db }: { db: Db }) {
  const hari = hariIniWIB();
  const iso = ISO_HARI(hari);
  const [jadwal, jurnal, tukar, perangkat, pengganti, supervisi] = await Promise.all([
    db.from("jadwal_lengkap").select("id", kepala).eq("hari", iso).eq("tahun_aktif", true),
    db.from("jurnal_jp").select("jadwal_id", kepala).eq("tanggal", hari),
    hitungBersama(db, "tukarMenungguKurikulum"),
    hitungBersama(db, "perangkatDiajukan"),
    db.from("perubahan_jadwal").select("id", kepala).eq("tanggal", hari),
    db.from("supervisi_akademik").select("id", kepala).eq("status", "terjadwal"),
  ]);
  const total = jadwal.count ?? 0;
  const terisi = jurnal.count ?? 0;
  return (
    <Panel judul="Kurikulum & jadwal">
      {jadwal.error || jurnal.error ? (
        <Gagal />
      ) : total === 0 ? (
        <Keadaan jenis="info">Tidak ada jam pelajaran terjadwal hari ini.</Keadaan>
      ) : (
        <p className="text-[0.9375rem]">
          Jurnal mengajar hari ini: <strong className="tabular-nums">{terisi}</strong> dari <strong className="tabular-nums">{total}</strong> jam ({Math.round((terisi / total) * 100)}%)
        </p>
      )}
      <Daftar>
        <Baris n={angka(tukar)} label="Tukar jam menunggu persetujuan" href="/admin/jadwal/tukar" tanda />
        <Baris n={pengganti.error ? null : (pengganti.count ?? 0)} label="Perubahan jadwal / guru pengganti hari ini" href="/admin/jadwal/pengganti" />
        <Baris n={angka(perangkat)} label="Perangkat ajar menunggu diperiksa" href="/admin/perangkat-ajar/review" tanda />
        <Baris n={supervisi.error ? null : (supervisi.count ?? 0)} label="Supervisi akademik terjadwal" href="/admin/supervisi" />
      </Daftar>
    </Panel>
  );
}

async function KartuKesiswaan({ db }: { db: Db }) {
  const [disiplin, pel, pre] = await Promise.all([statusDisiplin(db), hitungBersama(db, "pelanggaranBaru"), hitungBersama(db, "prestasiDiajukan")]);
  const belum = disiplin.error ? null : (disiplin.data as { dikonfirmasi: boolean; label?: string }[]).filter((d) => !d.dikonfirmasi);
  const sp = belum?.filter((d) => /^SP/i.test(d.label ?? "")).length ?? null;
  const panggil = belum === null ? null : belum.length - (sp ?? 0);
  return (
    <Panel judul="Kesiswaan & disiplin">
      <Daftar>
        <Baris n={sp} label="SP belum ditindaklanjuti" href="/admin/absensi/disiplin" tanda />
        <Baris n={panggil} label="Panggilan orang tua belum ditindaklanjuti" href="/admin/absensi/disiplin" tanda />
        <Baris n={angka(pel)} label="Laporan pelanggaran menunggu verifikasi" href="/admin/kesiswaan" tanda />
        <Baris n={angka(pre)} label="Prestasi menunggu verifikasi" href="/admin/kesiswaan" tanda />
      </Daftar>
    </Panel>
  );
}

async function KartuSarpras({ db }: { db: Db }) {
  const kini = new Date().toISOString();
  const [ajuan, dipinjam, rusak, barangRusak] = await Promise.all([
    hitungBersama(db, "peminjamanDiajukan"),
    db.from("peminjaman").select("id", kepala).in("status", ["disetujui", "dipinjam"]).lte("mulai", kini).gte("selesai", kini),
    db.from("laporan_kerusakan").select("id", kepala).in("status", ["dilaporkan", "diproses"]),
    db.from("barang").select("id", kepala).in("kondisi", ["rusak_ringan", "rusak_berat"]).is("deleted_at", null),
  ]);
  return (
    <Panel judul="Sarana & prasarana">
      <Daftar>
        <Baris n={angka(ajuan)} label="Peminjaman menunggu persetujuan" href="/admin/sarpras/peminjaman" tanda />
        <Baris n={dipinjam.error ? null : (dipinjam.count ?? 0)} label="Sedang dipinjam saat ini" href="/admin/sarpras/peminjaman" />
        <Baris n={rusak.error ? null : (rusak.count ?? 0)} label="Laporan kerusakan belum selesai" href="/admin/sarpras/kerusakan" tanda />
        <Baris n={barangRusak.error ? null : (barangRusak.count ?? 0)} label="Barang inventaris berkondisi rusak" href="/admin/sarpras" />
      </Daftar>
    </Panel>
  );
}

async function KartuHumas({ db }: { db: Db }) {
  const hari = hariIniWIB();
  const { data, error } = await db.rpc("statistik_humas", { p_dari: geserTanggal(hari, -29), p_sampai: hari });
  const s = (data ?? {}) as Record<string, number | null>;
  const v = (k: string) => (error ? null : Number(s[k] ?? 0));
  return (
    <Panel judul="Humas">
      <Daftar>
        <Baris n={v("aktif")} label="Pengaduan masih aktif" href="/admin/pengaduan" tanda />
        <Baris n={v("lewat_tenggat")} label="Pengaduan lewat tenggat" href="/admin/pengaduan" tanda />
        <Baris n={v("survei_aktif")} label={`Survei berjalan · ${v("responden") ?? "—"} responden (30 hari)`} href="/admin/survei" />
        <Baris n={v("mitra_segera")} label="Kerja sama (MoU) berakhir ≤ 30 hari" href="/admin/kemitraan" tanda />
      </Daftar>
    </Panel>
  );
}

// ------------------------------------------------------------------------------------------------ BK
async function KartuBk({ db }: { db: Db }) {
  const kini = new Date();
  const [aktif, minta, sesi] = await Promise.all([
    db.from("kasus_bk").select("id", kepala).in("status", ["aktif", "pemantauan"]),
    hitungBersama(db, "konselingBaru"),
    db.from("sesi_konseling").select("id, mulai, jenis, mode").eq("status", "terjadwal").gte("mulai", kini.toISOString()).lt("mulai", new Date(kini.getTime() + 7 * 864e5).toISOString()).order("mulai").limit(5),
  ]);
  const daftar = (sesi.data ?? []) as { id: string; mulai: string; jenis: string; mode: string }[];
  return (
    <Panel judul="Bimbingan konseling">
      <Daftar>
        <Baris n={aktif.error ? null : (aktif.count ?? 0)} label="Kasus aktif / pemantauan" href="/admin/bk" />
        <Baris n={angka(minta)} label="Permintaan layanan baru" href="/admin/bk" tanda />
      </Daftar>
      <h3 className="mt-4 text-sm font-semibold">Jadwal konseling 7 hari</h3>
      {sesi.error ? (
        <Gagal />
      ) : daftar.length === 0 ? (
        <p className="mt-1 text-sm text-[var(--muted)]">Belum ada sesi terjadwal.</p>
      ) : (
        <ul className="mt-1 space-y-1 text-sm">
          {daftar.map((x) => (
            <li key={x.id}>
              {new Date(x.mulai).toLocaleString("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} · {x.jenis} · {x.mode}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------------------------------------------ perwalian, piket, mengajar
async function KartuWali({ db, pid }: { db: Db; pid: string | null }) {
  const { data: ta } = await tahunAjaranAktif(db);
  const kelas = pid && ta ? (await db.from("kelas").select("id, nama").eq("wali_kelas_id", pid).eq("tahun_ajaran_id", ta.id).is("deleted_at", null).limit(1).maybeSingle()).data : null;
  if (!kelas)
    return (
      <Panel judul="Kelas saya">
        <Keadaan jenis="info">Anda belum ditetapkan sebagai wali kelas pada tahun ajaran aktif.</Keadaan>
      </Panel>
    );
  const hari = hariIniWIB();
  const anggota = ((await db.from("anggota_kelas").select("siswa_id").eq("kelas_id", kelas.id)).data ?? []).map((x) => x.siswa_id as string);
  const [abs, izin, disiplin] = await Promise.all([
    anggota.length ? db.from("absensi_siswa").select("status").eq("tanggal", hari).in("siswa_id", anggota) : Promise.resolve({ data: [], error: null }),
    anggota.length ? db.from("izin_ortu").select("id", kepala).eq("status", "menunggu").in("siswa_id", anggota) : nol,
    statusDisiplin(db),
  ]);
  const st = (abs.data ?? []) as { status: string }[];
  const hit = (s: string) => st.filter((x) => x.status === s).length;
  const perhatian = disiplin.error ? null : (disiplin.data as { kelas?: string; dikonfirmasi: boolean }[]).filter((d) => d.kelas === kelas.nama && !d.dikonfirmasi).length;
  return (
    <Panel judul={`Kelas saya · ${kelas.nama}`} aksi={<Link href="/admin/kelas-saya" className="text-sm font-semibold underline underline-offset-2">Buka kelas</Link>}>
      <p className="text-[0.9375rem]">
        {anggota.length} siswa · hari ini: sakit {hit("S")}, izin {hit("I")}, alpa {hit("A")}, terlambat {hit("T")}
      </p>
      <Daftar>
        <Baris n={perhatian} label="Siswa perlu tindak lanjut (SP/panggilan)" href="/admin/absensi/disiplin" tanda />
        <Baris n={angka(izin as Hitungan)} label="Izin/sakit dari orang tua menunggu" href="/admin/izin-ortu" tanda />
      </Daftar>
    </Panel>
  );
}

async function KartuPiket({ db }: { db: Db }) {
  const hari = hariIniWIB();
  const [petugas, telat, jmlTelat, koreksi, izinOrtu] = await Promise.all([
    db.from("piket_guru").select("pegawai(nama), tahun_ajaran!inner(aktif)").eq("hari", ISO_HARI(hari)).eq("tahun_ajaran.aktif", true),
    db.from("absensi_siswa").select("id, jam, siswa(nama)").eq("tanggal", hari).eq("status", "T").order("jam").limit(8),
    db.from("absensi_siswa").select("id", kepala).eq("tanggal", hari).eq("status", "T"),
    hitungBersama(db, "koreksiMenunggu"),
    hitungBersama(db, "izinOrtuMenunggu"),
  ]);
  const nama = ((petugas.data ?? []) as unknown as { pegawai: { nama: string } | null }[]).map((p) => p.pegawai?.nama).filter(Boolean);
  const daftarTelat = (telat.data ?? []) as unknown as { id: string; jam: string | null; siswa: { nama: string } | null }[];
  return (
    <Panel judul="Piket hari ini" aksi={<Link href="/admin/absensi" className="text-sm font-semibold underline underline-offset-2">Absensi siswa</Link>}>
      <p className="text-sm text-[var(--muted)]">Petugas: {nama.length ? nama.join(", ") : "belum diatur"}</p>
      <h3 className="mt-3 text-sm font-semibold">Siswa terlambat ({jmlTelat.error ? "—" : (jmlTelat.count ?? 0)})</h3>
      {telat.error ? (
        <Gagal />
      ) : daftarTelat.length === 0 ? (
        <p className="mt-1 text-sm text-[var(--muted)]">Belum ada siswa terlambat hari ini.</p>
      ) : (
        <ul className="mt-1 space-y-0.5 text-sm">
          {daftarTelat.map((x) => (
            <li key={x.id}>
              {jam(x.jam)} · {x.siswa?.nama ?? "—"}
            </li>
          ))}
        </ul>
      )}
      <Daftar>
        <Baris n={angka(izinOrtu)} label="Izin/sakit dari orang tua menunggu" href="/admin/izin-ortu" tanda />
        <Baris n={angka(koreksi)} label="Pengajuan koreksi absensi menunggu" href="/admin/absensi/pengajuan" tanda />
      </Daftar>
      <p className="mt-2 text-xs text-[var(--muted)]">Izin keluar kelas akan tampil di sini setelah modul absensi baru aktif.</p>
    </Panel>
  );
}

async function KartuMengajar({ db, pid }: { db: Db; pid: string | null }) {
  const hari = hariIniWIB();
  const jadwal = pid
    ? await db.from("jadwal_lengkap").select("id, jp_ke, jam_mulai, jam_selesai, kelas, mapel").eq("pegawai_id", pid).eq("hari", ISO_HARI(hari)).eq("tahun_aktif", true).order("jp_ke")
    : { data: [], error: null };
  const baris = (jadwal.data ?? []) as { id: string; jp_ke: number; jam_mulai: string | null; jam_selesai: string | null; kelas: string; mapel: string }[];
  const jurnal = baris.length ? ((await db.from("jurnal_jp").select("jadwal_id").eq("tanggal", hari).in("jadwal_id", baris.map((b) => b.id))).data ?? []).map((j) => j.jadwal_id as string) : [];
  return (
    <Panel judul="Jadwal mengajar hari ini" aksi={<Link href="/admin/jadwal-saya" className="text-sm font-semibold underline underline-offset-2">Jadwal saya</Link>}>
      {jadwal.error ? (
        <Gagal />
      ) : baris.length === 0 ? (
        <Keadaan jenis="info">{pid ? "Tidak ada jam mengajar hari ini." : "Akun ini belum tertaut ke data guru."}</Keadaan>
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {baris.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span>
                <strong>Jam ke-{b.jp_ke}</strong> {jam(b.jam_mulai)}–{jam(b.jam_selesai)} · {b.kelas} · {b.mapel}
              </span>
              {jurnal.includes(b.id) ? (
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">jurnal terisi</span>
              ) : (
                <Link href="/admin/jadwal-saya" className="rounded-md bg-[#fdf1d6] px-2 py-0.5 text-xs font-semibold text-[#7a5300]">
                  isi presensi & jurnal
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------------------------------------------ tenaga kependidikan & tugas lain
async function KartuTu({ db }: { db: Db }) {
  const { data: ta } = await tahunAjaranAktif(db);
  const [akun, aktif, beranggota, tanpaAkun] = await Promise.all([
    db.from("pengguna").select("user_id, pengguna_peran(peran)").eq("aktif", true).limit(2000),
    db.from("siswa").select("id", kepala).eq("status", "aktif").is("deleted_at", null),
    ta ? db.from("anggota_kelas").select("id", kepala).eq("tahun_ajaran_id", ta.id) : nol,
    db.from("siswa").select("id", kepala).eq("status", "aktif").is("deleted_at", null).is("user_id", null),
  ]);
  const tanpaPeran = akun.error ? null : ((akun.data ?? []) as { pengguna_peran: unknown[] }[]).filter((u) => u.pengguna_peran.length === 0).length;
  const tanpaKelas = aktif.error || beranggota.error ? null : Math.max(0, (aktif.count ?? 0) - (beranggota.count ?? 0));
  return (
    <Panel judul="Tata usaha">
      <Daftar>
        <Baris n={tanpaPeran} label="Akun menunggu verifikasi (tanpa peran)" href="/admin/pengguna" tanda />
        <Baris n={tanpaKelas} label={ta ? `Siswa aktif belum masuk kelas (${ta.nama})` : "Siswa aktif belum masuk kelas"} href="/admin/kelas" tanda />
        <Baris n={tanpaAkun.error ? null : (tanpaAkun.count ?? 0)} label="Siswa aktif belum punya akun portal" href="/admin/akun-portal" />
      </Daftar>
    </Panel>
  );
}

async function KartuPerpus({ db }: { db: Db }) {
  const hari = hariIniWIB();
  const awal = new Date(Date.parse(`${hari}T00:00:00+07:00`)).toISOString();
  const [dipinjam, telat, denda, kunjungan] = await Promise.all([
    db.from("pinjaman_buku").select("id", kepala).is("kembali_pada", null),
    db.from("pinjaman_buku").select("id", kepala).is("kembali_pada", null).lt("jatuh_tempo", hari),
    db.from("pinjaman_buku").select("id", kepala).gt("denda", 0).eq("denda_lunas", false),
    db.from("kunjungan_perpus").select("id", kepala).gte("waktu", awal),
  ]);
  const c = (r: { count: number | null; error: unknown }) => (r.error ? null : (r.count ?? 0));
  return (
    <Panel judul="Perpustakaan">
      <Daftar>
        <Baris n={c(dipinjam)} label="Buku sedang dipinjam" href="/admin/perpus" />
        <Baris n={c(telat)} label="Lewat jatuh tempo" href="/admin/perpus/laporan" tanda />
        <Baris n={c(denda)} label="Denda belum lunas" href="/admin/perpus/laporan" tanda />
        <Baris n={c(kunjungan)} label="Kunjungan hari ini" href="/admin/perpus" />
      </Daftar>
    </Panel>
  );
}

async function KartuLab({ db }: { db: Db }) {
  const hari = hariIniWIB();
  const awal = new Date(Date.parse(`${hari}T00:00:00+07:00`)).toISOString();
  const akhir = new Date(Date.parse(`${geserTanggal(hari, 1)}T00:00:00+07:00`)).toISOString();
  const [ajuan, hariIni, rusak] = await Promise.all([
    hitungBersama(db, "peminjamanDiajukan"),
    db.from("peminjaman").select("id", kepala).in("status", ["disetujui", "dipinjam"]).lt("mulai", akhir).gt("selesai", awal),
    db.from("barang").select("id", kepala).in("kondisi", ["rusak_ringan", "rusak_berat"]).is("deleted_at", null),
  ]);
  return (
    <Panel judul="Laboratorium">
      <Daftar>
        <Baris n={angka(ajuan)} label="Peminjaman lab menunggu persetujuan" href="/admin/sarpras/peminjaman" tanda />
        <Baris n={hariIni.error ? null : (hariIni.count ?? 0)} label="Jadwal pemakaian lab hari ini" href="/admin/sarpras/peminjaman" />
        <Baris n={rusak.error ? null : (rusak.count ?? 0)} label="Alat/barang berkondisi rusak" href="/admin/sarpras" tanda />
      </Daftar>
    </Panel>
  );
}

const NAMA_STATUS_PRESENSI: Record<string, string> = { H: "hadir", T: "terlambat", S: "sakit", I: "izin", DL: "dinas luar", C: "cuti", A: "tanpa keterangan" };
async function KartuHariIni({ db, pid }: { db: Db; pid: string | null }) {
  const hari = hariIniWIB();
  const [presensi, piket, umum] = await Promise.all([
    pid ? db.from("absensi_pegawai").select("status, jam_masuk, jam_pulang").eq("pegawai_id", pid).eq("tanggal", hari).maybeSingle() : Promise.resolve({ data: null, error: null }),
    pid ? db.from("piket_guru").select("hari, tahun_ajaran!inner(aktif)").eq("pegawai_id", pid).eq("tahun_ajaran.aktif", true) : Promise.resolve({ data: [], error: null }),
    db.from("pengumuman").select("id", kepala).eq("sasaran", "pegawai").eq("aktif", true).is("deleted_at", null),
  ]);
  const p = presensi.data as { status: string; jam_masuk: string | null; jam_pulang: string | null } | null;
  const tugasHariIni = ((piket.data ?? []) as { hari: number }[]).some((x) => x.hari === ISO_HARI(hari));
  return (
    <Panel judul="Hari ini" aksi={<Link href="/admin/presensi" className="text-sm font-semibold underline underline-offset-2">Presensi saya</Link>}>
      {!pid ? (
        <Keadaan jenis="info">Akun ini belum tertaut ke data pegawai. Hubungi operator.</Keadaan>
      ) : (
        <p className="text-[0.9375rem]">
          Presensi: {p ? `${NAMA_STATUS_PRESENSI[p.status] ?? p.status}${p.jam_masuk ? ` · masuk ${jam(p.jam_masuk)}` : ""}${p.jam_pulang ? ` · pulang ${jam(p.jam_pulang)}` : ""}` : "belum presensi"}
        </p>
      )}
      <Daftar>
        <Baris n={tugasHariIni ? 1 : 0} label={tugasHariIni ? "Anda bertugas piket/jaga hari ini" : "Tidak ada jadwal piket/jaga hari ini"} />
        <Baris n={umum.error ? null : (umum.count ?? 0)} label="Pengumuman internal aktif" />
      </Daftar>
    </Panel>
  );
}

async function KartuLiterasi({ db }: { db: Db }) {
  const hari = hariIniWIB();
  const [jurnal, tantangan] = await Promise.all([
    db.from("jurnal_baca").select("id", kepala).eq("status", "diajukan"),
    db.from("tantangan_literasi").select("id", kepala).is("deleted_at", null).lte("mulai", hari).gte("selesai", hari),
  ]);
  return (
    <Panel judul="Literasi">
      <Daftar>
        <Baris n={jurnal.error ? null : (jurnal.count ?? 0)} label="Jurnal baca siswa menunggu diperiksa" href="/admin/perpus/literasi" tanda />
        <Baris n={tantangan.error ? null : (tantangan.count ?? 0)} label="Tantangan literasi berjalan" href="/admin/perpus/literasi" />
      </Daftar>
    </Panel>
  );
}

async function KartuAnggaran({ db }: { db: Db }) {
  const [diajukan, lpj] = await Promise.all([
    db.from("pengajuan_kegiatan").select("id", kepala).eq("status", "disetujui_pembina"),
    db.from("pengajuan_kegiatan").select("id", kepala).eq("status", "lpj_diajukan"),
  ]);
  return (
    <Panel judul="Anggaran kegiatan">
      <Daftar>
        <Baris n={diajukan.error ? null : (diajukan.count ?? 0)} label="Pengajuan kegiatan menunggu keputusan anggaran" href="/admin/ekskul/pengajuan" tanda />
        <Baris n={lpj.error ? null : (lpj.count ?? 0)} label="Laporan pertanggungjawaban (LPJ) masuk" href="/admin/ekskul/pengajuan" tanda />
      </Daftar>
    </Panel>
  );
}

async function KartuMutu({ db }: { db: Db }) {
  const hari = hariIniWIB();
  const [evaluasi, temuan, rencana] = await Promise.all([
    hitungBersama(db, "mutuDiajukan"),
    db.from("temuan_mutu").select("id", kepala).neq("status", "ditutup"),
    db.from("rencana_perbaikan").select("id", kepala).in("status", ["rencana", "berjalan"]).lt("tenggat", hari),
  ]);
  return (
    <Panel judul="Penjaminan mutu">
      <Daftar>
        <Baris n={angka(evaluasi)} label="Evaluasi indikator menunggu tinjauan" href="/admin/mutu" tanda />
        <Baris n={temuan.error ? null : (temuan.count ?? 0)} label="Temuan belum ditutup" href="/admin/mutu/temuan" />
        <Baris n={rencana.error ? null : (rencana.count ?? 0)} label="Rencana perbaikan lewat tenggat" href="/admin/mutu/temuan" tanda />
      </Daftar>
    </Panel>
  );
}

async function KartuAlumni({ db }: { db: Db }) {
  const daftar = await hitungBersama(db, "alumniMenunggu");
  return (
    <Panel judul="Alumni">
      <Daftar>
        <Baris n={angka(daftar)} label="Pendaftaran alumni menunggu verifikasi" href="/admin/alumni" tanda />
      </Daftar>
    </Panel>
  );
}

/** Kartu sesuai peran (gabungan peran) — daftar kartu dari matriks (lib/admin/menu-peran.ts). Dipanggil halaman Ringkasan. */
export async function KartuPeran({ supabase, akses }: { supabase: SupabaseClient; akses: Akses }) {
  const pid = await pegawaiSaya(supabase);
  const buat: Record<KunciKartu, () => ReactNode> = {
    kepala: () => <KartuKepala db={supabase} />,
    admin: () => <KartuAdmin db={supabase} />,
    tu: () => <KartuTu db={supabase} />,
    kurikulum: () => <KartuKurikulum db={supabase} />,
    kesiswaan: () => <KartuKesiswaan db={supabase} />,
    sarpras: () => <KartuSarpras db={supabase} />,
    lab: () => <KartuLab db={supabase} />,
    humas: () => <KartuHumas db={supabase} />,
    bk: () => <KartuBk db={supabase} />,
    perpus: () => <KartuPerpus db={supabase} />,
    literasi: () => <KartuLiterasi db={supabase} />,
    anggaran: () => <KartuAnggaran db={supabase} />,
    mutu: () => <KartuMutu db={supabase} />,
    alumni: () => <KartuAlumni db={supabase} />,
    wali: () => <KartuWali db={supabase} pid={pid} />,
    piket: () => <KartuPiket db={supabase} />,
    mengajar: () => <KartuMengajar db={supabase} pid={pid} />,
    hariini: () => <KartuHariIni db={supabase} pid={pid} />,
  };
  const kartu = kartuUntuk(akses.peran);
  if (!kartu.length) return null;
  const nama = akses.peran.map((p) => NAMA_PERAN[p] ?? p).join(", ");
  return (
    <>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] lg:col-span-3" data-kartu-peran-judul="">
        Untuk peran Anda · {nama}
      </h2>
      {kartu.map((k) => (
        <div key={k} data-kartu-peran={k} className={k === "kepala" ? "lg:col-span-3" : ""}>
          {buat[k]()}
        </div>
      ))}
    </>
  );
}
