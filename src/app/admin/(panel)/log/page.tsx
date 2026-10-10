import { JudulHalaman, Paginasi, kelasTabel, kelasTd, kelasTh } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";

export const metadata = { title: "Log Aktivitas" };
const PER = 50;
const TABEL: Record<string, string> = {
  profil_sekolah: "Profil sekolah", berita: "Berita", agenda: "Agenda", pengumuman: "Pengumuman", galeri: "Galeri",
  siswa: "Siswa", pegawai: "Pegawai", kelas: "Kelas", anggota_kelas: "Anggota kelas", tahun_ajaran: "Tahun ajaran",
  orang_tua: "Orang tua", siswa_orang_tua: "Relasi orang tua", pengguna: "Pengguna", pengguna_peran: "Peran pengguna", peran_izin: "Matriks izin", admins: "Admin (lama)",
  auth: "Login & keamanan akun", peran: "Pengaturan peran", kegiatan_kalender: "Kalender kegiatan", pengajuan_tukar_jadwal: "Tukar jam",
  jadwal: "Jadwal pelajaran", perubahan_jadwal: "Perubahan jadwal",
  struktur_kurikulum: "Struktur kurikulum", capaian_pembelajaran: "Capaian pembelajaran", tujuan_pembelajaran: "Tujuan pembelajaran (ATP)",
  atp_status: "Status ATP", tugas: "Tugas", pengumpulan_tugas: "Nilai tugas", kuis: "Kuis", barang: "Inventaris barang", peminjaman: "Peminjaman", laporan_kerusakan: "Laporan kerusakan", perangkat_ajar: "Perangkat ajar", projek_kokurikuler: "Projek kokurikuler", supervisi_akademik: "Supervisi akademik", materi_kelas: "Materi digital", buku: "Katalog buku", eksemplar: "Eksemplar buku", pinjaman_buku: "Pinjaman buku", pengaduan: "Pengaduan", kemitraan: "Kemitraan", buku_tamu: "Buku tamu", pojok_baca: "Pojok baca", kegiatan_pojok: "Kegiatan pojok baca", reservasi_buku: "Pesanan buku", jurnal_baca: "Jurnal baca", tantangan_literasi: "Tantangan literasi", ulasan_buku: "Ulasan buku", duta_literasi: "Duta literasi", sla_pengaduan: "SLA pengaduan", kegiatan_mitra: "Kegiatan mitra", kontak_media: "Kontak media", survei: "Survei", pengaturan_bk: "Pengaturan BK", kategori_konseling: "Kategori konseling", tindak_lanjut_bk: "Tindak lanjut BK", rujukan_eksternal_bk: "Rujukan eksternal BK", pengaturan_ekskul: "Pengaturan ekskul", organisasi: "Organisasi siswa", pembina_organisasi: "Pembina organisasi", pendaftaran_ekskul: "Pendaftaran ekskul", keanggotaan_org: "Keanggotaan organisasi", kegiatan_org: "Kegiatan organisasi", program_kerja: "Program kerja", pengajuan_kegiatan: "Pengajuan kegiatan", sertifikat_org: "Sertifikat organisasi", angkatan_alumni: "Angkatan alumni", profil_alumni: "Profil alumni", pendaftaran_alumni: "Pendaftaran alumni", acara_alumni: "Acara alumni", peluang: "Peluang", mentor_alumni: "Mentor alumni", mentoring: "Mentoring", kontribusi_alumni: "Kontribusi alumni", cerita_alumni: "Cerita alumni", kerangka_mutu: "Kerangka mutu", standar_mutu: "Standar mutu", indikator_mutu: "Indikator mutu", evaluasi_indikator: "Evaluasi indikator", bukti_mutu: "Bukti mutu", tautan_bukti_mutu: "Tautan bukti", temuan_mutu: "Temuan mutu", rencana_perbaikan: "Rencana perbaikan",
};
const AKSI: Record<string, string> = {
  INSERT: "Tambah", UPDATE: "Ubah", DELETE: "Hapus", EKSPOR: "Ekspor data", LIHAT: "Lihat berkas", CETAK: "Cetak",
  LOGIN: "Masuk", LOGOUT: "Keluar", LOGIN_GAGAL: "Gagal masuk", KEAMANAN: "Keamanan akun", RESET_DIMINTA: "Minta atur ulang sandi",
};
const PERISTIWA: Record<string, string> = {
  sandi_diubah: "ganti kata sandi", sandi_direset: "sandi diatur ulang admin", sandi_lupa: "atur ulang sandi lewat email",
  mfa_aktif: "aktifkan verifikasi dua langkah", mfa_dihapus: "hapus autentikator", mfa_direset: "reset verifikasi dua langkah",
  keluar_semua: "keluar dari semua perangkat", tautan_reset: "kirim tautan atur ulang", wajib_mfa: "ubah peran wajib MFA",
};

