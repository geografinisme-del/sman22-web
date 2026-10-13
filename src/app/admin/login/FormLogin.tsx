"use client";

import Link from "next/link";
import { useState } from "react";
import { masuk } from "../actions";
import { FormAksi, Input, TombolSimpan } from "@/components/admin/form";

const JENIS = [
  { nilai: "staf", label: "Guru / Staf" },
  { nilai: "siswa", label: "Siswa" },
  { nilai: "orang_tua", label: "Orang Tua" },
] as const;

export function FormLogin({ awal = "staf" }: { awal?: "staf" | "siswa" | "orang_tua" }) {
  const [jenis, setJenis] = useState<(typeof JENIS)[number]["nilai"]>(awal);
  return (
    <FormAksi aksi={masuk} className="mt-8 space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Masuk sebagai</legend>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#f3f0fc] p-1">
          {JENIS.map((j) => (
            <label key={j.nilai} className="cursor-pointer">
              <input type="radio" name="jenis" value={j.nilai} checked={jenis === j.nilai} onChange={() => setJenis(j.nilai)} className="peer sr-only" />
              <span className="block rounded-lg px-2 py-2.5 text-center text-sm font-medium text-[#555f6b] transition hover:text-[var(--tema-utama)] peer-checked:bg-[var(--tema-utama)] peer-checked:text-white peer-checked:shadow-[0_8px_18px_-10px_rgb(40_79_215/0.9)] peer-focus-visible:ring-2 peer-focus-visible:ring-[#ad80f3]">
                {j.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {jenis === "staf" ? (
        <Input key="email" label="Email" nama="email" tipe="email" wajib placeholder="nama@sekolah.sch.id" />
      ) : (
        <Input
          key="nisn"
          label={jenis === "siswa" ? "NISN" : "NISN anak"}
          nama="nisn"
          tipe="text"
          wajib
          maks={10}
          placeholder="10 digit"
          bantuan={jenis === "orang_tua" ? "Gunakan NISN anak dan kata sandi dari kartu akun orang tua." : "Gunakan NISN dan kata sandi dari kartu akun siswa."}
        />
      )}
      <Input label="Kata sandi" nama="password" tipe="password" wajib />
      <div className="flex items-center justify-between gap-4">
        <TombolSimpan teksProses="Memeriksa…">Masuk</TombolSimpan>
        {jenis === "staf" ? (
          <Link href="/admin/lupa-sandi" className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline">Lupa kata sandi?</Link>
        ) : (
          <span className="text-right text-xs text-black/50">Lupa sandi? Hubungi wali kelas.</span>
        )}
      </div>
    </FormAksi>
  );
}
