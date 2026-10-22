"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { keluarSemuaPerangkat } from "@/app/admin/actions-keamanan";

function Kirim() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className="inline-flex min-h-10 items-center rounded-full bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60">
      {pending ? "Mengeluarkan…" : "Ya, keluar dari semua perangkat"}
    </button>
  );
}

/**
 * "Keluar dari semua perangkat" (signOut scope global) dengan konfirmasi singkat — untuk akun yang pernah dibuka di
 * komputer umum atau HP yang hilang. Tombol "Keluar" biasa hanya mengakhiri sesi di perangkat ini.
 */
export function TombolKeluarSemua() {
  const [tanya, setTanya] = useState(false);
  if (!tanya)
    return (
      <button type="button" onClick={() => setTanya(true)} className="inline-flex min-h-10 items-center rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--soft)]">
        Keluar dari semua perangkat
      </button>
    );
  return (
    <form action={keluarSemuaPerangkat} role="alertdialog" aria-labelledby="judul-keluar-semua" aria-describedby="isi-keluar-semua" className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
      <p id="judul-keluar-semua" className="font-semibold text-red-900">
        Keluar dari semua perangkat?
      </p>
      <p id="isi-keluar-semua" className="mt-1 text-sm text-red-900/80">
        Semua sesi akun ini di komputer dan HP lain akan berakhir, termasuk di perangkat ini. Anda perlu masuk lagi.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Kirim />
        <button type="button" onClick={() => setTanya(false)} autoFocus className="inline-flex min-h-10 items-center rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--soft)]">
          Batal
        </button>
      </div>
    </form>
  );
}
