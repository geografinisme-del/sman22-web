"use client";

import { useState } from "react";
import { simpanAbsensiKelas } from "../../../../actions-absensi";
import { FormAksi, TombolSimpan } from "@/components/admin/form";
import { KODE_ABSEN, STATUS_SISWA_ABSEN, type KodeAbsen } from "@/lib/admin/absensi";

type Baris = { id: string; nama: string; nisn: string | null; status: KodeAbsen; keterangan: string; jam: string | null };

export function FormAbsensiKelas({ kelasId, tanggal, siswa }: { kelasId: string; tanggal: string; siswa: Baris[] }) {
  const [nilai, setNilai] = useState<Record<string, KodeAbsen>>(Object.fromEntries(siswa.map((s) => [s.id, s.status])));
  const ringkas = KODE_ABSEN.map((k) => [k, Object.values(nilai).filter((v) => v === k).length] as const);

  return (
    <FormAksi aksi={simpanAbsensiKelas}>
      <input type="hidden" name="kelas_id" value={kelasId} />
      <input type="hidden" name="tanggal" value={tanggal} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {ringkas.map(([k, n]) => (
          <span key={k} className="rounded-full bg-white px-3 py-1 ring-1 ring-black/10">
            {STATUS_SISWA_ABSEN[k].label}: <strong>{n}</strong>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setNilai(Object.fromEntries(siswa.map((s) => [s.id, "H" as KodeAbsen])))}
          className="ml-auto rounded-full px-3 py-1 text-sm underline-offset-4 hover:underline"
        >
          Tandai semua hadir
        </button>
      </div>
      <ol className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
        {siswa.map((s, i) => (
          <li key={s.id} className="p-3 sm:p-4">
            <input type="hidden" name="siswa_id" value={s.id} />
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <p className="min-w-0 flex-1">
                <span className="mr-2 text-sm tabular-nums text-black/40">{i + 1}.</span>
                <span className="font-medium">{s.nama}</span>
                {s.jam && <span className="ml-2 text-xs text-amber-700">datang {s.jam.slice(0, 5)}</span>}
              </p>
              <fieldset className="flex flex-wrap gap-1.5">
                <legend className="sr-only">Status {s.nama}</legend>
                {KODE_ABSEN.map((k) => (
                  <label key={k} className="cursor-pointer">
                    <input
                      type="radio"
                      name={`status_${s.id}`}
                      value={k}
                      checked={nilai[s.id] === k}
                      onChange={() => setNilai((v) => ({ ...v, [s.id]: k }))}
                      className="peer sr-only"
                    />
                    <span
                      title={STATUS_SISWA_ABSEN[k].label}
                      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-2 text-sm font-semibold ring-1 ring-black/10 transition peer-focus-visible:ring-4 peer-focus-visible:ring-lime ${
                        nilai[s.id] === k ? `${STATUS_SISWA_ABSEN[k].warna} text-white ring-0` : "bg-white text-black/60 hover:bg-soft"
                      }`}
                    >
                      {STATUS_SISWA_ABSEN[k].pendek}
                    </span>
                  </label>
                ))}
              </fieldset>
            </div>
            {nilai[s.id] !== "H" && (
              <input
                name={`ket_${s.id}`}
                defaultValue={s.keterangan}
                maxLength={300}
                placeholder="Keterangan (mis. surat dokter, izin acara keluarga)"
                aria-label={`Keterangan ${s.nama}`}
                className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              />
            )}
          </li>
        ))}
      </ol>
      <div className="sticky bottom-4 flex justify-end">
        <div className="rounded-full bg-white/80 p-1 shadow-lg backdrop-blur">
          <TombolSimpan>Simpan absensi</TombolSimpan>
        </div>
      </div>
    </FormAksi>
  );
}
