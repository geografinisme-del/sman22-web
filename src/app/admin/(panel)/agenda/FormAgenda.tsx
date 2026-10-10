"use client";

import Link from "next/link";
import { simpanAgenda } from "../../actions";
import { FormAksi, Input, TombolSimpan } from "@/components/admin/form";

export function FormAgenda({ data }: { data: { id?: string; judul: string; tanggal: string; waktu: string; tempat: string } }) {
  return (
    <FormAksi aksi={simpanAgenda} className="grid gap-5 sm:grid-cols-2">
      {data.id && <input type="hidden" name="id" value={data.id} />}
      <div className="sm:col-span-2">
        <Input label="Nama kegiatan" nama="judul" nilai={data.judul} wajib maks={200} />
      </div>
      <Input label="Tanggal" nama="tanggal" tipe="date" nilai={data.tanggal} wajib />
      <Input label="Waktu" nama="waktu" nilai={data.waktu} placeholder="mis. 08.00 WIB" maks={60} />
      <div className="sm:col-span-2">
        <Input label="Tempat" nama="tempat" nilai={data.tempat} placeholder="mis. Aula" maks={120} />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <TombolSimpan>{data.id ? "Simpan perubahan" : "Tambah agenda"}</TombolSimpan>
        {data.id && (
          <Link href="/admin/agenda" className="text-sm text-black/60 hover:underline">
            Batal
          </Link>
        )}
      </div>
    </FormAksi>
  );
}
