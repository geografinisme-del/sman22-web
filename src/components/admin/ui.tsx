import Link from "next/link";
import type { ReactNode } from "react";
import { arsipkan } from "@/app/admin/actions";
import { TombolArsip } from "./form";
import "./judul-halaman.css";

/**
 * Header kerja: judul halaman (24–28px), konteks singkat, dan tindakan yang relevan.
 * Tombol aksi (tinggi 44px, pil) sejajar vertikal dengan JUDUL di layar lebar; di HP turun ke bawah deskripsi.
 */
export function JudulHalaman({ judul, deskripsi, aksi, konteks }: { judul: string; deskripsi?: string; aksi?: ReactNode; konteks?: ReactNode }) {
  return (
    <div className="mb-6 border-b border-[var(--line)] pb-5">
      {konteks && <p className="mb-1 text-sm text-[var(--muted)]">{konteks}</p>}
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <h1 className="min-w-0 text-[1.625rem] font-semibold leading-tight text-[var(--ink)]">{judul}</h1>
        {aksi && <div className="aksi-halaman order-3 sm:order-none sm:justify-end">{aksi}</div>}
        {deskripsi && <p className="order-2 -mt-2 max-w-3xl text-[0.9375rem] text-[var(--muted)] sm:order-none sm:col-span-2 sm:mt-0">{deskripsi}</p>}
      </div>
    </div>
  );
}

export function TombolLink({ href, children, sekunder }: { href: string; children: ReactNode; sekunder?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 shrink-0 items-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
        sekunder ? "border border-[var(--line)] bg-white hover:border-[var(--muted)]" : "bg-ink text-white hover:bg-ink/85"
      }`}
    >
      {children}
    </Link>
  );
}

export function Kartu({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[10px] border border-[var(--line)] bg-white p-5 sm:p-6 ${className}`}>{children}</div>;
}

