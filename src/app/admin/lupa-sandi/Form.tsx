"use client";

import { mintaResetSandi } from "../actions-keamanan";
import { FormAksi, Input, TombolSimpan } from "@/components/admin/form";

export function FormLupaSandi() {
  return (
    <FormAksi aksi={mintaResetSandi} className="mt-6 space-y-5">
      <Input label="Email akun" nama="email" tipe="email" wajib placeholder="nama@sekolah.sch.id" />
      <TombolSimpan>Kirim tautan</TombolSimpan>
    </FormAksi>
  );
}
