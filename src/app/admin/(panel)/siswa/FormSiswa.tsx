"use client";

import { simpanSiswa } from "../../actions-induk";
import { FormAksi, Input, Pilihan, TextArea, TombolSimpan } from "@/components/admin/form";
import { Kartu } from "@/components/admin/ui";
import { AGAMA, STATUS_SISWA } from "@/lib/admin/induk";

export type DataSiswa = Record<string, string>;

export function FormSiswa({
  data,
  kelas,
  bisaUbah,
  namaTa,
}: {
  data: DataSiswa;
  kelas: { id: string; nama: string }[];
  bisaUbah: boolean;
  namaTa: string | null;
}) {
  return (
    <FormAksi aksi={simpanSiswa}>
      <fieldset disabled={!bisaUbah} className="space-y-6">
        {data.id && <input type="hidden" name="id" value={data.id} />}
        <Kartu>
          <h2 className="mb-5 text-2xl">Identitas</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input label="Nama lengkap" nama="nama" nilai={data.nama} wajib maks={150} />
            </div>
            <Input label="NISN" nama="nisn" nilai={data.nisn} bantuan="10 digit, boleh kosong bila belum ada" maks={10} />
            <Input label="NIS / NIPD" nama="nis" nilai={data.nis} maks={20} />
            <Pilihan
              label="Jenis kelamin"
              nama="jenis_kelamin"
              nilai={data.jenis_kelamin}
              opsi={[{ nilai: "", label: "—" }, { nilai: "L", label: "Laki-laki" }, { nilai: "P", label: "Perempuan" }]}
            />
            <Pilihan label="Agama" nama="agama" nilai={data.agama} opsi={[{ nilai: "", label: "—" }, ...AGAMA.map((a) => ({ nilai: a, label: a }))]} />
            <Input label="Tempat lahir" nama="tempat_lahir" nilai={data.tempat_lahir} maks={80} />
            <Input label="Tanggal lahir" nama="tanggal_lahir" tipe="date" nilai={data.tanggal_lahir} />
          </div>
        </Kartu>
        <Kartu>
          <h2 className="mb-5 text-2xl">Sekolah</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Pilihan
              label={namaTa ? `Kelas (tahun ajaran ${namaTa})` : "Kelas (belum ada tahun ajaran aktif)"}
              nama="kelas_id"
              nilai={data.kelas_id}
              opsi={[{ nilai: "", label: "— Belum ada kelas —" }, ...kelas.map((k) => ({ nilai: k.id, label: k.nama }))]}
            />
            <Input label="Tahun masuk" nama="tahun_masuk" nilai={data.tahun_masuk} placeholder="2026" maks={4} />
            <Pilihan
              label="Status"
              nama="status"
              nilai={data.status}
              opsi={STATUS_SISWA.map((s) => ({ nilai: s, label: s[0].toUpperCase() + s.slice(1) }))}
            />
            <Input label="Keterangan status" nama="keterangan_status" nilai={data.keterangan_status} placeholder="mis. mutasi ke SMAN … (tanggal)" />
          </div>
        </Kartu>
        <Kartu>
          <h2 className="mb-5 text-2xl">Kontak</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="No. HP siswa" nama="telepon" tipe="tel" nilai={data.telepon} maks={30} />
            <Input label="Email" nama="email" tipe="email" nilai={data.email} />
            <div className="sm:col-span-2">
              <TextArea label="Alamat" nama="alamat" nilai={data.alamat} baris={2} maks={300} />
            </div>
          </div>
        </Kartu>
        {bisaUbah && (
          <div className="sticky bottom-4 flex justify-end">
            <div className="rounded-full bg-white/80 p-1 shadow-lg backdrop-blur">
              <TombolSimpan>Simpan data siswa</TombolSimpan>
            </div>
          </div>
        )}
      </fieldset>
    </FormAksi>
  );
}
