"use client";

import { konfirmasiDisiplin } from "../../../actions-absensi";
import { FormAksi, TextArea, TombolSimpan } from "@/components/admin/form";

export function FormKonfirmasi({ siswaId, jenis, ambang }: { siswaId: string; jenis: string; ambang: number }) {
  return (
    <FormAksi aksi={konfirmasiDisiplin} className="space-y-3">
      <input type="hidden" name="siswa_id" value={siswaId} />
      <input type="hidden" name="jenis" value={jenis} />
      <input type="hidden" name="ambang" value={ambang} />
      <TextArea label="Tindakan yang sudah dilakukan" nama="catatan" baris={2} wajib maks={1000} placeholder="mis. SP 1 diserahkan ke orang tua tanggal …; orang tua hadir & menandatangani" />
      <TombolSimpan>Konfirmasi selesai</TombolSimpan>
    </FormAksi>
  );
}
