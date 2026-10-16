"use client";

import { useState, type ReactNode } from "react";

/**
 * Saringan tingkat prestasi. Tanpa JavaScript semua baris tetap tampil (penyaringan hanya peningkatan);
 * baris disembunyikan lewat atribut data-tingkat di elemen <li> yang dirender server.
 */
export function SaringTingkat({ tingkat, children }: { tingkat: string[]; children: ReactNode }) {
  const [pilih, setPilih] = useState("Semua");
  return (
    <div data-saring={pilih}>
      {tingkat.length > 1 && (
        <div className="pr-saring" role="group" aria-label="Saring tingkat prestasi">
          {["Semua", ...tingkat].map((t) => (
            <button key={t} type="button" aria-pressed={pilih === t} onClick={() => setPilih(t)}>
              {t}
            </button>
          ))}
        </div>
      )}
      <style>{pilih === "Semua" ? "" : `[data-saring="${pilih.replace(/[^A-Za-z]/g, "")}"] .pr-baris:not([data-tingkat="${pilih.replace(/[^A-Za-z]/g, "")}"]){display:none}`}</style>
      {children}
    </div>
  );
}
