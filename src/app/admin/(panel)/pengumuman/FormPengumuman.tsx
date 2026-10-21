"use client";

import Link from "next/link";
import { simpanPengumuman } from "../../actions";
import { Centang, FormAksi, Input, InputGambar, TextArea, TombolSimpan } from "@/components/admin/form";

type Data = {
  id?: string;
  judul: string;
  isi: string;
  tanggal: string;
  penting: boolean;
  aktif: boolean;
  tayang_mulai?: string;
  tayang_selesai?: string;
  prioritas?: boolean;
  poster_url?: string;
  poster_alt?: string;
  tautan_url?: string;
  tautan_label?: string;
  sasaran?: string;
};

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
      <div className="sm:col-span-2">
        {data.sasaran === "pegawai" && <input type="hidden" name="sasaran_lama" value="pegawai" />}
        <Centang
          label="Pengumuman internal Guru & Tendik"
          nama="internal"
          nilai={data.sasaran === "pegawai"}
          bantuan="Tidak tampil di website publik; hanya muncul di dasbor Guru & Tendik yang sudah masuk."
        />
      </div>

      <fieldset className="grid gap-5 rounded-xl border border-[var(--line)] p-4 sm:col-span-2 sm:grid-cols-2">
        <legend className="px-1 font-semibold">Popup prioritas (opsional)</legend>
        <input type="hidden" name="kolom_popup" value={"prioritas" in data ? "1" : ""} />
        <div className="sm:col-span-2">
          <Centang
            label="Tampilkan sebagai popup prioritas"
            nama="prioritas"
            nilai={data.prioritas}
            bantuan="Muncul sekali per kunjungan di beranda (modal). Gunakan hanya untuk informasi sangat penting; bila ada beberapa, yang terbaru yang tampil."
          />
        </div>
        <div>
          <input type="hidden" name="poster_lama" value={data.poster_url ?? ""} />
          <InputGambar label="Poster (opsional)" nama="poster" sekarang={data.poster_url || undefined} />
          <p className="mt-1 text-sm text-[var(--muted)]">Ditampilkan utuh tanpa dipotong. Tulis juga informasi pentingnya di kolom Isi.</p>
          {data.poster_url && (
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" name="hapus_poster" className="h-4 w-4" /> Hapus poster saat ini
            </label>
          )}
        </div>
        <TextArea label="Teks alternatif poster" nama="poster_alt" nilai={data.poster_alt} baris={2} maks={300} bantuan="Wajib bila ada poster: jelaskan isi poster untuk pembaca layar." />
        <Input label="Tautan tombol (opsional)" nama="tautan_url" nilai={data.tautan_url} placeholder="/spmb atau https://…" bantuan="Tujuan QR/pendaftaran. Diawali / atau https://" />
        <Input label="Label tombol" nama="tautan_label" nilai={data.tautan_label} maks={40} placeholder="contoh: Daftar sekarang" />
      </fieldset>
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
