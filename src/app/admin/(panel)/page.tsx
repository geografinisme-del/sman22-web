import Link from "next/link";
import { Kartu, JudulHalaman, Notifikasi } from "@/components/admin/ui";
import { berperan, punya, wajibLogin } from "@/lib/admin/auth";
import { formatTanggal } from "@/lib/format";
import { BagianHariIni } from "@/components/dashboard/HariIni";

export const metadata = { title: "Ringkasan" };

const NAMA_TABEL: Record<string, string> = {
  profil_sekolah: "Profil sekolah",
  berita: "Berita",
  agenda: "Agenda",
  pengumuman: "Pengumuman",
  galeri: "Galeri",
  siswa: "Siswa",
  pegawai: "Pegawai",
  kelas: "Kelas",
  anggota_kelas: "Anggota kelas",
  tahun_ajaran: "Tahun ajaran",
  orang_tua: "Orang tua",
  siswa_orang_tua: "Relasi orang tua",
  pengguna: "Pengguna",
  pengguna_peran: "Peran pengguna",
  pelanggaran_siswa: "Pelanggaran siswa",
  prestasi_siswa: "Prestasi siswa",
  pembinaan_siswa: "Pembinaan siswa",
  rujukan_bk: "Rujukan BK",
  jenis_pelanggaran: "Aturan pelanggaran",
  absensi_siswa: "Absensi siswa",
  absensi_pegawai: "Kehadiran pegawai",
  absensi_jp: "Absensi per jam",
  jurnal_jp: "Jurnal mengajar",
  izin_ortu: "Izin orang tua",
  pengajuan_koreksi: "Koreksi absensi",
  pengajuan_izin_pegawai: "Izin pegawai",
  jadwal: "Jadwal",
  perubahan_jadwal: "Perubahan jadwal",
  penugasan_mengajar: "Penugasan mengajar",
  hero_slide: "Foto pembuka",
  pengaturan_situs: "Tampilan website",
};
const AKSI: Record<string, string> = { INSERT: "ditambah", UPDATE: "diubah", DELETE: "dihapus", LIHAT: "dibuka", EKSPOR: "diekspor", LOGIN: "masuk", CETAK: "dicetak" };

function Angka({ nilai, label, href }: { nilai: number | string; label: string; href?: string }) {
  const isi = (
    <>
      <p className="font-serif text-5xl leading-none">{nilai}</p>
      <p className="mt-2 text-sm text-black/60">{label}</p>
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-2xl bg-white p-5 ring-1 ring-black/5 transition hover:ring-brand-600">
      {isi}
    </Link>
  ) : (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">{isi}</div>
  );
}

