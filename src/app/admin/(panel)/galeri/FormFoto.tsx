"use client";

import Link from "next/link";
import { simpanFoto } from "../../actions";
import { FormAksi, Input, InputGambar, TombolSimpan } from "@/components/admin/form";

export function FormFoto({ data }: { data: { id?: string; judul: string; urutan: number; gambar_url: string } }) {
  return (
    <FormAksi aksi={simpanFoto} className="grid gap-5 sm:grid-cols-[1fr_160px]">
      {data.id && <input type="hidden" name="id" value={data.id} />}
      <div className="sm:col-span-2">
        <InputGambar label="Foto" nama="gambar" sekarang={data.gambar_url || undefined} wajib={!data.id} />
      </div>
      <Input label="Keterangan foto" nama="judul" nilai={data.judul} wajib maks={200} />
      <Input label="Urutan" nama="urutan" tipe="number" nilai={data.urutan} bantuan="Angka kecil tampil lebih dulu." />
      <div className="flex items-center gap-3 sm:col-span-2">
        <TombolSimpan>{data.id ? "Simpan perubahan" : "Unggah foto"}</TombolSimpan>
        {data.id && (
          <Link href="/admin/galeri" className="text-sm text-black/60 hover:underline">
            Batal
          </Link>
        )}
      </div>
    </FormAksi>
  );
}
