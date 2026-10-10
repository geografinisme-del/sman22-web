"use client";

import { useState } from "react";
import { catatKegiatanPojok, simpanPojok, simpanTantangan, tetapkanDuta, tulisJurnal, ulasBuku } from "@/app/admin/actions-perpus";
import { Centang, FormAksi, Input, Pilihan, TextArea, TombolSimpan } from "@/components/admin/form";

type Opsi = { id: string; nama: string };

export function FormJurnal({ hari }: { hari: string }) {
  return (
    <FormAksi aksi={tulisJurnal} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Judul buku" nama="judul" wajib maks={250} />
        <Input label="Pengarang" nama="pengarang" maks={250} />
        <Input label="Tanggal membaca" nama="tanggal" tipe="date" nilai={hari} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Halaman" nama="halaman" tipe="number" nilai={0} />
          <Input label="Menit" nama="menit" tipe="number" nilai={0} />
        </div>
      </div>
      <TextArea label="Ringkasan & kesan" nama="ringkasan" baris={4} maks={3000} wajib placeholder="Apa isi bagian yang kamu baca? Apa yang paling berkesan?" />
      <TombolSimpan>Kirim jurnal</TombolSimpan>
    </FormAksi>
  );
}

export function Bintang({ nama = "rating", awal = 0 }: { nama?: string; awal?: number }) {
  const [n, setN] = useState(awal);
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold">Penilaian</legend>
      <div className="flex gap-1" role="radiogroup">
        {[1, 2, 3, 4, 5].map((i) => (
          <label key={i} className="cursor-pointer text-3xl leading-none" title={`${i} bintang`}>
            <input type="radio" name={nama} value={i} className="sr-only" checked={n === i} onChange={() => setN(i)} />
            <span aria-hidden className={i <= n ? "text-amber-500" : "text-black/20"}>★</span><span className="sr-only">{i} bintang</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function FormUlasan({ buku_id }: { buku_id: string }) {
  return (
    <FormAksi aksi={ulasBuku} className="space-y-3">
      <input type="hidden" name="buku_id" value={buku_id} />
      <Bintang />
      <TextArea label="Ulasan" nama="isi" baris={3} maks={1000} placeholder="Apa yang kamu sukai dari buku ini? Untuk siapa buku ini cocok?" />
      <TombolSimpan>Kirim ulasan</TombolSimpan>
    </FormAksi>
  );
}

export type DataTantangan = { id: string; judul: string; deskripsi: string; mulai: string; selesai: string; target_buku: number; target_menit: number };
export function FormTantangan({ d }: { d?: DataTantangan }) {
  return (
    <FormAksi aksi={simpanTantangan} className="space-y-4">
      {d && <input type="hidden" name="id" value={d.id} />}
      <Input label="Nama tantangan" nama="judul" nilai={d?.judul} wajib maks={150} placeholder="mis. Tantangan 5 Buku Semester Ganjil" />
      <TextArea label="Keterangan" nama="deskripsi" nilai={d?.deskripsi} baris={2} maks={2000} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Mulai" nama="mulai" tipe="date" nilai={d?.mulai} />
        <Input label="Selesai" nama="selesai" tipe="date" nilai={d?.selesai} />
        <Input label="Target judul buku" nama="target_buku" tipe="number" nilai={d?.target_buku ?? 5} />
        <Input label="Target menit membaca" nama="target_menit" tipe="number" nilai={d?.target_menit ?? 0} bantuan="0 = tidak dipakai" />
      </div>
      <TombolSimpan>{d ? "Simpan" : "Buat tantangan"}</TombolSimpan>
    </FormAksi>
  );
}

export function FormDuta() {
  return (
    <FormAksi aksi={tetapkanDuta} className="flex flex-wrap items-end gap-3">
      <Input label="NISN siswa" nama="nisn" maks={10} />
      <Input label="Peran" nama="peran" nilai="Duta Literasi" maks={60} />
      <TombolSimpan>Tetapkan</TombolSimpan>
    </FormAksi>
  );
}

export type DataPojok = { id: string; nama: string; lokasi: string; kelas_id: string | null; penanggung_jawab_id: string | null; deskripsi: string; aktif: boolean };
export function FormPojok({ d, guru, kelas }: { d?: DataPojok; guru: Opsi[]; kelas: Opsi[] }) {
  return (
    <FormAksi aksi={simpanPojok} className="space-y-4">
      {d && <input type="hidden" name="id" value={d.id} />}
      <Input label="Nama pojok baca" nama="nama" nilai={d?.nama} wajib maks={100} placeholder="mis. Pojok Baca X-1, Saung Literasi" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Lokasi" nama="lokasi" nilai={d?.lokasi} maks={150} />
        <Pilihan label="Kelas (opsional)" nama="kelas_id" nilai={d?.kelas_id ?? ""} opsi={[{ nilai: "", label: "— umum —" }, ...kelas.map((k) => ({ nilai: k.id, label: k.nama }))]} />
        <Pilihan label="Penanggung jawab" nama="penanggung_jawab_id" nilai={d?.penanggung_jawab_id ?? ""} opsi={[{ nilai: "", label: "—" }, ...guru.map((g) => ({ nilai: g.id, label: g.nama }))]} />
      </div>
      <TextArea label="Keterangan / koleksi" nama="deskripsi" nilai={d?.deskripsi} baris={2} maks={1000} />
      <Centang label="Aktif" nama="aktif" nilai={d?.aktif ?? true} />
      <TombolSimpan>{d ? "Simpan" : "Tambah pojok baca"}</TombolSimpan>
    </FormAksi>
  );
}

export function FormKegiatanPojok({ pojok_id, hari }: { pojok_id: string; hari: string }) {
  return (
    <FormAksi aksi={catatKegiatanPojok} className="grid gap-3 sm:grid-cols-[140px_1fr_100px]">
      <input type="hidden" name="pojok_id" value={pojok_id} />
      <Input label="Tanggal" nama="tanggal" tipe="date" nilai={hari} />
      <Input label="Kegiatan" nama="kegiatan" maks={300} placeholder="mis. Literasi 15 menit pagi, bedah buku" />
      <Input label="Peserta" nama="peserta" tipe="number" nilai={0} />
      <div className="sm:col-span-3"><Input label="Tautan dokumentasi (Drive/foto, opsional)" nama="tautan_dokumentasi" placeholder="https://" /></div>
      <div className="sm:col-span-3"><TombolSimpan>Catat kegiatan</TombolSimpan></div>
    </FormAksi>
  );
}