export default async function Ringkasan({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const { pesan } = await searchParams;
  const { supabase, akses } = await wajibLogin();
  if (!akses) return null;
  const hitung = (tabel: string) => supabase.from(tabel).select("id", { count: "exact", head: true }).is("deleted_at", null);

  const konten = punya(akses, "konten.kelola")
    ? await Promise.all([
        hitung("berita").eq("status", "terbit"),
        hitung("berita").eq("status", "draft"),
        hitung("pengumuman").eq("aktif", true),
        hitung("agenda").gte("tanggal", new Date().toISOString().slice(0, 10)),
        supabase.from("profil_sekolah").select("*").eq("id", 1).maybeSingle(),
      ])
    : null;

  let induk: null | { ta: string | null; siswa: number; pegawai: number; kelas: number; tingkat: Record<string, number>; tanpaKelas: number } = null;
  if (punya(akses, "data_induk.baca")) {
    const { data: ta } = await supabase.from("tahun_ajaran").select("id, nama, semester").eq("aktif", true).maybeSingle();
    const [s, p, k, X, XI, XII, tk] = await Promise.all([
      hitung("siswa").eq("status", "aktif"),
      hitung("pegawai").eq("status", "aktif"),
      ta ? hitung("kelas").eq("tahun_ajaran_id", ta.id) : Promise.resolve({ count: 0 }),
      ...(["X", "XI", "XII"] as const).map((t) =>
        supabase.from("siswa_kelas_aktif").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "aktif").eq("tingkat", t),
      ),
      supabase.from("siswa_kelas_aktif").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "aktif").is("kelas_id", null),
    ]);
    induk = {
      ta: ta ? `${ta.nama} · semester ${ta.semester}` : null,
      siswa: s.count ?? 0,
      pegawai: p.count ?? 0,
      kelas: k.count ?? 0,
      tingkat: { X: X.count ?? 0, XI: XI.count ?? 0, XII: XII.count ?? 0 },
      tanpaKelas: tk.count ?? 0,
    };
  }

  const audit = punya(akses, "audit.baca")
    ? (await supabase.from("audit_log").select("id, waktu, tabel, aksi").order("waktu", { ascending: false }).limit(8)).data
    : null;

  const kolomProfil = ["alamat", "telepon", "email", "npsn", "visi", "misi", "sambutan_isi", "slogan"] as const;
  const profil = konten?.[4].data as Record<string, unknown> | null | undefined;
  const profilKosong = konten ? kolomProfil.filter((k) => !String(profil?.[k] ?? "").trim()).length : 0;

  return (
    <>
      <JudulHalaman judul={`Halo, ${akses.nama || "Bapak/Ibu"}`} deskripsi="Ringkasan sesuai hak akses Anda." />
      {pesan === "tanpa-akses" && (
        <div role="alert" className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-200">
          Anda tidak memiliki akses ke halaman tersebut.
        </div>
      )}
      <Notifikasi kode={pesan === "tanpa-akses" ? undefined : pesan} />
      <BagianHariIni supabase={supabase} akses={akses} />

      {induk && (
        <section className="mb-10">
          <h2 className="mb-4 font-serif text-3xl">Data induk</h2>
          {!induk.ta && (
            <Link href="/admin/tahun-ajaran" className="mb-4 block rounded-2xl bg-amber-50 p-5 text-amber-900 ring-1 ring-amber-200">
              <strong>Belum ada tahun ajaran aktif.</strong> Buat dan aktifkan tahun ajaran terlebih dahulu →
            </Link>
          )}
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <li><Angka nilai={induk.siswa} label="Siswa aktif" href="/admin/siswa" /></li>
            <li><Angka nilai={induk.pegawai} label="Guru & pegawai aktif" href="/admin/pegawai" /></li>
            <li><Angka nilai={induk.kelas} label="Kelas tahun ini" href="/admin/kelas" /></li>
            <li><Angka nilai={induk.ta ?? "—"} label="Tahun ajaran aktif" href="/admin/tahun-ajaran" /></li>
          </ul>
          <Kartu className="mt-4">
            <p className="text-sm font-semibold">Sebaran siswa aktif per tingkat</p>
            <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              {Object.entries(induk.tingkat).map(([t, n]) => (
                <span key={t}>
                  Kelas {t}: <strong>{n}</strong>
                </span>
              ))}
              <span className={induk.tanpaKelas ? "text-amber-700" : "text-black/50"}>
                Belum punya kelas: <strong>{induk.tanpaKelas}</strong>
              </span>
              <span className="text-black/50">
                Jumlah: <strong>{Object.values(induk.tingkat).reduce((a, b) => a + b, 0) + induk.tanpaKelas}</strong> (harus sama
                dengan siswa aktif: {induk.siswa})
              </span>
            </div>
          </Kartu>
        </section>
      )}

      {berperan(akses, "wali_kelas") && (
        <Link href="/admin/kelas-saya" className="mb-10 block rounded-2xl bg-brand-900 p-6 text-white">
          <p className="font-serif text-3xl">Kelas perwalian saya →</p>
          <p className="mt-1 text-white/70">Lihat daftar siswa dan kontak orang tua.</p>
        </Link>
      )}

      {konten && (
        <section className="mb-10">
          <h2 className="mb-4 font-serif text-3xl">Website</h2>
          {profilKosong > 0 && (
            <Link href="/admin/profil" className="mb-4 block rounded-2xl bg-amber-50 p-5 text-amber-900 ring-1 ring-amber-200">
              <strong>{profilKosong} isian profil sekolah masih kosong</strong>. Klik untuk melengkapi →
            </Link>
          )}
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <li><Angka nilai={konten[0].count ?? 0} label="Berita terbit" href="/admin/berita" /></li>
            <li><Angka nilai={konten[1].count ?? 0} label="Draft berita" href="/admin/berita" /></li>
            <li><Angka nilai={konten[2].count ?? 0} label="Pengumuman aktif" href="/admin/pengumuman" /></li>
            <li><Angka nilai={konten[3].count ?? 0} label="Agenda mendatang" href="/admin/agenda" /></li>
          </ul>
        </section>
      )}

      {audit && (
        <Kartu>
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-2xl">Aktivitas terakhir</h2>
            <Link href="/admin/log" className="text-sm underline-offset-4 hover:underline">
              Semua log →
            </Link>
          </div>
          {audit.length === 0 ? (
            <p className="mt-4 text-black/50">Belum ada aktivitas.</p>
          ) : (
            <ul className="mt-4 divide-y divide-black/5 text-sm">
              {audit.map((a) => (
                <li key={a.id} className="flex justify-between gap-4 py-2">
                  <span>
                    {NAMA_TABEL[a.tabel] ?? a.tabel} · <span className="text-black/50">{AKSI[a.aksi] ?? a.aksi}</span>
                  </span>
                  <time className="shrink-0 text-black/40">
                    {formatTanggal(a.waktu.slice(0, 10), { month: "short" })}{" "}
                    {new Date(a.waktu).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Kartu>
      )}
    </>
  );
}
