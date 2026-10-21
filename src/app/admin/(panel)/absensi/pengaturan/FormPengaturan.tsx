"use client";

import { simpanPengaturanAbsensi, tambahHariLibur } from "../../../actions-absensi";
import { FormAksi, Input, TombolSimpan, useErrorKolom } from "@/components/admin/form";

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

function PilihHari({ nilai }: { nilai: number[] }) {
  const error = useErrorKolom("hari_sekolah");
  return (
    <fieldset className="sm:col-span-3">
      <legend className="mb-2 text-sm font-semibold">Hari sekolah</legend>
      <div className="flex flex-wrap gap-2">
        {HARI.map((h, i) => (
          <label key={h} className="flex cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm has-[:checked]:border-muted has-[:checked]:bg-soft">
            <input type="checkbox" name="hari_sekolah" value={i + 1} defaultChecked={nilai.includes(i + 1)} />
            {h}
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-blue-teks">{error}</p>}
    </fieldset>
  );
}

export function FormPengaturan({ data, namaTa }: { data: { jam_masuk_batas: string; jam_pulang_mulai: string; jam_pulang_selesai: string; hari_sekolah: number[]; mulai_hitung: string }; namaTa: string | null }) {
  return (
    <FormAksi aksi={simpanPengaturanAbsensi} className="grid gap-5 sm:grid-cols-3">
      <Input label="Batas jam masuk" nama="jam_masuk_batas" tipe="time" nilai={data.jam_masuk_batas} bantuan="Lewat dari jam ini = terlambat" />
      <Input label="Pulang mulai" nama="jam_pulang_mulai" tipe="time" nilai={data.jam_pulang_mulai} />
      <Input label="Pulang selesai" nama="jam_pulang_selesai" tipe="time" nilai={data.jam_pulang_selesai} />
      <PilihHari nilai={data.hari_sekolah} />
      <div className="sm:col-span-3">
        <Input
          label={`Mulai menghitung absensi${namaTa ? ` (tahun ajaran ${namaTa})` : ""}`}
          nama="mulai_hitung"
          tipe="date"
          nilai={data.mulai_hitung}
          bantuan="Catatan sebelum tanggal ini tidak dihitung di rekap & SP (mis. masa uji coba). Data lama tetap tersimpan."
        />
      </div>
      <div className="sm:col-span-3"><TombolSimpan>Simpan pengaturan</TombolSimpan></div>
    </FormAksi>
  );
}

export function FormLibur() {
  return (
    <FormAksi aksi={tambahHariLibur} className="grid gap-4 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
      <Input label="Dari" nama="dari" tipe="date" wajib />
      <Input label="Sampai (opsional)" nama="sampai" tipe="date" />
      <Input label="Keterangan" nama="keterangan" wajib placeholder="mis. Libur semester" maks={120} />
      <TombolSimpan>Tambah</TombolSimpan>
    </FormAksi>
  );
}
