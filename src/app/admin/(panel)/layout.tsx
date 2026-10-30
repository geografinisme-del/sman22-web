import { hariIniWIB } from "@/lib/admin/absensi";
import { Sidebar, type GrupMenu } from "@/components/admin/Sidebar";
import { berperan, NAMA_PERAN, punya, wajibLogin } from "@/lib/admin/auth";
import { hitungBersama, pegawaiSaya as cariPegawaiSaya, statusDisiplin, tugasPerluNilai, tukarUntukSaya, type NamaHitungan } from "@/lib/admin/hitungan";
import { redirect } from "next/navigation";
import { keluar } from "../actions";
import { ruangKerjaUntuk } from "@/lib/ruang-kerja";
import { menuUntuk } from "@/lib/admin/menu-peran";
import { AksenBidang } from "@/components/admin/AksenBidang";
import { MenungguVerifikasi } from "@/components/admin/MenungguVerifikasi";

export const dynamic = "force-dynamic";

const PERAN_PANEL = ["super_admin", "kepala_sekolah", "waka_kurikulum", "waka_kesiswaan", "waka_sarpras", "waka_humas", "pustakawan", "literasi", "keuangan", "admin_alumni", "tim_mutu", "auditor", "operator", "piket", "bk", "wali_kelas", "guru", "laboran", "pegawai"];

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

  // Menu = matriks per PERAN (lib/admin/menu-peran.ts, docs/matriks-layanan.md). Hanya item dinamis yang memakai data
  // (PIC pengaduan, penanggung jawab pojok baca, pembina organisasi, pemilik indikator mutu). Badge dipasang per alamat.
  const badge: Record<string, number> = {
    "/admin/persetujuan": menungguSetuju,
    "/admin/tukar-jam": tukarMasuk,
    "/admin/jadwal/tukar": tukarMenunggu,
    "/admin/perangkat-ajar/review": perangkatMenunggu,
    "/admin/supervisi": supervisiTugas,
    "/admin/lms": perluNilai,
    "/admin/sarpras/peminjaman": pinjamMenunggu,
    "/admin/sarpras/kerusakan": rusakBaru,
    "/admin/perpus/literasi": jurnalMenunggu,
    "/admin/pengaduan": aduanBaru,
    "/admin/buku-tamu": tamuAda,
    "/admin/bk": mintaBk,
    "/admin/ekskul": ekskulMenungguBinaan,
    "/admin/ekskul/pengajuan": punya(akses, "ekskul.anggaran") && !kelolaEkskul ? 0 : ajuEkskulBinaan,
    "/admin/alumni": daftarAlumni,
    "/admin/mutu": mutuDiajukan,
    "/admin/kesiswaan": pelanggaranBaru + prestasiBaru,
    "/admin/rujukan-bk": rujukanBaru,
    "/admin/absensi/pengajuan": punya(akses, "absensi.kelola") ? koreksiMenunggu : 0,
    "/admin/izin-ortu": izinOrtuMenunggu,
    "/admin/absensi/disiplin": perluTindakan,
    "/admin/izin-pegawai": punya(akses, "izin_pegawai.setujui") ? izinPegawaiMenunggu : 0,
  };
  const grup: GrupMenu[] = [
    { item: [{ href: "/admin", label: "Ringkasan" }] },
    ...menuUntuk(akses.peran, { picPengaduan: aduanAda > 0, pjPojok: pjPojok > 0, pembina: binaan > 0, pemilikMutu }).map((g) => ({
      judul: g.judul,
      item: g.item.map((m) => ({ ...m, badge: badge[m.href] })),
    })),
  ];

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
