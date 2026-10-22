import "server-only";
import { tulisCsv } from "@/lib/admin/csv-impor";
import { AGAMA, type KolomImpor } from "@/lib/admin/induk";
import { buatTemplateXlsx, PENANDA_CONTOH, type BarisPetunjuk, type KolomTemplate } from "@/lib/admin/xlsx-template";

/** Keterangan pengisian per kolom (ditampilkan di lembar "Petunjuk"). */
const KETERANGAN: Record<string, string> = {
  nama: "Nama lengkap sesuai ijazah/Dapodik.",
  nisn: "10 digit. Kolom berformat teks: ketik apa adanya, angka 0 di depan tetap tersimpan.",
  nis: "Nomor induk sekolah / NIPD (teks).",
  nip: "18 digit (teks), kosongkan bila bukan PNS/PPPK.",
  nuptk: "16 digit (teks), boleh kosong.",
  jenis_kelamin: "Pilih L atau P dari daftar.",
  tempat_lahir: "Nama kota/kabupaten.",
  tanggal_lahir: "Tanggal dengan format dd/mm/yyyy, mis. 17/05/2009.",
  agama: "Pilih dari daftar: Islam, Kristen, Katolik, Hindu, Buddha, Konghucu, atau Lainnya.",
  kelas: "Pilih dari daftar kelas tahun ajaran aktif (nama rombel persis seperti di menu Kelas, mis. X-1).",
  tahun_masuk: "4 digit tahun, mis. 2026.",
  alamat: "Alamat tempat tinggal.",
  telepon: "Nomor HP aktif (teks), mis. 081234567890.",
  nama_ayah: "Boleh kosong.",
  nama_ibu: "Boleh kosong.",
  telepon_ortu: "Nomor HP orang tua/wali (teks) untuk notifikasi.",
  jenis: "Pilih guru atau tendik dari daftar.",
  jabatan: "Mis. Guru Geografi, Wakasek Kurikulum, Staf TU.",
  email: "Email aktif untuk akun & lupa sandi.",
};

/** Kolom yang wajib berformat TEKS di Excel (angka 0 di depan & digit panjang tidak berubah jadi 1,23E+09). */
const KOLOM_TEKS = new Set(["nisn", "nis", "nip", "nuptk", "telepon", "telepon_ortu", "email", "nama", "tempat_lahir", "alamat", "nama_ayah", "nama_ibu", "jabatan", "kelas"]);

const ddmmyyyy = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : iso);
const contohNama = (k: KolomImpor) => (k.kunci === "nama" ? `${k.contoh} ${PENANDA_CONTOH}` : k.contoh);

function kolomTemplate(kolom: KolomImpor[], kelas: string[]): KolomTemplate[] {
  return kolom.map((k) => {
    const dasar = { judul: k.label, contoh: contohNama(k), lebar: Math.min(40, Math.max(13, k.label.length + 4, contohNama(k).length + 3)) };
    if (k.kunci === "tanggal_lahir") return { ...dasar, jenis: "tanggal" as const, lebar: 14 };
    if (k.kunci === "jenis_kelamin") return { ...dasar, jenis: "teks" as const, pilihan: ["L", "P"], pesan: "Isi L (laki-laki) atau P (perempuan)." };
    if (k.kunci === "agama") return { ...dasar, jenis: "teks" as const, pilihan: [...AGAMA], pesan: `Pilih salah satu: ${AGAMA.join(", ")}.` };
    if (k.kunci === "jenis") return { ...dasar, jenis: "teks" as const, pilihan: ["guru", "tendik"], pesan: "Isi guru atau tendik." };
    if (k.kunci === "kelas" && kelas.length) return { ...dasar, jenis: "teks" as const, daftar: "Kelas", pesan: "Pilih kelas dari daftar kelas tahun ajaran aktif." };
    if (k.kunci === "tahun_masuk") return { ...dasar, jenis: "umum" as const };
    return { ...dasar, jenis: KOLOM_TEKS.has(k.kunci) ? ("teks" as const) : ("umum" as const) };
  });
}

/**
 * Template impor: .xlsx (lembar Data + Petunjuk + daftar pilihan tersembunyi) atau `?format=csv`
 * (BOM UTF-8, pemisah ";", baris CRLF, judul + 1 baris contoh). Urutan kolom sama di keduanya.
 * Gagal membuat file → 500 dengan pesan yang jelas (ditampilkan tombol unduh).
 */
export async function kirimTemplate(kolom: KolomImpor[], nama: string, format: string | null, kelas: string[] = []) {
  try {
    if (format === "csv") {
      const contoh = kolom.map((k) => (k.kunci === "tanggal_lahir" ? ddmmyyyy(k.contoh) : contohNama(k)));
      return new Response(tulisCsv(kolom.map((k) => k.label), [contoh]), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="template-impor-${nama}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }
    const petunjuk: BarisPetunjuk[] = kolom.map((k) => [k.label, k.wajib ? "Wajib" : "Boleh kosong", KETERANGAN[k.kunci] ?? "", k.kunci === "tanggal_lahir" ? ddmmyyyy(k.contoh) : k.contoh]);
    const isi = buatTemplateXlsx({
      kolom: kolomTemplate(kolom, kelas),
      daftar: kelas.length ? { Kelas: kelas } : undefined,
      petunjuk,
      catatan: [
        "Isi data mulai baris ke-2 lembar \"Data\": satu baris = satu orang. Jangan mengubah judul kolom di baris 1.",
        `Baris contoh berwarna abu boleh dihapus. Bila tidak dihapus, baris yang namanya diakhiri ${PENANDA_CONTOH} otomatis dilewati saat impor.`,
        "NIK tidak perlu diisi — template ini sengaja tidak memuat kolom NIK.",
        "Kolom NISN, NIS, NIP, NUPTK, dan No. HP berformat teks: ketik apa adanya, angka 0 di depan tetap tersimpan.",
        "Tanggal lahir ditulis dd/mm/yyyy, mis. 17/05/2009.",
        "Kolom berdaftar pilihan (Jenis kelamin, Agama, Kelas, Jenis): klik sel, lalu pilih dari panah kecil di kanan sel.",
        "Simpan sebagai .xlsx, lalu unggah di menu Impor: Cocokkan kolom → Periksa → Selesai.",
        "Data ganda: baris dengan NISN/NIP yang sudah ada ditampilkan untuk diperiksa dulu, tidak ditimpa diam-diam.",
      ],
    });
    return new Response(new Blob([isi as BlobPart]), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="template-impor-${nama}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[template] gagal membuat template:", (e as Error).message);
    return new Response("Template gagal dibuat. Coba lagi beberapa saat lagi atau hubungi Tim TIK.", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
