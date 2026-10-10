"use client";

import { useRef } from "react";
import { catatKunjungan, kembalikanBuku, pinjamBuku, simpanBuku, simpanPengaturanPerpus, tambahEksemplar } from "@/app/admin/actions-perpus";
import { Centang, FormAksi, Input, Pilihan, TextArea, TombolSimpan } from "@/components/admin/form";

export const KATEGORI_DDC = [
  "000 Karya umum", "100 Filsafat & psikologi", "200 Agama", "300 Ilmu sosial", "400 Bahasa", "500 Sains & matematika",
  "600 Teknologi", "700 Seni & olahraga", "800 Sastra", "900 Sejarah & geografi", "Fiksi", "Referensi", "Buku paket", "Lainnya",
];

/** Kotak besar yang siap menerima pemindai barcode/QR (pemindai USB mengetik lalu Enter) */
function KotakPindai({ nama, label, placeholder, fokus }: { nama: string; label: string; placeholder: string; fokus?: boolean }) {
  return (
    <label className="block text-sm font-semibold">{label}
      <input name={nama} autoFocus={fokus} autoComplete="off" placeholder={placeholder}
        className="mt-1.5 block w-full rounded-xl border border-black/15 bg-white px-4 py-3 font-mono text-lg uppercase tracking-wider outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10" />
    </label>
  );
}

export function FormPinjam() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref}>
      <FormAksi aksi={pinjamBuku} className="space-y-4">
        <KotakPindai nama="anggota" label="NISN siswa / NIP guru" placeholder="mis. 0081000016" fokus />
        <KotakPindai nama="kode" label="Kode buku" placeholder="PUS000123" />
        <TombolSimpan>Pinjamkan</TombolSimpan>
      </FormAksi>
    </div>
  );
}

export function FormKembali() {
  return (
    <FormAksi aksi={kembalikanBuku} className="space-y-4">
      <KotakPindai nama="kode" label="Kode buku" placeholder="PUS000123" />
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">Kondisi
          <select name="kondisi" className="rounded-lg border border-black/15 bg-white px-2 py-1.5"><option value="tersedia">Baik</option><option value="rusak">Rusak</option><option value="hilang">Hilang (diganti)</option></select>
        </label>
        <label className="flex items-center gap-2"><input type="checkbox" name="lunas" defaultChecked /> Denda dibayar saat ini</label>
      </div>
      <TombolSimpan>Kembalikan</TombolSimpan>
    </FormAksi>
  );
}

export type DataBuku = { id: string; judul: string; pengarang: string; penerbit: string; tahun: number | null; isbn: string; kategori: string; nomor_panggil: string; rak: string; sinopsis: string; sampul_url: string; tautan_digital: string; tampil_publik: boolean; lisensi: string; akses_digital: string; rekomendasi: boolean };

