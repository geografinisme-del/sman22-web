"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { masuk } from "../actions";
import { FormAksi, Input, Kolom, TombolSimpan, useErrorKolom } from "@/components/admin/form";

const JENIS = [
  { nilai: "staf", label: "Guru, Tendik & Manajemen" },
  { nilai: "siswa", label: "Siswa" },
  { nilai: "orang_tua", label: "Orang Tua" },
] as const;

/** Kolom kata sandi dengan tombol tampilkan/sembunyikan (bisa dipakai dengan keyboard). */
export function InputSandi({ nama = "password", label = "Kata sandi", autoComplete = "current-password" }: { nama?: string; label?: string; autoComplete?: string }) {
  const [lihat, setLihat] = useState(false);
  const error = useErrorKolom(nama);
  return (
    <Kolom label={label} nama={nama}>
      <div className="relative">
        <input
          id={nama}
          name={nama}
          type={lihat ? "text" : "password"}
          required
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${nama}-error` : undefined}
          className="w-full rounded-lg border border-black/20 bg-white py-3 pl-4 pr-28 text-base outline-none transition focus:border-[var(--tema-utama)] focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--tema-utama)_20%,transparent)] aria-[invalid=true]:border-merah"
        />
        <button
          type="button"
          onClick={() => setLihat((v) => !v)}
          aria-pressed={lihat}
          aria-controls={nama}
          className="absolute right-1.5 top-1/2 flex min-h-9 -translate-y-1/2 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold text-[#3b414b] hover:bg-black/5"
        >
          {lihat ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          {lihat ? "Sembunyikan" : "Tampilkan"}
          <span className="sr-only"> kata sandi</span>
        </button>
      </div>
    </Kolom>
  );
}

export function FormLogin({ awal = "staf" }: { awal?: "staf" | "siswa" | "orang_tua" }) {
  const [jenis, setJenis] = useState<(typeof JENIS)[number]["nilai"]>(awal);
  return (
    <FormAksi aksi={masuk} className="mt-6 space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Masuk sebagai</legend>
        <div className="grid grid-cols-2 gap-2">
          {JENIS.map((j) => (
            <label key={j.nilai} className={`cursor-pointer ${j.nilai === "staf" ? "col-span-2" : ""}`}>
              <input type="radio" name="jenis" value={j.nilai} checked={jenis === j.nilai} onChange={() => setJenis(j.nilai)} className="peer sr-only" />
              {/* aktif ditandai bentuk (garis tebal), ikon centang, dan huruf tebal — tidak hanya warna */}
              <span className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-black/20 bg-white px-2 text-center text-sm font-medium text-[#3b414b] transition hover:border-black/50 peer-checked:border-2 peer-checked:border-[var(--tema-utama)] peer-checked:bg-[color-mix(in_srgb,var(--tema-utama)_6%,#fff)] peer-checked:font-semibold peer-checked:text-[#1f2328] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--tema-utama)]">
                {jenis === j.nilai && <Check size={16} aria-hidden className="shrink-0 text-[var(--tema-utama)]" />}
                {j.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {jenis === "staf" ? (
        <Input key="email" label="Email" nama="email" tipe="email" wajib placeholder="contoh: nama@sekolah.sch.id" />
      ) : (
        <Input
          key="nisn"
          label={jenis === "siswa" ? "NISN" : "NISN anak"}
          nama="nisn"
          tipe="text"
          wajib
          maks={10}
          placeholder="contoh: 0081234567"
          bantuan={jenis === "orang_tua" ? "Gunakan NISN anak dan kata sandi dari kartu akun orang tua." : "Gunakan NISN dan kata sandi dari kartu akun siswa."}
        />
      )}
      <InputSandi />
      <TombolSimpan teksProses="Memeriksa…">Masuk</TombolSimpan>
      <p className="text-sm text-[#3b414b]">
        {jenis === "staf" ? (
          <Link href="/admin/lupa-sandi" className="font-semibold underline underline-offset-4">
            Lupa kata sandi?
          </Link>
        ) : (
          <>Lupa kata sandi? Minta wali kelas atau operator mencetak ulang kartu akun.</>
        )}
      </p>
    </FormAksi>
  );
}