const PESAN: Record<string, { teks: string; ok: boolean }> = {
  tersimpan: { teks: "Perubahan berhasil disimpan.", ok: true },
  "tur-minimal": { teks: "Minimal 3 titik tur harus aktif. Aktifkan titik lain sebelum menonaktifkan yang ini.", ok: false },
  "tur-maksimal": { teks: "Maksimal 8 titik tur aktif. Nonaktifkan titik lain dulu.", ok: false },
  "pesanan-siap": { teks: "Buku dipesan dan sudah disiapkan. Ambil di perpustakaan dalam 3 hari.", ok: true },
  "pesanan-antre": { teks: "Buku dipesan. Anda masuk antrean dan akan diberi tahu saat buku siap diambil.", ok: true },
  "pesanan-batal": { teks: "Pesanan buku dibatalkan.", ok: true },
  "survei-terkirim": { teks: "Terima kasih, jawaban survei terkirim.", ok: true },
  "alumni-aktif": { teks: "Alumni diverifikasi. Tautan aktivasi akun dikirim ke emailnya.", ok: true },
  "alumni-aktif-tanpa-email": { teks: "Alumni diverifikasi & akun dibuat. Email sekolah belum aktif — minta alumni memakai “Lupa kata sandi” di halaman masuk dengan email yang didaftarkan.", ok: true },
  diarsipkan: { teks: "Data diarsipkan (tidak dihapus permanen).", ok: true },
  diterima: { teks: "Izin diterima. Absensi siswa sudah terisi otomatis.", ok: true },
  ditolak: { teks: "Izin ditolak. Orang tua dapat melihat catatan Anda di portal.", ok: true },
  dibatalkan: { teks: "Pemberitahuan dibatalkan.", ok: true },
  "mapel-dipakai": { teks: "Mapel masih dipakai di penugasan mengajar. Arsipkan penugasannya dulu.", ok: false },
  "jam-dipakai": { teks: "Jam hari itu masih dipakai jadwal. Kosongkan jadwalnya dulu.", ok: false },
  "dibatalkan-perubahan": { teks: "Perubahan jadwal dibatalkan; jadwal kembali seperti biasa.", ok: true },
  "perlu-catatan": { teks: "Tulis catatan perbaikan agar penulis tahu apa yang harus diubah.", ok: false },
  "berita-disetujui": { teks: "Berita disetujui dan diterbitkan (atau tayang sesuai jadwal).", ok: true },
  "berita-dikembalikan": { teks: "Berita dikembalikan ke penulis dengan catatan perbaikan.", ok: true },
  "revisi-dipulihkan": { teks: "Versi lama dipulihkan. Versi sebelumnya tetap tersimpan di riwayat.", ok: true },
  "izin-dibatalkan": { teks: "Pengajuan dibatalkan.", ok: true },
  "izin-pegawai-disetujui": { teks: "Pengajuan disetujui. Kehadiran guru terisi otomatis dan tampil di menu Guru Pengganti.", ok: true },
  "versi-baru": { teks: "Disimpan sebagai versi baru. Catatan yang sudah ada tetap memakai poin lamanya.", ok: true },
  "jenis-nonaktif": { teks: "Jenis pelanggaran dinonaktifkan. Riwayat catatan tetap tersimpan.", ok: true },
  "mfa-aktif": { teks: "Verifikasi dua langkah aktif. Simpan HP Anda baik-baik; tambahkan HP kedua sebagai cadangan bila ada.", ok: true },
  "mfa-dihapus": { teks: "Aplikasi autentikator dihapus dari akun.", ok: true },
  "mfa-terakhir": { teks: "Peran Anda wajib verifikasi dua langkah. Tambahkan aplikasi lain dulu sebelum menghapus yang terakhir.", ok: false },
  "mfa-direset": { teks: "Verifikasi dua langkah pengguna direset. Ia akan diminta mendaftar ulang saat masuk.", ok: true },
  "sandi-baru": { teks: "Kata sandi baru tersimpan. Sesi di perangkat lain sudah diakhiri.", ok: true },
  "tautan-terkirim": { teks: "Tautan atur ulang kata sandi dikirim ke email pengguna (berlaku 1 jam).", ok: true },
  "tukar-diajukan": { teks: "Pengajuan dikirim. Guru tujuan diberi tahu; setelah ia menerima, kurikulum memutuskan.", ok: true },
  "tukar-dijawab": { teks: "Jawaban tersimpan dan pemohon diberi tahu.", ok: true },
  "perlu-alasan": { teks: "Tulis alasan penolakan agar guru tahu.", ok: false },
  "tukar-diputus": { teks: "Keputusan tersimpan. Bila disetujui, jadwal hari itu sudah berubah dan guru & siswa diberi tahu.", ok: true },
  "perangkat-diajukan": { teks: "Perangkat ajar diajukan. Wakasek Kurikulum diberi tahu untuk memeriksa.", ok: true },
  "perangkat-disetujui": { teks: "Perangkat ajar disetujui; guru diberi tahu.", ok: true },
  "perangkat-revisi": { teks: "Perangkat dikembalikan dengan catatan revisi; guru diberi tahu.", ok: true },
  "perlu-catatan-revisi": { teks: "Tulis catatan revisi agar guru tahu apa yang harus diperbaiki.", ok: false },
  "supervisi-dijadwalkan": { teks: "Supervisi dijadwalkan. Guru dan supervisor diberi tahu.", ok: true },
  "supervisi-selesai": { teks: "Penilaian supervisi selesai dan dikirim ke guru.", ok: true },
  "soal-terkunci": { teks: "Soal tidak bisa diubah karena kuis sudah dikerjakan siswa.", ok: false },
  "pinjam-diajukan": { teks: "Peminjaman diajukan. Sarpras diberi tahu untuk menyetujui.", ok: true },
  "kerusakan-dilaporkan": { teks: "Laporan terkirim ke Sarpras. Anda diberi tahu saat ditangani.", ok: true },
  diperpanjang: { teks: "Peminjaman diperpanjang.", ok: true },
  "pengaduan-diproses": { teks: "Pengaduan diperbarui. Pelapor (bila login) dan PIC diberi tahu.", ok: true },
  "tamu-tercatat": { teks: "Tamu tercatat; guru/staf yang dituju diberi tahu.", ok: true },
  gagal: { teks: "Aksi gagal. Coba lagi atau hubungi super admin.", ok: false },
  "kelas-berisi": { teks: "Kelas masih berisi siswa. Pindahkan siswanya dulu sebelum mengarsipkan kelas.", ok: false },
};

