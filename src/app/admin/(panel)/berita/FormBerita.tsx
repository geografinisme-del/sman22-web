"use client";

import { useState } from "react";
import { simpanBerita } from "../../actions";
import { Centang, FormAksi, Input, InputGambar, Pilihan, TextArea, TombolSimpan } from "@/components/admin/form";
import { Kartu } from "@/components/admin/ui";
import { buatSlug } from "@/lib/admin/schema";

export type DataBerita = {
  id?: string;
  judul: string;
  slug: string;
  kategori: string;
  tanggal: string;
  ringkasan: string;
  isi: string;
  status: string;
  gambar_url: string;
  tayang_mulai?: string;
  catatan_review?: string;
};

const KATEGORI = ["Kegiatan", "Prestasi", "Akademik", "Keagamaan", "Kesiswaan", "Pengumuman", "Lainnya"];

export function FormBerita({ data, bolehTerbit }: { data: DataBerita; bolehTerbit: boolean }) {
  const [judul, setJudul] = useState(data.judul);
  const usulanSlug = buatSlug(judul);

  return (
    <FormAksi aksi={simpanBerita}>
      {data.id && <input type="hidden" name="id" value={data.id} />}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Kartu className="space-y-5">
          <div>
            <label htmlFor="judul" className="mb-1.5 block text-sm font-semibold">
              Judul berita
            </label>
            <input
              id="judul"
              name="judul"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              required
              maxLength={200}
              className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 font-serif text-2xl outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10"
              placeholder="Tulis judul berita…"
            />
          </div>
          <TextArea label="Ringkasan" nama="ringkasan" nilai={data.ringkasan} baris={2} maks={400} bantuan="1–2 kalimat, tampil di daftar berita." />
          <TextArea label="Isi berita" nama="isi" nilai={data.isi} baris={14} bantuan="Pisahkan paragraf dengan satu baris kosong." />
          <InputGambar label="Foto utama" nama="gambar" sekarang={data.gambar_url || undefined} />
          {data.gambar_url && <Centang label="Hapus foto utama" nama="hapus_gambar" bantuan="Centang lalu simpan untuk menghapus foto." />}
        </Kartu>

        <div className="space-y-6">
          <Kartu className="space-y-5">
            {data.status === "ditolak" && data.catatan_review && (
              <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
                <strong>Dikembalikan penyetuju:</strong> {data.catatan_review}
              </p>
            )}
            <Pilihan
              label="Status"
              nama="status"
              nilai={data.status === "ditolak" ? "draft" : data.status === "terbit" && !bolehTerbit ? "terbit" : data.status}
              opsi={[
                { nilai: "draft", label: "Draf (belum tampil)" },
                ...(!bolehTerbit ? [{ nilai: "diajukan", label: "Ajukan untuk disetujui" }] : []),
                ...(bolehTerbit || data.status === "terbit" ? [{ nilai: "terbit", label: "Terbit (tampil di website)" }] : []),
              ]}
            />
            <Input
              label="Jadwal tayang (opsional)"
              nama="tayang_mulai"
              tipe="datetime-local"
              nilai={data.tayang_mulai}
              bantuan="Kosongkan agar tampil segera setelah terbit. Waktu WIB."
            />
            <Input label="Tanggal" nama="tanggal" tipe="date" nilai={data.tanggal} wajib />
            <Pilihan label="Kategori" nama="kategori" nilai={data.kategori} opsi={KATEGORI.map((k) => ({ nilai: k, label: k }))} />
            <Input
              label="Alamat halaman (slug)"
              nama="slug"
              nilai={data.slug}
              bantuan={`Kosongkan untuk otomatis: /berita/${usulanSlug || "…"}`}
            />
            <TombolSimpan>Simpan berita</TombolSimpan>
            {!bolehTerbit && <p className="text-xs text-black/50">Berita baru tampil di website setelah disetujui kepala sekolah.</p>}
          </Kartu>
        </div>
      </div>
    </FormAksi>
  );
}
