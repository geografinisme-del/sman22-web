import { hariIniWIB } from "@/lib/admin/absensi";
import { Sidebar, type GrupMenu } from "@/components/admin/Sidebar";
import { berperan, NAMA_PERAN, punya, wajibLogin } from "@/lib/admin/auth";
import { hitungBersama, pegawaiSaya as cariPegawaiSaya, statusDisiplin, tugasPerluNilai, tukarUntukSaya, type NamaHitungan } from "@/lib/admin/hitungan";
import { redirect } from "next/navigation";
import { keluar } from "../actions";
import { ruangKerjaUntuk } from "@/lib/ruang-kerja";
import { AksenBidang } from "@/components/admin/AksenBidang";
import { MenungguVerifikasi } from "@/components/admin/MenungguVerifikasi";

export const dynamic = "force-dynamic";

const WEBSITE = [
  { href: "/admin/profil", label: "Profil Sekolah" },
  { href: "/admin/berita", label: "Berita" },
  { href: "/admin/pengumuman", label: "Pengumuman" },
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/galeri", label: "Galeri" },
  { href: "/admin/kartu-beranda", label: "Kartu Beranda" },
  { href: "/admin/staf-publik", label: "Guru & Tendik (publik)" },
  { href: "/admin/menu", label: "Menu navigasi" },
  { href: "/admin/portal-masuk", label: "Halaman masuk portal" },
  { href: "/admin/fasilitas", label: "Fasilitas" },
  { href: "/admin/halaman", label: "Halaman teks" },
  { href: "/admin/tur-sekolah", label: "Tur Sekolah" },
  { href: "/admin/foto-sementara", label: "Foto sementara" },
  { href: "/admin/prestasi", label: "Prestasi & Alumni" },
  { href: "/admin/spmb", label: "SPMB Beranda" },
  { href: "/admin/portal-bidang", label: "Penanggung Jawab Portal" },
];