export default async function Log({ searchParams }: { searchParams: Promise<{ tabel?: string; aksi?: string; hal?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await wajibIzin("audit.baca");
  const hal = Math.max(1, Number(sp.hal) || 1);
  let q = supabase
    .from("audit_log")
    .select("id, waktu, user_id, tabel, aksi, record_id, data_baru", { count: "exact" })
    .order("waktu", { ascending: false })
    .range((hal - 1) * PER, hal * PER - 1);
  if (sp.tabel && TABEL[sp.tabel]) q = q.eq("tabel", sp.tabel);
  if (sp.aksi && AKSI[sp.aksi]) q = q.eq("aksi", sp.aksi);
  const { data, count } = await q;
  const ids = [...new Set((data ?? []).map((d) => d.user_id).filter(Boolean))];
  const { data: orang } = ids.length ? await supabase.from("pengguna").select("user_id, nama, email").in("user_id", ids) : { data: [] };
  const nama = new Map((orang ?? []).map((o) => [o.user_id, o.nama || o.email]));
  const judul = (d: { data_baru: Record<string, unknown> | null }) => {
    const b = d.data_baru ?? {};
    if (b.peristiwa) return PERISTIWA[String(b.peristiwa)] ?? String(b.peristiwa);
    if (b.akun) return `akun: ${String(b.akun)}${b.dibatasi ? " (dibatasi)" : ""}`;
    return String(b.nama ?? b.judul ?? b.peran ?? (b.jumlah != null ? `${b.jumlah} baris` : ""));
  };

  return (
    <>
      <JudulHalaman judul="Log Aktivitas" deskripsi="Semua perubahan data tercatat otomatis oleh database dan tidak bisa diubah dari aplikasi." />
      <form className="mb-4 flex flex-wrap gap-3">
        <select name="tabel" defaultValue={sp.tabel ?? ""} className="rounded-full border border-black/15 bg-white px-4 py-2" aria-label="Jenis data">
          <option value="">Semua data</option>
          {Object.entries(TABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="aksi" defaultValue={sp.aksi ?? ""} className="rounded-full border border-black/15 bg-white px-4 py-2" aria-label="Aksi">
          <option value="">Semua aksi</option>
          {Object.entries(AKSI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="rounded-full bg-brand-900 px-5 py-2 font-semibold text-white">Terapkan</button>
      </form>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className={kelasTabel}>
          <thead>
            <tr>
              <th className={kelasTh}>Waktu</th>
              <th className={kelasTh}>Oleh</th>
              <th className={kelasTh}>Aksi</th>
              <th className={kelasTh}>Data</th>
            </tr>
          </thead>
          <tbody>
            {data?.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-black/50">Belum ada aktivitas.</td></tr>}
            {data?.map((d) => (
              <tr key={d.id}>
                <td className={`${kelasTd} whitespace-nowrap text-black/60`}>
                  {new Date(d.waktu).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
                </td>
                <td className={kelasTd}>{nama.get(d.user_id) ?? <span className="text-black/40">sistem</span>}</td>
                <td className={kelasTd}>{AKSI[d.aksi] ?? d.aksi}</td>
                <td className={kelasTd}>
                  {TABEL[d.tabel] ?? d.tabel}
                  {judul(d) && <span className="text-black/50"> · {judul(d)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginasi halaman={hal} total={count ?? 0} perHalaman={PER} dasar="/admin/log" params={{ tabel: sp.tabel, aksi: sp.aksi }} />
    </>
  );
}
