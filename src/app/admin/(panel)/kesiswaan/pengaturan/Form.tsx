"use client";

import { Centang, FormAksi, Input, Pilihan, TombolSimpan } from "@/components/admin/form";
import { PERINGKAT, TINGKAT } from "@/lib/kesiswaan/label";
import { simpanAturanPoin, simpanJenisPelanggaran } from "../../../actions-kesiswaan";

export function FormJenis({ j }: { j?: { id: string; kode: string; nama: string; kategori: string; poin: number } }) {
  return (
    <FormAksi aksi={simpanJenisPelanggaran} className="grid items-end gap-2 sm:grid-cols-[5rem_1fr_8rem_6rem_auto_auto]">
      {j && <input type="hidden" name="id" value={j.id} />}
      <Input label="Kode" nama="kode" nilai={j?.kode} maks={10} />
      <Input label="Nama pelanggaran" nama="nama" nilai={j?.nama} maks={150} wajib />
      <Pilihan label="Kategori" nama="kategori" nilai={j?.kategori ?? "ringan"} opsi={[{ nilai: "ringan", label: "Ringan" }, { nilai: "sedang", label: "Sedang" }, { nilai: "berat", label: "Berat" }]} />
      <Input label="Poin" nama="poin" tipe="number" nilai={j?.poin ?? 5} />
      <TombolSimpan>{j ? "Simpan" : "Tambah"}</TombolSimpan>
      {j && <button name="aktif" value="off" className="mb-1 text-sm text-merah underline">nonaktifkan</button>}
    </FormAksi>
  );
}

export function FormAturan({ prestasi, tindakan, kurangi }: { prestasi: { tingkat: string; peringkat: string; poin: number }[]; tindakan: { ambang: number; tindakan: string }[]; kurangi: boolean }) {
  const nilai = (t: string, p: string) => prestasi.find((x) => x.tingkat === t && x.peringkat === p)?.poin ?? 0;
  return (
    <FormAksi aksi={simpanAturanPoin} className="space-y-6">
      <div>
        <p className="mb-2 font-semibold">Poin prestasi</p>
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead><tr><th className="px-2 py-1 text-left">Tingkat</th>{Object.entries(PERINGKAT).map(([k, l]) => <th key={k} className="px-2 py-1">{l}</th>)}</tr></thead>
            <tbody>
              {Object.entries(TINGKAT).map(([t, lt]) => (
                <tr key={t}>
                  <td className="px-2 py-1 font-medium">{lt}</td>
                  {Object.keys(PERINGKAT).map((p) => (
                    <td key={p} className="px-1 py-1"><input name={`pp_${t}_${p}`} type="number" min={0} max={500} defaultValue={nilai(t, p)} aria-label={`Poin ${lt} ${PERINGKAT[p]}`} className="w-16 rounded-lg border border-black/15 px-2 py-1 text-center" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <p className="mb-2 font-semibold">Tindak lanjut berdasarkan poin</p>
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex gap-2">
              <input name={`ambang_${i}`} type="number" min={1} defaultValue={tindakan[i]?.ambang ?? ""} placeholder="poin" aria-label={`Ambang ${i + 1}`} className="w-24 rounded-lg border border-black/15 px-2 py-1.5 text-sm" />
              <input name={`tindakan_${i}`} defaultValue={tindakan[i]?.tindakan ?? ""} maxLength={100} placeholder="Tindakan" aria-label={`Tindakan ${i + 1}`} className="flex-1 rounded-lg border border-black/15 px-2 py-1.5 text-sm" />
            </div>
          ))}
        </div>
      </div>
      <Centang label="Poin prestasi mengurangi poin pelanggaran" nama="prestasi_kurangi_poin" nilai={kurangi} bantuan="Bila dicentang, siswa berprestasi mendapat 'penebusan' poin. Sesuaikan dengan tata tertib sekolah." />
      <TombolSimpan>Simpan aturan</TombolSimpan>
    </FormAksi>
  );
}
