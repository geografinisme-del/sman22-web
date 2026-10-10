"use client";

import { useMemo, useState } from "react";
import { catatTerlambat } from "../../actions-absensi";
import { FormAksi, Input, TombolSimpan } from "@/components/admin/form";

type Siswa = { id: string; nama: string; nisn: string | null; kelas: string | null };

export function FormTerlambat({ siswa, jamSekarang }: { siswa: Siswa[]; jamSekarang: string }) {
  const [cari, setCari] = useState("");
  const [pilih, setPilih] = useState<Siswa | null>(null);
  const hasil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (q.length < 2) return [];
    return siswa.filter((s) => s.nama.toLowerCase().includes(q) || (s.nisn ?? "").startsWith(q)).slice(0, 8);
  }, [cari, siswa]);

  return (
    <FormAksi aksi={catatTerlambat} className="space-y-4">
      <input type="hidden" name="siswa_id" value={pilih?.id ?? ""} />
      <div className="relative">
        <label htmlFor="cari-siswa" className="mb-1.5 block text-sm font-semibold">Cari siswa (nama / NISN)</label>
        <input
          id="cari-siswa"
          value={pilih ? `${pilih.nama} — ${pilih.kelas ?? "tanpa kelas"}` : cari}
          onChange={(e) => {
            setPilih(null);
            setCari(e.target.value);
          }}
          autoComplete="off"
          role="combobox"
          aria-expanded={hasil.length > 0 && !pilih}
          aria-controls="hasil-siswa"
          className="w-full rounded-xl border border-black/15 bg-white px-4 py-3"
          placeholder="Ketik minimal 2 huruf…"
        />
        {!pilih && hasil.length > 0 && (
          <ul id="hasil-siswa" role="listbox" className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/10">
            {hasil.map((s) => (
              <li key={s.id} role="option" aria-selected={false}>
                <button type="button" onClick={() => setPilih(s)} className="flex w-full justify-between px-4 py-2.5 text-left text-sm hover:bg-krem">
                  <span>{s.nama}</span>
                  <span className="text-black/50">{s.kelas ?? "—"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <Input label="Jam datang" nama="jam" tipe="time" nilai={jamSekarang} />
        <Input label="Keterangan (opsional)" nama="keterangan" placeholder="mis. ban bocor" maks={300} />
      </div>
      <TombolSimpan>Catat terlambat</TombolSimpan>
    </FormAksi>
  );
}
