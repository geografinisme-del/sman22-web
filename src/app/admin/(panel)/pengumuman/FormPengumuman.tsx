"use client";

import Link from "next/link";
import { simpanPengumuman } from "../../actions";
import { Centang, FormAksi, Input, TextArea, TombolSimpan } from "@/components/admin/form";

type Data = { id?: string; judul: string; isi: string; tanggal: string; penting: boolean; aktif: boolean; tayang_mulai?: string; tayang_selesai?: string };

export function FormPengumuman({ data }: { data: Data }) {
  return (
    <FormAksi aksi={simpanPengumuman} className="grid gap-5 sm:grid-cols-2">
      {data.id && <input type="hidden" name="id" value={data.id} />}
      <div className="sm:col-span-2">
        <Input label="Judul" nama="judul" nilai={data.judul} wajib maks={200} />
      </div>
      <div className="sm:col-span-2">
        <TextArea label="Isi pengumuman" nama="isi" nilai={data.isi} baris={4} maks={2000} />
      </div>
      <Input label="Tanggal" nama="tanggal" tipe="date" nilai={data.tanggal} wajib />
      <div />
      <Input label="Mulai tayang (opsional)" nama="tayang_mulai" tipe="datetime-local" nilai={data.tayang_mulai} bantuan="Kosongkan agar langsung tampil. Waktu WIB." />
      <Input label="Berhenti tayang (opsional)" nama="tayang_selesai" tipe="datetime-local" nilai={data.tayang_selesai} bantuan="Pengumuman otomatis hilang setelah waktu ini." />
      <Centang label="Penting" nama="penting" nilai={data.penting} bantuan="Diberi tanda dan ditampilkan paling atas." />
      <Centang label="Tampilkan di website" nama="aktif" nilai={data.aktif} bantuan="Hapus centang untuk menyembunyikan sementara." />
      <div className="flex items-center gap-3 sm:col-span-2">
        <TombolSimpan>{data.id ? "Simpan perubahan" : "Tambah pengumuman"}</TombolSimpan>
        {data.id && (
          <Link href="/admin/pengumuman" className="text-sm text-black/60 hover:underline">
            Batal
          </Link>
        )}
      </div>
    </FormAksi>
  );
}
