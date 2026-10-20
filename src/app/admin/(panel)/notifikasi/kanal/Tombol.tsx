"use client";

import { useActionState } from "react";
import { prosesSekarang } from "../../../actions-notif";

export function TombolProses() {
  const [h, jalankan, proses] = useActionState(prosesSekarang, { ok: false, pesan: "" });
  return (
    <form action={jalankan} className="flex items-center gap-3">
      <button disabled={proses} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{proses ? "Memproses…" : "Kirim antrian sekarang"}</button>
      {h.pesan && <span role="status" className="text-sm">{h.pesan}</span>}
    </form>
  );
}
