"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { masuk } from "@/app/admin/actions";
import { FormAksi, Input, Kolom, TombolSimpan, useErrorKolom } from "@/components/admin/form";
import type { PeranMasuk } from "@/lib/masuk";

/** Kolom kata sandi dengan tombol lihat/sembunyikan (bisa dipakai dengan keyboard). */
export function InputSandi({ nama = "password", label = "Kata Sandi", autoComplete = "current-password" }: { nama?: string; label?: string; autoComplete?: string }) {
  const [lihat, setLihat] = useState(false);
  const error = useErrorKolom(nama);
  return (
    <Kolom label={label} nama={nama}>
      <div className="masuk-sandi">
        <input
          id={nama}
          name={nama}
          type={lihat ? "text" : "password"}
          required
          autoComplete={autoComplete}
          placeholder="Masukkan kata sandi"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${nama}-error` : undefined}
        />
        <button type="button" onClick={() => setLihat((v) => !v)} aria-pressed={lihat} aria-controls={nama}>
          {lihat ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          {lihat ? "Sembunyikan" : "Lihat"}
          <span className="sr-only"> kata sandi</span>
        </button>
      </div>
    </Kolom>
  );
}

/**
 * Formulir masuk satu peran. Peran ditentukan HALAMAN (tanpa pilihan "Masuk sebagai"); cara masuk tetap seperti
 * sebelumnya: Guru & Tendik = email, siswa = NISN, orang tua = NISN anak — semuanya dengan kata sandi.
 */
export function FormMasuk({ peran, lanjut }: { peran: PeranMasuk; lanjut?: string }) {
  return (
    <FormAksi aksi={masuk} className="mt-6 space-y-5">
      <input type="hidden" name="halaman" value={peran} />
      {lanjut && <input type="hidden" name="lanjut" value={lanjut} />}
      {peran === "gtk" ? (
        <Input label="Email" nama="email" tipe="email" wajib placeholder="Masukkan email Anda" />
      ) : (
        <Input
          label={peran === "siswa" ? "NISN" : "NISN Anak"}
          nama="nisn"
          tipe="text"
          wajib
          maks={10}
          placeholder={peran === "siswa" ? "Masukkan NISN Anda" : "Masukkan NISN putra/putri Anda"}
          bantuan={peran === "orang-tua" ? "Gunakan NISN putra/putri Anda." : undefined}
        />
      )}
      <InputSandi />
      {peran === "gtk" && (
        <p className="text-right text-sm">
          <Link href="/admin/lupa-sandi" className="font-semibold text-[var(--blue-teks)] underline underline-offset-4">
            Lupa kata sandi?
          </Link>
        </p>
      )}
      <TombolSimpan teksProses="Memeriksa…">Masuk</TombolSimpan>
    </FormAksi>
  );
}
