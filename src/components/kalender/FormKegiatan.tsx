"use client";

import { simpanKegiatan } from "@/app/admin/actions-kalender";
import { Centang, FormAksi, Input, Pilihan, TextArea, TombolSimpan } from "@/components/admin/form";
import { JENIS_KEGIATAN, SASARAN, type Kegiatan } from "@/lib/kalender";

export function FormKegiatan({ data, tanggalAwal }: { data?: Kegiatan; tanggalAwal: string }) {
  return (
    <FormAksi aksi={simpanKegiatan} className="space-y-5">
      {data && <input type="hidden" name="id" value={data.id} />}
      <Input label="Nama kegiatan" nama="judul" nilai={data?.judul} wajib maks={150} placeholder="mis. Penilaian Tengah Semester" />
      <Pilihan label="Jenis" nama="jenis" nilai={data?.jenis ?? "kegiatan"} opsi={Object.entries(JENIS_KEGIATAN).map(([k, v]) => ({ nilai: k, label: v.label }))} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Tanggal mulai" nama="mulai" tipe="date" nilai={data?.mulai ?? tanggalAwal} wajib />
        <Input label="Tanggal selesai" nama="selesai" tipe="date" nilai={data?.selesai} bantuan="Kosongkan bila satu hari" />
        <Input label="Jam mulai" nama="jam_mulai" tipe="time" nilai={data?.jam_mulai?.slice(0, 5) ?? ""} bantuan="Opsional" />
        <Input label="Jam selesai" nama="jam_selesai" tipe="time" nilai={data?.jam_selesai?.slice(0, 5) ?? ""} />
      </div>
      <Input label="Tempat" nama="lokasi" nilai={data?.lokasi} maks={150} />
      <TextArea label="Keterangan" nama="keterangan" nilai={data?.keterangan} baris={3} maks={1000} />
      <Pilihan label="Ditujukan untuk" nama="sasaran" nilai={data?.sasaran ?? "umum"} opsi={Object.entries(SASARAN).map(([k, v]) => ({ nilai: k, label: v }))} />
      <Centang
        label="Tidak ada KBM (libur belajar)"
        nama="kbm_libur"
        nilai={data?.kbm_libur}
        bantuan="Tanggal-tanggal ini otomatis menjadi hari libur di absensi & jadwal (hari Minggu dilewati). Otomatis untuk jenis Libur."
      />
      <TombolSimpan>{data ? "Simpan perubahan" : "Tambah ke kalender"}</TombolSimpan>
    </FormAksi>
  );
}
