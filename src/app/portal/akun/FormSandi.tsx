"use client";

import { FormAksi, Input, TombolSimpan } from "@/components/admin/form";
import { gantiSandiSendiri } from "../../admin/actions-portal";

export function FormSandi() {
  return (
    <FormAksi aksi={gantiSandiSendiri} className="mt-4 space-y-4">
      <Input label="Kata sandi lama" nama="lama" tipe="password" wajib />
      <Input label="Kata sandi baru" nama="baru" tipe="password" wajib maks={72} />
      <Input label="Ulangi kata sandi baru" nama="ulang" tipe="password" wajib maks={72} />
      <TombolSimpan>Ganti kata sandi</TombolSimpan>
    </FormAksi>
  );
}
