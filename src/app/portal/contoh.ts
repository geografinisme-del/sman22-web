import type { Anak } from "./data";

/**
 * DATA CONTOH fiktif untuk "Lihat sebagai…" Siswa / Orang Tua. Hanya di memori (kode), TIDAK disimpan ke database dan
 * tidak berasal dari data siswa asli. Selalu ditampilkan berlabel "Data contoh".
 * ID memakai rentang UUID khusus yang tidak mungkin dimiliki baris asli (versi 0).
 */
export const ID_CONTOH = ["00000000-0000-0000-0000-00000000c001", "00000000-0000-0000-0000-00000000c002"];
export const adalahIdContoh = (id: string) => ID_CONTOH.includes(id);

export const ANAK_CONTOH: Anak[] = [
  { id: ID_CONTOH[0], nama: "Rina Contoh Pratiwi", nisn: "0000000001", kelas: "XI-2", kelas_id: null, jenis_kelamin: "P" },
  { id: ID_CONTOH[1], nama: "Bima Contoh Saputra", nisn: "0000000002", kelas: "X-4", kelas_id: null, jenis_kelamin: "L" },
];

/** siswa melihat dirinya sendiri; orang tua melihat dua anak contoh */
export const anakContoh = (ortu: boolean) => (ortu ? ANAK_CONTOH : ANAK_CONTOH.slice(0, 1));

export const WALI_CONTOH = "Ibu Contoh Lestari, S.Pd.";

export const rekapContoh = (id: string) =>
  id === ID_CONTOH[0]
    ? { sakit: 1, izin: 1, alpa: 0, terlambat: 2, pulang_cepat: 0, hari_efektif: 18, persen_hadir: 94 }
    : { sakit: 0, izin: 0, alpa: 1, terlambat: 0, pulang_cepat: 0, hari_efektif: 18, persen_hadir: 97 };

/** catatan ketidakhadiran contoh: tanggal relatif terhadap hari ini (YYYY-MM-DD) */
export function catatanContoh(id: string, hariIni: string) {
  const geser = (n: number) => {
    const d = new Date(`${hariIni}T00:00:00+07:00`);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };
  return id === ID_CONTOH[0]
    ? [
        { tanggal: geser(2), status: "T", keterangan: "Contoh: hujan deras" },
        { tanggal: geser(6), status: "S", keterangan: "Contoh: demam" },
        { tanggal: geser(11), status: "I", keterangan: "Contoh: acara keluarga" },
      ]
    : [{ tanggal: geser(4), status: "A", keterangan: "" }];
}
