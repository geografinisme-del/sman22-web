"use client";

import { simpanProfil } from "../../actions";
import { FormAksi, Input, InputGambar, TextArea, TombolSimpan } from "@/components/admin/form";
import { Kartu } from "@/components/admin/ui";

export type DataProfil = Record<string, string>;

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <Kartu>
      <h2 className="mb-6 text-2xl">{judul}</h2>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </Kartu>
  );
}

export function FormProfil({ data }: { data: DataProfil }) {
  return (
    <FormAksi aksi={simpanProfil}>
      <Bagian judul="Identitas & kontak">
        <Input label="Slogan / moto sekolah" nama="slogan" nilai={data.slogan} maks={200} />
        <Input label="NPSN" nama="npsn" nilai={data.npsn} bantuan="8 digit angka" maks={8} />
        <Input label="Akreditasi" nama="akreditasi" nilai={data.akreditasi} placeholder="mis. A (Unggul)" />
        <Input label="Jam layanan" nama="jam_layanan" nilai={data.jam_layanan} />
        <Input label="Telepon" nama="telepon" nilai={data.telepon} tipe="tel" />
        <Input label="Email" nama="email" nilai={data.email} tipe="email" />
        <div className="sm:col-span-2">
          <TextArea label="Alamat lengkap" nama="alamat" nilai={data.alamat} baris={2} maks={300} />
        </div>
      </Bagian>

      <Bagian judul="Kepala sekolah & sambutan">
        <Input label="Nama kepala sekolah (dengan gelar)" nama="kepala_sekolah" nilai={data.kepala_sekolah} />
        <div className="sm:col-span-2">
          <InputGambar label="Foto kepala sekolah" nama="foto" sekarang={data.foto_kepala_sekolah} />
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Kutipan singkat"
            nama="sambutan_kutipan"
            nilai={data.sambutan_kutipan}
            bantuan="Satu kalimat yang tampil besar di beranda."
            maks={300}
          />
        </div>
        <div className="sm:col-span-2">
          <TextArea
            label="Isi sambutan"
            nama="sambutan_isi"
            nilai={data.sambutan_isi}
            baris={8}
            bantuan="Pisahkan paragraf dengan satu baris kosong."
          />
        </div>
      </Bagian>

      <Bagian judul="Visi, misi & sejarah">
        <div className="sm:col-span-2">
          <TextArea label="Visi" nama="visi" nilai={data.visi} baris={3} />
        </div>
        <div className="sm:col-span-2">
          <TextArea label="Misi" nama="misi" nilai={data.misi} baris={6} bantuan="Satu misi per baris." />
        </div>
        <div className="sm:col-span-2">
          <TextArea label="Sejarah singkat" nama="sejarah" nilai={data.sejarah} baris={8} bantuan="Pisahkan paragraf dengan satu baris kosong." />
        </div>
      </Bagian>

      <Bagian judul="Beranda">
        <div className="sm:col-span-2">
          <TextArea
            label="Kalimat pembuka (tampil besar di bawah foto utama)"
            nama="pernyataan"
            nilai={data.pernyataan}
            baris={3}
            maks={600}
          />
        </div>
        <Input label="Jumlah peserta didik" nama="jumlah_siswa" nilai={data.jumlah_siswa} placeholder="mis. 1.150" bantuan="Kosongkan bila tidak ingin ditampilkan." />
        <Input label="Jumlah guru & tendik" nama="jumlah_guru" nilai={data.jumlah_guru} placeholder="mis. 85" />
        <Input label="Jumlah ekstrakurikuler" nama="jumlah_ekskul" nilai={data.jumlah_ekskul} placeholder="mis. 24" />
      </Bagian>

      <div className="sticky bottom-4 flex justify-end">
        <div className="rounded-full bg-white/80 p-1 shadow-lg backdrop-blur">
          <TombolSimpan>Simpan profil</TombolSimpan>
        </div>
      </div>
    </FormAksi>
  );
}