export function Notifikasi({ kode }: { kode?: string }) {
  const p = kode ? PESAN[kode] : undefined;
  if (!p) return null;
  return (
    <div
      role={p.ok ? "status" : "alert"}
      className={`mb-6 rounded-xl px-4 py-3 text-sm font-medium ${
        p.ok ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-red-50 text-red-800 ring-1 ring-red-200"
      }`}
    >
      {p.teks}
    </div>
  );
}

export function KosongAdmin({ teks, aksi }: { teks: string; aksi?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/20 p-10 text-center">
      <p className="text-black/50">{teks}</p>
      {aksi && <div className="mt-4">{aksi}</div>}
    </div>
  );
}

export function FormArsip({ tabel, id, judul, kembali }: { tabel: string; id: string; judul: string; kembali: string }) {
  return (
    <form action={arsipkan}>
      <input type="hidden" name="tabel" value={tabel} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kembali" value={kembali} />
      <TombolArsip judul={judul} />
    </form>
  );
}

export function Lencana({ children, warna = "abu" }: { children: ReactNode; warna?: "hijau" | "abu" | "kuning" }) {
  const k = {
    hijau: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    abu: "bg-black/5 text-black/60 ring-black/10",
    kuning: "bg-amber-50 text-amber-800 ring-amber-200",
  }[warna];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${k}`}>{children}</span>;
}

/** Navigasi halaman (mempertahankan filter di URL) */
export function Paginasi({
  halaman,
  total,
  perHalaman,
  dasar,
  params,
}: {
  halaman: number;
  total: number;
  perHalaman: number;
  dasar: string;
  params: Record<string, string | undefined>;
}) {
  const jumlah = Math.max(1, Math.ceil(total / perHalaman));
  if (jumlah <= 1) return <p className="mt-4 text-sm text-black/50">{total} data</p>;
  const url = (h: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (h > 1) q.set("hal", String(h));
    const s = q.toString();
    return s ? `${dasar}?${s}` : dasar;
  };
  const kelas = "rounded-full px-4 py-2 text-sm font-medium ring-1 ring-black/10";
  return (
    <nav aria-label="Halaman" className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-black/50">
        {(halaman - 1) * perHalaman + 1}–{Math.min(halaman * perHalaman, total)} dari {total} data
      </p>
      <div className="flex items-center gap-2">
        {halaman > 1 ? (
          <Link href={url(halaman - 1)} className={`${kelas} bg-white hover:bg-black/5`}>
            ← Sebelumnya
          </Link>
        ) : (
          <span className={`${kelas} opacity-40`}>← Sebelumnya</span>
        )}
        <span className="px-2 text-black/60">
          {halaman} / {jumlah}
        </span>
        {halaman < jumlah ? (
          <Link href={url(halaman + 1)} className={`${kelas} bg-white hover:bg-black/5`}>
            Berikutnya →
          </Link>
        ) : (
          <span className={`${kelas} opacity-40`}>Berikutnya →</span>
        )}
      </div>
    </nav>
  );
}

export function TabelKosong({ kolom, teks }: { kolom: number; teks: string }) {
  return (
    <tr>
      <td colSpan={kolom} className="px-4 py-10 text-center text-black/50">
        {teks}
      </td>
    </tr>
  );
}

export const kelasTabel = "w-full min-w-[640px] text-left text-sm";
export const kelasTh = "border-b border-black/10 bg-soft px-4 py-3 text-xs font-semibold uppercase tracking-wider text-black/50";
export const kelasTd = "border-b border-black/5 px-4 py-3";
