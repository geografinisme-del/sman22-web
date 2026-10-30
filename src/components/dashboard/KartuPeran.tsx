import Link from "next/link";
import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Keadaan, Panel } from "@/components/dashboard/HariIni";
import { geserTanggal, hariIniWIB } from "@/lib/admin/absensi";
import { berperan, NAMA_PERAN, punya, type Akses } from "@/lib/admin/auth";
import { BOLEH } from "@/lib/admin/akses-modul";
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

/** super admin: akun, keamanan & kesehatan notifikasi; operator (akun dasar): hanya akun yang menunggu verifikasi */
async function KartuAdmin({ db, penuh }: { db: Db; penuh: boolean }) {
  // sejak kemarin pukul 00.00 WIB
  const sehari = new Date(Date.parse(`${geserTanggal(hariIniWIB(), -1)}T00:00:00+07:00`)).toISOString();
  const [akun, gagalLogin, gagalKirim, antre] = await Promise.all([
    db.from("pengguna").select("user_id, pengguna_peran(peran)").eq("aktif", true).limit(2000),
    penuh ? db.from("audit_log").select("id", kepala).eq("aksi", "LOGIN_GAGAL").gte("waktu", sehari) : nol,
    penuh ? db.from("antrian_kirim").select("id", kepala).eq("status", "gagal") : nol,
    penuh ? db.from("antrian_kirim").select("id", kepala).eq("status", "menunggu") : nol,
  ]);
  const tanpaPeran = akun.error ? null : ((akun.data ?? []) as { pengguna_peran: unknown[] }[]).filter((u) => u.pengguna_peran.length === 0).length;
  return (
    <Panel judul={penuh ? "Administrasi sistem" : "Akun & pengguna"}>
      <Daftar>
        <Baris n={tanpaPeran} label="Akun menunggu verifikasi (tanpa peran)" href="/admin/pengguna" tanda />
        {penuh && (
          <>
            <Baris n={gagalLogin.error ? null : (gagalLogin.count ?? 0)} label="Percobaan masuk gagal (sejak kemarin)" href="/admin/log" tanda />
            <Baris n={gagalKirim.error ? null : (gagalKirim.count ?? 0)} label="Notifikasi WhatsApp/email gagal" href="/admin/notifikasi/kanal" tanda />
            <Baris n={antre.error ? null : (antre.count ?? 0)} label="Notifikasi dalam antrean" href="/admin/notifikasi/kanal" />
          </>
        )}
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

/** Kartu sesuai peran (gabungan peran). Dipanggil halaman Ringkasan. */
export async function KartuPeran({ supabase, akses }: { supabase: SupabaseClient; akses: Akses }) {
  const pid = await pegawaiSaya(supabase);
  const kartu: { kunci: string; el: ReactNode }[] = [];
  if (berperan(akses, "kepala_sekolah")) kartu.push({ kunci: "kepala", el: <KartuKepala db={supabase} /> });
  if (punya(akses, "pengguna.kelola") || punya(akses, "pengguna.kelola_dasar")) kartu.push({ kunci: "admin", el: <KartuAdmin db={supabase} penuh={punya(akses, "pengguna.kelola")} /> });
  if (punya(akses, "kurikulum.kelola")) kartu.push({ kunci: "kurikulum", el: <KartuKurikulum db={supabase} /> });
  if (punya(akses, "kesiswaan.kelola")) kartu.push({ kunci: "kesiswaan", el: <KartuKesiswaan db={supabase} /> });
  if (punya(akses, "sarpras.kelola") || punya(akses, "sarpras.inventaris")) kartu.push({ kunci: "sarpras", el: <KartuSarpras db={supabase} /> });
  if (punya(akses, "humas.kelola")) kartu.push({ kunci: "humas", el: <KartuHumas db={supabase} /> });
  if (punya(akses, "bk.konseling")) kartu.push({ kunci: "bk", el: <KartuBk db={supabase} /> });
  if (berperan(akses, "wali_kelas")) kartu.push({ kunci: "wali", el: <KartuWali db={supabase} pid={pid} /> });
  if (berperan(akses, "piket")) kartu.push({ kunci: "piket", el: <KartuPiket db={supabase} /> });
  if (BOLEH.mengajar(akses)) kartu.push({ kunci: "mengajar", el: <KartuMengajar db={supabase} pid={pid} /> });
  if (!kartu.length) return null;
  const nama = akses.peran.map((p) => NAMA_PERAN[p] ?? p).join(", ");
  return (
    <>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] lg:col-span-3" data-kartu-peran-judul="">
        Untuk peran Anda · {nama}
      </h2>
      {kartu.map((k) => (
        <div key={k.kunci} data-kartu-peran={k.kunci} className={k.kunci === "kepala" ? "lg:col-span-3" : ""}>
          {k.el}
        </div>
      ))}
    </>
  );
}