const PERAN_PANEL = ["super_admin", "kepala_sekolah", "wakasek", "kurikulum", "sarpras", "pustakawan", "literasi", "keuangan", "admin_alumni", "tim_mutu", "auditor", "operator", "humas", "kesiswaan", "piket", "bk", "wali_kelas", "guru", "laboran", "pegawai"];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, akses } = await wajibLogin();
  // peran yang wajib verifikasi dua langkah: izinnya ditahan database sampai kode autentikator dimasukkan
  if (akses?.peranTertunda.length) redirect("/admin/mfa");
  // akun aktif TANPA peran = belum diverifikasi: hanya profilnya sendiri + kontak operator (di semua alamat /admin/*).
  // Dasbor dasar GTK baru terbuka setelah admin memberi peran (minimal "Pegawai umum").
  if (akses?.tanpaPeran) return <MenungguVerifikasi supabase={supabase} nama={akses.nama} email={akses.email} keluar={keluar} />;
  const bolehPanel = akses?.peran.some((p) => PERAN_PANEL.includes(p));

  if (akses && !bolehPanel && (berperan(akses, "siswa") || berperan(akses, "orang_tua"))) redirect("/portal");
  if (akses && !bolehPanel && berperan(akses, "alumni")) redirect("/alumni/akun");
  if (!akses || !bolehPanel) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div className="max-w-md text-center">
          <h1 className="text-4xl">Akun belum diberi akses</h1>
          <p className="mt-3 text-black/60">
            Anda masuk sebagai <strong>{user.email}</strong>, tetapi akun ini belum diberi peran atau sedang dinonaktifkan.
            Hubungi super admin sekolah.
          </p>
          <form data-keluar-akun="" action={keluar}>
            <button type="submit" className="mt-6 rounded-full bg-ink px-6 py-3 font-semibold text-white">
              Keluar
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Data menu & badge. Semua query yang tidak saling bergantung dijalankan BERSAMAAN (tahap 1), lalu yang butuh
  // pegawai_saya (tahap 2) — sebelumnya ±20 tahap berurutan. Menu ringkas (Pegawai umum/laboran) tidak memuat badge.
  // Layout ini tidak dirender ulang saat berpindah halaman dari sidebar (hanya saat muat penuh / setelah simpan data).
  // ---------------------------------------------------------------------------------------------------------------
  const dasarSaja = akses.peran.every((p) => p === "pegawai" || p === "laboran");
  const hitung = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);
  const nol = Promise.resolve(0);
  const jika = (syarat: boolean, q: () => PromiseLike<{ count: number | null }>) => (!dasarSaja && syarat ? hitung(q()) : nol);
  // hitungan yang juga dipakai halaman Ringkasan: satu query per permintaan (lihat lib/admin/hitungan.ts)
  const bersama = (syarat: boolean, nama: NamaHitungan) => jika(syarat, () => hitungBersama(supabase, nama));
  const kepala = { count: "exact" as const, head: true };
  const kelolaEkskul = punya(akses, "ekskul.kelola");
  const lihatEkskul = kelolaEkskul || punya(akses, "ekskul.lihat");
  const ajuEkskul = kelolaEkskul || punya(akses, "ekskul.anggaran") || punya(akses, "ekskul.lihat");
  const perpusKelola = punya(akses, "perpus.kelola") || punya(akses, "perpus.lihat");
  const bina = punya(akses, "perpus.kelola") || punya(akses, "literasi.kelola");
  const bisaIzinOrtu = punya(akses, "absensi.kelola") || berperan(akses, "wali_kelas");
  const awalHari = new Date(Date.parse(`${hariIniWIB()}T00:00:00+07:00`)).toISOString();
  const statEkskul = () => Promise.resolve(supabase.rpc("statistik_ekskul")).then(({ data }) => ((data ?? []) as { menunggu: number }[]).reduce((t, x) => t + x.menunggu, 0));
  const ajuanEkskul = () => (kelolaEkskul ? hitungBersama(supabase, "kegiatanMenungguKelola") : supabase.from("pengajuan_kegiatan").select("id", kepala).eq("status", "diajukan"));

  // tahap 1: tidak bergantung pada data lain
  const [
    pegawaiSaya, pemilikMutu, notif, menungguSetuju, tukarMenunggu, perangkatMenunggu, pinjamMenunggu, rusakBaru, jurnalMenunggu,
    aduanBaru, aduanAda, tamuAda, mintaBk, ekskulMenunggu, ajuEkskulJumlah, daftarAlumni, mutuDiajukan, pelanggaranBaru, prestasiBaru,
    rujukanBaru, koreksiMenunggu, perluTindakan, izinOrtuMenunggu, izinPegawaiMenunggu,
  ] = await Promise.all([
    cariPegawaiSaya(supabase),
    dasarSaja ? Promise.resolve(false) : Promise.resolve(supabase.rpc("pemilik_mutu")).then((r) => Boolean(r.data)),
    // "Lihat sebagai…": notifikasi pribadi admin tidak ditampilkan (bukan milik peran yang dilihat)
    akses.pratinjau ? nol : hitung(supabase.from("notifikasi").select("id", kepala).is("dibaca_pada", null)),
    bersama(punya(akses, "konten.terbitkan"), "beritaDiajukan"),
    bersama(punya(akses, "jadwal.kelola"), "tukarMenungguKurikulum"),
    bersama(punya(akses, "kurikulum.kelola"), "perangkatDiajukan"),
    bersama(punya(akses, "sarpras.kelola"), "peminjamanDiajukan"),
    bersama(punya(akses, "sarpras.kelola"), "kerusakanBaru"),
    jika(bina, () => supabase.from("jurnal_baca").select("id", kepala).eq("status", "diajukan")),
    bersama(true, "aduanBaru"),
    jika(true, () => supabase.from("pengaduan").select("id", kepala)),
    jika(true, () => supabase.from("buku_tamu").select("id", kepala).is("keluar", null).gte("masuk", awalHari)),
    bersama(punya(akses, "bk.konseling"), "konselingBaru"),
    !dasarSaja && lihatEkskul ? statEkskul() : nol,
    jika(ajuEkskul, ajuanEkskul),
    bersama(punya(akses, "alumni.kelola"), "alumniMenunggu"),
    bersama(punya(akses, "mutu.kelola") || punya(akses, "mutu.audit"), "mutuDiajukan"),
    bersama(punya(akses, "kesiswaan.kelola") && (punya(akses, "kesiswaan.lihat") || berperan(akses, "wali_kelas")), "pelanggaranBaru"),
    bersama(punya(akses, "kesiswaan.kelola") && (punya(akses, "kesiswaan.lihat") || berperan(akses, "wali_kelas")), "prestasiDiajukan"),
    bersama(punya(akses, "bk.rujukan"), "rujukanBaru"),
    bersama(punya(akses, "absensi.kelola") || berperan(akses, "wali_kelas"), "koreksiMenunggu"),
    !dasarSaja && punya(akses, "disiplin.kelola")
      ? statusDisiplin(supabase).then(({ data }) => data.filter((d) => !d.dikonfirmasi).length)
      : nol,
    bersama(bisaIzinOrtu, "izinOrtuMenunggu"),
    bersama(punya(akses, "izin_pegawai.setujui") || punya(akses, "absensi_pegawai.lihat"), "izinPegawaiMenunggu"),
  ]);

  // tahap 2: butuh data pegawai milik akun ini
  const pg = pegawaiSaya;
  const [tukarMasuk, supervisiTugas, perluNilai, pjPojok, binaan] = await Promise.all([
    jika(Boolean(pg), () => tukarUntukSaya(supabase, pg!)),
    jika(Boolean(pg), () => supabase.from("supervisi_akademik").select("id", kepala).eq("supervisor_id", pg!).eq("status", "terjadwal")),
    jika(Boolean(pg), () => tugasPerluNilai(supabase, pg!)),
    jika(Boolean(pg) && !(bina || perpusKelola), () => supabase.from("pojok_baca").select("id", kepala).eq("penanggung_jawab_id", pg!).is("deleted_at", null)),
    jika(Boolean(pg) && !kelolaEkskul, () => supabase.from("pembina_organisasi").select("organisasi_id", kepala).eq("pegawai_id", pg!)),
  ]);
  // pembina tanpa izin ekskul: badge organisasi & pengajuan dihitung setelah tahu ia pembina
  const [ekskulMenungguBinaan, ajuEkskulBinaan] =
    binaan > 0 && !dasarSaja ? await Promise.all([lihatEkskul ? Promise.resolve(ekskulMenunggu) : statEkskul(), ajuEkskul ? Promise.resolve(ajuEkskulJumlah) : hitung(ajuanEkskul())]) : [ekskulMenunggu, ajuEkskulJumlah];

  const grup: GrupMenu[] = [{ item: [{ href: "/admin", label: "Ringkasan" }] }];
  if (punya(akses, "konten.kelola") || punya(akses, "konten.terbitkan"))
    grup.push({
      judul: "Website",
      item: [
        ...(punya(akses, "konten.terbitkan") ? [{ href: "/admin/persetujuan", label: "Persetujuan Konten", badge: menungguSetuju }] : []),
        ...(punya(akses, "konten.kelola") ? WEBSITE : []),
        { href: "/admin/situs", label: "Tampilan Website" },
        ...(punya(akses, "konten.kelola") ? [{ href: "/admin/tampilan", label: "Tema & Tampilan" }] : []),
      ],
    });
  if (punya(akses, "data_induk.baca"))
    grup.push({
      judul: "Data Induk",
      item: [
        { href: "/admin/siswa", label: "Siswa" },
        { href: "/admin/pegawai", label: "Guru & Pegawai" },
        { href: "/admin/kelas", label: "Kelas" },
        { href: "/admin/tahun-ajaran", label: "Tahun Ajaran" },
      ],
    });
  const jadwal: GrupMenu["item"] = [
    { href: "/admin/jadwal-saya", label: "Jadwal Saya" },
    { href: "/admin/jadwal", label: "Jadwal Pelajaran" },
  ];
  if (pegawaiSaya) jadwal.push({ href: "/admin/tukar-jam", label: "Tukar Jam", badge: tukarMasuk });
  jadwal.push({ href: "/admin/kalender", label: "Kalender Sekolah" });
  if (punya(akses, "jadwal.pengganti") || punya(akses, "jadwal.kelola")) jadwal.push({ href: "/admin/jadwal/pengganti", label: "Guru Pengganti" });
  if (punya(akses, "jadwal.kelola")) jadwal.push({ href: "/admin/jadwal/tukar", label: "Persetujuan Tukar Jam", badge: tukarMenunggu });
  if (punya(akses, "jadwal.pengganti") || punya(akses, "jadwal.kelola")) jadwal.push({ href: "/admin/jadwal/riwayat", label: "Riwayat Jadwal" });
  grup.push({ judul: "Jadwal", item: jadwal });
  const kurikulum: GrupMenu["item"] = [{ href: "/admin/kurikulum", label: "Struktur Kurikulum" }];
  if (pegawaiSaya || punya(akses, "kurikulum.kelola")) kurikulum.push({ href: "/admin/kurikulum/atp", label: "CP, TP & ATP" });
  if (pegawaiSaya) kurikulum.push({ href: "/admin/perangkat-ajar", label: "Perangkat Ajar" });
  if (punya(akses, "kurikulum.kelola")) kurikulum.push({ href: "/admin/perangkat-ajar/review", label: "Periksa Perangkat", badge: perangkatMenunggu });
  if (pegawaiSaya) kurikulum.push({ href: "/admin/materi", label: "Materi & Papan Interaktif" });
  kurikulum.push({ href: "/admin/kokurikuler", label: "Projek Kokurikuler" });
  if (pegawaiSaya || punya(akses, "supervisi.kelola")) kurikulum.push({ href: "/admin/supervisi", label: "Supervisi Akademik", badge: supervisiTugas });
  grup.push({ judul: "Kurikulum", item: kurikulum });
  if (pegawaiSaya) grup.push({ judul: "Pembelajaran", item: [{ href: "/admin/lms", label: "Kelas Digital (Tugas & Kuis)", badge: perluNilai }] });
  const sarpras: GrupMenu["item"] = [];
  if (punya(akses, "sarpras.kelola") || punya(akses, "sarpras.lihat")) sarpras.push({ href: "/admin/sarpras", label: "Inventaris" });
  sarpras.push({ href: "/admin/sarpras/peminjaman", label: "Peminjaman Ruang/Barang", badge: pinjamMenunggu });
  sarpras.push({ href: "/admin/sarpras/kerusakan", label: "Laporan Kerusakan", badge: rusakBaru });
  grup.push({ judul: "Sarpras", item: sarpras });
  const perpus: GrupMenu["item"] = [{ href: "/admin/perpus", label: perpusKelola ? "Sirkulasi" : "Pinjaman Saya" }];
  if (perpusKelola) perpus.push({ href: "/admin/perpus/katalog", label: "Katalog Buku" }, { href: "/admin/perpus/laporan", label: "Laporan & Denda" });
  if (bina || perpusKelola) perpus.push({ href: "/admin/perpus/literasi", label: "Literasi", badge: jurnalMenunggu }, { href: "/admin/perpus/pojok", label: "Pojok Baca" });
  else if (pjPojok) perpus.push({ href: "/admin/perpus/pojok", label: "Pojok Baca Saya" });
  grup.push({ judul: "Perpustakaan", item: perpus });
  const humas: GrupMenu["item"] = [];
  if (punya(akses, "pengaduan.kelola") || punya(akses, "pengaduan.rahasia") || aduanAda > 0) humas.push({ href: "/admin/pengaduan", label: "Pengaduan", badge: aduanBaru });
  if (punya(akses, "humas.kelola") || punya(akses, "pengaduan.kelola") || punya(akses, "pengaduan.rahasia")) humas.unshift({ href: "/admin/humas", label: "Dasbor Humas" });
  if (punya(akses, "humas.kelola")) humas.push({ href: "/admin/kemitraan", label: "Kemitraan & MoU" }, { href: "/admin/survei", label: "Survei" }, { href: "/admin/kontak-media", label: "Kontak Media" });
  if (punya(akses, "tamu.catat") || punya(akses, "humas.kelola") || pegawaiSaya) humas.push({ href: "/admin/buku-tamu", label: "Buku Tamu", badge: tamuAda });
  if (humas.length) grup.push({ judul: "Humas", item: humas });
  // BK (isi konseling hanya untuk guru BK; pimpinan hanya agregat)
  const bk: GrupMenu["item"] = [];
  if (punya(akses, "bk.konseling")) bk.push({ href: "/admin/bk", label: "Layanan & Kasus BK", badge: mintaBk });
  if (punya(akses, "bk.agregat")) bk.push({ href: "/admin/bk/laporan", label: "Laporan BK (agregat)" });
  if (punya(akses, "bk.konseling") || punya(akses, "audit.baca")) bk.push({ href: "/admin/bk/log", label: "Log Akses BK" });
  if (bk.length) grup.push({ judul: "Bimbingan Konseling", item: bk });
  // Ekskul & OSIS
  const ekskul: GrupMenu["item"] = [];
  if (lihatEkskul || binaan > 0) ekskul.push({ href: "/admin/ekskul", label: kelolaEkskul ? "Organisasi Siswa" : "Organisasi Binaan", badge: ekskulMenungguBinaan });
  if (ajuEkskul || binaan > 0) ekskul.push({ href: "/admin/ekskul/pengajuan", label: "Pengajuan Kegiatan", badge: punya(akses, "ekskul.anggaran") && !kelolaEkskul ? 0 : ajuEkskulBinaan });
  if (ekskul.length) grup.push({ judul: "Ekskul & OSIS", item: ekskul });
  // Alumni
  if (punya(akses, "alumni.kelola") || punya(akses, "alumni.lihat")) {
    const alumni: GrupMenu["item"] = [{ href: "/admin/alumni", label: "Alumni & Tracer", badge: daftarAlumni }];
    if (punya(akses, "alumni.kelola")) alumni.push({ href: "/admin/alumni/layanan", label: "Layanan Alumni" });
    grup.push({ judul: "Alumni", item: alumni });
  }
  // Mutu & akreditasi (tim mutu, auditor, pimpinan, atau pemilik indikator)
  if (punya(akses, "mutu.kelola") || punya(akses, "mutu.audit") || punya(akses, "mutu.lihat") || pemilikMutu)
    grup.push({ judul: "Mutu", item: [{ href: "/admin/mutu", label: "Mutu & Akreditasi", badge: mutuDiajukan }, { href: "/admin/mutu/temuan", label: "Temuan & Perbaikan" }, { href: "/admin/mutu/bukti", label: "Repositori Bukti" }] });
  const kesiswaan: GrupMenu["item"] = [{ href: "/admin/kesiswaan/lapor", label: "Lapor Pelanggaran/Prestasi" }];
  if (punya(akses, "kesiswaan.lihat") || berperan(akses, "wali_kelas")) kesiswaan.push({ href: "/admin/kesiswaan", label: "Prestasi & Poin", badge: pelanggaranBaru + prestasiBaru });
  if (punya(akses, "bk.rujukan")) kesiswaan.push({ href: "/admin/rujukan-bk", label: "Rujukan BK", badge: rujukanBaru });
  if (punya(akses, "kesiswaan.kelola")) kesiswaan.push({ href: "/admin/kesiswaan/pengaturan", label: "Aturan Poin" });
  grup.push({ judul: "Kesiswaan", item: kesiswaan });
  if (berperan(akses, "wali_kelas")) grup.push({ judul: "Perwalian", item: [{ href: "/admin/kelas-saya", label: "Kelas Saya" }] });

  // Absensi & disiplin (dengan penanda jumlah yang perlu ditindaklanjuti)
  const absensi: GrupMenu["item"] = [{ href: "/admin/presensi", label: "Presensi Saya" }];
  const bisaAbsensiSiswa = punya(akses, "absensi.lihat") || berperan(akses, "wali_kelas");
  if (bisaAbsensiSiswa) absensi.push({ href: "/admin/absensi", label: "Absensi Siswa" });
  if (punya(akses, "absensi.kelola") || berperan(akses, "wali_kelas"))
    absensi.push({ href: "/admin/absensi/pengajuan", label: "Pengajuan Koreksi", badge: punya(akses, "absensi.kelola") ? koreksiMenunggu : 0 });
  if (bisaIzinOrtu) absensi.push({ href: "/admin/izin-ortu", label: "Izin dari Orang Tua", badge: izinOrtuMenunggu });
  if (bisaAbsensiSiswa) absensi.push({ href: "/admin/absensi/jp", label: "Per Jam Pelajaran" });
  if (bisaAbsensiSiswa) absensi.push({ href: "/admin/absensi/rekap", label: "Rekap Absensi" });
  if (punya(akses, "disiplin.lihat") || berperan(akses, "wali_kelas")) absensi.push({ href: "/admin/absensi/disiplin", label: "SP & Panggilan Ortu", badge: perluTindakan });
  if (punya(akses, "absensi_pegawai.lihat")) absensi.push({ href: "/admin/absensi/guru", label: "Kehadiran Guru" });
  if (punya(akses, "izin_pegawai.setujui") || punya(akses, "absensi_pegawai.lihat"))
    absensi.push({ href: "/admin/izin-pegawai", label: "Izin Guru & Pegawai", badge: punya(akses, "izin_pegawai.setujui") ? izinPegawaiMenunggu : 0 });
  if (punya(akses, "absensi_pegawai.kelola")) absensi.push({ href: "/admin/absensi/guru/pengaturan", label: "Jam Kerja Pegawai" });
  if (punya(akses, "absensi.atur")) absensi.push({ href: "/admin/absensi/pengaturan", label: "Pengaturan Absensi" });
  grup.push({ judul: "Absensi", item: absensi });
  const pengaturan = [];
  if (punya(akses, "akun_portal.kelola")) pengaturan.push({ href: "/admin/akun-portal", label: "Akun Portal Siswa & Ortu" });
  if (punya(akses, "pengguna.kelola")) pengaturan.push({ href: "/admin/pengguna", label: "Pengguna & Peran" });
  if (punya(akses, "pengguna.kelola")) pengaturan.push({ href: "/admin/notifikasi/kanal", label: "WhatsApp & Email" });
  pengaturan.push({ href: "/admin/profil-saya", label: "Profil Saya" }, { href: "/admin/direktori", label: "Direktori GTK" }, { href: "/admin/keamanan", label: "Keamanan Akun" });
  if (punya(akses, "audit.baca")) pengaturan.push({ href: "/admin/log", label: "Log Aktivitas" });
  if (pengaturan.length) grup.push({ judul: "Pengaturan", item: pengaturan });

  // Pegawai umum (satpam, caraka, sopir, …) dan laboran: menu dasbor dasar saja
  // (+ inventaris & jadwal lab untuk laboran). Hak akses tetap dijaga RLS; ini hanya merapikan menu.
  if (dasarSaja) {
    const dasar: GrupMenu[] = [
      { item: [{ href: "/admin", label: "Ringkasan" }] },
      {
        judul: "Saya",
        item: [
          { href: "/admin/profil-saya", label: "Profil Saya" },
          { href: "/admin/direktori", label: "Direktori GTK" },
          { href: "/admin/kalender", label: "Kalender Sekolah" },
          ...(pegawaiSaya ? [{ href: "/admin/presensi", label: "Presensi Saya" }] : []),
        ],
      },
    ];
    if (punya(akses, "sarpras.inventaris"))
      dasar.push({ judul: "Laboratorium", item: [{ href: "/admin/sarpras", label: "Inventaris" }, { href: "/admin/sarpras/peminjaman", label: "Jadwal & Peminjaman Lab" }] });
    dasar.push({ judul: "Pengaturan", item: [{ href: "/admin/keamanan", label: "Keamanan Akun" }] });
    grup.splice(0, grup.length, ...dasar);
  }

  return (
    <>
      <Sidebar
        notif={notif}
        grup={grup}
        ruang={ruangKerjaUntuk(akses)}
        nama={akses.nama}
        email={akses.email}
        peran={akses.peran.map((p) => NAMA_PERAN[p] ?? p).join(", ")}
        keluar={keluar}
        lihatSebagai={berperan(akses, "super_admin") && !akses.pratinjau}
      />
      <main className="px-4 py-6 sm:px-6 lg:ml-[260px] lg:px-8 lg:py-7 print:m-0 print:p-0">
        <div className="max-w-[1320px]">
          <AksenBidang ruang={ruangKerjaUntuk(akses)}>{children}</AksenBidang>
        </div>
      </main>
    </>
  );
}
