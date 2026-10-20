"use client";

import { useState } from "react";
import { ajukanPinjam, hapusBarang, laporKerusakan, simpanBarang, simpanRuangSarpras } from "@/app/admin/actions-sarpras";
import { Centang, FormAksi, Input, Pilihan, TextArea, TombolSimpan, useErrorKolom } from "@/components/admin/form";
import { KONDISI, SUMBER_DANA } from "@/lib/lms";

type Opsi = { id: string; nama: string };

function InputFoto({ label = "Foto (opsional)" }: { label?: string }) {
  const err = useErrorKolom("foto");
  return (
    <div>
      <label htmlFor="foto" className="mb-1.5 block text-sm font-semibold">{label}</label>
      <input id="foto" name="foto" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-white" />
      <p className={`mt-1 text-xs ${err ? "text-blue-teks" : "text-black/50"}`}>{err ?? "JPG/PNG/WEBP, maks. 4 MB. Di HP bisa langsung memotret."}</p>
    </div>
  );
}

export type DataBarang = {
  id: string; kode: string; nama: string; kategori_id: string; merk: string; spesifikasi: string; ruang_id: string | null; jumlah: number; satuan: string;
  kondisi: string; sumber_dana: string; tahun_perolehan: number | null; harga: number | null; bisa_dipinjam: boolean; keterangan: string;
};

export function FormBarang({ data, kategori, ruang }: { data?: DataBarang; kategori: Opsi[]; ruang: Opsi[] }) {
  return (
    <FormAksi aksi={simpanBarang} className="space-y-4">
      {data && <input type="hidden" name="id" value={data.id} />}
      <Input label="Nama barang" nama="nama" nilai={data?.nama} wajib maks={150} placeholder="mis. Proyektor Epson EB-X51" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Pilihan label="Kategori" nama="kategori_id" nilai={data?.kategori_id} opsi={kategori.map((k) => ({ nilai: k.id, label: k.nama }))} />
        <Pilihan label="Lokasi (ruang)" nama="ruang_id" nilai={data?.ruang_id ?? ""} opsi={[{ nilai: "", label: "— gudang / belum ditempatkan —" }, ...ruang.map((r) => ({ nilai: r.id, label: r.nama }))]} />
        <Input label="Merk / tipe" nama="merk" nilai={data?.merk} maks={100} />
        <Pilihan label="Kondisi" nama="kondisi" nilai={data?.kondisi ?? "baik"} opsi={Object.entries(KONDISI).map(([k, v]) => ({ nilai: k, label: v.label }))} />
        <Input label="Jumlah" nama="jumlah" tipe="number" nilai={data?.jumlah ?? 1} wajib />
        <Input label="Satuan" nama="satuan" nilai={data?.satuan ?? "unit"} maks={20} />
        <Pilihan label="Sumber dana" nama="sumber_dana" nilai={data?.sumber_dana ?? ""} opsi={[{ nilai: "", label: "—" }, ...SUMBER_DANA.map((s) => ({ nilai: s, label: s }))]} />
        <Input label="Tahun perolehan" nama="tahun_perolehan" tipe="number" nilai={data?.tahun_perolehan ?? ""} />
        <Input label="Harga satuan (Rp)" nama="harga" nilai={data?.harga ?? ""} placeholder="mis. 5500000" />
      </div>
      <TextArea label="Spesifikasi" nama="spesifikasi" nilai={data?.spesifikasi} baris={2} maks={1000} />
      <TextArea label="Keterangan" nama="keterangan" nilai={data?.keterangan} baris={2} maks={1000} />
      <InputFoto />
      <Centang label="Bisa dipinjam guru/staf" nama="bisa_dipinjam" nilai={data?.bisa_dipinjam} />
      <TombolSimpan>{data ? "Simpan" : "Tambah barang"}</TombolSimpan>
    </FormAksi>
  );
}

export function FormHapusBarang({ id }: { id: string }) {
  return (
    <FormAksi aksi={hapusBarang} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <Input label="Alasan penghapusan aset" nama="alasan_hapus" wajib maks={300} placeholder="mis. Rusak berat, sudah dilelang (BA No. …)" />
      <button className="rounded-full px-5 py-2.5 text-sm font-semibold text-blue-teks ring-1 ring-blue/30">Hapus dari daftar aset</button>
    </FormAksi>
  );
}

