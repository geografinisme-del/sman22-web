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
        <div className="grid grid-cols-3 gap-1 rounded-full bg-black/5 p-1">
          {JENIS.map((j) => (
            <label key={j.nilai} className="cursor-pointer">
              <input type="radio" name="jenis" value={j.nilai} checked={jenis === j.nilai} onChange={() => setJenis(j.nilai)} className="peer sr-only" />
              <span className="block rounded-full px-2 py-2 text-center text-sm font-medium text-black/60 transition peer-checked:bg-white peer-checked:text-tinta peer-checked:shadow peer-focus-visible:ring-2 peer-focus-visible:ring-accent-400">
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
        <TombolSimpan>Masuk</TombolSimpan>
        {jenis === "staf" ? (
          <Link href="/admin/lupa-sandi" className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline">Lupa kata sandi?</Link>
        ) : (
          <span className="text-right text-xs text-black/50">Lupa sandi? Hubungi wali kelas.</span>
        )}
      </div>
    </FormAksi>
  );
}