export function FormBuku({ data }: { data?: DataBuku }) {
  return (
    <FormAksi aksi={simpanBuku} className="space-y-4">
      {data && <input type="hidden" name="id" value={data.id} />}
      <Input label="Judul" nama="judul" nilai={data?.judul} wajib maks={250} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Pengarang" nama="pengarang" nilai={data?.pengarang} maks={250} />
        <Input label="Penerbit" nama="penerbit" nilai={data?.penerbit} maks={150} />
        <Input label="Tahun terbit" nama="tahun" tipe="number" nilai={data?.tahun ?? ""} />
        <Input label="ISBN" nama="isbn" nilai={data?.isbn} maks={20} />
        <Pilihan label="Kategori" nama="kategori" nilai={data?.kategori ?? KATEGORI_DDC[9]} opsi={KATEGORI_DDC.map((k) => ({ nilai: k, label: k }))} />
        <Input label="Nomor panggil" nama="nomor_panggil" nilai={data?.nomor_panggil} maks={40} placeholder="mis. 910 SUM g" />
        <Input label="Rak" nama="rak" nilai={data?.rak} maks={40} />
        <Input label="Sampul (URL gambar, opsional)" nama="sampul_url" nilai={data?.sampul_url} placeholder="https://" />
      </div>
      <Input label="Tautan e-book / versi digital (opsional)" nama="tautan_digital" nilai={data?.tautan_digital} placeholder="https://buku.kemdikbud.go.id/…" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Dasar lisensi e-book" nama="lisensi" nilai={data?.lisensi} maks={120} placeholder="mis. Buku Kemendikbud (terbuka), CC BY, langganan sekolah" bantuan="Wajib bila ada tautan digital" />
        <Pilihan label="Akses e-book" nama="akses_digital" nilai={data?.akses_digital ?? "warga"} opsi={[{ nilai: "warga", label: "Hanya warga sekolah yang masuk" }, { nilai: "publik", label: "Terbuka untuk umum (lisensi terbuka)" }]} />
      </div>
      <TextArea label="Sinopsis" nama="sinopsis" nilai={data?.sinopsis} baris={3} maks={3000} />
      {!data && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Jumlah eksemplar" nama="jumlah" tipe="number" nilai={1} />
          <Input label="Sumber" nama="sumber" placeholder="mis. BOS 2026, hibah alumni" maks={60} />
        </div>
      )}
      <Centang label="Tampil di katalog publik (website)" nama="tampil_publik" nilai={data?.tampil_publik ?? true} />
      <Centang label="Rekomendasi pustakawan (tampil paling atas)" nama="rekomendasi" nilai={data?.rekomendasi} />
      <TombolSimpan>{data ? "Simpan" : "Tambah buku"}</TombolSimpan>
    </FormAksi>
  );
}

export function FormTambahEksemplar({ buku_id, pojok = [] }: { buku_id: string; pojok?: { id: string; nama: string }[] }) {
  return (
    <FormAksi aksi={tambahEksemplar} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="buku_id" value={buku_id} />
      <Input label="Tambah eksemplar" nama="jumlah" tipe="number" nilai={1} />
      <Input label="Sumber" nama="sumber" maks={60} />
      {pojok.length > 0 && <Pilihan label="Lokasi" nama="pojok_id" opsi={[{ nilai: "", label: "Perpustakaan" }, ...pojok.map((p) => ({ nilai: p.id, label: p.nama }))]} />}
      <TombolSimpan>Tambah</TombolSimpan>
    </FormAksi>
  );
}

export function FormPengaturanPerpus({ c }: { c: { lama_pinjam: number; maks_pinjam: number; maks_perpanjang: number; denda_per_hari: number } }) {
  return (
    <FormAksi aksi={simpanPengaturanPerpus} className="grid gap-4 sm:grid-cols-2">
      <Input label="Lama pinjam (hari)" nama="lama_pinjam" tipe="number" nilai={c.lama_pinjam} />
      <Input label="Maks. buku per orang" nama="maks_pinjam" tipe="number" nilai={c.maks_pinjam} />
      <Input label="Maks. perpanjangan" nama="maks_perpanjang" tipe="number" nilai={c.maks_perpanjang} />
      <Input label="Denda per hari (Rp, 0 = tanpa denda)" nama="denda_per_hari" tipe="number" nilai={Number(c.denda_per_hari)} />
      <div className="sm:col-span-2"><TombolSimpan>Simpan aturan</TombolSimpan></div>
    </FormAksi>
  );
}

export function FormKunjungan() {
  return (
    <FormAksi aksi={catatKunjungan} className="flex flex-wrap items-end gap-3">
      <div className="min-w-56 flex-1"><KotakPindai nama="anggota" label="NISN / NIP / nama tamu" placeholder="Pindai kartu" /></div>
      <label className="text-sm font-semibold">Keperluan
        <select name="keperluan" className="mt-1.5 block rounded-xl border border-black/15 bg-white px-3 py-3"><option value="membaca">Membaca</option><option value="meminjam">Meminjam</option><option value="mengerjakan_tugas">Mengerjakan tugas</option><option value="lainnya">Lainnya</option></select>
      </label>
      <TombolSimpan>Catat</TombolSimpan>
    </FormAksi>
  );
}
