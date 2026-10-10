"use client";

import { FormAksi, Pilihan, TextArea, TombolSimpan } from "@/components/admin/form";
import { tanganiRujukan } from "../../actions-kesiswaan";

export function FormTangani({ id, status, catatan }: { id: string; status: string; catatan: string }) {
  return (
    <FormAksi aksi={tanganiRujukan} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <Pilihan label="Status" nama="status" nilai={status} opsi={[{ nilai: "baru", label: "Baru" }, { nilai: "ditangani", label: "Sedang ditangani" }, { nilai: "selesai", label: "Selesai" }]} />
      <TextArea label="Catatan BK (rahasia, hanya BK)" nama="catatan_bk" nilai={catatan} baris={3} maks={2000} />
      <TombolSimpan>Simpan</TombolSimpan>
    </FormAksi>
  );
}
