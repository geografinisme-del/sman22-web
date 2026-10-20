"use client";

import { FormAksi, InputBukti, TextArea, TombolSimpan, useErrorKolom } from "@/components/admin/form";
import { ajukanIzin } from "../../admin/actions-portal";

function Tanggal({ nama, label, nilai, wajib }: { nama: string; label: string; nilai?: string; wajib?: boolean }) {
  const err = useErrorKolom(nama);
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        type="date"
        name={nama}
        defaultValue={nilai}
        required={wajib}
        aria-invalid={Boolean(err)}
        className="mt-1.5 block w-full rounded-xl border border-black/15 bg-white px-4 py-3 font-normal aria-[invalid=true]:border-blue-teks"
      />
      {err && <span className="mt-1 block text-sm font-normal text-blue-teks">{err}</span>}
    </label>
  );
}

export function FormIzin({ anak, hariIni }: { anak: { id: string; nama: string }[]; hariIni: string }) {
  return (
    <FormAksi aksi={ajukanIzin} className="mt-5 space-y-5">
      {anak.length > 1 ? (
        <label className="block text-sm font-semibold">
          Anak
          <select name="siswa_id" className="mt-1.5 block w-full rounded-xl border border-black/15 bg-white px-4 py-3 font-normal">
            {anak.map((a) => (
              <option key={a.id} value={a.id}>{a.nama}</option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="siswa_id" value={anak[0].id} />
      )}
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Jenis</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["S", "Sakit"],
            ["I", "Izin (keperluan keluarga, dll.)"],
          ].map(([v, l]) => (
            <label key={v} className="flex cursor-pointer items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-3 text-sm has-[:checked]:border-blue-teks has-[:checked]:bg-soft">
              <input type="radio" name="jenis" value={v} defaultChecked={v === "S"} className="accent-ink" /> {l}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Tanggal nama="tanggal_mulai" label="Dari tanggal" nilai={hariIni} wajib />
        <Tanggal nama="tanggal_selesai" label="Sampai tanggal" nilai={hariIni} />
      </div>
      <TextArea label="Keterangan" nama="alasan" baris={3} maks={500} wajib placeholder="Contoh: demam sejak semalam, istirahat di rumah" />
      <InputBukti label="Foto surat dokter / surat izin (opsional)" bantuan="Bisa langsung memotret dari HP. Hanya wali kelas & piket yang dapat melihatnya." />
      <TombolSimpan>Kirim ke wali kelas</TombolSimpan>
    </FormAksi>
  );
}
