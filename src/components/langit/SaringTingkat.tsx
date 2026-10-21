"use client";

import { useState, type ReactNode } from "react";

/**
 * Saringan pil (tingkat prestasi, bidang Guru & Tendik). Tanpa JavaScript semua baris tetap tampil; dengan JS baris lain disembunyikan
 * lewat atribut data-tingkat pada baris yang dirender server.
 */
export function SaringTingkat({ tingkat, label = "Saring tingkat prestasi", children }: { tingkat: string[]; label?: string; children: ReactNode }) {
  const [pilih, setPilih] = useState("Semua");
  const aman = pilih.replace(/[^A-Za-z]/g, "");
  return (
    <div data-saring={aman}>
      {tingkat.length > 1 && (
        <div className="lgt-saringan mb-5" role="group" aria-label={label}>
          {["Semua", ...tingkat].map((t) => (
            <button key={t} type="button" className="lgt-chip" aria-pressed={pilih === t} onClick={() => setPilih(t)}>
              {t}
            </button>
          ))}
        </div>
      )}
      <style>{pilih === "Semua" ? "" : `[data-saring="${aman}"] [data-tingkat]:not([data-tingkat="${aman}"]){display:none}`}</style>
      {children}
    </div>
  );
}
