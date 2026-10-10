"use client";

import { useState } from "react";
import { FormAksi, TombolSimpan } from "@/components/admin/form";
import { JENIS_PERUBAHAN, type JenisPerubahan } from "@/lib/admin/jadwal";
import { simpanPerubahan } from "../../../actions-jadwal";

const kotak = "rounded-xl border border-black/15 bg-white px-3 py-2 text-sm";

export function FormPerubahan({
  jadwalId,
  tanggal,
  tersedia,
  ruang,
  label,
}: {
  jadwalId: string;
  tanggal: string;
  tersedia: { id: string; nama: string; jp_hari_itu: number }[];
  ruang: { id: string; nama: string }[];
  label: string;
}) {
  const [jenis, setJenis] = useState<JenisPerubahan>("pengganti");
  return (
    <FormAksi aksi={simpanPerubahan} className="space-y-2">
      <input type="hidden" name="jadwal_id" value={jadwalId} />
      <input type="hidden" name="tanggal" value={tanggal} />
      <div className="flex flex-wrap items-center gap-2">
        <select name="jenis" value={jenis} onChange={(e) => setJenis(e.target.value as JenisPerubahan)} aria-label={`Jenis perubahan ${label}`} className={kotak}>
          {Object.entries(JENIS_PERUBAHAN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {jenis === "pengganti" && (
          <select name="pegawai_pengganti_id" aria-label={`Guru pengganti ${label}`} className={`w-64 ${kotak}`}>
            <option value="">— pilih guru yang kosong —</option>
            {tersedia.map((g) => <option key={g.id} value={g.id}>{g.nama} ({g.jp_hari_itu} JP hari itu)</option>)}
          </select>
        )}
        {jenis === "pindah_ruang" && (
          <select name="ruang_id" aria-label={`Ruang ${label}`} className={kotak}>
            <option value="">— pilih ruang —</option>
            {ruang.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
          </select>
        )}
        <input name="catatan" maxLength={300} placeholder="Catatan (mis. tugas hal. 45)" aria-label={`Catatan ${label}`} className={`min-w-48 flex-1 ${kotak}`} />
        <TombolSimpan>Simpan</TombolSimpan>
      </div>
      {jenis === "pengganti" && tersedia.length === 0 && <p className="text-xs text-amber-700">Tidak ada guru yang kosong pada jam ini. Pilih tugas mandiri.</p>}
    </FormAksi>
  );
}