export function FormRuang({ r, guru }: { r: { id: string; gedung: string; kondisi: string; kapasitas: number | null; bisa_dipinjam: boolean; penanggung_jawab_id: string | null }; guru: Opsi[] }) {
  return (
    <FormAksi aksi={simpanRuangSarpras} className="grid gap-2 sm:grid-cols-[1fr_1fr_90px_1.4fr_auto_auto] sm:items-end">
      <input type="hidden" name="id" value={r.id} />
      <label className="text-xs font-semibold">Gedung<input name="gedung" defaultValue={r.gedung} maxLength={60} className="mt-1 block w-full rounded-lg border border-black/15 px-2 py-1.5 text-sm font-normal" /></label>
      <label className="text-xs font-semibold">Kondisi
        <select name="kondisi" defaultValue={r.kondisi} className="mt-1 block w-full rounded-lg border border-black/15 px-2 py-1.5 text-sm font-normal">
          {["baik", "rusak_ringan", "rusak_berat"].map((k) => <option key={k} value={k}>{KONDISI[k].label}</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold">Kapasitas<input name="kapasitas" type="number" defaultValue={r.kapasitas ?? ""} className="mt-1 block w-full rounded-lg border border-black/15 px-2 py-1.5 text-sm font-normal" /></label>
      <label className="text-xs font-semibold">Penanggung jawab
        <select name="penanggung_jawab_id" defaultValue={r.penanggung_jawab_id ?? ""} className="mt-1 block w-full rounded-lg border border-black/15 px-2 py-1.5 text-sm font-normal">
          <option value="">—</option>{guru.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-1.5 pb-2 text-xs font-semibold"><input type="checkbox" name="bisa_dipinjam" defaultChecked={r.bisa_dipinjam} /> Bisa dipinjam</label>
      <button className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white">Simpan</button>
    </FormAksi>
  );
}

export function FormPinjam({ ruang, barang, hariIni, awal }: { ruang: Opsi[]; barang: (Opsi & { jumlah: number })[]; hariIni: string; awal?: string }) {
  const [objek, setObjek] = useState(awal ?? "");
  const isBarang = objek.startsWith("barang:");
  const maks = isBarang ? barang.find((b) => `barang:${b.id}` === objek)?.jumlah ?? 1 : 1;
  const err = useErrorKolom("objek");
  return (
    <FormAksi aksi={ajukanPinjam} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold">Ruang / barang</span>
        <select name="objek" value={objek} onChange={(e) => setObjek(e.target.value)} className="w-full rounded-xl border border-black/15 bg-white px-4 py-3">
          <option value="">— pilih —</option>
          {ruang.length > 0 && <optgroup label="Ruang">{ruang.map((r) => <option key={r.id} value={`ruang:${r.id}`}>{r.nama}</option>)}</optgroup>}
          {barang.length > 0 && <optgroup label="Barang">{barang.map((b) => <option key={b.id} value={`barang:${b.id}`}>{b.nama} ({b.jumlah})</option>)}</optgroup>}
        </select>
        {err && <span className="mt-1 block text-blue-teks">{err}</span>}
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Tanggal" nama="tanggal" tipe="date" nilai={hariIni} wajib />
        <Input label="Jam mulai" nama="jam_mulai" tipe="time" nilai="07:00" wajib />
        <Input label="Jam selesai" nama="jam_selesai" tipe="time" nilai="09:00" wajib />
      </div>
      {isBarang && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Sampai tanggal (bila lebih dari sehari)" nama="tanggal_selesai" tipe="date" />
          <Input label={`Jumlah (maks. ${maks})`} nama="jumlah" tipe="number" nilai={1} />
        </div>
      )}
      <TextArea label="Keperluan" nama="keperluan" baris={2} wajib maks={300} placeholder="mis. Praktikum IPA kelas XI-2" />
      <TombolSimpan>Ajukan peminjaman</TombolSimpan>
    </FormAksi>
  );
}

export function FormLapor({ ruang, barang, awal }: { ruang: Opsi[]; barang: Opsi[]; awal?: string }) {
  return (
    <FormAksi aksi={laporKerusakan} className="space-y-4">
      <Input label="Apa yang rusak?" nama="judul" wajib maks={150} placeholder="mis. AC tidak dingin, proyektor mati" />
      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold">Lokasi / barang</span>
        <select name="objek" defaultValue={awal ?? ""} className="w-full rounded-xl border border-black/15 bg-white px-4 py-3">
          <option value="">— tidak spesifik —</option>
          <optgroup label="Ruang">{ruang.map((r) => <option key={r.id} value={`ruang:${r.id}`}>{r.nama}</option>)}</optgroup>
          <optgroup label="Barang">{barang.map((b) => <option key={b.id} value={`barang:${b.id}`}>{b.nama}</option>)}</optgroup>
        </select>
      </label>
      <TextArea label="Keterangan" nama="deskripsi" baris={3} maks={2000} />
      <Pilihan label="Tingkat kepentingan" nama="prioritas" nilai="sedang" opsi={[{ nilai: "rendah", label: "Rendah" }, { nilai: "sedang", label: "Sedang" }, { nilai: "tinggi", label: "Tinggi — mengganggu KBM / berbahaya" }]} />
      <InputFoto />
      <TombolSimpan>Kirim laporan</TombolSimpan>
    </FormAksi>
  );
}
