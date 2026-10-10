"use client";

import Link from "next/link";
import { simpanTahunAjaran } from "../../actions-induk";
import { FormAksi, Input, Pilihan, TombolSimpan } from "@/components/admin/form";

type Data = { id?: string; nama: string; semester: string; tanggal_mulai: string; tanggal_selesai: string };

export function FormTahunAjaran({ data }: { data: Data }) {
  return (
    <FormAksi aksi={simpanTahunAjaran} className="grid gap-5 sm:grid-cols-2">
      {data.id && <input type="hidden" name="id" value={data.id} />}
      <Input label="Tahun ajaran" nama="nama" nilai={data.nama} wajib placeholder="2026/2027" />
      <Pilihan
        label="Semester berjalan"
        nama="semester"
        nilai={data.semester}
        opsi={[
          { nilai: "ganjil", label: "Ganjil" },
          { nilai: "genap", label: "Genap" },
        ]}
      />
      <Input label="Tanggal mulai" nama="tanggal_mulai" tipe="date" nilai={data.tanggal_mulai} />
      <Input label="Tanggal selesai" nama="tanggal_selesai" tipe="date" nilai={data.tanggal_selesai} />
      <div className="flex items-center gap-3 sm:col-span-2">
        <TombolSimpan>{data.id ? "Simpan perubahan" : "Tambah tahun ajaran"}</TombolSimpan>
        {data.id && (
          <Link href="/admin/tahun-ajaran" className="text-sm text-black/60 hover:underline">
            Batal
          </Link>
        )}
      </div>
    </FormAksi>
  );
}
