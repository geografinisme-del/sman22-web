"use client";

import { tambahOrangTua } from "../../actions-induk";
import { FormAksi, Input, Pilihan, TombolSimpan } from "@/components/admin/form";

export function FormOrtu({ siswaId }: { siswaId: string }) {
  return (
    <FormAksi aksi={tambahOrangTua} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="siswa_id" value={siswaId} />
      <Input label="Nama" nama="nama" wajib maks={150} />
      <Pilihan label="Hubungan" nama="hubungan" opsi={[{ nilai: "ayah", label: "Ayah" }, { nilai: "ibu", label: "Ibu" }, { nilai: "wali", label: "Wali" }]} />
      <Input label="No. HP" nama="telepon" tipe="tel" maks={30} />
      <Input label="Pekerjaan" nama="pekerjaan" maks={80} />
      <div className="sm:col-span-2">
        <TombolSimpan>Tambah orang tua/wali</TombolSimpan>
      </div>
    </FormAksi>
  );
}
