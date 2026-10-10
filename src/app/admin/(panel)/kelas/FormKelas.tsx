"use client";

import Link from "next/link";
import { simpanKelas } from "../../actions-induk";
import { FormAksi, Input, Pilihan, TombolSimpan } from "@/components/admin/form";

type Data = { id?: string; tahun_ajaran_id: string; tingkat: string; nama: string; program: string; wali_kelas_id: string };

export function FormKelas({ data, guru, kembali }: { data: Data; guru: { id: string; nama: string }[]; kembali: string }) {
  return (
    <FormAksi aksi={simpanKelas} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {data.id && <input type="hidden" name="id" value={data.id} />}
      <input type="hidden" name="tahun_ajaran_id" value={data.tahun_ajaran_id} />
      <Pilihan
        label="Tingkat"
        nama="tingkat"
        nilai={data.tingkat}
        opsi={[
          { nilai: "X", label: "X (Fase E)" },
          { nilai: "XI", label: "XI (Fase F)" },
          { nilai: "XII", label: "XII (Fase F)" },
        ]}
      />
      <Input label="Nama kelas" nama="nama" nilai={data.nama} wajib placeholder="X-1" bantuan="Contoh: X-1, XI-2, XII-3" />
      <Input label="Program / peminatan" nama="program" nilai={data.program} placeholder="opsional" />
      <Pilihan
        label="Wali kelas"
        nama="wali_kelas_id"
        nilai={data.wali_kelas_id}
        opsi={[{ nilai: "", label: "— Belum ditentukan —" }, ...guru.map((g) => ({ nilai: g.id, label: g.nama }))]}
      />
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
        <TombolSimpan>{data.id ? "Simpan perubahan" : "Tambah kelas"}</TombolSimpan>
        {data.id && (
          <Link href={kembali} className="text-sm text-black/60 hover:underline">
            Batal
          </Link>
        )}
      </div>
    </FormAksi>
  );
}
