"use client";

import { simpanAbsensiPegawai } from "../../../actions-absensi";
import { FormAksi, Input, Pilihan, TombolSimpan } from "@/components/admin/form";
import { STATUS_PEGAWAI_ABSEN } from "@/lib/admin/absensi";

export function FormAbsenPegawai({ pegawai, tanggal }: { pegawai: { id: string; nama: string }[]; tanggal: string }) {
  return (
    <FormAksi aksi={simpanAbsensiPegawai} className="grid gap-4 sm:grid-cols-2">
      <Pilihan label="Guru / pegawai" nama="pegawai_id" opsi={[{ nilai: "", label: "— Pilih —" }, ...pegawai.map((p) => ({ nilai: p.id, label: p.nama }))]} />
      <Input label="Tanggal" nama="tanggal" tipe="date" nilai={tanggal} wajib />
      <Pilihan label="Status" nama="status" nilai="I" opsi={Object.entries(STATUS_PEGAWAI_ABSEN).map(([k, v]) => ({ nilai: k, label: v }))} />
      <Input label="Keterangan" nama="keterangan" maks={300} placeholder="mis. surat tugas no. …" />
      <div className="sm:col-span-2"><TombolSimpan>Simpan</TombolSimpan></div>
    </FormAksi>
  );
}
