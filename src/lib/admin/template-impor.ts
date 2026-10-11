import "server-only";
import { bukuXlsx, kirimXlsx } from "@/lib/admin/excel";
import type { KolomImpor } from "@/lib/admin/induk";

/** Keterangan pengisian per kolom (ditampilkan di lembar "Petunjuk"). */
const KETERANGAN: Record<string, string> = {
  nama: "Nama lengkap sesuai ijazah/Dapodik.",
  nisn: "10 digit. Ketik apa adanya, angka 0 di depan tetap disimpan.",
  nis: "Nomor induk sekolah / NIPD.",
  nip: "18 digit, kosongkan bila bukan PNS/PPPK.",
  nuptk: "16 digit, boleh kosong.",
  jenis_kelamin: "Isi L atau P.",
  tempat_lahir: "Nama kota/kabupaten.",
  tanggal_lahir: "Format tanggal Excel (mis. 17/05/2009) atau teks 2009-05-17.",
  agama: "Islam, Kristen, Katolik, Hindu, Buddha, atau Konghucu.",
  kelas: "Nama rombel persis seperti di menu Kelas, mis. X-1.",
  tahun_masuk: "4 digit tahun, mis. 2026.",
  alamat: "Alamat tempat tinggal.",
  telepon: "Nomor HP aktif, mis. 081234567890.",
  nama_ayah: "Boleh kosong.",
  nama_ibu: "Boleh kosong.",
  telepon_ortu: "Nomor HP orang tua/wali untuk notifikasi.",
  jenis: "Isi guru atau tendik.",
  jabatan: "Mis. Guru Geografi, Wakasek Kurikulum, Staf TU.",
  email: "Email aktif untuk akun & lupa sandi.",
};

/** Template impor: lembar "Data" (judul kolom saja) + lembar "Petunjuk". `?format=csv` → CSV berpemisah titik koma. */
export async function kirimTemplate(kolom: KolomImpor[], nama: string, format: string | null) {
  if (format === "csv") {
    // pemisah ";" agar langsung terbuka per kolom di Excel berbahasa Indonesia
    const csv = "\uFEFF" + kolom.map((k) => k.label).join(";") + "\r\n";
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="template-impor-${nama}.csv"`,
      },
    });
  }
  const isi = await bukuXlsx([
    {
      nama: "Data",
      kolom: kolom.map((k) => ({
        judul: k.label,
        jenis: k.kunci === "tanggal_lahir" ? ("tanggal" as const) : ("teks" as const),
        lebar: Math.max(14, k.label.length + 4, k.contoh.length + 4),
      })),
      baris: [],
    },
    {
      nama: "Petunjuk",
      kolom: [
        { judul: "Kolom", lebar: 22 },
        { judul: "Wajib?", lebar: 9 },
        { judul: "Cara mengisi", lebar: 62 },
        { judul: "Contoh", lebar: 24 },
      ],
      baris: [
        ...kolom.map((k) => [k.label, k.wajib ? "Wajib" : "Boleh kosong", KETERANGAN[k.kunci] ?? "", k.contoh]),
        [],
        ["Langkah", "", "1. Isi data mulai baris ke-2 lembar \"Data\" (satu baris = satu orang). 2. Jangan mengubah judul kolom. 3. Simpan sebagai .xlsx lalu unggah di menu Impor.", ""],
        ["Data ganda", "", "Baris dengan NISN/NIP yang sudah ada akan ditampilkan untuk diperiksa dulu, tidak ditimpa diam-diam.", ""],
      ],
    },
  ]);
  return kirimXlsx(isi, `template-impor-${nama}`);
}
