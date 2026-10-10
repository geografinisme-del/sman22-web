"use client";

import { ajukanKoreksi } from "../../../../actions-absensi";
import { FormAksi, InputBukti, Pilihan, TextArea, TombolSimpan } from "@/components/admin/form";
import { KODE_ABSEN, STATUS_SISWA_ABSEN } from "@/lib/admin/absensi";

export function FormKoreksi({ siswa, tanggal }: { siswa: { id: string; nama: string; status: string }[]; tanggal: string }) {
  return (
    <FormAksi aksi={ajukanKoreksi} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="tanggal" value={tanggal} />
      <Pilihan label="Siswa" nama="siswa_id" opsi={siswa.map((s) => ({ nilai: s.id, label: `${s.nama} (sekarang: ${s.status})` }))} />
      <Pilihan label="Ubah menjadi" nama="status_baru" opsi={KODE_ABSEN.map((k) => ({ nilai: k, label: STATUS_SISWA_ABSEN[k].label }))} />
      <div className="sm:col-span-2">
        <TextArea label="Alasan" nama="alasan" baris={2} wajib maks={500} placeholder="mis. surat dokter baru diserahkan orang tua tanggal …" />
      </div>
      <div className="sm:col-span-2">
        <InputBukti label="Bukti (opsional, dianjurkan)" bantuan="Foto surat dokter/izin atau PDF, maksimal 4 MB. Hanya piket/admin yang dapat membukanya." />
      </div>
      <div className="sm:col-span-2">
        <TombolSimpan>Kirim pengajuan</TombolSimpan>
      </div>
    </FormAksi>
  );
}
