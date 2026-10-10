"use client";

import { gantiSandiSendiri, simpanSandiBaru } from "@/app/admin/actions-keamanan";
import { FormAksi, Input, TombolSimpan } from "@/components/admin/form";
import { InputKode } from "./Mfa";

const BANTU = "Minimal 10 karakter, berisi huruf dan angka. Jangan sama dengan sandi akun lain.";

export function FormGantiSandi() {
  return (
    <FormAksi aksi={gantiSandiSendiri} className="space-y-5">
      <Input label="Kata sandi lama" nama="lama" tipe="password" wajib />
      <Input label="Kata sandi baru" nama="baru" tipe="password" wajib bantuan={BANTU} />
      <Input label="Ulangi kata sandi baru" nama="ulang" tipe="password" wajib />
      <TombolSimpan>Ganti kata sandi</TombolSimpan>
    </FormAksi>
  );
}

export function FormSandiBaru({ perluKode }: { perluKode: boolean }) {
  return (
    <FormAksi aksi={simpanSandiBaru} className="mt-6 space-y-5">
      <Input label="Kata sandi baru" nama="baru" tipe="password" wajib bantuan={BANTU} />
      <Input label="Ulangi kata sandi baru" nama="ulang" tipe="password" wajib />
      {perluKode && <InputKode label="Kode dari aplikasi autentikator" fokus={false} />}
      <TombolSimpan>Simpan kata sandi</TombolSimpan>
    </FormAksi>
  );
}
