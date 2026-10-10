"use client";

import { simpanPegawai } from "../../actions-induk";
import { FormAksi, Input, Pilihan, TombolSimpan } from "@/components/admin/form";
import { Kartu } from "@/components/admin/ui";
import { STATUS_PEGAWAI } from "@/lib/admin/induk";

export function FormPegawai({ data, bisaUbah }: { data: Record<string, string>; bisaUbah: boolean }) {
  return (
    <FormAksi aksi={simpanPegawai}>
      <fieldset disabled={!bisaUbah}>
        {data.id && <input type="hidden" name="id" value={data.id} />}
        <Kartu>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input label="Nama lengkap (dengan gelar)" nama="nama" nilai={data.nama} wajib maks={150} />
            </div>
            <Input label="NIP" nama="nip" nilai={data.nip} bantuan="18 digit, kosongkan bila non-ASN" maks={18} />
            <Input label="NUPTK" nama="nuptk" nilai={data.nuptk} bantuan="16 digit" maks={16} />
            <Pilihan label="Jenis" nama="jenis" nilai={data.jenis} opsi={[{ nilai: "guru", label: "Guru" }, { nilai: "tendik", label: "Tenaga kependidikan" }]} />
            <Pilihan
              label="Jenis kelamin"
              nama="jenis_kelamin"
              nilai={data.jenis_kelamin}
              opsi={[{ nilai: "", label: "—" }, { nilai: "L", label: "Laki-laki" }, { nilai: "P", label: "Perempuan" }]}
            />
            <Input label="Jabatan / tugas" nama="jabatan" nilai={data.jabatan} placeholder="mis. Guru Geografi, Wakasek Kurikulum" maks={100} />
            <Pilihan label="Status" nama="status" nilai={data.status} opsi={STATUS_PEGAWAI.map((s) => ({ nilai: s, label: s[0].toUpperCase() + s.slice(1) }))} />
            <Input label="No. HP" nama="telepon" tipe="tel" nilai={data.telepon} maks={30} />
            <Input label="Email" nama="email" tipe="email" nilai={data.email} />
          </div>
          {bisaUbah && (
            <div className="mt-6">
              <TombolSimpan>Simpan data pegawai</TombolSimpan>
            </div>
          )}
        </Kartu>
      </fieldset>
    </FormAksi>
  );
}
