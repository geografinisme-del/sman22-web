import { hariIniWIB } from "@/lib/admin/absensi";
import { Sidebar, type GrupMenu } from "@/components/admin/Sidebar";
import { berperan, NAMA_PERAN, punya, wajibLogin } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { keluar } from "../actions";
import { ruangKerjaUntuk } from "@/lib/ruang-kerja";
import { AksenBidang } from "@/components/admin/AksenBidang";

export const dynamic = "force-dynamic";

const WEBSITE = [
  { href: "/admin/profil", label: "Profil Sekolah" },
  { href: "/admin/berita", label: "Berita" },
  { href: "/admin/pengumuman", label: "Pengumuman" },
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/galeri", label: "Galeri" },
  { href: "/admin/kartu-beranda", label: "Kartu Beranda" },
  { href: "/admin/tur-sekolah", label: "Tur Sekolah" },
  { href: "/admin/prestasi", label: "Prestasi & Alumni" },
  { href: "/admin/spmb", label: "SPMB Beranda" },
  { href: "/admin/portal-bidang", label: "Penanggung Jawab Portal" },
];

const PERAN_PANEL = ["super_admin", "kepala_sekolah", "wakasek", "kurikulum", "sarpras", "pustakawan", "literasi", "keuangan", "admin_alumni", "tim_mutu", "auditor", "operator", "humas", "kesiswaan", "piket", "bk", "wali_kelas", "guru"];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, akses } = await wajibLogin();
  // peran yang wajib verifikasi dua langkah: izinnya ditahan database sampai kode autentikator dimasukkan
  if (akses?.peranTertunda.length) redirect("/admin/mfa");
  const bolehPanel = akses?.peran.some((p) => PERAN_PANEL.includes(p));

  if (akses && !bolehPanel && (berperan(akses, "siswa") || berperan(akses, "orang_tua"))) redirect("/portal");
  if (akses && !bolehPanel && berperan(akses, "alumni")) redirect("/alumni/akun");
  if (!akses || !bolehPanel) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-4xl">Akun belum diberi akses</h1>
          <p className="mt-3 text-black/60">
            Anda masuk sebagai <strong>{user.email}</strong>, tetapi akun ini belum diberi peran atau sedang dinonaktifkan.
            Hubungi super admin sekolah.
          </p>
          <form action={keluar}>
            <button type="submit" className="mt-6 rounded-full bg-brand-900 px-6 py-3 font-semibold text-white">
              Keluar
            </button>
          </form>
        </div>
      </main>
    );
  }

  const grup: GrupMenu[] = [{ item: [{ href: "/admin", label: "Ringkasan" }] }];
  const { count: menungguSetuju } = punya(akses, "konten.terbitkan")
    ? await supabase.from("berita").select("id", { count: "exact", head: true }).eq("status", "diajukan").is("deleted_at", null)
    : { count: 0 };
  if (punya(akses, "konten.kelola") || punya(akses, "konten.terbitkan"))
    grup.push({
      judul: "Website",
      item: [
        ...(punya(akses, "konten.terbitkan") ? [{ href: "/admin/persetujuan", label: "Persetujuan Konten", badge: menungguSetuju ?? 0 }] : []),
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
  const { data: pegawaiSaya } = await supabase.rpc("pegawai_saya");
  const [{ count: tukarMasuk }, { count: tukarMenunggu }] = await Promise.all([
    pegawaiSaya
      ? supabase.from("pengajuan_tukar_jadwal").select("id", { count: "exact", head: true }).eq("mitra_id", pegawaiSaya).eq("status", "menunggu_mitra")
      : Promise.resolve({ count: 0 }),
    punya(akses, "jadwal.kelola")
      ? supabase.from("pengajuan_tukar_jadwal").select("id", { count: "exact", head: true }).eq("status", "menunggu_kurikulum")
      : Promise.resolve({ count: 0 }),
  ]);
  if (pegawaiSaya) jadwal.push({ href: "/admin/tukar-jam", label: "Tukar Jam", badge: tukarMasuk ?? 0 });
  jadwal.push({ href: "/admin/kalender", label: "Kalender Sekolah" });
  if (punya(akses, "jadwal.pengganti") || punya(akses, "jadwal.kelola")) jadwal.push({ href: "/admin/jadwal/pengganti", label: "Guru Pengganti" });
  if (punya(akses, "jadwal.kelola")) jadwal.push({ href: "/admin/jadwal/tukar", label: "Persetujuan Tukar Jam", badge: tukarMenunggu ?? 0 });
  if (punya(akses, "jadwal.pengganti") || punya(akses, "jadwal.kelola")) jadwal.push({ href: "/admin/jadwal/riwayat", label: "Riwayat Jadwal" });
  grup.push({ judul: "Jadwal", item: jadwal });
  const [{ count: perangkatMenunggu }, { count: supervisiTugas }] = await Promise.all([
    punya(akses, "kurikulum.kelola")
      ? supabase.from("perangkat_ajar").select("id", { count: "exact", head: true }).eq("status", "diajukan").is("deleted_at", null)
      : Promise.resolve({ count: 0 }),
    pegawaiSaya
      ? supabase.from("supervisi_akademik").select("id", { count: "exact", head: true }).eq("supervisor_id", pegawaiSaya).eq("status", "terjadwal")
      : Promise.resolve({ count: 0 }),
  ]);
  const kurikulum: GrupMenu["item"] = [{ href: "/admin/kurikulum", label: "Struktur Kurikulum" }];
  if (pegawaiSaya || punya(akses, "kurikulum.kelola")) kurikulum.push({ href: "/admin/kurikulum/atp", label: "CP, TP & ATP" });
  if (pegawaiSaya) kurikulum.push({ href: "/admin/perangkat-ajar", label: "Perangkat Ajar" });
  if (punya(akses, "kurikulum.kelola")) kurikulum.push({ href: "/admin/perangkat-ajar/review", label: "Periksa Perangkat", badge: perangkatMenunggu ?? 0 });
  if (pegawaiSaya) kurikulum.push({ href: "/admin/materi", label: "Materi & Papan Interaktif" });
  kurikulum.push({ href: "/admin/kokurikuler", label: "Projek Kokurikuler" });
  if (pegawaiSaya || punya(akses, "supervisi.kelola")) kurikulum.push({ href: "/admin/supervisi", label: "Supervisi Akademik", badge: supervisiTugas ?? 0 });
  grup.push({ judul: "Kurikulum", item: kurikulum });
  const [{ count: perluNilai }, { count: pinjamMenunggu }, { count: rusakBaru }] = await Promise.all([
    pegawaiSaya
      ? supabase.from("pengumpulan_tugas").select("id, tugas!inner(pegawai_id)", { count: "exact", head: true }).eq("status", "dikumpulkan").eq("tugas.pegawai_id", pegawaiSaya)
      : Promise.resolve({ count: 0 }),
    punya(akses, "sarpras.kelola") ? supabase.from("peminjaman").select("id", { count: "exact", head: true }).eq("status", "diajukan") : Promise.resolve({ count: 0 }),
    punya(akses, "sarpras.kelola") ? supabase.from("laporan_kerusakan").select("id", { count: "exact", head: true }).eq("status", "dilaporkan") : Promise.resolve({ count: 0 }),
  ]);
  if (pegawaiSaya) grup.push({ judul: "Pembelajaran", item: [{ href: "/admin/lms", label: "Kelas Digital (Tugas & Kuis)", badge: perluNilai ?? 0 }] });
  const sarpras: GrupMenu["item"] = [];
  if (punya(akses, "sarpras.kelola") || punya(akses, "sarpras.lihat")) sarpras.push({ href: "/admin/sarpras", label: "Inventaris" });
  sarpras.push({ href: "/admin/sarpras/peminjaman", label: "Peminjaman Ruang/Barang", badge: pinjamMenunggu ?? 0 });
  sarpras.push({ href: "/admin/sarpras/kerusakan", label: "Laporan Kerusakan", badge: rusakBaru ?? 0 });
  grup.push({ judul: "Sarpras", item: sarpras });
  const perpusKelola = punya(akses, "perpus.kelola") || punya(akses, "perpus.lihat");
  const perpus: GrupMenu["item"] = [{ href: "/admin/perpus", label: perpusKelola ? "Sirkulasi" : "Pinjaman Saya" }];
  if (perpusKelola) perpus.push({ href: "/admin/perpus/katalog", label: "Katalog Buku" }, { href: "/admin/perpus/laporan", label: "Laporan & Denda" });
  const bina = punya(akses, "perpus.kelola") || punya(akses, "literasi.kelola");
  if (bina || perpusKelola) {
    const { count: jurnalMenunggu } = bina ? await supabase.from("jurnal_baca").select("id", { count: "exact", head: true }).eq("status", "diajukan") : { count: 0 };
    perpus.push({ href: "/admin/perpus/literasi", label: "Literasi", badge: jurnalMenunggu ?? 0 }, { href: "/admin/perpus/pojok", label: "Pojok Baca" });
  } else if (pegawaiSaya) {
    const { count: pjPojok } = await supabase.from("pojok_baca").select("id", { count: "exact", head: true }).eq("penanggung_jawab_id", pegawaiSaya).is("deleted_at", null);
    if (pjPojok) perpus.push({ href: "/admin/perpus/pojok", label: "Pojok Baca Saya" });
  }
  grup.push({ judul: "Perpustakaan", item: perpus });
  const awalHari = new Date(Date.parse(`${hariIniWIB()}T00:00:00+07:00`)).toISOString();
  const [{ count: aduanBaru }, { count: aduanAda }, { count: tamuAda }] = await Promise.all([
    supabase.from("pengaduan").select("id", { count: "exact", head: true }).eq("status", "baru"),
    supabase.from("pengaduan").select("id", { count: "exact", head: true }),
    supabase.from("buku_tamu").select("id", { count: "exact", head: true }).is("keluar", null).gte("masuk", awalHari),
  ]);
  const humas: GrupMenu["item"] = [];
  if (punya(akses, "pengaduan.kelola") || punya(akses, "pengaduan.rahasia") || (aduanAda ?? 0) > 0) humas.push({ href: "/admin/pengaduan", label: "Pengaduan", badge: aduanBaru ?? 0 });
  if (punya(akses, "humas.kelola") || punya(akses, "pengaduan.kelola") || punya(akses, "pengaduan.rahasia")) humas.unshift({ href: "/admin/humas", label: "Dasbor Humas" });
  if (punya(akses, "humas.kelola")) humas.push({ href: "/admin/kemitraan", label: "Kemitraan & MoU" }, { href: "/admin/survei", label: "Survei" }, { href: "/admin/kontak-media", label: "Kontak Media" });
  if (punya(akses, "tamu.catat") || punya(akses, "humas.kelola") || pegawaiSaya) humas.push({ href: "/admin/buku-tamu", label: "Buku Tamu", badge: tamuAda ?? 0 });
  if (humas.length) grup.push({ judul: "Humas", item: humas });
  // BK (isi konseling hanya untuk guru BK; pimpinan hanya agregat)
  const bk: GrupMenu["item"] = [];
  if (punya(akses, "bk.konseling")) {
    const { count: mintaBk } = await supabase.from("permintaan_konseling").select("id", { count: "exact", head: true }).eq("status", "baru");
    bk.push({ href: "/admin/bk", label: "Layanan & Kasus BK", badge: mintaBk ?? 0 });
  }
  if (punya(akses, "bk.agregat")) bk.push({ href: "/admin/bk/laporan", label: "Laporan BK (agregat)" });
  if (punya(akses, "bk.konseling") || punya(akses, "audit.baca")) bk.push({ href: "/admin/bk/log", label: "Log Akses BK" });
  if (bk.length) grup.push({ judul: "Bimbingan Konseling", item: bk });
  // Ekskul & OSIS
  const ekskul: GrupMenu["item"] = [];
  const kelolaEkskul = punya(akses, "ekskul.kelola");
  const { count: binaan } = !kelolaEkskul && pegawaiSaya ? await supabase.from("pembina_organisasi").select("organisasi_id", { count: "exact", head: true }).eq("pegawai_id", pegawaiSaya) : { count: 0 };
  if (kelolaEkskul || punya(akses, "ekskul.lihat") || (binaan ?? 0) > 0) {
    const { data: st } = await supabase.rpc("statistik_ekskul");
    const menunggu = ((st ?? []) as { menunggu: number }[]).reduce((t, x) => t + x.menunggu, 0);
    ekskul.push({ href: "/admin/ekskul", label: kelolaEkskul ? "Organisasi Siswa" : "Organisasi Binaan", badge: menunggu });
  }
  if (kelolaEkskul || punya(akses, "ekskul.anggaran") || punya(akses, "ekskul.lihat") || (binaan ?? 0) > 0) {
    const { count: aju } = await supabase.from("pengajuan_kegiatan").select("id", { count: "exact", head: true })
      .in("status", kelolaEkskul ? ["disetujui_pembina", "lpj_diajukan"] : ["diajukan"]);
    ekskul.push({ href: "/admin/ekskul/pengajuan", label: "Pengajuan Kegiatan", badge: punya(akses, "ekskul.anggaran") && !kelolaEkskul ? 0 : aju ?? 0 });
  }
  if (ekskul.length) grup.push({ judul: "Ekskul & OSIS", item: ekskul });
  // Alumni
  if (punya(akses, "alumni.kelola") || punya(akses, "alumni.lihat")) {
    const { count: daftarAlumni } = punya(akses, "alumni.kelola") ? await supabase.from("pendaftaran_alumni").select("id", { count: "exact", head: true }).eq("status", "menunggu") : { count: 0 };
    const alumni: GrupMenu["item"] = [{ href: "/admin/alumni", label: "Alumni & Tracer", badge: daftarAlumni ?? 0 }];
    if (punya(akses, "alumni.kelola")) alumni.push({ href: "/admin/alumni/layanan", label: "Layanan Alumni" });
    grup.push({ judul: "Alumni", item: alumni });
  }
  // Mutu & akreditasi (tim mutu, auditor, pimpinan, atau pemilik indikator)
  const { data: pemilikMutu } = await supabase.rpc("pemilik_mutu");
  if (punya(akses, "mutu.kelola") || punya(akses, "mutu.audit") || punya(akses, "mutu.lihat") || pemilikMutu) {
    const { count: diajukan } = punya(akses, "mutu.kelola") || punya(akses, "mutu.audit") ? await supabase.from("evaluasi_indikator").select("id", { count: "exact", head: true }).eq("persetujuan", "diajukan") : { count: 0 };
    grup.push({ judul: "Mutu", item: [{ href: "/admin/mutu", label: "Mutu & Akreditasi", badge: diajukan ?? 0 }, { href: "/admin/mutu/temuan", label: "Temuan & Perbaikan" }, { href: "/admin/mutu/bukti", label: "Repositori Bukti" }] });
  }
  const kesiswaan: GrupMenu["item"] = [{ href: "/admin/kesiswaan/lapor", label: "Lapor Pelanggaran/Prestasi" }];
  if (punya(akses, "kesiswaan.lihat") || berperan(akses, "wali_kelas")) {
    const [{ count: c1 }, { count: c2 }] = punya(akses, "kesiswaan.kelola")
      ? await Promise.all([
          supabase.from("pelanggaran_siswa").select("id", { count: "exact", head: true }).eq("status", "dilaporkan"),
          supabase.from("prestasi_siswa").select("id", { count: "exact", head: true }).eq("status", "diajukan"),
        ])
      : [{ count: 0 }, { count: 0 }];
    kesiswaan.push({ href: "/admin/kesiswaan", label: "Prestasi & Poin", badge: (c1 ?? 0) + (c2 ?? 0) });
  }
  if (punya(akses, "bk.rujukan")) {
    const { count } = await supabase.from("rujukan_bk").select("id", { count: "exact", head: true }).eq("status", "baru");
    kesiswaan.push({ href: "/admin/rujukan-bk", label: "Rujukan BK", badge: count ?? 0 });
  }
  if (punya(akses, "kesiswaan.kelola")) kesiswaan.push({ href: "/admin/kesiswaan/pengaturan", label: "Aturan Poin" });
  grup.push({ judul: "Kesiswaan", item: kesiswaan });
  if (berperan(akses, "wali_kelas")) grup.push({ judul: "Perwalian", item: [{ href: "/admin/kelas-saya", label: "Kelas Saya" }] });

  // Absensi & disiplin (dengan penanda jumlah yang perlu ditindaklanjuti)
  const bisaIzinOrtu = punya(akses, "absensi.kelola") || berperan(akses, "wali_kelas");
  const [pengajuan, disiplin, izinOrtu] = await Promise.all([
    punya(akses, "absensi.kelola") || berperan(akses, "wali_kelas")
      ? supabase.from("pengajuan_koreksi").select("id", { count: "exact", head: true }).eq("status", "menunggu")
      : Promise.resolve({ count: 0 }),
    punya(akses, "disiplin.kelola") ? supabase.rpc("status_disiplin") : Promise.resolve({ data: [] as unknown[] }),
    bisaIzinOrtu
      ? supabase.from("izin_ortu").select("id", { count: "exact", head: true }).eq("status", "menunggu")
      : Promise.resolve({ count: 0 }),
  ]);
  const perluTindakan = ((disiplin.data ?? []) as { dikonfirmasi: boolean }[]).filter((d) => !d.dikonfirmasi).length;
  const absensi: GrupMenu["item"] = [{ href: "/admin/presensi", label: "Presensi Saya" }];
  const bisaAbsensiSiswa = punya(akses, "absensi.lihat") || berperan(akses, "wali_kelas");
  if (bisaAbsensiSiswa) absensi.push({ href: "/admin/absensi", label: "Absensi Siswa" });
  if (punya(akses, "absensi.kelola") || berperan(akses, "wali_kelas"))
    absensi.push({ href: "/admin/absensi/pengajuan", label: "Pengajuan Koreksi", badge: punya(akses, "absensi.kelola") ? pengajuan.count ?? 0 : 0 });
  if (bisaIzinOrtu) absensi.push({ href: "/admin/izin-ortu", label: "Izin dari Orang Tua", badge: izinOrtu.count ?? 0 });
  if (bisaAbsensiSiswa) absensi.push({ href: "/admin/absensi/jp", label: "Per Jam Pelajaran" });
  if (bisaAbsensiSiswa) absensi.push({ href: "/admin/absensi/rekap", label: "Rekap Absensi" });
  if (punya(akses, "disiplin.lihat") || berperan(akses, "wali_kelas"))
    absensi.push({ href: "/admin/absensi/disiplin", label: "SP & Panggilan Ortu", badge: perluTindakan });
  if (punya(akses, "absensi_pegawai.lihat")) absensi.push({ href: "/admin/absensi/guru", label: "Kehadiran Guru" });
  if (punya(akses, "izin_pegawai.setujui") || punya(akses, "absensi_pegawai.lihat")) {
    const { count } = await supabase.from("pengajuan_izin_pegawai").select("id", { count: "exact", head: true }).eq("status", "menunggu");
    absensi.push({ href: "/admin/izin-pegawai", label: "Izin Guru & Pegawai", badge: punya(akses, "izin_pegawai.setujui") ? count ?? 0 : 0 });
  }
  if (punya(akses, "absensi_pegawai.kelola")) absensi.push({ href: "/admin/absensi/guru/pengaturan", label: "Jam Kerja Pegawai" });
  if (punya(akses, "absensi.atur")) absensi.push({ href: "/admin/absensi/pengaturan", label: "Pengaturan Absensi" });
  grup.push({ judul: "Absensi", item: absensi });
  const pengaturan = [];
  if (punya(akses, "akun_portal.kelola")) pengaturan.push({ href: "/admin/akun-portal", label: "Akun Portal Siswa & Ortu" });
  if (punya(akses, "pengguna.kelola")) pengaturan.push({ href: "/admin/pengguna", label: "Pengguna & Peran" });
  if (punya(akses, "pengguna.kelola")) pengaturan.push({ href: "/admin/notifikasi/kanal", label: "WhatsApp & Email" });
  pengaturan.push({ href: "/admin/keamanan", label: "Keamanan Akun" });
  if (punya(akses, "audit.baca")) pengaturan.push({ href: "/admin/log", label: "Log Aktivitas" });
  if (pengaturan.length) grup.push({ judul: "Pengaturan", item: pengaturan });

  const { count: notif } = await supabase.from("notifikasi").select("id", { count: "exact", head: true }).is("dibaca_pada", null);
  return (
    <>
      <Sidebar
        notif={notif ?? 0}
        grup={grup}
        ruang={ruangKerjaUntuk(akses)}
        nama={akses.nama}
        email={akses.email}
        peran={akses.peran.map((p) => NAMA_PERAN[p] ?? p).join(", ")}
        keluar={keluar}
      />
      <main className="px-4 py-6 sm:px-6 lg:ml-[260px] lg:px-8 lg:py-7 print:m-0 print:p-0">
        <div className="max-w-[1320px]">
          <AksenBidang ruang={ruangKerjaUntuk(akses)}>{children}</AksenBidang>
        </div>
      </main>
    </>
  );
}
