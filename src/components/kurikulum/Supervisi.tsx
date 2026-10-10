"use client";

import { isiSupervisi, tanggapiSupervisi } from "@/app/admin/actions-kurikulum";
import { FormAksi, TextArea, TombolSimpan } from "@/components/admin/form";
import { INSTRUMEN_SUPERVISI, SKALA_SKOR } from "@/lib/kurikulum";

export function FormInstrumen({ id, skor, kekuatan, perbaikan, rekomendasi }: { id: string; skor: Record<string, string>; kekuatan: string; perbaikan: string; rekomendasi: string }) {
  return (
    <FormAksi aksi={isiSupervisi} className="space-y-6">
      <input type="hidden" name="id" value={id} />
      {INSTRUMEN_SUPERVISI.map((b) => (
        <fieldset key={b.bagian}>
          <legend className="mb-2 font-serif text-xl">{b.bagian}</legend>
          <ul className="divide-y divide-black/5 rounded-xl ring-1 ring-black/10">
            {b.butir.map((x) => (
              <li key={x.kode} className="grid gap-2 p-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                <span>{x.teks}</span>
                <span className="flex gap-1" role="radiogroup" aria-label={x.teks}>
                  {Object.entries(SKALA_SKOR).map(([n, l]) => (
                    <label key={n} title={l} className="cursor-pointer">
                      <input type="radio" name={`skor_${x.kode}`} value={n} defaultChecked={skor[x.kode] === n} className="peer sr-only" />
                      <span className="grid h-9 w-9 place-items-center rounded-full font-semibold ring-1 ring-black/15 peer-checked:bg-brand-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent-400">{n}</span>
                    </label>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </fieldset>
      ))}
      <p className="text-xs text-black/50">Skala: {Object.entries(SKALA_SKOR).map(([n, l]) => `${n} = ${l}`).join(" · ")}</p>
      <TextArea label="Kekuatan" nama="kekuatan" nilai={kekuatan} baris={3} maks={2000} />
      <TextArea label="Hal yang perlu diperbaiki" nama="perbaikan" nilai={perbaikan} baris={3} maks={2000} />
      <TextArea label="Rekomendasi / tindak lanjut" nama="rekomendasi" nilai={rekomendasi} baris={3} maks={2000} />
      <div className="flex flex-wrap gap-3">
        <TombolSimpan>Simpan draf</TombolSimpan>
        <button type="submit" name="final" value="1" className="rounded-full bg-emerald-700 px-6 py-3 font-semibold text-white">Selesaikan & kirim ke guru</button>
      </div>
    </FormAksi>
  );
}

export function FormTanggapan({ id, nilai }: { id: string; nilai: string }) {
  return (
    <FormAksi aksi={tanggapiSupervisi} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <TextArea label="Tanggapan Anda" nama="tanggapan" nilai={nilai} baris={3} maks={2000} placeholder="Refleksi & rencana perbaikan" />
      <TombolSimpan>Kirim tanggapan</TombolSimpan>
    </FormAksi>
  );
}
