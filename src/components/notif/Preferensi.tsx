"use client";

import { useActionState } from "react";
import { FormAksi, Input, TombolSimpan } from "@/components/admin/form";
import { kirimTes, simpanPreferensi } from "@/app/admin/actions-notif";
import { KATEGORI_NOTIF } from "@/lib/notif/kategori";

export type Pref = { email: boolean; whatsapp: boolean; nomor_wa: string; kategori_mati: string[] };

export function FormPreferensi({ p, kontak, kanal }: { p: Pref; kontak: { email: string | null; wa: string | null }; kanal: { email: boolean; whatsapp: boolean } }) {
  const [tes, jalankanTes, prosesTes] = useActionState(kirimTes, { ok: false, pesan: "" });
  return (
    <div className="space-y-4">
      <FormAksi aksi={simpanPreferensi} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-xl bg-white p-4 ring-1 ring-black/10">
            <input type="checkbox" name="whatsapp" defaultChecked={p.whatsapp} className="mt-1 h-5 w-5 accent-brand-800" />
            <span><strong>WhatsApp</strong><span className="block text-sm text-black/60">{kontak.wa ? `ke ${kontak.wa}` : "nomor belum ada"}{!kanal.whatsapp && " · belum diaktifkan sekolah"}</span></span>
          </label>
          <label className="flex items-start gap-3 rounded-xl bg-white p-4 ring-1 ring-black/10">
            <input type="checkbox" name="email" defaultChecked={p.email} className="mt-1 h-5 w-5 accent-brand-800" />
            <span><strong>Email</strong><span className="block text-sm text-black/60">{kontak.email ? `ke ${kontak.email}` : "email belum ada"}{!kanal.email && " · belum diaktifkan sekolah"}</span></span>
          </label>
        </div>
        <Input label="Nomor WhatsApp (opsional, bila berbeda dari data sekolah)" nama="nomor_wa" nilai={p.nomor_wa} placeholder="0812xxxxxxxx" />
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Jangan kirim ke WhatsApp/email untuk:</legend>
          <div className="grid gap-1 sm:grid-cols-2">
            {Object.entries(KATEGORI_NOTIF).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="mati" value={k} defaultChecked={p.kategori_mati.includes(k)} className="h-4 w-4 accent-brand-800" /> {l}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-black/50">Notifikasi tetap tampil di lonceng aplikasi. Pesan malam (21.00–06.00) ditunda sampai pagi, kecuali yang penting. Peringatan keamanan akun (ganti sandi, verifikasi dua langkah) selalu dikirim.</p>
        </fieldset>
        <TombolSimpan>Simpan pengaturan</TombolSimpan>
      </FormAksi>
      <form action={jalankanTes}>
        <button disabled={prosesTes} className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15 disabled:opacity-50">{prosesTes ? "Mengirim…" : "Kirim notifikasi tes ke saya"}</button>
        {tes.pesan && <span className={`ml-3 text-sm ${tes.ok ? "text-emerald-700" : "text-merah"}`}>{tes.pesan}</span>}
      </form>
    </div>
  );
}
