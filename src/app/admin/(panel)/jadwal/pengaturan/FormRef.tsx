"use client";

import { FormAksi, Input, Pilihan, TombolSimpan } from "@/components/admin/form";
import { simpanMapel, simpanRuang } from "../../../actions-jadwal";

export function FormMapel() {
  return (
    <FormAksi aksi={simpanMapel} className="grid items-end gap-3 sm:grid-cols-[1fr_8rem_10rem_auto]">
      <Input label="Nama mapel" nama="nama" wajib maks={100} placeholder="Geografi" />
      <Input label="Singkatan" nama="kode" maks={20} placeholder="GEO" />
      <Pilihan label="Kelompok" nama="kelompok" nilai="umum" opsi={[
        { nilai: "umum", label: "Umum" }, { nilai: "pilihan", label: "Pilihan" }, { nilai: "muatan_lokal", label: "Muatan lokal" }, { nilai: "lainnya", label: "Lainnya" },
      ]} />
      <TombolSimpan>Tambah</TombolSimpan>
    </FormAksi>
  );
}

export function FormRuang() {
  return (
    <FormAksi aksi={simpanRuang} className="grid items-end gap-3 sm:grid-cols-[1fr_10rem_8rem_auto]">
      <Input label="Nama ruang" nama="nama" wajib maks={60} placeholder="Lab Komputer" />
      <Pilihan label="Jenis" nama="jenis" nilai="kelas" opsi={[
        { nilai: "kelas", label: "Ruang kelas" }, { nilai: "laboratorium", label: "Laboratorium" }, { nilai: "lapangan", label: "Lapangan" }, { nilai: "lainnya", label: "Lainnya" },
      ]} />
      <Input label="Kapasitas" nama="kapasitas" tipe="number" />
      <TombolSimpan>Tambah</TombolSimpan>
    </FormAksi>
  );
}
