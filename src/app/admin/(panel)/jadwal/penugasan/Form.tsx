"use client";

import { FormAksi, TextArea, TombolSimpan, useErrorKolom } from "@/components/admin/form";
import { imporPenugasan, simpanPenugasan } from "../../../actions-jadwal";

type Opsi = { id: string; nama: string };
const kotak = "rounded-xl border border-black/15 bg-white px-3 py-2 text-sm";

function Err({ n }: { n: string }) {
  const e = useErrorKolom(n);
  return e ? <span className="block text-xs text-merah">{e}</span> : null;
}

export function TambahPenugasan({ kelasId, mapel, guru }: { kelasId: string; mapel: Opsi[]; guru: Opsi[] }) {
  return (
    <FormAksi aksi={simpanPenugasan} className="space-y-3">
      <input type="hidden" name="kelas_id" value={kelasId} />
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_6rem_auto]">
        <label className="text-sm font-semibold">Mapel
          <select name="mapel_id" className={`mt-1 block w-full font-normal ${kotak}`}>
            <option value="">— pilih —</option>
            {mapel.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
          </select>
          <Err n="mapel_id" />
        </label>
        <label className="text-sm font-semibold">Guru
          <select name="pegawai_id" className={`mt-1 block w-full font-normal ${kotak}`}>
            <option value="">(belum ditentukan)</option>
            {guru.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">JP/minggu
          <input name="jp_per_minggu" type="number" min={0} max={20} defaultValue={2} className={`mt-1 block w-full font-normal ${kotak}`} />
          <Err n="jp_per_minggu" />
        </label>
        <TombolSimpan>Tambah</TombolSimpan>
      </div>
    </FormAksi>
  );
}

export function UbahPenugasan({ id, kelasId, pegawaiId, jp, guru, mapel }: { id: string; kelasId: string; pegawaiId: string | null; jp: number; guru: Opsi[]; mapel: string }) {
  return (
    <FormAksi aksi={simpanPenugasan} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kelas_id" value={kelasId} />
      <input type="hidden" name="mapel_id" value="00000000-0000-0000-0000-000000000000" />
      <select name="pegawai_id" defaultValue={pegawaiId ?? ""} aria-label={`Guru ${mapel}`} className={`w-56 ${kotak}`}>
        <option value="">(belum ditentukan)</option>
        {guru.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
      </select>
      <input name="jp_per_minggu" type="number" min={0} max={20} defaultValue={jp} aria-label={`JP ${mapel}`} className={`w-16 ${kotak}`} />
      <button className="rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-black/15 hover:bg-black/5">Simpan</button>
    </FormAksi>
  );
}

export function TempelPenugasan() {
  return (
    <FormAksi aksi={imporPenugasan} className="space-y-3">
      <TextArea
        label="Tempel dari Excel / Google Sheets"
        nama="teks"
        baris={8}
        placeholder={"Kelas\tMapel\tGuru (nama atau NIP)\tJP\nX-1\tGeografi\tDra. Siti Aminah\t3\nX-1\tMatematika\t198001012005011001\t4"}
        bantuan="Urutan kolom: Kelas | Mapel | Guru | JP per minggu. Blok sel di Excel → Ctrl+C → tempel di sini. Baris yang sudah ada akan diperbarui; mapel baru dibuat otomatis."
      />
      <TombolSimpan>Simpan semua</TombolSimpan>
    </FormAksi>
  );
}
