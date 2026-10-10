"use client";

import { useEffect, useRef, useState } from "react";
import type { HasilAksi } from "../../admin/actions";
import { catatScan } from "../../admin/actions-jp";

export function Scan({ token }: { token: string }) {
  const [hasil, setHasil] = useState<HasilAksi | null>(null);
  const sekali = useRef(false);
  useEffect(() => {
    if (sekali.current) return;
    sekali.current = true;
    catatScan(token).then(setHasil);
  }, [token]);
  if (!hasil) return <p className="text-center text-black/60">Mencatat kehadiran…</p>;
  return (
    <div role={hasil.ok ? "status" : "alert"} className={`rounded-3xl p-8 text-center ${hasil.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>
      <p className="font-serif text-5xl">{hasil.ok ? "✓" : "!"}</p>
      <p className="mt-3 text-lg font-semibold">{hasil.pesan}</p>
      {!hasil.ok && <p className="mt-2 text-sm">Pindai ulang QR yang tampil di depan kelas.</p>}
    </div>
  );
}
